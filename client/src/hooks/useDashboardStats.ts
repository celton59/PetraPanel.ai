import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// Tipos para los datos de estadísticas del dashboard
export interface ProjectStat {
  projectId: number;
  name: string;
  prefix: string;
  count: number;
}

export interface MonthlyStat {
  month: string;
  count: number;
}

export interface UserStat {
  userId: number;
  username: string;
  fullName: string;
  count: number;
}

export interface DashboardStats {
  totalVideos: number;
  stateCounts: {
    available: number;
    content_corrections: number;
    content_review: number;
    upload_media: number;
    media_corrections: number;
    media_review: number;
    final_review: number;
    completed: number;
  };
  deletedCount: number;
  projectStats: ProjectStat[];
  monthlyStats: MonthlyStat[];
  topUsers: UserStat[];
  topOptimizers: UserStat[];
}

/**
 * Hook para obtener estadísticas detalladas para el dashboard
 */
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data } = await axios.get<DashboardStats>('/api/stats/dashboard');
      return data;
    },
    staleTime: 30000, // Considera los datos frescos por 30 segundos
    refetchOnWindowFocus: true, // Actualiza los datos cuando el usuario regresa a la pestaña
    refetchOnMount: true, // Actualiza cuando el componente se monta (vuelve a la página)
    refetchInterval: 60000, // Refresca automáticamente cada minuto incluso sin interacción
  });
}

// Tipos para estadísticas de proyectos
export interface ProjectDetailedStat {
  id: number;
  name: string;
  prefix: string;
  totalVideos: number;
  stateCounts: {
    available: number;
    content_corrections: number;
    content_review: number;
    upload_media: number;
    media_corrections: number;
    media_review: number;
    final_review: number;
    completed: number;
  };
}

export interface ProjectsStats {
  projects: ProjectDetailedStat[];
}

/**
 * Hook para obtener estadísticas detalladas por proyecto
 */
export function useProjectStats() {
  return useQuery<ProjectsStats>({
    queryKey: ["project-stats"],
    queryFn: async () => {
      const { data } = await axios.get<ProjectsStats>('/api/stats/projects');
      return data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

// Tipos para estadísticas de usuarios
export interface CreatorStat {
  userId: number;
  username: string;
  fullName: string;
  role: string;
  totalVideos: number;
  completed: number;
  inProgress: number;
}

export interface OptimizerStat {
  userId: number;
  username: string;
  fullName: string;
  role: string;
  totalOptimized: number;
  completed: number;
  inReview: number;
}

export interface ReviewerStat {
  userId: number;
  username: string;
  fullName: string;
  role: string;
  totalReviewed: number;
  approved: number;
  rejected: number;
}

export interface UsersStats {
  creators: CreatorStat[];
  optimizers: OptimizerStat[];
  contentReviewers: ReviewerStat[];
  mediaReviewers: ReviewerStat[];
}

/**
 * Hook para obtener estadísticas detalladas por usuarios
 */
export function useUserStats() {
  return useQuery<UsersStats>({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const { data } = await axios.get<UsersStats>('/api/stats/users');
      return data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}