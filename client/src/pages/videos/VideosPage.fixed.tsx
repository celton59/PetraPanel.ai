import { VideoDetailDialog } from "./VideoDetailDialog";
import { ApiVideo, UpdateVideoData, useVideos } from "@/hooks/useVideos";
import { Button } from "@/components/ui/button";
import { UserBadges } from "@/components/video/UserBadges";
import { ThumbnailPreview } from "@/components/ui/thumbnail-preview";
import {
  Eye,
  Trash2,
  Loader2,
  Plus,
  Filter,
  Layout,
  Grid,
  List,
  Image as ImageIcon,
  CheckSquare,
  Square,
} from "lucide-react";
import { NewVideoDialog } from "./NewVideoDialog";
import { useUser } from "@/hooks/use-user";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { VideoFilters } from "./VideoFilters";
import type { DateRange } from "react-day-picker";
import { getStatusBadgeColor, getStatusLabel } from "@/lib/status-labels";
import { cn, formatDate } from "@/lib/utils";
import { User, VideoStatus } from "@db/schema";

// Estados visibles por rol
const VISIBLE_STATES = {
  optimizer: [
    "pending",
    "in_progress",
    "optimize_review",
    "title_corrections",
    "en_revision",
  ],
  youtuber: ["video_disponible", "asignado", "youtube_ready", "completed"],
  reviewer: [
    "optimize_review",
    "title_corrections",
    "upload_review",
    "completed",
    "en_revision",
  ],
  content_reviewer: [
    "content_review",
    "optimize_review",
    "title_corrections"
  ],
  media_reviewer: [
    "media_review",
    "upload_review"
  ],
  admin: [
    "pending",
    "in_progress",
    "optimize_review",
    "title_corrections",
    "upload_review",
    "media_corrections",
    "review",
    "youtube_ready",
    "completed",
    "en_revision",
  ],
} as const;

const DETAILS_PERMISSION: Record<User["role"], VideoStatus[]> = {
  admin: [],
  optimizer: ["available", "content_corrections"],
  reviewer: ["content_review", "media_review"],
  content_reviewer: ['content_review'],
  media_reviewer: ['media_review'],
  youtuber: ["upload_media", "media_corrections"],
};

