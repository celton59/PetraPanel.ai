import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { UploadProgressState } from "@/services/videoUploader";
import { VideoUploadProgress } from "@/components/video/VideoUploadProgress";
import { ThumbnailPreview } from "@/components/ui/thumbnail-preview";

interface CorrectionUploadFieldsProps {
  videoFile: File | null;
  thumbnailFile: File | null;
  onVideoFileChange: (file: File | null) => void;
  onThumbnailFileChange: (file: File | null) => void;
  isUploading?: boolean;
  uploadProgress?: UploadProgressState;
  needsVideoCorrection?: boolean;
  needsThumbnailCorrection?: boolean;
}

// Estado inicial de progreso vacío para usar como valor por defecto
const emptyProgressState: UploadProgressState = {
  isUploading: false,
  progress: 0,
  uploadedParts: 0,
  totalParts: 0,
  uploadSpeed: 0,
  estimatedTimeRemaining: 0
};

export function CorrectionUploadFields({
  videoFile,
  thumbnailFile,
  onVideoFileChange,
  onThumbnailFileChange,
  isUploading,
  uploadProgress = emptyProgressState,
  needsVideoCorrection = false,
  needsThumbnailCorrection = false
}: CorrectionUploadFieldsProps) {
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isDraggingThumbnail, setIsDraggingThumbnail] = useState(false);

  const handleDragOver = (e: React.DragEvent, setIsDragging: (value: boolean) => void) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent, setIsDragging: (value: boolean) => void) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (
    e: React.DragEvent,
    setIsDragging: (value: boolean) => void,
    setFile: (file: File | null) => void,
    fileType: 'video' | 'image'
  ) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (fileType === 'video' && !file.type.startsWith('video/')) {
      alert('Por favor, sube un archivo de video válido');
      return;
    }

    if (fileType === 'image' && !file.type.startsWith('image/')) {
      alert('Por favor, sube un archivo de imagen válido');
      return;
    }

    setFile(file);
  };

  const FileUploadZone = ({ 
    file, 
    isDragging, 
    onDragOver, 
    onDragLeave, 
    onDrop, 
    onFileChange,
    accept,
    type,
    isUploading,
    uploadProgress,
    needsCorrection
  }: {
    file: File | null;
    isDragging: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onFileChange: (file: File | null) => void;
    accept: string;
    type: 'video' | 'image';
    isUploading?: boolean;
    uploadProgress?: UploadProgressState;
    needsCorrection?: boolean;
  }) => (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`
        relative border-2 border-dashed rounded-lg p-6 text-center
        ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
        ${isUploading ? 'bg-muted/50' : ''}
        ${!needsCorrection ? 'opacity-50 cursor-not-allowed' : ''}
        transition-colors
      `}
    >
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileChange(file);
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading || !needsCorrection}
      />
      
      {file ? (
        <div className="space-y-3 relative">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">Archivo seleccionado:</p>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onFileChange(null);
              }}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
          
          {type === 'image' && (
            <div className="w-full h-36 my-2 mx-auto overflow-hidden max-w-xs relative">
              <ThumbnailPreview
                src={URL.createObjectURL(file)}
                alt="Vista previa"
                aspectRatio="video"
                enableZoom={true}
                showPlaceholder={true}
                title={file.name}
                showHoverActions={true}
                showPlayButton={false}
                className="h-full w-full object-cover rounded-md"
              />
            </div>
          )}
          
          <p className="text-sm text-muted-foreground truncate max-w-full">
            {file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB
          </p>
          
          {isUploading && uploadProgress && (
            <VideoUploadProgress 
              progressState={{
                ...uploadProgress,
                isUploading: true
              }}
              className="mt-2"
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {needsCorrection ? 
              `Arrastra y suelta tu ${type === 'video' ? 'video' : 'miniatura'} corregido aquí` :
              `No se requiere corrección para este ${type === 'video' ? 'video' : 'miniatura'}`
            }
          </p>
          {needsCorrection && (
            <>
              <p className="text-sm text-muted-foreground">
                O haz clic para seleccionar un archivo
              </p>
              <div className="w-12 h-12 mx-auto opacity-20">
                {type === 'video' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {needsVideoCorrection && (
        <div className="space-y-2">
          <Label className="mb-2 block">Video Corregido</Label>
          <FileUploadZone
            file={videoFile}
            isDragging={isDraggingVideo}
            onDragOver={(e) => handleDragOver(e, setIsDraggingVideo)}
            onDragLeave={(e) => handleDragLeave(e, setIsDraggingVideo)}
            onDrop={(e) => handleDrop(e, setIsDraggingVideo, onVideoFileChange, 'video')}
            onFileChange={onVideoFileChange}
            accept="video/*"
            type="video"
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            needsCorrection={needsVideoCorrection}
          />
          <Alert variant="default" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Formatos soportados: MP4, MOV, AVI. Tamaño máximo: 1GB
            </AlertDescription>
          </Alert>
        </div>
      )}

      {needsThumbnailCorrection && (
        <div className="space-y-2">
          <Label className="mb-2 block">Miniatura Corregida</Label>
          <FileUploadZone
            file={thumbnailFile}
            isDragging={isDraggingThumbnail}
            onDragOver={(e) => handleDragOver(e, setIsDraggingThumbnail)}
            onDragLeave={(e) => handleDragLeave(e, setIsDraggingThumbnail)}
            onDrop={(e) => handleDrop(e, setIsDraggingThumbnail, onThumbnailFileChange, 'image')}
            onFileChange={onThumbnailFileChange}
            accept="image/*"
            type="image"
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            needsCorrection={needsThumbnailCorrection}
          />
          <Alert variant="default" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Formatos soportados: JPG, PNG. Resolución recomendada: 1280x720
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {!needsVideoCorrection && !needsThumbnailCorrection && (
        <div className="py-8 text-center">
          <p className="text-gray-500 text-sm">No se han solicitado correcciones para este video.</p>
        </div>
      )}
    </div>
  );
}
