import { Youtube, GitCompareArrows, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { VideoStats } from "./components/VideoStats";
import { SearchBar } from "./components/SearchBar";
import { TableActions } from "./components/TableActions";
import { VideoTable } from "./components/VideoTable";
import { MobileVideoList } from "./components/MobileVideoList";
import { PaginationControls } from "./components/PaginationControls";
import { SendToOptimizeDialog } from "./components/SendToOptimizeDialog";
import { VideoAnalysisDialog } from "./components/VideoAnalysisDialog";
import { TitleComparisonDialog } from "./configuration/TitleComparisonDialog";
import { TitulinVideo, Channel, VideoResponse } from "./types";
import { format, parseISO, isValid, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { SortingState } from "@tanstack/react-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import TitulinConfiguration from "./configuration/TitulinConfiguration";

function VideoOverviewTab({ children }: { children: React.ReactNode }) {
  return <div className="space-y-8">{children}</div>;
}

export default function TitulinPage() {
  // Estados de la página
  const [searchValue, setSearchValue] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [selectedVideo, setSelectedVideo] = useState<TitulinVideo | null>(null);
  const [analysisVideo, setAnalysisVideo] = useState<TitulinVideo | null>(null);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [onlyEvergreen, setOnlyEvergreen] = useState(false);
  const [onlyAnalyzed, setOnlyAnalyzed] = useState(false);
  const [currentTab, setCurrentTab] = useState("overview");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "publishedAt", desc: true }
  ]);
  
  // Estado para detectar si estamos en un dispositivo móvil
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  // Efecto para gestionar la búsqueda
  useEffect(() => {
    const timerId = setTimeout(() => {
      setTitleFilter(searchValue.trim());
      setCurrentPage(1);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timerId);
  }, [searchValue]);
  
  // Efecto para detectar cambios en el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Agregar listener para cambios de tamaño
    window.addEventListener('resize', handleResize);
    
    // Limpiar listener al desmontar
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Obtener el queryClient para poder usarlo más tarde
  const queryClient = useQueryClient();

  // Consulta para obtener videos
  const {
    data: videosData,
    isLoading,
    isFetching,
    refetch
  } = useQuery<VideoResponse>({
    queryKey: ["youtube-videos", channelFilter, currentPage, pageSize, titleFilter, onlyEvergreen, onlyAnalyzed, currentTab],
    queryFn: async () => {
      const searchParams = {
        ...(channelFilter !== "all" ? { channelId: channelFilter } : {}),
        ...(titleFilter ? { title: titleFilter } : {}),
        ...(onlyEvergreen ? { isEvergreen: true } : {}),
        ...(onlyAnalyzed ? { analyzed: true } : {}),
        ...(currentTab === "evergreen" ? { isEvergreen: true } : {}),
        ...(currentTab === "no-evergreen" ? { isEvergreen: false, analyzed: true } : {}),
        ...(currentTab === "analizados" ? { analyzed: true } : {}),
        ...(currentTab === "no-analizados" ? { analyzed: false } : {}),
        page: currentPage,
        limit: pageSize
      };

      console.log("Parámetros de búsqueda:", searchParams);

      const response = await axios.get<VideoResponse>("/api/titulin/videos", {
        params: searchParams
      });
      return response.data;

    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Obtener canales
  const { data: channels } = useQuery<Channel[]>({
    queryKey: ["youtube-channels"],
    queryFn: async () => {
      const response = await axios.get("/api/titulin/channels");
      return response.data;
    },
  });

  // Obtener estadísticas
  const { data: statsData } = useQuery({
    queryKey: ["youtube-videos-stats"],
    queryFn: async () => {
      const response = await axios.get("/api/titulin/videos/stats");
      return response.data;
    },
  });

  // Función para formatear fechas
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return "-";
      return format(date, "PPp", { locale: es });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "-";
    }
  };

  // Obtener la información de la última actualización
  const getLastUpdateInfo = () => {
    if (!channels || channels.length === 0) return "No hay canales";

    if (channelFilter !== "all") {
      const selectedChannel = channels.find(c => c.channelId === channelFilter);
      // Obtener lastVideoFetch con cualquiera de los dos formatos posibles
      const lastFetch = selectedChannel?.lastVideoFetch || selectedChannel?.['last_video_fetch'];

      if (!lastFetch) return "Sin datos de actualización";

      try {
        const date = parseISO(lastFetch);
        return `Hace ${formatDistanceToNow(date, { locale: es })}`;
      } catch (error) {
        return "Fecha inválida";
      }
    }

    const lastUpdate = channels.reduce((latest, channel) => {
      // Obtener lastVideoFetch con cualquiera de los dos formatos posibles
      const lastFetch = channel.lastVideoFetch || channel['last_video_fetch'];

      if (!lastFetch) return latest;
      if (!latest) return lastFetch;
      return lastFetch > latest ? lastFetch : latest;
    }, null as string | null);

    if (!lastUpdate) return "No hay datos";

    try {
      const date = parseISO(lastUpdate);
      return `Hace ${formatDistanceToNow(date, { locale: es })}`;
    } catch (error) {
      return "Fecha inválida";
    }
  };

  // Obtener el nombre de un canal
  const getChannelName = (channelId: string) => {
    const channel = channels?.find(c => c.channelId === channelId);
    return channel?.name || channelId;
  };

  // Descargar CSV
  const downloadCSVMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.get("/api/titulin/videos", {
        params: {
          ...(channelFilter !== "all" ? { channelId: channelFilter } : {}),
          ...(titleFilter ? { title: titleFilter } : {}),
          limit: 1000,
          page: 1
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      const exportVideos = data.videos || [];

      if (!exportVideos.length) {
        toast.error("No hay videos para descargar");
        return;
      }

      // Crear el contenido del CSV
      const titlesForCSV = exportVideos.map((video: TitulinVideo) => {
        // Obtener la fecha publicada con cualquiera de los dos formatos posibles
        const publishedDate = video.publishedAt || video['published_at'];

        return {
          title: video.title,
          views: video.viewCount,
          likes: video.likeCount,
          published: formatDate(publishedDate),
          channel: getChannelName(video.channelId),
          duration: video.duration,
          isEvergreen: video.analyzed && video.analysisData ? (video.analysisData.isEvergreen ? "Sí" : "No") : "No analizado",
          url: `https://youtube.com/watch?v=${video.videoId}`
        };
      });

      // Convertir a formato CSV
      const headers = Object.keys(titlesForCSV[0]).join(',');
      const rows = titlesForCSV.map((obj: Record<string, any>) =>
        Object.values(obj).map(value =>
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
      );
      const csv = [headers, ...rows].join('\n');

      // Descargar como archivo
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `youtube_videos_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Se han exportado ${exportVideos.length} videos`);
    },
    onError: (error) => {
      console.error("Error downloading CSV:", error);
      toast.error("No se pudo generar el archivo CSV");
    }
  });

  // Handler para descargar CSV
  const handleDownloadCSV = () => {
    downloadCSVMutation.mutate();
  };

  // Extraer datos
  const videos = videosData?.videos || [];
  const pagination = videosData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 };
  const totalVideos = pagination.total || 0;
  const viewsCount = statsData?.totalViews || 0;
  const likesCount = statsData?.totalLikes || 0;
  const isDownloading = downloadCSVMutation.isPending;

  // Función para refrescar datos
  const refreshData = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success("Datos actualizados correctamente");
  };

  // Manejador de cambio de ordenación
  const handleSortingChange = (newSorting: SortingState) => {
    setSorting(newSorting);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Youtube className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Titulín</h1>
            </div>
          </div>
        </motion.div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visión General</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <VideoOverviewTab>
              <VideoStats
                totalVideos={totalVideos}
                viewsCount={viewsCount}
                likesCount={likesCount}
                lastUpdateInfo={getLastUpdateInfo()}
              />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="space-y-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  <div className="relative flex-1 w-full">
                    <SearchBar
                      searchValue={searchValue}
                      setSearchValue={setSearchValue}
                      setTitleFilter={setTitleFilter}
                      setCurrentPage={setCurrentPage}
                      isFetching={isFetching}
                    />
                  </div>

                  <TableActions
                    channelFilter={channelFilter}
                    setChannelFilter={setChannelFilter}
                    setCurrentPage={setCurrentPage}
                    channels={channels}
                    handleDownloadCSV={handleDownloadCSV}
                    isDownloading={isDownloading}
                    onlyEvergreen={onlyEvergreen}
                    setOnlyEvergreen={setOnlyEvergreen}
                    onlyAnalyzed={onlyAnalyzed}
                    setOnlyAnalyzed={setOnlyAnalyzed}
                    refreshData={refreshData}
                    isRefreshing={isRefreshing}
                  />
                </div>

                {/* Pestañas para filtrar videos */}
                <Card>
                  <CardContent className="p-0">
                    <Tabs
                      defaultValue="todos"
                      value={currentTab}
                      onValueChange={(value) => {
                        setCurrentTab(value);
                        setCurrentPage(1);
                      }}
                      className="w-full"
                    >
                      <div className="p-4 border-b">
                        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
                          <TabsTrigger value="todos" className="text-xs md:text-sm">
                            Todos
                          </TabsTrigger>
                          <TabsTrigger value="evergreen" className="text-xs md:text-sm">
                            Evergreen
                          </TabsTrigger>
                          <TabsTrigger value="no-evergreen" className="text-xs md:text-sm">
                            No Evergreen
                          </TabsTrigger>
                          <TabsTrigger value="analizados" className="text-xs md:text-sm">
                            Analizados
                          </TabsTrigger>
                          <TabsTrigger value="no-analizados" className="text-xs md:text-sm">
                            Sin Analizar
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="todos" className="m-0">
                        {isLoading ? (
                          <div className="text-center py-10">
                            <div className="animate-spin h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Cargando videos...</p>
                          </div>
                        ) : (
                          <div>
                            <VideoTable
                              videos={videos}
                              setSelectedVideo={setSelectedVideo}
                              setAnalysisVideo={setAnalysisVideo}
                              getChannelName={getChannelName}
                              isLoading={isFetching}
                              onSortingChange={handleSortingChange}
                            />
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="evergreen" className="m-0">
                        {isLoading ? (
                          <div className="text-center py-10">
                            <div className="animate-spin h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Cargando videos evergreen...</p>
                          </div>
                        ) : (
                          <div>
                            <VideoTable
                              videos={videos}
                              setSelectedVideo={setSelectedVideo}
                              setAnalysisVideo={setAnalysisVideo}
                              getChannelName={getChannelName}
                              isLoading={isFetching}
                              onSortingChange={handleSortingChange}
                            />
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="no-evergreen" className="m-0">
                        {isLoading ? (
                          <div className="text-center py-10">
                            <div className="animate-spin h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Cargando videos no evergreen...</p>
                          </div>
                        ) : (
                          <div>
                            <VideoTable
                              videos={videos}
                              setSelectedVideo={setSelectedVideo}
                              setAnalysisVideo={setAnalysisVideo}
                              getChannelName={getChannelName}
                              isLoading={isFetching}
                              onSortingChange={handleSortingChange}
                            />
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="analizados" className="m-0">
                        {isLoading ? (
                          <div className="text-center py-10">
                            <div className="animate-spin h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Cargando videos analizados...</p>
                          </div>
                        ) : (
                          <div>
                            <VideoTable
                              videos={videos}
                              setSelectedVideo={setSelectedVideo}
                              setAnalysisVideo={setAnalysisVideo}
                              getChannelName={getChannelName}
                              isLoading={isFetching}
                              onSortingChange={handleSortingChange}
                            />
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="no-analizados" className="m-0">
                        {isLoading ? (
                          <div className="text-center py-10">
                            <div className="animate-spin h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Cargando videos sin analizar...</p>
                          </div>
                        ) : (
                          <div>
                            <VideoTable
                              videos={videos}
                              setSelectedVideo={setSelectedVideo}
                              setAnalysisVideo={setAnalysisVideo}
                              getChannelName={getChannelName}
                              isLoading={isFetching}
                              onSortingChange={handleSortingChange}
                            />
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Paginación */}
                <div className="flex justify-between items-center mt-4 px-2">
                  <div className="text-sm text-muted-foreground">
                    {pagination.total > 0 ? (
                      <span>
                        Mostrando {Math.min((currentPage - 1) * pageSize + 1, pagination.total)} - {Math.min(currentPage * pageSize, pagination.total)} de {pagination.total} videos
                      </span>
                    ) : (
                      <span>No hay videos que coincidan con los filtros</span>
                    )}
                  </div>

                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={pagination.totalPages}
                    setCurrentPage={setCurrentPage}
                  />
                </div>
              </motion.div>

              {/* Mantener los diálogos y modales */}
              {selectedVideo && (
                <SendToOptimizeDialog
                  video={selectedVideo}
                  open={!!selectedVideo}
                  onOpenChange={(open) => {
                    if (!open) setSelectedVideo(null);
                  }}
                />
              )}

              {analysisVideo && (
                <VideoAnalysisDialog
                  video={analysisVideo}
                  open={!!analysisVideo}
                  onOpenChange={(open) => {
                    if (!open) setAnalysisVideo(null);
                  }}
                  onAnalysisComplete={() => {
                    window.setTimeout(() => {
                      queryClient.invalidateQueries({ queryKey: ["youtube-videos"] });
                    }, 500);
                  }}
                />
              )}

              {showComparisonDialog && (
                <TitleComparisonDialog
                  open={showComparisonDialog}
                  onOpenChange={setShowComparisonDialog}
                />
              )}
            </VideoOverviewTab>
          </TabsContent>

          <TabsContent value="config">
            <TitulinConfiguration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}