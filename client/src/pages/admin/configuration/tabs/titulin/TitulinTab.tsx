import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Trash2, Video, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { YoutubeChannel } from "@db/schema";

export default function TitulinTab () {
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannelUrl, setNewChannelUrl] = useState("");
  const [syncingChannelId, setSyncingChannelId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: channels = [], isLoading } = useQuery<YoutubeChannel[]>({
    queryKey: ["titulin-channels"],
    queryFn: async () => {
      try {
        const response = await axios.get("/api/titulin/channels");
        return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error('Error fetching channels:', error);
        toast.error("Error al cargar los canales");
        return [];
      }
    },
  });

  function formatLastUpdate (dateString?: string) {
    if (!dateString) return "Nunca";
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return "Nunca";
      return `Hace ${formatDistanceToNow(date, { locale: es })}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Nunca";
    }
  };

  const addChannelMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await axios.post("/api/titulin/channels", { url });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["titulin-channels"] });
      toast.success("Canal añadido correctamente");
      setNewChannelUrl("");
    },
    onError: (error) => {
      console.error("Error adding channel:", error);
      toast.error("No se pudo añadir el canal");
    },
    onSettled: () => {
      setIsAddingChannel(false);
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: async (id: number) => {
      // await axios.delete(`/api/titulin/channels/${id}`);
      await fetch(`/api/titulin/channels/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["titulin-channels"] });
      toast.success("Canal eliminado correctamente");
    },
    onError: (error) => {
      console.error("Error deleting channel:", error);
      toast.error("No se pudo eliminar el canal");
    },
  });

  const syncChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const response = await axios.post(`/api/titulin/channels/${channelId}/sync`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["titulin-channels"] });
      toast.success("Canal sincronizado correctamente");
    },
    onError: (error) => {
      console.error("Error syncing channel:", error);
      toast.error("No se pudo sincronizar el canal");
    },
    onSettled: () => {
      setSyncingChannelId(null);
    },
  });

  const handleAddChannel = async () => {
    if (!newChannelUrl.trim()) return;
    setIsAddingChannel(true);
    addChannelMutation.mutate(newChannelUrl);
  };

  const handleDeleteChannel = async (id: number) => {
    deleteChannelMutation.mutate(id);
  };

  const handleSyncChannel = async (id: number, channelId: string) => {
    setSyncingChannelId(id);
    syncChannelMutation.mutate(channelId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">Canales para Titulin</h2>
        <p className="text-sm text-muted-foreground">
          Gestiona los canales de YouTube que se utilizarán como referencia para generar títulos
        </p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="URL del canal de YouTube"
            value={newChannelUrl}
            onChange={(e) => setNewChannelUrl(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleAddChannel}
            disabled={isAddingChannel || !newChannelUrl}
          >
            {isAddingChannel ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Añadir Canal
          </Button>
        </div>
      </Card>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Thumbnail</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Videos Analizados</TableHead>
              <TableHead>Última Actualización</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[150px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.length > 0 ? (
              channels.map((channel) => (
                <TableRow key={channel.id}>
                  <TableCell>
                    <div className="w-16 h-12 bg-muted rounded overflow-hidden">
                      {channel.thumbnailUrl ? (
                        <img
                          src={channel.thumbnailUrl}
                          alt={channel.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No img
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      {channel.name}
                    </div>
                  </TableCell>
                  <TableCell>{channel.videoCount || 0}</TableCell>
                  <TableCell>
                    {formatLastUpdate(channel.lastVideoFetch as unknown as string | undefined )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={channel.active ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {channel.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSyncChannel(channel.id, channel.channelId)}
                        disabled={syncingChannelId === channel.id}
                      >
                        {syncingChannelId === channel.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar canal?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará el canal y
                              todo su historial de análisis.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteChannel(channel.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="text-muted-foreground">
                    No hay canales configurados
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};