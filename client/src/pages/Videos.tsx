import { VideoCard } from "@/components/VideoCard";
import { useVideos } from "@/hooks/use-videos";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Loader2 } from "lucide-react";
import { NewVideoDialog } from "@/components/video/NewVideoDialog";
import { useUser } from "@/hooks/use-user";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VideoStatus } from "@db/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VideoOptimizer } from "@/components/video/VideoOptimizer";
import { useState } from "react";
import { VideoFilters } from "@/components/video/VideoFilters";
import type { DateRange } from "react-day-picker";

// Estados visibles por rol
const VISIBLE_STATES = {
  optimizer: ['pending', 'in_progress', 'optimize_review', 'title_corrections', 'en_revision'],
  youtuber: ['video_disponible', 'asignado', 'youtube_ready', 'completed'],
  reviewer: ['optimize_review', 'title_corrections', 'upload_review', 'completed', 'en_revision'],
  admin: ['pending', 'in_progress', 'optimize_review', 'title_corrections', 'upload_review', 'media_corrections', 'review', 'youtube_ready', 'completed', 'en_revision']
} as const;

// Función para obtener el estado real del video considerando la metadata y el rol
const getEffectiveStatus = (video: any, userRole?: string, currentUser?: any) => {
  // Si el video tiene un estado personalizado en metadata, tiene prioridad
  if (video.metadata?.customStatus) {
    return video.metadata.customStatus;
  }

  // Estados específicos por rol
  switch (userRole) {
    case 'youtuber':
      // Cuando está en upload_review, el youtuber lo ve como disponible
      if (video.status === 'upload_review') {
        // Si está asignado a este youtuber específicamente
        if (video.currentReviewerId === currentUser?.id) {
          return 'asignado';
        }
        // Por defecto, mostrar como disponible sin importar la metadata
        return 'video_disponible';
      }
      break;

    case 'reviewer':
      // Para revisores, mostrar upload_review como disponible
      if (video.status === 'upload_review') {
        return 'video_disponible';
      }
      break;

    case 'optimizer':
      // Si es pending, mostrar como disponible sin importar la metadata
      if (video.status === 'pending') {
        return 'disponible';
      }
      break;
  }

  // Si no hay reglas específicas, usar el estado del video
  return video.status;
};

const getEffectiveAssignment = (video: any, userRole?: string, currentUser?: any) => {
  // Si es revisor y el video está en upload_review, mostrar como disponible
  if (userRole === 'reviewer' && video.status === 'upload_review') {
    return {
      name: 'Disponible',
      id: null
    };
  }

  // Si es youtuber y el video está en upload_review, verificar la metadata
  if (userRole === 'youtuber' && video.status === 'upload_review') {
    // Si el video está asignado al youtuber actual, mostrar su nombre
    if (video.currentReviewerId === currentUser?.id) {
      return {
        name: currentUser?.username || 'Tú',
        id: video.currentReviewerId
      };
    }
    // Si el video está asignado a otro youtuber, mostrar como no disponible
    if (video.currentReviewerId) {
      return {
        name: 'No disponible',
        id: video.currentReviewerId
      };
    }
    // Si no está asignado, mostrar como disponible
    return {
      name: 'Disponible',
      id: null
    };
  }

  // Para optimizadores: si el título está aprobado, mostrar quién lo optimizó
  if (userRole === 'optimizer' &&
      video.metadata?.secondaryStatus?.type === 'title_approved' &&
      video.metadata?.optimization?.reviewedBy?.approved &&
      video.metadata?.optimization?.optimizedBy) {
    return {
      name: video.metadata.optimization.optimizedBy.username,
      id: video.metadata.optimization.optimizedBy.userId
    };
  }

  // Para otros roles, mostrar la asignación normal
  return {
    name: video.reviewerName || video.reviewerUsername,
    id: video.currentReviewerId
  };
};

