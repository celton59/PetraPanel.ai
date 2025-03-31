import { useState } from "react";
import { Video } from "@db/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpdateVideoData } from "@/hooks/useVideos";
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Youtube,
  Upload,
  Video as VideoIcon,
  Clock,
  Check,
  PlayCircle
} from "lucide-react";
import { YoutubePublishDialog } from "@/components/youtube/YoutubePublishDialog";

interface FinalReviewContentProps {
  video: Video;
  onUpdate: (data: UpdateVideoData) => Promise<void>;
  openYoutubeDialog?: () => void;
}

export function FinalReviewContent({
  video,
  onUpdate,
  openYoutubeDialog
}: FinalReviewContentProps) {
  // Solo se muestra si estamos en estado final_review
  if (video.status !== "final_review") return null;
  
  // Estado para controlar la apertura del diálogo de publicación en YouTube
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  
  // Función para manejar la publicación exitosa en YouTube
  const handleYoutubePublished = async (youtubeUrl: string) => {
    try {
      // Actualizar el estado del video a completado y guardar la URL de YouTube
      await onUpdate({
        status: "completed",
        youtubeUrl
      });
    } catch (error) {
      console.error("Error al actualizar el estado del video:", error);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm relative bg-gradient-to-b from-white to-red-50/30 dark:from-gray-900 dark:to-red-950/10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-red-600 to-red-500 dark:from-red-600 dark:via-red-700 dark:to-red-600"></div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md">
                <Youtube className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-semibold text-red-700 dark:text-red-300 text-xl mb-1">Revisión Final</h3>
                <p className="text-gray-600 dark:text-gray-400">Este video está listo para ser publicado</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">Contenido verificado</span>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 rounded-lg bg-white/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mt-0.5">
                  <VideoIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Video optimizado</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    El video ha sido verificado y está listo para su distribución
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 rounded-lg bg-white/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mt-0.5">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Beneficios de publicar en YouTube</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Alcance global, monetización y estadísticas detalladas sobre el rendimiento del video
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-lg border border-red-100 dark:border-red-800/50">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-full bg-red-200 dark:bg-red-800/70 text-red-600 dark:text-red-300 mt-0.5">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-medium text-red-700 dark:text-red-300">Información importante</h4>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    Una vez publicado en YouTube, este video avanzará a estado "Completado" y ya no se podrá editar.
                    Verifica toda la información antes de proceder.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="flex items-center space-x-2 p-2 rounded bg-white/60 dark:bg-gray-800/30 border border-red-100 dark:border-red-900/30">
                  <Upload className="h-4 w-4 text-red-500 dark:text-red-400" />
                  <span className="text-xs text-red-700 dark:text-red-300">Subida automática</span>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded bg-white/60 dark:bg-gray-800/30 border border-red-100 dark:border-red-900/30">
                  <Clock className="h-4 w-4 text-red-500 dark:text-red-400" />
                  <span className="text-xs text-red-700 dark:text-red-300">Publicación inmediata</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              size="lg"
              onClick={() => setYoutubeDialogOpen(true)}
              className="w-full md:w-auto bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 py-3 shadow-md transition-all duration-300 hover:shadow-lg"
            >
              <Youtube className="mr-2 h-5 w-5" />
              Publicar ahora en YouTube
            </Button>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button
                variant="outline"
                className="sm:flex-1 py-2 border-green-200 text-green-600 hover:text-green-700 hover:border-green-300 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
                onClick={() => onUpdate({ status: 'completed' })}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Completar sin YouTube
              </Button>
              <Button
                variant="outline"
                className="sm:flex-1 py-2 border-amber-200 text-amber-600 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
                onClick={() => onUpdate({ status: 'media_review' })}
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Volver a revisión
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Diálogo para publicar en YouTube */}
      <YoutubePublishDialog
        video={video}
        open={youtubeDialogOpen}
        onClose={() => setYoutubeDialogOpen(false)}
        onPublished={handleYoutubePublished}
      />
    </>
  );
}