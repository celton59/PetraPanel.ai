import { useState, useEffect } from 'react';
import { useYoutubeChannels } from '@/hooks/useYoutubeChannels';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Youtube, Link, Plus, Unlink, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface YoutubeChannelSelectorProps {
  projectId: number;
  onChannelSelect?: (channel: { channelId: string; name: string }) => void;
}

export function YoutubeChannelSelector({ projectId, onChannelSelect }: YoutubeChannelSelectorProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  
  // Formulario para crear canal
  const [formData, setFormData] = useState({
    channelId: '',
    name: '',
    url: '',
    description: ''
  });
  
  // Hooks para YouTube
  const {
    channels,
    isLoadingChannels,
    getProjectChannels,
    getDefaultProjectChannel,
    createChannel,
    isCreatingChannel,
    linkChannelToProject,
    isLinkingChannel,
    unlinkChannelFromProject,
    isUnlinkingChannel,
    getAuthUrl,
    isGettingAuthUrl,
    checkChannelAuthorization
  } = useYoutubeChannels();
  
  // Obtener canales del proyecto
  const { 
    data: projectChannels,
    isLoading: isLoadingProjectChannels,
    refetch: refetchProjectChannels
  } = getProjectChannels(projectId);
  
  // Obtener canal predeterminado
  const {
    data: defaultChannel,
    isLoading: isLoadingDefaultChannel,
    refetch: refetchDefaultChannel
  } = getDefaultProjectChannel(projectId);
  
  // Estado de autorización para el canal seleccionado
  const {
    data: authStatus,
    refetch: refetchAuthStatus
  } = checkChannelAuthorization(selectedChannelId || (defaultChannel?.channelId || ''));
  
  // Efecto para establecer el canal predeterminado como seleccionado al cargar
  useEffect(() => {
    if (defaultChannel && !selectedChannelId) {
      setSelectedChannelId(defaultChannel.channelId);
      
      if (onChannelSelect) {
        onChannelSelect({
          channelId: defaultChannel.channelId,
          name: defaultChannel.name
        });
      }
    }
  }, [defaultChannel, selectedChannelId, onChannelSelect]);
  
  // Cambiar canal seleccionado
  const handleChannelChange = (channelId: string) => {
    setSelectedChannelId(channelId);
    
    // Si se proporciona un callback, notificar del cambio
    if (onChannelSelect) {
      const channel = projectChannels?.find(c => c.channelId === channelId);
      if (channel) {
        onChannelSelect({
          channelId: channel.channelId,
          name: channel.name
        });
      }
    }
  };
  
  // Crear nuevo canal
  const handleCreateChannel = async () => {
    if (!formData.channelId || !formData.name || !formData.url) {
      toast.error('Datos incompletos', {
        description: 'El ID del canal, nombre y URL son obligatorios'
      });
      return;
    }
    
    try {
      await createChannel(formData);
      setCreateDialogOpen(false);
      // Limpiar formulario
      setFormData({
        channelId: '',
        name: '',
        url: '',
        description: ''
      });
    } catch (error) {
      console.error('Error al crear canal:', error);
    }
  };
  
  // Vincular canal al proyecto
  const handleLinkChannel = async (channelId: string, makeDefault: boolean = false) => {
    try {
      await linkChannelToProject({
        projectId,
        channelId,
        isDefault: makeDefault
      });
      setLinkDialogOpen(false);
      
      // Recargar lista de canales del proyecto
      refetchProjectChannels();
      refetchDefaultChannel();
      
      // Si se está vinculando el canal seleccionado actualmente, también se debe refrescar su estado de autorización
      if (channelId === selectedChannelId) {
        refetchAuthStatus();
      }
    } catch (error) {
      console.error('Error al vincular canal:', error);
    }
  };
  
  // Desvincular canal del proyecto
  const handleUnlinkChannel = async (channelId: string) => {
    if (!confirm('¿Estás seguro de que deseas desvincular este canal del proyecto?')) {
      return;
    }
    
    try {
      await unlinkChannelFromProject({
        projectId,
        channelId
      });
      
      // Recargar lista de canales del proyecto
      refetchProjectChannels();
      refetchDefaultChannel();
      
      // Si se está desvinculando el canal seleccionado actualmente, limpiar la selección
      if (channelId === selectedChannelId) {
        setSelectedChannelId('');
      }
    } catch (error) {
      console.error('Error al desvincular canal:', error);
    }
  };
  
  // Iniciar proceso de autorización
  const handleAuthorize = () => {
    const channelId = selectedChannelId || (defaultChannel?.channelId || '');
    if (!channelId) {
      toast.error('No hay canal seleccionado', {
        description: 'Selecciona un canal para autorizar'
      });
      return;
    }
    
    getAuthUrl(channelId);
  };
  
  // Renderizado del componente
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="youtube-channel" className="text-sm font-medium flex items-center gap-1.5">
          <Youtube className="h-4 w-4 text-red-600" />
          Canal de YouTube
          {authStatus?.isAuthorized && (
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
              Autorizado
            </Badge>
          )}
        </Label>
        
        <div className="flex gap-2">
          <Select 
            value={selectedChannelId} 
            onValueChange={handleChannelChange}
            disabled={isLoadingProjectChannels || isLoadingDefaultChannel}
          >
            <SelectTrigger id="youtube-channel" className="flex-1">
              <SelectValue placeholder="Seleccionar canal de YouTube" />
            </SelectTrigger>
            <SelectContent>
              {projectChannels?.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  No hay canales vinculados a este proyecto
                </div>
              ) : (
                projectChannels?.map(channel => (
                  <SelectItem key={channel.channelId} value={channel.channelId}>
                    <div className="flex items-center gap-2">
                      <span>{channel.name}</span>
                      {channel.isDefault && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Predeterminado
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLinkDialogOpen(true)}
            disabled={isLoadingChannels}
            title="Vincular canal existente"
          >
            <Link className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCreateDialogOpen(true)}
            title="Crear nuevo canal"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Acciones adicionales cuando un canal está seleccionado */}
      {selectedChannelId && (
        <div className="flex flex-wrap gap-2 mt-2">
          {!authStatus?.isAuthorized ? (
            <Button 
              variant="default" 
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white" 
              onClick={handleAuthorize}
              disabled={isGettingAuthUrl}
            >
              {isGettingAuthUrl ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Youtube className="h-4 w-4 mr-2" />
              )}
              Autorizar canal
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-200 hover:border-green-300 hover:bg-green-50"
              onClick={handleAuthorize}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Reautorizar
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:border-red-300 hover:bg-red-50"
            onClick={() => handleUnlinkChannel(selectedChannelId)}
            disabled={isUnlinkingChannel}
          >
            {isUnlinkingChannel ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Unlink className="h-4 w-4 mr-2" />
            )}
            Desvincular canal
          </Button>
          
          {selectedChannelId && !projectChannels?.find(c => c.channelId === selectedChannelId)?.isDefault && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLinkChannel(selectedChannelId, true)}
              disabled={isLinkingChannel}
            >
              {isLinkingChannel ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Establecer como predeterminado
            </Button>
          )}
        </div>
      )}
      
      {/* Modal para crear un nuevo canal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear nuevo canal de YouTube</DialogTitle>
            <DialogDescription>
              Introduce los datos del canal de YouTube que deseas crear
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="channel-id">ID del canal</Label>
              <Input
                id="channel-id"
                value={formData.channelId}
                onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                placeholder="Ej: UCxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground">
                El ID del canal se encuentra en la URL de tu canal de YouTube
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="channel-name">Nombre del canal</Label>
              <Input
                id="channel-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre visible del canal"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="channel-url">URL del canal</Label>
              <Input
                id="channel-url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://youtube.com/c/..."
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="channel-description">Descripción (opcional)</Label>
              <Textarea
                id="channel-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del canal"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateChannel}
              disabled={isCreatingChannel || !formData.channelId || !formData.name || !formData.url}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isCreatingChannel ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Youtube className="h-4 w-4 mr-2" />
              )}
              Crear canal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal para vincular canal existente al proyecto */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Vincular canal a proyecto</DialogTitle>
            <DialogDescription>
              Selecciona un canal de YouTube para vincularlo a este proyecto
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="link-channel">Canal de YouTube</Label>
              <Select 
                value={selectedChannelId}
                onValueChange={setSelectedChannelId}
              >
                <SelectTrigger id="link-channel">
                  <SelectValue placeholder="Seleccionar canal" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingChannels ? (
                    <div className="p-2 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando canales...
                    </div>
                  ) : channels?.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No hay canales disponibles
                    </div>
                  ) : (
                    channels?.map(channel => {
                      // Verificar si el canal ya está vinculado
                      const isLinked = projectChannels?.some(pc => pc.channelId === channel.channelId);
                      
                      return (
                        <SelectItem 
                          key={channel.channelId} 
                          value={channel.channelId}
                          disabled={isLinked}
                        >
                          <div className="flex items-center gap-2">
                            <span>{channel.name}</span>
                            {isLinked && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Ya vinculado
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="make-default"
                className="h-4 w-4 rounded border-gray-300 focus:ring-indigo-600"
                defaultChecked={true}
              />
              <Label htmlFor="make-default" className="text-sm">
                Establecer como canal predeterminado para este proyecto
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                const makeDefault = (document.getElementById('make-default') as HTMLInputElement)?.checked;
                handleLinkChannel(selectedChannelId, makeDefault);
              }}
              disabled={isLinkingChannel || !selectedChannelId}
            >
              {isLinkingChannel ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link className="h-4 w-4 mr-2" />
              )}
              Vincular canal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}