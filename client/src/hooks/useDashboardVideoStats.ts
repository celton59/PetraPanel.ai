import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface VideoStats {
  totalVideos: number;
  stateCounts: {
    upload_media: number;
    content_corrections: number;
    available: number;
    final_review: number;
    // Podemos agregar más estados aquí según sea necesario
    media_corrections?: number;
    media_review?: number;
    completed?: number;
  };
}

/**
 * Hook para obtener estadísticas de videos para el dashboard
 * Usa los datos del endpoint existente de estadísticas de videos
 * y los adapta para el formato que necesita el componente del dashboard
 */
export function useDashboardVideoStats() {
  return useQuery<VideoStats>({
    queryKey: ["dashboard-video-stats"],
    queryFn: async () => {
      const { data } = await axios.get<VideoStats>('/api/titulin/videos/stats');
      return data;
    },
    staleTime: 30000, // Refrescar cada 30 segundos
  });
}