import { VideoDetailDialog } from "./VideoDetailDialog";
import { ApiVideo, useVideos } from "@/hooks/useVideos";
import { Button } from "@/components/ui/button";
import { UserBadges } from "@/components/video/UserBadges";
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
import { Dialog } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { VideoFilters } from "./VideoFilters";
import type { DateRange } from "react-day-picker";
import { getStatusBadgeColor, getStatusLabel } from "@/lib/status-labels";
import { cn } from "@/lib/utils";
import { User, VideoStatus } from "@db/schema";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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

  const { 
    videos, 
    isLoading, 
    isFetching,
    deleteVideo, 
    updateVideo,
    page,
    paginationMetadata,
    changePage,
  } = useVideos();

  const [updatingVideoId, setUpdatingVideoId] = useState<number | undefined>(
    undefined,
  );
  const [newVideoDialogOpen, setNewVideoDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ApiVideo | undefined>(
    undefined,
  );
  const [viewMode, setViewMode] = useState<"table" | "grid" | "list">("table");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("new") === "true") {
      setNewVideoDialogOpen(true);
      window.history.replaceState({}, "", "/videos");
    }
  }, []);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState("all");
  const [assignedTo, setAssignedTo] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  if (!user) return null;

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


    return true;
  })

  function getTableView() {
    return (
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden relative">
        {/* Accent gradient para la tabla de videos */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-primary to-violet-500 absolute top-0 left-0"></div>
        <div className="overflow-x-auto pt-1">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
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
                <TableRow key={video.id} className="group">
                  {/* Miniatura */}
                  <TableCell>
                    <div className="w-16 h-12 bg-muted rounded overflow-hidden group-hover:ring-2 ring-primary/20 transition-all">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.optimizedTitle ?? video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                          <Layout className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {video.seriesNumber ?? "-"}
                  </TableCell>
                  <TableCell className="font-medium max-w-[300px] truncate">
                    {video.optimizedTitle ?? video.title}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(getStatusBadgeColor(video.status))}
                    >
                      {getStatusLabel(user!.role, video)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <UserBadges video={video} compact />
                  </TableCell>
                  <TableCell>
                    {video.updatedAt
                      ? new Date(video.updatedAt).toLocaleDateString()
                      : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canSeeVideoDetails(video) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={updatingVideoId === video.id}
                          onClick={() => handleVideoClick(video)}
                          className="transition-colors"
                        >
                          {updatingVideoId === video.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {user?.role === "admin" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                ¿Estás seguro?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará
                                permanentemente el video
                                <span className="font-medium">
                                  {" "}
                                  {video.title}
                                </span>
                                .
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  deleteVideo({
                                    videoId: video.id,
                                    projectId: video.projectId,
                                  })
                                }
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
              {(!videos || videos.length === 0) && (
                <TableRow>
                  <TableCell colSpan={12}>{renderEmptyState()}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {paginationMetadata && paginationMetadata.totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(page - 1)}
                    disabled={!paginationMetadata.hasPrevPage}
                  />
                </PaginationItem>

                {renderPaginationItems()}

                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!paginationMetadata.hasNextPage}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <div className="text-center text-sm text-muted-foreground mt-2">
              Mostrando {videos.length} de {paginationMetadata.totalVideos} videos • 
              Página {paginationMetadata.page} de {paginationMetadata.totalPages}
            </div>
          </div>
        )}
      </div>
    );
  }

  function getGridView() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos?.map((video) => (
          <div
            key={video.id}
            className="group relative bg-card rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-border hover:border-primary/20"
          >
            {/* Gradient accent en tarjetas grid */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-primary to-violet-500 absolute top-0 left-0 z-10"></div>
            <div className="aspect-video bg-muted relative">
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                  <Layout className="h-4 w-4" />
                </div>
              )}
              <div
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={() => handleVideoClick(video)}
              >
                <Eye className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="p-4">
              <div className="mb-2 flex justify-between items-center">
                <Badge
                  variant="secondary"
                  className={cn("text-xs", getStatusBadgeColor(video.status))}
                >
                  {getStatusLabel(user!.role, video)}
                </Badge>
                {user?.role === "admin" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Se eliminará
                          permanentemente el video
                          <span className="font-medium"> {video.title}</span>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            deleteVideo({
                              videoId: video.id,
                              projectId: video.projectId,
                            })
                          }
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <h3 className="font-medium text-sm mb-1 truncate">
                {video.optimizedTitle || video.title}
              </h3>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{video.seriesNumber || "Sin serie"}</span>
                <span>
                  {video.updatedAt &&
                    new Date(video.updatedAt).toLocaleDateString()}
                  {!video.updatedAt &&
                    video.createdAt &&
                    new Date(video.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-2">
                <UserBadges video={video} compact />
              </div>
            </div>
          </div>
        ))}
        {(!videos || videos.length === 0) && renderEmptyState()}
        {paginationMetadata && paginationMetadata.totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(page - 1)}
                    disabled={!paginationMetadata.hasPrevPage}
                  />
                </PaginationItem>

                {renderPaginationItems()}

                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!paginationMetadata.hasNextPage}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <div className="text-center text-sm text-muted-foreground mt-2">
              Mostrando {videos.length} de {paginationMetadata.totalVideos} videos • 
              Página {paginationMetadata.page} de {paginationMetadata.totalPages}
            </div>
          </div>
        )}
      </div>
    );
  }

  function getListView() {
    return (
      <div className="space-y-4">
        {videos?.map((video: any) => (
          <div
            key={video.id}
            className="flex items-center gap-4 p-4 bg-card rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-border hover:border-primary/20 cursor-pointer relative overflow-hidden"
            onClick={() => handleVideoClick(video)}
          >
            {/* Gradient accent en tarjetas list */}
            <div className="h-full w-1 bg-gradient-to-b from-indigo-600 via-primary to-violet-500 absolute top-0 left-0"></div>
            <div className="w-24 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                  <Layout className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="flex-grow min-w-0">
              <h3 className="font-medium mb-1 truncate">
                {video.optimizedTitle || video.title}
              </h3>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn("text-xs", getStatusBadgeColor(video.status))}
                >
                  {getStatusLabel(user!.role, video)}
                </Badge>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  {video.seriesNumber || "Sin serie"}
                </span>
              </div>
              <div className="mt-2">
                <UserBadges video={video} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {new Date(
                  video.updatedAt || video.createdAt,
                ).toLocaleDateString()}
              </span>
              {user?.role === "admin" && (
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
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará
                        permanentemente el video
                        <span className="font-medium"> {video.title}</span>.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          deleteVideo({
                            videoId: video.id,
                            projectId: video.projectId,
                          })
                        }
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
        {(!videos || videos.length === 0) && renderEmptyState()}

        {paginationMetadata && paginationMetadata.totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(page - 1)}
                    disabled={!paginationMetadata.hasPrevPage}
                  />
                </PaginationItem>

                {renderPaginationItems()}

                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!paginationMetadata.hasNextPage}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <div className="text-center text-sm text-muted-foreground mt-2">
              Mostrando {videos.length} de {paginationMetadata.totalVideos} videos • 
              Página {paginationMetadata.page} de {paginationMetadata.totalPages}
            </div>
          </div>
        )}
      </div>
    );
  }

  function getVideoDialog() {
    return (
      <Dialog
        open={Boolean(selectedVideo)}
        onOpenChange={() => setSelectedVideo(undefined)}
      >
        <VideoDetailDialog
          video={selectedVideo!}
          onUpdate={async (data, keepDialog) => {
            setUpdatingVideoId(selectedVideo!.id);
            try {
              await updateVideo({
                videoId: selectedVideo!.id,
                projectId: selectedVideo!.projectId,
                updateRequest: data,
              });
              if (!keepDialog) {
                setUpdatingVideoId(undefined);
                setSelectedVideo(undefined);                
              }              

            } catch (err) {
              console.log(err);
              toast.error("Error al actualizar el video");
            }
          }}
        />
      </Dialog>
    );
  }

  // Función para manejar el cambio de página
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (paginationMetadata?.totalPages || 1)) {
      changePage(newPage);
    }
  };

  // Función para renderizar los elementos de paginación
  const renderPaginationItems = () => {
    if (!paginationMetadata) return null;

    const { page: currentPage, totalPages } = paginationMetadata;
    const pages = [];

    // Mostrar primera página
    if (currentPage > 2) {
      pages.push(
        <PaginationItem key="first">
          <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
        </PaginationItem>
      );

      // Mostrar elipsis si hay muchas páginas
      if (currentPage > 3) {
        pages.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }

    // Páginas alrededor de la actual
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink 
            isActive={i === currentPage}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Mostrar elipsis si hay muchas páginas
    if (currentPage < totalPages - 2) {
      pages.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      );

      // Mostrar última página
      pages.push(
        <PaginationItem key="last">
          <PaginationLink onClick={() => handlePageChange(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return pages;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col gap-2 mb-12">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Videos
              </span>
            </h1>
            <div className="flex items-center space-x-4">
              <div className="h-8 w-1 bg-gradient-to-b from-blue-600 via-purple-600 to-pink-600 rounded-full" />
              <p className="text-lg text-muted-foreground font-medium tracking-tight">
                Gestiona y optimiza tus videos para YouTube
              </p>
            </div>
          </div>
          {user?.role === "admin" && (
            <NewVideoDialog
              open={newVideoDialogOpen}
              onOpenChange={setNewVideoDialogOpen}
            />
          )}
        </div>
      </div>

      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            visibleStates={
              VISIBLE_STATES[user?.role as keyof typeof VISIBLE_STATES] || []
            }
          />
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant={showFilters ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="h-9 w-9"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("table")}
              className="h-9 w-9"
            >
              <Layout className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="h-9 w-9"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="h-9 w-9"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg">
        {viewMode === "table"
          ? getTableView()
          : viewMode === "grid"
            ? getGridView()
            : getListView()}
      </div>

      {selectedVideo && getVideoDialog()}
    </div>
  );
}