export default function VideosPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { videos, isLoading, deleteVideo, updateVideo, bulkDeleteVideos } = useVideos();
  
  // Estados para UI
  const [updatingVideoId, setUpdatingVideoId] = useState<number | undefined>(undefined);
  const [newVideoDialogOpen, setNewVideoDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ApiVideo | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"table" | "grid" | "list">("table");
  
  // Estados para selección
  const [selectedVideos, setSelectedVideos] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  
  // Estados para selección por arrastre
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState<{x: number, y: number} | null>(null);
  const [dragCurrentPosition, setDragCurrentPosition] = useState<{x: number, y: number} | null>(null);
  const dragSelectionRef = useRef<HTMLDivElement>(null);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState("all");
  const [assignedTo, setAssignedTo] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Efecto para manejar parámetros de URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("new") === "true") {
      setNewVideoDialogOpen(true);
      window.history.replaceState({}, "", "/videos");
    }
  }, []);

  // Filtrar videos según criterios
  const filteredVideos = videos.filter((video) => {
    if (searchTerm) {
      return (
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.optimizedTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (video.seriesNumber && video.seriesNumber.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
        (video.description && video.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (video.creatorName && video.creatorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (video.optimizerName && video.optimizerName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // if (status !== "all") {
    //   return video.status === status;
    // }

    // if (assignedTo !== "all") {
    //   return video.assigned_to === assignedTo;
    // }

    // if (projectId !== "all") {
    //   return video.project_id === projectId;
    // }

    // if (dateRange) {
    //   return (
    //     video.created_at >= dateRange.startDate &&
    //     video.created_at <= dateRange.endDate
    //   );
    // }

    return true;
  });

  // Mostrar loader mientras carga el usuario
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center bg-background w-full">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Verificar que hay un usuario
  if (!user) return null;

  // Mostrar loader mientras cargan los videos
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando videos...</p>
        </div>
      </div>
    );
  }

  function canSeeVideoDetails(video: ApiVideo): boolean {
    if (user?.role === "admin") return true;

    return DETAILS_PERMISSION[user!.role].includes(video.status);
  }

  async function handleVideoClick(video: ApiVideo) {
    setSelectedVideo(video);
  }

  function renderEmptyState() {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-lg border border-dashed">
        <div className="rounded-full bg-primary/10 p-3 mb-4">
          <ImageIcon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-medium">No hay videos disponibles</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">
          {user?.role === "optimizer"
            ? "Los videos aparecerán aquí cuando haya contenido para optimizar"
            : "Comienza agregando tu primer video usando el botón superior"}
        </p>
        {user?.role === "admin" && (
          <Button onClick={() => setNewVideoDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Video
          </Button>
        )}
      </div>
    );
  }

  // Toggle video selection
  const toggleSelectVideo = (videoId: number) => {
    setSelectedVideos(prev => {
      if (prev.includes(videoId)) {
        return prev.filter(id => id !== videoId);
      } else {
        return [...prev, videoId];
      }
    });
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    if (selectMode) {
      // If turning off selection mode, clear selections
      setSelectedVideos([]);
    }
    setSelectMode(!selectMode);
  };

  // Toggle select all videos
  const toggleSelectAll = () => {
    if (selectedVideos.length === filteredVideos.length) {
      setSelectedVideos([]);
    } else {
      setSelectedVideos(filteredVideos.map(video => video.id));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedVideos.length === 0) return;
    
    const projectIdToUse = videos.find(v => selectedVideos.includes(v.id))?.projectId;
    if (!projectIdToUse) return;

    try {
      await bulkDeleteVideos({
        projectId: projectIdToUse,
        videoIds: selectedVideos
      });
      setSelectedVideos([]);
      setSelectMode(false);
    } catch (error) {
      console.error("Error deleting videos in bulk:", error);
    }
  };
  
  // Funciones para selección por arrastre
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectMode) return;
    
    // Solo permitir arrastre con botón izquierdo
    if (e.button !== 0) return;
    
    // Capturar las coordenadas relativas al viewport
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    // Calcular coordenadas relativas al contenedor
    const containerRect = e.currentTarget.getBoundingClientRect();
    const offsetX = clientX - containerRect.left;
    const offsetY = clientY - containerRect.top;
    
    // Actualizar el estado para reflejar la posición inicial del arrastre
    setIsDragging(true);
    setDragStartPosition({ x: clientX, y: clientY });
    setDragCurrentPosition({ x: clientX, y: clientY });
    
    // Prevenir comportamiento de arrastre del navegador
    e.preventDefault();
  };
  
  const handleDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !selectMode) return;
    
    // Actualizar la posición actual del cursor
    setDragCurrentPosition({ x: e.clientX, y: e.clientY });
    
    // Solo intentar seleccionar si tenemos el elemento de referencia
    if (dragSelectionRef.current) {
      // Actualizar el estilo del rectángulo de selección antes de detectar intersecciones
      const style = getSelectionRectStyle();
      Object.assign(dragSelectionRef.current.style, style);
      
      // Usar requestAnimationFrame para sincronizar con la siguiente actualización de pantalla
      requestAnimationFrame(() => {
        if (!dragSelectionRef.current) return;
        
        // Obtener el rectángulo calculado después de aplicar los estilos
        const selectionRect = dragSelectionRef.current.getBoundingClientRect();
        
        // Obtener todos los elementos de video en la vista actual
        const videoElements = document.querySelectorAll('.video-card');
        
        videoElements.forEach((element) => {
          const videoRect = element.getBoundingClientRect();
          const videoId = Number(element.getAttribute('data-video-id'));
          
          // Verificar si el elemento está dentro del rectángulo de selección
          if (videoId && rectanglesIntersect(selectionRect, videoRect)) {
            // Agregar a seleccionados si no está ya
            if (!selectedVideos.includes(videoId)) {
              setSelectedVideos(prev => [...prev, videoId]);
            }
          }
        });
      });
    }
    
    e.preventDefault();
  };
  
  const handleDragEnd = () => {
    if (!isDragging || !selectMode) return;
    
    setIsDragging(false);
    setDragStartPosition(null);
    setDragCurrentPosition(null);
  };
  
  // Función para verificar si dos rectángulos se intersectan
  const rectanglesIntersect = (rect1: DOMRect, rect2: DOMRect) => {
    return !(
      rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom
    );
  };
  
  // Calcular las coordenadas del rectángulo de selección
  const getSelectionRectStyle = () => {
    if (!dragStartPosition || !dragCurrentPosition) return {};
    
    // Obtener el rectángulo del contenedor
    const containerRect = document.querySelector('.relative')?.getBoundingClientRect();
    if (!containerRect) return {};
    
    // Calcular las coordenadas relativas al contenedor
    const left = Math.min(dragStartPosition.x, dragCurrentPosition.x) - containerRect.left;
    const top = Math.min(dragStartPosition.y, dragCurrentPosition.y) - containerRect.top;
    const width = Math.abs(dragCurrentPosition.x - dragStartPosition.x);
    const height = Math.abs(dragCurrentPosition.y - dragStartPosition.y);
    
    // Retornar con precisión de pixeles para evitar problemas de renderizado
    return {
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      width: `${Math.round(width)}px`,
      height: `${Math.round(height)}px`,
      backgroundColor: 'rgba(var(--primary), 0.1)',
      borderColor: 'rgba(var(--primary), 0.3)',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '2px'
    };
  };
  
  // Nota: Los atajos de teclado han sido desactivados para evitar problemas en macOS

  function getTableView() {
    return (
      <div className="space-y-6">
        {/* Vista de tabla para escritorio */}
        <div className="hidden md:block rounded-lg border bg-card shadow-sm overflow-hidden relative">
          {/* Accent gradient para la tabla de videos */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-primary to-violet-500 absolute top-0 left-0"></div>
          <div className="overflow-x-auto pt-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {user?.role === "admin" && selectMode && (
                    <TableHead className="w-[40px]">
                      <div className={cn(
                        "p-1.5 rounded-md transition-colors", 
                        selectedVideos.length === filteredVideos.length && filteredVideos.length > 0 ? "bg-primary/20" : "bg-card hover:bg-muted"
                      )}>
                        <Checkbox 
                          checked={selectedVideos.length === filteredVideos.length && filteredVideos.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="h-4 w-4 border-2 transition-all duration-200"
                          aria-label="Seleccionar todos"
                        />
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="">Miniatura</TableHead>
                  <TableHead className="">Serie</TableHead>
                  <TableHead className="">Título</TableHead>
                  <TableHead className="">Estado</TableHead>
                  <TableHead className="">Colaboradores</TableHead>
                  <TableHead className="">Actualización</TableHead>
                  <TableHead className=" text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVideos?.map((video) => (
                  <TableRow key={video.id} className="group video-card" data-video-id={video.id}>
                    {/* Selection checkbox */}
                    {user?.role === "admin" && selectMode && (
                      <TableCell className="w-[40px]">
                        <div className={cn(
                          "p-1.5 rounded-md transition-colors", 
                          selectedVideos.includes(video.id) ? "bg-primary/20" : "bg-card hover:bg-muted"
                        )}>
                          <Checkbox 
                            checked={selectedVideos.includes(video.id)}
                            onCheckedChange={() => toggleSelectVideo(video.id)}
                            className="h-4 w-4 border-2 transition-all duration-200"
                            aria-label={`Seleccionar video ${video.title}`}
                          />
                        </div>
                      </TableCell>
                    )}
                    {/* Miniatura */}
                    <TableCell>
                      <div className="w-16 h-12 rounded overflow-hidden group-hover:ring-2 ring-primary/20 transition-all">
                        <ThumbnailPreview
                          src={video.thumbnailUrl}
                          alt={video.optimizedTitle ?? video.title}
                          aspectRatio="video"
                          enableZoom={true}
                          showPlaceholder={true}
                          className="h-full"
                          title={video.optimizedTitle ?? video.title}
                          showHoverActions={false}
                        />
                      </div>
                    </TableCell>
                    {/* Serie */}
                    <TableCell className="font-medium text-center">
                      {video.seriesNumber || "-"}
                    </TableCell>
                    {/* Título */}
                    <TableCell
                      className={cn("font-medium max-w-md", canSeeVideoDetails(video) ? "cursor-pointer hover:text-primary" : "")}
                      onClick={() => canSeeVideoDetails(video) && handleVideoClick(video)}
                    >
                      <div className="space-y-1">
                        <span className="text-base line-clamp-1">{video.optimizedTitle || video.title}</span>
                      </div>
                    </TableCell>
                    {/* Estado */}
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "capitalize text-xs",
                          getStatusBadgeColor(video.status)
                        )}
                      >
                        {getStatusLabel(user!.role, video)}
                      </Badge>
                    </TableCell>
                    {/* Contributors */}
                    <TableCell>
                      <UserBadges video={video} compact={true} />
                    </TableCell>
                    {/* Updated */}
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(video.updatedAt, false)}
                    </TableCell>
                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canSeeVideoDetails(video) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleVideoClick(video)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver detalles</span>
                          </Button>
                        )}
                        {user?.role === "admin" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará permanentemente el video y
                                  todos sus archivos asociados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    deleteVideo({
                                      videoId: video.id,
                                      projectId: video.projectId,
                                    });
                                  }}
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
                {/* El mensaje de "No hay videos" se mostrará fuera de la tabla */}
              </TableBody>
            </Table>
          </div>
        </div>
        {(!videos || videos.length === 0) && renderEmptyState()}
      </div>
    );
  }

  function getGridView() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredVideos?.map((video) => (
          <div
            key={video.id}
            className="group video-card relative rounded-lg border shadow-sm overflow-hidden transition-all hover:shadow-md bg-card"
            data-video-id={video.id}
            onClick={() => !selectMode && handleVideoClick(video)}
          >
            {/* Selection checkbox overlay */}
            {selectMode && (
              <div className="absolute top-2 right-2 z-10 transition-all duration-200 scale-0 animate-in zoom-in-50 data-[state=visible]:scale-100"
                data-state={selectMode ? "visible" : "hidden"}>
                <div className={cn(
                  "p-1.5 rounded-md transition-colors", 
                  selectedVideos.includes(video.id) ? "bg-primary/30 backdrop-blur-sm" : "bg-background/80 backdrop-blur-sm hover:bg-background/90"
                )}>
                  <Checkbox
                    checked={selectedVideos.includes(video.id)}
                    onCheckedChange={() => toggleSelectVideo(video.id)}
                    className="h-4 w-4 border-2 transition-all duration-200"
                    aria-label={`Seleccionar video ${video.title}`}
                  />
                </div>
              </div>
            )}
            
            {/* Thumbnail */}
            <div className="aspect-video w-full overflow-hidden relative">
              <ThumbnailPreview
                src={video.thumbnailUrl}
                alt={video.title}
                aspectRatio="video"
                enableZoom={true}
                showPlaceholder={true}
                title={video.optimizedTitle || video.title}
                duration={video.seriesNumber ? `S${video.seriesNumber}` : undefined}
                className="w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
            
            {/* Content */}
            <div className="p-3">
              <h3 className="font-medium text-sm line-clamp-2 mb-1">
                {video.optimizedTitle || video.title}
              </h3>
              
              <div className="flex justify-between items-center mt-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs capitalize",
                    getStatusBadgeColor(video.status)
                  )}
                >
                  {getStatusLabel(user!.role, video)}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {video.updatedAt ? formatDate(video.updatedAt) : ""}
                </div>
              </div>
              
              <UserBadges video={video} compact={true} />
            </div>
          </div>
        ))}
        {/* El mensaje de "No hay videos" se mostrará en la vista principal */}
      </div>
    );
  }

  function getListView() {
    return (
      <div className="space-y-3">
        {filteredVideos?.map((video) => (
          <div
            key={video.id}
            className="group video-card relative flex items-center border rounded-lg p-3 bg-card shadow-sm hover:shadow-md transition-all"
            data-video-id={video.id}
            onClick={() => !selectMode && handleVideoClick(video)}
          >
            {/* Selection checkbox overlay */}
            {selectMode && (
              <div className="absolute top-2 right-2 z-10 transition-all duration-200 scale-0 animate-in zoom-in-50 data-[state=visible]:scale-100"
                data-state={selectMode ? "visible" : "hidden"}>
                <div className={cn(
                  "p-1.5 rounded-md transition-colors", 
                  selectedVideos.includes(video.id) ? "bg-primary/30 backdrop-blur-sm" : "bg-background/80 backdrop-blur-sm hover:bg-background/90"
                )}>
                  <Checkbox
                    checked={selectedVideos.includes(video.id)}
                    onCheckedChange={() => toggleSelectVideo(video.id)}
                    className="h-4 w-4 border-2 transition-all duration-200"
                    aria-label={`Seleccionar video ${video.title}`}
                  />
                </div>
              </div>
            )}
            
            {/* Thumbnail */}
            <div className="w-28 h-16 flex-shrink-0 overflow-hidden rounded mr-3">
              <ThumbnailPreview
                src={video.thumbnailUrl}
                alt={video.title}
                aspectRatio="video"
                enableZoom={true}
                showPlaceholder={true}
                title={video.optimizedTitle || video.title}
                duration={video.seriesNumber ? `S${video.seriesNumber}` : undefined}
                className="w-full h-full"
              />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm line-clamp-1 mb-1">
                {video.optimizedTitle || video.title}
              </h3>
              
              <div className="flex flex-wrap gap-2 items-center mt-1">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs capitalize",
                    getStatusBadgeColor(video.status)
                  )}
                >
                  {getStatusLabel(user!.role, video)}
                </Badge>
                
                <div className="text-xs text-muted-foreground">
                  {video.updatedAt ? formatDate(video.updatedAt) : ""}
                </div>
                
                <UserBadges video={video} compact={true} />
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center ml-4 gap-1">
              {canSeeVideoDetails(video) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVideoClick(video);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">Ver detalles</span>
                </Button>
              )}
              {user?.role === "admin" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente el video y
                        todos sus archivos asociados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteVideo({
                            videoId: video.id,
                            projectId: video.projectId,
                          });
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        ))}
        {/* El mensaje de "No hay videos" se mostrará en la vista principal */}
      </div>
    );
  }

  // Función para actualizar un video
  const handleVideoUpdate = async (data: UpdateVideoData, keepDialogOpen = false) => {
    if (!selectedVideo) return;
    
    setUpdatingVideoId(selectedVideo.id);
    
    try {
      await updateVideo({
        videoId: selectedVideo.id,
        projectId: selectedVideo.projectId,
        updateRequest: data,
      });
      toast.success("Video actualizado");
      
      // Cerrar diálogo solo si no se indica lo contrario
      if (!keepDialogOpen) {
        setSelectedVideo(undefined);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar el video");
    } finally {
      setUpdatingVideoId(undefined);
    }
  };

  // No se usa función intermedia para evitar problemas con los hooks
  const videoDialogOpen = !!selectedVideo;
  const handleOpenChange = (open: boolean) => {
    if (!open) setSelectedVideo(undefined);
  };

  return (
    <div 
      className="relative pb-10"
      // Eventos para selección por arrastre
      onMouseDown={handleDragStart}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
    >
      {/* Rectángulo de selección */}
      {isDragging && selectMode && (
        <div
          ref={dragSelectionRef}
          className="absolute pointer-events-none z-10"
          style={getSelectionRectStyle()}
        ></div>
      )}
      
      {/* Toolbar con acciones */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold tracking-tight">Videos</h1>
          <div className="bg-muted px-2 py-1 rounded text-sm font-medium text-muted-foreground">
            {filteredVideos?.length || 0} videos
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {user?.role === "admin" && (
            <>
              {selectMode ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={toggleSelectionMode}
                    className="gap-1.5"
                  >
                    <Square className="h-4 w-4" />
                    Salir del modo selección
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={selectedVideos.length === 0}
                        className="gap-1.5"
                        data-delete-selected
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar seleccionados ({selectedVideos.length})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Se eliminarán permanentemente {selectedVideos.length} videos y
                          todos sus archivos asociados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectionMode}
                  className="gap-1.5"
                >
                  <CheckSquare className="h-4 w-4" />
                  Modo selección
                </Button>
              )}
              
              <Button
                size="sm"
                onClick={() => setNewVideoDialogOpen(true)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Nuevo Video
              </Button>
            </>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5 mr-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          
          <Link href="/videos/trash" className="no-underline">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Papelera
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Filtros */}
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
        visibleStates={user ? VISIBLE_STATES[user.role] : undefined}
      />
      
      {/* Vista principal */}
      <div className="flex justify-end mb-2 space-x-1">
        <Button
          variant={viewMode === "table" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => setViewMode("table")}
        >
          <Layout className="h-3.5 w-3.5" />
          <span className="sr-only">Vista tabla</span>
        </Button>
        <Button
          variant={viewMode === "grid" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => setViewMode("grid")}
        >
          <Grid className="h-3.5 w-3.5" />
          <span className="sr-only">Vista cuadrícula</span>
        </Button>
        <Button
          variant={viewMode === "list" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => setViewMode("list")}
        >
          <List className="h-3.5 w-3.5" />
          <span className="sr-only">Vista lista</span>
        </Button>
      </div>
      
      {(!videos || videos.length === 0) 
        ? renderEmptyState()
        : (
          <>
            {viewMode === "table" && getTableView()}
            {viewMode === "grid" && getGridView()}
            {viewMode === "list" && getListView()}
          </>
        )}
      
      <Dialog 
        open={videoDialogOpen} 
        onOpenChange={handleOpenChange}
      >
        {selectedVideo && (
          <VideoDetailDialog
            video={selectedVideo}
            onUpdate={handleVideoUpdate}
          />
        )}
      </Dialog>
      
      <NewVideoDialog
        open={newVideoDialogOpen}
        onOpenChange={setNewVideoDialogOpen}
      />
    </div>
  );
}