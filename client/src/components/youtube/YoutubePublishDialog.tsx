import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Youtube, Check } from 'lucide-react';
import { useYoutubeChannels } from '@/hooks/useYoutubeChannels';
import { Video } from '@db/schema';
import { YoutubeChannelSelector } from './YoutubeChannelSelector';

interface YoutubePublishDialogProps {
  video: Video;
  open: boolean;
  onClose: () => void;
  onPublished: (youtubeUrl: string) => void;
}

export function YoutubePublishDialog({ video, open, onClose, onPublished }: YoutubePublishDialogProps) {
  const [selectedChannel, setSelectedChannel] = useState<{ channelId: string; name: string } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadData, setUploadData] = useState({
    title: video.optimizedTitle || video.title || '',
    description: video.optimizedDescription || video.description || '',
    tags: video.tags ? video.tags.split(',').map(tag => tag.trim()) : [],
    privacyStatus: 'unlisted' as 'public' | 'unlisted' | 'private'
  });

  const { publishVideoToYoutube, isPublishingVideo } = useYoutubeChannels();

  // Resetea el estado al abrir/cerrar el diálogo
  useEffect(() => {
    if (open) {
      setUploadStatus('idle');
      setUploadData({
        title: video.optimizedTitle || video.title || '',
        description: video.optimizedDescription || video.description || '',
        tags: video.tags ? video.tags.split(',').map(tag => tag.trim()) : [],
        privacyStatus: 'unlisted'
      });
    }
  }, [open, video]);

  // Maneja el evento de publicación en YouTube
  const handleYouTubeUpload = async () => {
    if (!selectedChannel) {
      alert('Selecciona un canal de YouTube para publicar');
      return;
    }

    setUploadStatus('uploading');
    
    try {
      await publishVideoToYoutube({
        videoId: video.id,
        channelId: selectedChannel.channelId,
        videoData: uploadData
      });
      
      setUploadStatus('success');
      
      // Si hay un callback de éxito, llamarlo con una URL provisional (será actualizada por el backend)
      if (onPublished) {
        onPublished(`https://www.youtube.com/watch?v=VIDEO_ID_HERE`);
      }
      
      // Cerrar el diálogo después de un breve retraso
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Error al publicar en YouTube:', error);
      setUploadStatus('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg font-semibold">
            <Youtube className="mr-2 h-5 w-5 text-red-600" /> 
            Publicar en YouTube
          </DialogTitle>
          <DialogDescription>
            Configura los detalles para publicar este video en YouTube
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 my-6">
          {/* Selector de canal de YouTube */}
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-md">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-3">Selecciona el canal de YouTube</h3>
            <YoutubeChannelSelector 
              projectId={video.projectId} 
              onChannelSelect={(channel) => setSelectedChannel(channel)}
            />
          </div>
          
          {/* Configuración del video */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-title">Título</Label>
              <Input 
                id="youtube-title"
                value={uploadData.title} 
                onChange={(e) => setUploadData({
                  ...uploadData,
                  title: e.target.value
                })}
                className="w-full"
                disabled={uploadStatus === 'uploading'}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="youtube-description">Descripción</Label>
              <Textarea 
                id="youtube-description"
                value={uploadData.description} 
                onChange={(e) => setUploadData({
                  ...uploadData,
                  description: e.target.value
                })}
                className="min-h-[150px]"
                disabled={uploadStatus === 'uploading'}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="youtube-privacy">Visibilidad</Label>
              <Select 
                value={uploadData.privacyStatus}
                onValueChange={(value: 'public' | 'unlisted' | 'private') => setUploadData({
                  ...uploadData,
                  privacyStatus: value
                })}
                disabled={uploadStatus === 'uploading'}
              >
                <SelectTrigger id="youtube-privacy">
                  <SelectValue placeholder="Seleccionar visibilidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Privado</SelectItem>
                  <SelectItem value="unlisted">No listado</SelectItem>
                  <SelectItem value="public">Público</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={uploadStatus === 'uploading' || isPublishingVideo}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleYouTubeUpload}
            disabled={uploadStatus === 'uploading' || isPublishingVideo || !selectedChannel}
            className={`
              ${uploadStatus === 'uploading' || isPublishingVideo ? 'opacity-80 cursor-not-allowed' : ''}
              ${uploadStatus === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}
              ${uploadStatus === 'error' ? 'bg-red-600 hover:bg-red-700' : ''}
            `}
          >
            {uploadStatus === 'idle' && !isPublishingVideo && (
              <>
                <Youtube className="mr-2 h-4 w-4" />
                Publicar en YouTube
              </>
            )}
            {(uploadStatus === 'uploading' || isPublishingVideo) && (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publicando...
              </>
            )}
            {uploadStatus === 'success' && (
              <>
                <Check className="mr-2 h-4 w-4" />
                Publicado con éxito
              </>
            )}
            {uploadStatus === 'error' && "Error al publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}