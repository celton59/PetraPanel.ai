import { useState } from "react";
import { AlertCircle, Loader2, Upload, Cloud, Send, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ApiVideo, UpdateVideoData } from "@/hooks/useVideos";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionItem,
  AccordionContent,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser } from "@/hooks/use-user";
import { CorrectionUploadFields } from "./CorrectionUploadFields";
import { VideoUploader, UploadProgressState } from "@/services/videoUploader";
import { VideoUploadProgress } from "@/components/video/VideoUploadProgress";
import { motion, AnimatePresence } from "framer-motion";
import { AffiliateManager } from "@/components/video/AffiliateManager";
import { AffiliateInfoDialog } from "@/components/video/AffiliateInfoDialog";

// Estado inicial de progreso vacío
const emptyProgressState: UploadProgressState = {
  isUploading: false,
  progress: 0,
  uploadedParts: 0,
  totalParts: 0,
  uploadSpeed: 0,
  estimatedTimeRemaining: 0
};

interface MediaCorrectionsDetailProps {
  video: ApiVideo;
  onUpdate: (data: UpdateVideoData) => Promise<void>;
}

export function MediaCorrectionsDetail({
  video,
  onUpdate,
}: MediaCorrectionsDetailProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>(emptyProgressState);
  const [uploader, setUploader] = useState<VideoUploader | null>(null);

  const { user } = useUser();

  async function uploadThumbnail(file: File): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Importamos api y refreshCSRFToken de nuestro archivo axios mejorado
      const { refreshCSRFToken } = await import('../../../lib/axios');
      const api = (await import('../../../lib/axios')).default;
      
      // Refrescar proactivamente el token CSRF antes de esta operación importante
      await refreshCSRFToken();
      
      // Usar nuestra instancia de axios configurada con manejo CSRF
      await api.post(
        `/api/projects/${video.projectId}/videos/${video.id}/uploadThumbnail`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
    } catch (error: any) {
      console.error(`Error uploading thumbnail:`, error);
      
      // Manejo mejorado de errores de CSRF
      if (error.response?.status === 403 && 
          (error.response?.data?.message?.includes('CSRF') || 
           error.response?.data?.message?.includes('token') || 
           error.response?.data?.message?.includes('Token'))) {
        throw new Error("Error de validación de seguridad. Intente de nuevo.");
      }
      
      throw new Error(error.response?.data?.message || error.message || `Error al subir la miniatura`);
    }
  }

  async function uploadVideo(): Promise<string> {
    if (!videoFile) throw new Error("No hay archivo de video para subir");

    try {
      // Crear la instancia del uploader y guardarla para posible cancelación
      const videoUploader = new VideoUploader(video.projectId, video.id, videoFile);
      setUploader(videoUploader);

      // Configurar el callback de progreso
      videoUploader.onProgress((progressState) => {
        setUploadProgress(progressState);
      });

      // Iniciar la carga multiparte
      const url = await videoUploader.upload();
      
      // Limpiar referencia al uploader
      setUploader(null);
      
      return url;
    } catch (error: any) {
      console.error("Error al subir el video:", error);
      // Asegurarse de limpiar el uploader en caso de error
      setUploader(null);
      throw new Error(error.message || "Error al subir el video");
    }
  }

  // Función para cancelar la carga en curso
  const handleCancelUpload = async () => {
    if (uploader) {
      try {
        await uploader.cancel();
        console.log("Carga cancelada");
      } catch (error) {
        console.error("Error al cancelar la carga:", error);
      } finally {
        setUploader(null);
        setIsUploading(false);
        setUploadProgress(emptyProgressState);
      }
    }
  }

  async function handleUpload() {
    if (!videoFile && !thumbnailFile) {
      toast.error("Se requiere al menos un archivo para enviar correcciones");
      return;
    }

    setIsUploading(true);
    let videoUrl: string | undefined;

    try {
      // Subida de video
      if (videoFile) {
        videoUrl = await uploadVideo();
      }

      // Subida de miniatura
      if (thumbnailFile) {
        await uploadThumbnail(thumbnailFile);
      }

      // Actualizar el estado del video
      await onUpdate({
        status: "media_review",
        videoUrl: videoUrl,
        contentUploadedBy: user?.id,
      });

      toast.success("Correcciones enviadas correctamente");
    } catch (error: any) {
      console.error("Error al subir:", error);
      toast.error(error.message || "Error al enviar correcciones");
    } finally {
      setIsUploading(false);
      setUploadProgress(emptyProgressState);
    }
  }

  return (
    <ScrollArea className="max-h-[65vh]">
      <div className="p-4 pr-6">
        {/* Alerta de correcciones compacta */}
        {video.mediaReviewComments?.at(0) && (
          <div className="mb-4">
            <div className="flex items-start p-3 rounded-md border border-red-200 dark:border-red-900/50 shadow-sm bg-gradient-to-r from-red-50/80 to-transparent dark:from-red-950/30 dark:to-transparent backdrop-blur-sm">
              <div className="flex-shrink-0 p-1 bg-red-100 dark:bg-red-900/40 rounded-full mr-2 mt-0.5">
                <AlertCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <h3 className="text-xs font-medium text-red-700 dark:text-red-300">Corrección solicitada</h3>

                  {/* Badges de corrección */}
                  {video.mediaVideoNeedsCorrection && (
                    <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50">
                      Corregir Video
                    </span>
                  )}
                  {video.mediaThumbnailNeedsCorrection && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                      Corregir Miniatura
                    </span>
                  )}
                </div>
                <p className="text-xs text-red-700/90 dark:text-red-400/90 whitespace-pre-wrap">
                  {video.mediaReviewComments?.at(-1)}
                </p>
              </div>
            </div>

            {/* Historial de correcciones mejorado */}
            <Accordion type="single" collapsible className="mt-2 overflow-hidden rounded-md border border-gray-200 dark:border-gray-800 shadow-sm">
              <AccordionItem value="item-1" className="border-0">
                <AccordionTrigger className="px-3 py-2 text-xs font-medium bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-900/40 dark:to-transparent">
                  <div className="flex items-center">
                    <div className="p-1 rounded-full bg-red-50 dark:bg-red-900/30 mr-2">
                      <AlertCircle className="h-3 w-3 text-red-500 dark:text-red-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      Historial de correcciones
                      <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-[0.65rem] font-medium text-red-600 dark:text-red-300">
                        {video.mediaReviewComments?.length || 0}
                      </span>
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 py-2 space-y-2 bg-gradient-to-b from-gray-50/70 to-white dark:from-gray-900/30 dark:to-gray-900/10">
                  {video.mediaReviewComments?.map((comment, index) => (
                    <div
                      key={index}
                      className={`
                        relative flex flex-col p-2 rounded-md shadow-sm
                        ${index === video.mediaReviewComments!.length - 1
                          ? "border border-red-300 dark:border-red-800 bg-gradient-to-r from-red-50/90 to-white dark:from-red-950/30 dark:to-gray-900/20"
                          : "border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40"
                        }
                      `}
                    >
                      <p className="text-xs text-red-700 dark:text-red-300 pl-3 border-l border-red-300 dark:border-red-700">
                        {comment}
                      </p>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        {/* Título y descripción más compactos con animación */}
        <motion.div 
          className="mb-4 flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Enviar Correcciones</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sube los archivos corregidos según las indicaciones
            </p>
          </div>
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              onClick={handleUpload}
              className="py-1 h-9 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 text-white shadow-md"
              size="sm"
              disabled={isUploading || (!videoFile && !thumbnailFile)}
            >
              {isUploading ? (
                <motion.span 
                  className="flex items-center gap-1.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Subiendo...
                </motion.span>
              ) : (
                <motion.span 
                  className="flex items-center gap-1.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Send className="h-3.5 w-3.5" />
                  Enviar Correcciones
                </motion.span>
              )}
            </Button>
          </motion.div>
        </motion.div>

        {/* Contenedor para los campos de corrección con animación */}
        <motion.div 
          className="bg-gradient-to-b from-gray-50/70 to-white dark:from-gray-900/30 dark:to-gray-900/10 border border-gray-200 dark:border-gray-800 rounded-md p-4 shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <AnimatePresence>
            {isUploading && videoFile && (
              <motion.div 
                className="mb-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <VideoUploadProgress 
                  progressState={uploadProgress}
                  onCancel={handleCancelUpload}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          <CorrectionUploadFields
            videoFile={videoFile}
            thumbnailFile={thumbnailFile}
            onVideoFileChange={setVideoFile}
            onThumbnailFileChange={setThumbnailFile}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            needsVideoCorrection={Boolean(video.mediaVideoNeedsCorrection)}
            needsThumbnailCorrection={Boolean(video.mediaThumbnailNeedsCorrection)}
          />
        </motion.div>

        {/* Información sobre enlaces de afiliación - Advertencia mejorada */}
        <motion.div 
          className="mt-6 mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-md p-4 relative overflow-hidden shadow-md">
            <div className="absolute right-0 top-0 w-24 h-24 bg-amber-100 dark:bg-amber-900/20 opacity-50 rounded-full -mr-8 -mt-8"></div>
            <div className="flex items-start gap-3 relative z-10">
              <div className="flex-shrink-0 p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-full mt-0.5">
                <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">⚠️ IMPORTANTE</h3>
                <div className="text-xs text-amber-700 dark:text-amber-300 space-y-2">
                  <p className="font-medium">
                    Si tu video menciona productos o servicios con enlaces de afiliación, <span className="underline font-bold">DEBES SEGUIR ESTAS INSTRUCCIONES</span>:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Que hay enlaces en la descripción y en los comentarios fijados, y invitarlos a registrarse, comprar o lo que requiera el vídeo</li>
                    <li><span className="bg-red-200 dark:bg-red-900/50 px-1 font-bold">NO MENCIONAR</span> que son enlaces de afiliación</li>
                    <li>Explicar brevemente que usarlos ayuda al canal</li>
                  </ul>
                  <p className="pt-1 font-semibold">
                    Este requisito es obligatorio para cumplir con las normativas aplicables. Los videos sin esta mención serán rechazados.
                  </p>
                </div>
                <div className="mt-3">
                  <AffiliateInfoDialog variant="button" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Componente de gestión de afiliados */}
        {video && video.id && (
          <motion.div 
            className="mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <AffiliateManager video={video} className="overflow-hidden" />
          </motion.div>
        )}
      </div>
    </ScrollArea>
  );
}