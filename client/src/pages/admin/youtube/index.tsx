import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CardContent } from '@/components/ui/card';
import { CardDescription } from '@/components/ui/card';
import { CardFooter } from '@/components/ui/card';
import { CardHeader } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { TabsContent } from '@/components/ui/tabs';
import { TabsList } from '@/components/ui/tabs';
import { TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Check, 
  Loader2, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Youtube
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useYoutubeChannels } from '@/hooks/useYoutubeChannels';
import { useProjects } from '@/hooks/useProjects';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { YoutubeChannel } from '@/hooks/useYoutubeChannels';

type ProjectChannel = {
  id: number;
  project_id: number;
  channel_id: string;
  is_default: boolean;
  created_at: string;
  project: {
    id: number;
    name: string;
  };
  channel: YoutubeChannel;
};

export default function YoutubeAdminPage() {
  const [_, params] = useRoute('/administracion/youtube');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [newChannelData, setNewChannelData] = useState({
    name: '',
    channelId: '',
    url: '',
    description: '',
  });
  const [linkData, setLinkData] = useState({
    channelId: '',
    projectId: 0,
    isDefault: false,
  });
  const [selectedChannel, setSelectedChannel] = useState<YoutubeChannel | null>(null);

  const { 
    channels,
    isLoadingChannels,
    refetchChannels,
    createChannel,
    isCreatingChannel,
    linkChannelToProject,
    isLinkingChannel,
    unlinkChannelFromProject,
    isUnlinkingChannel,
    getAuthUrl,
    isGettingAuthUrl,
    getProjectChannels
  } = useYoutubeChannels();

  const { 
    projects,
    isLoading: isLoadingProjects,
  } = useProjects();

  const [projectChannels, setProjectChannels] = useState<ProjectChannel[]>([]);
  const [loadingProjectChannels, setLoadingProjectChannels] = useState(false);

  // Cargar los canales de proyectos al cambiar el canal seleccionado
  useEffect(() => {
    if (selectedChannel) {
      loadProjectChannels(selectedChannel.channelId);
    }
  }, [selectedChannel]);

  const loadProjectChannels = async (channelId: string) => {
    setLoadingProjectChannels(true);
    try {
      const result = await getProjectChannels(Number(channelId));
      if (result && Array.isArray(result.data)) {
        // Convertir el formato de canal de YouTube a formato de ProjectChannel
        const formattedChannels = result.data.map((channel: any) => ({
          id: channel.linkId || channel.id,
          project_id: Number(channel.projectId || 0),
          channel_id: channel.channelId,
          is_default: channel.isDefault || false,
          created_at: channel.createdAt || new Date().toISOString(),
          project: {
            id: Number(channel.projectId || 0),
            name: channel.projectName || 'Proyecto sin nombre'
          },
          channel: channel
        })) as ProjectChannel[];
        
        setProjectChannels(formattedChannels);
      } else {
        setProjectChannels([]);
      }
    } catch (error) {
      console.error('Error al cargar los canales del proyecto:', error);
      toast.error('Error al cargar los proyectos asociados al canal');
      setProjectChannels([]);
    } finally {
      setLoadingProjectChannels(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelData.name || !newChannelData.channelId || !newChannelData.url) {
      toast.error('Por favor, completa todos los campos obligatorios');
      return;
    }

    try {
      await createChannel(newChannelData);
      setIsCreateDialogOpen(false);
      setNewChannelData({
        name: '',
        channelId: '',
        url: '',
        description: '',
      });
      refetchChannels();
      toast.success('Canal creado exitosamente');
    } catch (error) {
      console.error('Error al crear canal:', error);
      toast.error('Error al crear el canal');
    }
  };

  const handleLinkChannel = async () => {
    if (!linkData.channelId || !linkData.projectId) {
      toast.error('Por favor, selecciona un canal y un proyecto');
      return;
    }

    try {
      await linkChannelToProject({
        channelId: linkData.channelId,
        projectId: linkData.projectId,
        isDefault: linkData.isDefault,
      });
      setIsLinkDialogOpen(false);
      setLinkData({
        channelId: '',
        projectId: 0,
        isDefault: false,
      });
      if (selectedChannel) {
        loadProjectChannels(selectedChannel.channelId);
      }
      toast.success('Canal vinculado al proyecto exitosamente');
    } catch (error) {
      console.error('Error al vincular canal:', error);
      toast.error('Error al vincular el canal al proyecto');
    }
  };

  const handleUnlinkChannel = async (projectChannelId: number) => {
    if (!confirm('¿Estás seguro de que deseas desvincular este canal del proyecto?')) {
      return;
    }

    try {
      await unlinkChannelFromProject({
        projectId: 0,
        channelId: ''
      });
      if (selectedChannel) {
        loadProjectChannels(selectedChannel.channelId);
      }
      toast.success('Canal desvinculado del proyecto exitosamente');
    } catch (error) {
      console.error('Error al desvincular canal:', error);
      toast.error('Error al desvincular el canal del proyecto');
    }
  };

  const handleAuthChannel = async (channelId: string) => {
    try {
      await getAuthUrl(channelId);
      // La redirección a Google la maneja el hook
    } catch (error) {
      console.error('Error al obtener URL de autorización:', error);
      toast.error('Error al iniciar el proceso de autorización');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administración de Canales de YouTube</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los canales de YouTube y su vinculación con proyectos
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => refetchChannels()}
            disabled={isLoadingChannels}
          >
            {isLoadingChannels ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualizar
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Canal
          </Button>
          <Button onClick={() => setIsLinkDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Vincular a Proyecto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Canales de YouTube</CardTitle>
              <CardDescription>
                Selecciona un canal para ver detalles y administrarlo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingChannels ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : channels?.length === 0 ? (
                <div className="text-center p-6 border border-dashed rounded-lg">
                  <p className="text-muted-foreground">No hay canales registrados</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Registrar Canal
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-2">
                    {channels?.map(channel => (
                      <div
                        key={channel.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedChannel?.id === channel.id
                            ? 'bg-muted border-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedChannel(channel)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Youtube className="h-5 w-5 text-red-500" />
                            <div>
                              <p className="font-medium">{channel.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {channel.channelId}
                              </p>
                            </div>
                          </div>
                          {channel.isAuthorized ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs flex items-center">
                              <Check className="h-3 w-3 mr-1" /> Autorizado
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs flex items-center">
                              <AlertTriangle className="h-3 w-3 mr-1" /> No autorizado
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          {selectedChannel ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Youtube className="h-5 w-5 text-red-500 mr-2" />
                  {selectedChannel.name}
                </CardTitle>
                <CardDescription>
                  ID del canal: {selectedChannel.channelId}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="details">
                  <TabsList className="mb-4">
                    <TabsTrigger value="details">Detalles</TabsTrigger>
                    <TabsTrigger value="projects">Proyectos Vinculados</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Estado de Autorización</h3>
                        <div className="flex items-center">
                          {selectedChannel.isAuthorized ? (
                            <>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs flex items-center">
                                <Check className="h-3 w-3 mr-1" /> Autorizado
                              </Badge>
                              <p className="ml-2 text-sm text-muted-foreground">
                                Este canal está autorizado para publicar videos
                              </p>
                            </>
                          ) : (
                            <>
                              <Badge variant="destructive" className="text-xs flex items-center">
                                <AlertTriangle className="h-3 w-3 mr-1" /> No autorizado
                              </Badge>
                              <p className="ml-2 text-sm text-muted-foreground">
                                Este canal necesita autorización para publicar videos
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-sm font-medium mb-2">Información adicional</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Fecha de creación</p>
                            <p>{new Date(selectedChannel.createdAt).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Última actualización</p>
                            <p>{new Date(selectedChannel.updatedAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="projects">
                    <div className="space-y-4">
                      {loadingProjectChannels ? (
                        <div className="flex justify-center items-center h-40">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : projectChannels.length === 0 ? (
                        <div className="text-center p-6 border border-dashed rounded-lg">
                          <p className="text-muted-foreground">Este canal no está vinculado a ningún proyecto</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => {
                              setLinkData(prev => ({
                                ...prev,
                                channelId: selectedChannel.channelId,
                              }));
                              setIsLinkDialogOpen(true);
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Vincular a Proyecto
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {projectChannels.map(pc => (
                            <div key={pc.id} className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <p className="font-medium">{pc.project.name}</p>
                                <div className="flex space-x-2 items-center mt-1">
                                  {pc.is_default && (
                                    <Badge variant="outline" className="text-xs">
                                      Canal Predeterminado
                                    </Badge>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    Vinculado el {new Date(pc.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnlinkChannel(pc.id)}
                                disabled={isUnlinkingChannel}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setSelectedChannel(null)}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => handleAuthChannel(selectedChannel.channelId)}
                  disabled={isGettingAuthUrl || selectedChannel.isAuthorized}
                >
                  {isGettingAuthUrl ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Youtube className="mr-2 h-4 w-4" />
                  )}
                  {selectedChannel.isAuthorized ? 'Ya Autorizado' : 'Autorizar Canal'}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Youtube className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                <h3 className="text-lg font-medium mb-2">Selecciona un canal</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Selecciona un canal de YouTube para ver sus detalles y administrarlo,
                  o crea uno nuevo si es necesario.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Diálogo para crear un nuevo canal */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Canal de YouTube</DialogTitle>
            <DialogDescription>
              Ingresa los detalles del canal de YouTube que deseas registrar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Canal</Label>
              <Input
                id="name"
                placeholder="Canal de Marketing"
                value={newChannelData.name}
                onChange={(e) => setNewChannelData({ ...newChannelData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channelId">ID del Canal</Label>
              <Input
                id="channelId"
                placeholder="UCaBcDeFgHi12345"
                value={newChannelData.channelId}
                onChange={(e) => setNewChannelData({ ...newChannelData, channelId: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                El ID del canal se encuentra en la URL del canal: youtube.com/channel/[ID-DEL-CANAL]
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL del Canal</Label>
              <Input
                id="url"
                placeholder="https://www.youtube.com/channel/UCaBcDeFgHi12345"
                value={newChannelData.url}
                onChange={(e) => setNewChannelData({ ...newChannelData, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Input
                id="description"
                placeholder="Canal oficial de marketing de la empresa"
                value={newChannelData.description}
                onChange={(e) => setNewChannelData({ ...newChannelData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateChannel}
              disabled={isCreatingChannel}
            >
              {isCreatingChannel && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Canal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para vincular canal a proyecto */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Canal a Proyecto</DialogTitle>
            <DialogDescription>
              Selecciona el canal y el proyecto que deseas vincular.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="channelSelect">Canal de YouTube</Label>
              <Select
                value={linkData.channelId}
                onValueChange={(value) => setLinkData({ ...linkData, channelId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un canal" />
                </SelectTrigger>
                <SelectContent>
                  {channels?.map(channel => (
                    <SelectItem key={channel.id} value={channel.channelId}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectSelect">Proyecto</Label>
              <Select
                value={linkData.projectId ? String(linkData.projectId) : ""}
                onValueChange={(value) => setLinkData({ ...linkData, projectId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map(project => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="defaultChannel"
                checked={linkData.isDefault}
                onChange={(e) => setLinkData({ ...linkData, isDefault: e.target.checked })}
                className="w-4 h-4 text-primary border-primary rounded focus:ring-primary"
              />
              <Label htmlFor="defaultChannel" className="text-sm font-normal">
                Establecer como canal predeterminado para este proyecto
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLinkDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLinkChannel}
              disabled={isLinkingChannel}
            >
              {isLinkingChannel && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vincular Canal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}