const Videos = () => {
  const { videos, isLoading, deleteVideo, updateVideo } = useVideos();
  const { user, isLoading: isUserLoading } = useUser();
  const [updatingVideoId, setUpdatingVideoId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);

  // Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("all");
  const [assignedTo, setAssignedTo] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const canViewVideo = (video: any) => {
    const userRole = user?.role as keyof typeof VISIBLE_STATES || 'viewer';
    const effectiveStatus = getEffectiveStatus(video, userRole, user);

    // Admin puede ver todo
    if (userRole === 'admin') return true;
    
    // Revisor puede ver videos en optimize_review
    if (userRole === 'reviewer' && 
        (video.status === 'optimize_review' || 
         video.status === 'title_corrections' || 
         effectiveStatus === 'optimize_review')) {
      return true;
    }

    // Optimizador puede ver:
    if (userRole === 'optimizer') {
      const isAssignedToUser = video.currentReviewerId === user?.id ||
        video.metadata?.optimization?.assignedTo?.userId === user?.id;

      // Videos pendientes o en progreso siempre son visibles para optimizadores
      if (video.status === 'pending' || effectiveStatus === 'pending') {
        return true;
      }

      // Si el título está aprobado, mostrar el video
      if (video.metadata?.optimization?.reviewedBy?.approved) {
        return true;
      }

      // Videos en estado personalizado "en_revision"
      if (effectiveStatus === 'en_revision' && isAssignedToUser) {
        return true;
      }
      // Videos en estado optimize_review que le pertenecen
      if (effectiveStatus === 'optimize_review' && isAssignedToUser) {
        return true;
      }
    }

    // Para otros roles, verificar si el estado es visible según la configuración
    return VISIBLE_STATES[userRole]?.includes(effectiveStatus);
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleDelete = async (videoId: number) => {
    try {
      await deleteVideo(videoId);
      toast.success("Video eliminado correctamente");
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error("Error al eliminar el video");
    }
  };

  const handleVideoClick = async (video: any) => {
    const userRole = user?.role || 'viewer';

    // Si es optimizador o admin y el video está pendiente, asignarlo
    if ((userRole === 'optimizer' || userRole === 'admin') && video.status === 'pending') {
      setUpdatingVideoId(video.id);
      try {
        await updateVideo({
          videoId: video.id,
          data: {
            status: 'in_progress',
            currentReviewerId: user?.id,
            metadata: {
              ...video.metadata,
              optimization: {
                ...video.metadata?.optimization,
                assignedTo: {
                  userId: user?.id,
                  username: user?.username || '',
                  assignedAt: new Date().toISOString()
                }
              }
            }
          },
          currentRole: userRole
        });
        setSelectedVideoId(video.id);
        setDialogOpen(true);
      } catch (error) {
        console.error('Error al actualizar el video:', error);
        toast.error("Error al actualizar el estado del video");
      } finally {
        setUpdatingVideoId(null);
      }
    }
    // Si es youtuber y el video está en upload_review (que ve como disponible), asignarlo
    else if (userRole === 'youtuber' && video.status === 'upload_review') {
      setUpdatingVideoId(video.id);
      try {
        await updateVideo({
          videoId: video.id,
          data: {
            currentReviewerId: user?.id,
            metadata: {
              ...video.metadata,
              roleView: {
                ...video.metadata?.roleView,
                youtuber: {
                  status: 'video_disponible',
                  hideAssignment: false
                }
              }
            }
          },
          currentRole: userRole
        });
        setSelectedVideoId(video.id);
        setDialogOpen(true);
      } catch (error) {
        console.error('Error al asignar el video:', error);
        toast.error("Error al asignar el video");
      } finally {
        setUpdatingVideoId(null);
      }
    }
    else {
      // Para otros roles o estados, simplemente abrir el diálogo
      setSelectedVideoId(video.id);
      setDialogOpen(true);
    }
  };

  const filteredVideos = videos?.filter((video: any) => {
    // Primero filtrar por visibilidad según rol
    if (!canViewVideo(video)) return false;

    // Filtro por búsqueda (incluye seriesNumber)
    const matchesSearch =
      searchTerm === "" ||
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (video.seriesNumber && video.seriesNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtro por estado
    const matchesStatus =
      status === "all" || getEffectiveStatus(video, user?.role, user) === status;

    // Filtro por asignación
    const matchesAssignee =
      assignedTo === "all" ||
      (assignedTo === "unassigned" && !video.currentReviewerId) ||
      String(video.currentReviewerId) === assignedTo;

    // Filtro por proyecto
    const matchesProject =
      projectId === "all" || String(video.projectId) === projectId;

    // Filtro por fecha
    const matchesDate = !dateRange?.from || (
      video.updatedAt &&
      new Date(video.updatedAt) >= dateRange.from &&
      (!dateRange.to || new Date(video.updatedAt) <= dateRange.to)
    );

    return matchesSearch && matchesStatus && matchesAssignee && matchesProject && matchesDate;
  });

  const selectedVideo = videos?.find(v => v.id === selectedVideoId);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-[1200px] px-4 py-8">
      <div className="flex flex-col gap-2 mb-12">
        <h1 className="text-4xl font-bold">Videos</h1>
        <p className="text-muted-foreground text-lg">
          Gestiona y optimiza tus videos para YouTube
        </p>
        {user?.role !== 'optimizer' && (
          <div className="flex justify-end mt-4">
            <NewVideoDialog />
          </div>
        )}
      </div>

      <div className="mb-8">
        <VideoFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          status={status}
          onStatusChange={setStatus}
          date={dateRange}
          onDateChange={setDateRange}
          assignedTo={assignedTo}
          onAssignedToChange={setAssignedTo}
          projectId={projectId}
          onProjectChange={setProjectId}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          visibleStates={VISIBLE_STATES[user?.role as keyof typeof VISIBLE_STATES] || []}
        />
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[100px]">Miniatura</TableHead>
                <TableHead className="w-[100px]">Serie</TableHead>
                <TableHead className="min-w-[300px]">Título</TableHead>
                <TableHead className="w-[150px]">Estado</TableHead>
                <TableHead className="w-[150px]">Asignado a</TableHead>
                <TableHead className="w-[150px]">Actualización</TableHead>
                <TableHead className="w-[100px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVideos?.map((video: any) => (
                <TableRow key={video.id}>
                  <TableCell>
                    <div className="w-16 h-12 bg-muted rounded overflow-hidden">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
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
                    {getEffectiveAssignment(video, user?.role, user)?.name === 'No disponible' ? 
                      '(No disponible)' : 
                      (video.seriesNumber || '-')}
                  </TableCell>
                  <TableCell className="font-medium max-w-[300px] truncate">
                    {getEffectiveAssignment(video, user?.role, user)?.name === 'No disponible' ? 
                      '(No disponible)' : 
                      (video.optimizedTitle || video.title)}
                  </TableCell>
                  <TableCell>
                    {getEffectiveAssignment(video, user?.role, user)?.name === 'No disponible' ? 
                      <Badge variant="secondary" className="bg-gray-500/20 text-gray-600">No disponible</Badge> :
                      <Badge variant="secondary" className={`${getStatusBadge(getEffectiveStatus(video, user?.role, user) as VideoStatus)}`}>
                        {getStatusLabel(getEffectiveStatus(video, user?.role, user) as VideoStatus, user?.role)}
                      </Badge>
                    }
                  </TableCell>
                  <TableCell>
                    {getEffectiveAssignment(video, user?.role, user)?.name || 'Sin asignar'}
                  </TableCell>
                  <TableCell>
                    {getEffectiveAssignment(video, user?.role, user)?.name === 'No disponible' ? 
                      '-' :
                      new Date(video.updatedAt || video.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={updatingVideoId === video.id}
                        onClick={() => handleVideoClick(video)}
                      >
                        {updatingVideoId === video.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      {user?.role === 'admin' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente el video
                                <span className="font-medium"> {video.title}</span>.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(video.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredVideos || filteredVideos.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No hay videos disponibles
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedVideo && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Detalles del Video</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              {(selectedVideo.status === 'in_progress' || selectedVideo.status === 'title_corrections' || selectedVideo.metadata?.customStatus === 'en_revision') && user?.role === 'optimizer' ? (
                <VideoOptimizer
                  video={selectedVideo}
                  onUpdate={(videoId, data) => updateVideo({ videoId, data, currentRole: user?.role || 'viewer' })}
                  allowedTransitions={ALLOWED_TRANSITIONS[user?.role as keyof typeof ALLOWED_TRANSITIONS]?.[selectedVideo.status as keyof (typeof ALLOWED_TRANSITIONS)[keyof typeof ALLOWED_TRANSITIONS]] || []}
                />
              ) : (
                <VideoCard
                  video={selectedVideo}
                  userRole={user?.role || 'viewer'}
                  onUpdate={(videoId, data) => updateVideo({ videoId, data, currentRole: user?.role || 'viewer' })}
                  allowedTransitions={ALLOWED_TRANSITIONS[user?.role as keyof typeof ALLOWED_TRANSITIONS]?.[selectedVideo.status as keyof (typeof ALLOWED_TRANSITIONS)[keyof typeof ALLOWED_TRANSITIONS]] || []}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const getStatusBadge = (status: VideoStatus) => {
  // Si es un estado personalizado, definir su estilo
  if (status === 'video_disponible') {
    return "bg-blue-500/20 text-blue-600";
  }
  if (status === 'asignado') {
    return "bg-green-500/20 text-green-600";
  }
  if (status === 'en_revision') {
    return "bg-purple-500/20 text-purple-600";
  }

  const styles = {
    pending: "bg-yellow-500/20 text-yellow-600",
    in_progress: "bg-blue-500/20 text-blue-600",
    title_corrections: "bg-red-500/20 text-red-600",
    optimize_review: "bg-pink-500/20 text-pink-600",
    upload_review: "bg-purple-500/20 text-purple-600",
    youtube_ready: "bg-green-500/20 text-green-600",
    review: "bg-indigo-500/20 text-indigo-600",
    media_corrections: "bg-red-500/20 text-red-600",
    completed: "bg-emerald-500/20 text-emerald-600"
  };
  return styles[status as keyof typeof styles] || "bg-gray-500/20 text-gray-600";
};

const getStatusLabel = (status: VideoStatus, userRole?: string) => {

  // Si es optimizador y el estado es pendiente, mostrar como disponible
  if (userRole === 'optimizer' && status === 'pending') {
    return "Disponible";
  }

  // Si es un estado personalizado, mostrar su etiqueta correspondiente
  if (status === 'video_disponible') {
    return "Video Disponible";
  }
  if (status === 'asignado') {
    return "Asignado";
  }
  if (status === 'en_revision') {
    return "En Revisión";
  }

  const labels = {
    pending: "Pendiente",
    in_progress: "En Proceso",
    title_corrections: "Correcciones de Título",
    optimize_review: "Rev. Optimización",
    upload_review: "Rev. Archivos",
    youtube_ready: "Listo YouTube",
    review: "Rev. Final",
    media_corrections: "Correcciones de Archivos",
    completed: "Completado"
  };
  return labels[status as keyof typeof labels] || status;
};

const ALLOWED_TRANSITIONS = {
  optimizer: {
    pending: ['in_progress'],
    in_progress: ['optimize_review'],
    title_corrections: ['optimize_review'],
    en_revision: ['optimize_review']
  },
  youtuber: {
    youtube_ready: ['completed']
  },
  reviewer: {
    optimize_review: ['title_corrections', 'upload_review'],
    upload_review: ['optimize_review'],
    review: [],
    media_corrections: ["upload_review"],
    title_corrections: [],
    pending: [],
    in_progress: [],
    completed: [],
    en_revision: ['optimize_review', 'title_corrections', 'media_corrections']
  },
  admin: {
    pending: ['in_progress', 'optimize_review', 'title_corrections', 'upload_review', 'media_corrections', 'review', 'youtube_ready', 'completed', 'en_revision'],
    in_progress: ['optimize_review', 'title_corrections', 'upload_review', 'media_corrections', 'review', 'youtube_ready', 'completed', 'en_revision'],
    optimize_review: ['title_corrections', 'upload_review', 'media_corrections', 'review', 'youtube_ready', 'completed', 'en_revision'],
    title_corrections: ['optimize_review', 'upload_review', 'media_corrections', 'review', 'youtube_ready', 'completed', 'en_revision'],
    upload_review: ['media_corrections', 'review', 'youtube_ready', 'completed', 'en_revision'],
    media_corrections: ['upload_review', 'review', 'youtube_ready', 'completed', 'en_revision'],
    review: ['youtube_ready', 'title_corrections', 'media_corrections', 'completed', 'en_revision'],
    youtube_ready: ['completed'],
    completed: [],
    en_revision: ['optimize_review', 'title_corrections', 'media_corrections', 'review', 'youtube_ready', 'completed']
  }
} as const;

export default Videos;