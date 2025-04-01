import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";

export interface UserActivityFilters {
  userId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  actionType?: string | null;
  limit?: number;
  offset?: number;
}

export interface UserActivityRecord {
  id: number;
  userId: number;
  userName: string;
  userFullName: string;
  actionType: string;
  actionDetail: string;
  entityId: number;
  entityType: string;
  entityName: string;
  createdAt: string;
  ipAddress: string;
  userAgent: string;
}

export interface UserActivityMeta {
  total: number;
  filtered: number;
  limit: number;
  offset: number;
}

export interface ActionSummary {
  actionType: string;
  count: number;
}

export interface UserSummary {
  userId: number;
  userName: string;
  userFullName: string;
  count: number;
}

export interface DailyActivity {
  date: string;
  count: number;
}

export interface SessionData {
  id: number;
  userId: number;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  ipAddress: string;
  userAgent: string;
}

export interface UserActivitySummary {
  byAction: ActionSummary[];
  byUser: UserSummary[];
  byDate: DailyActivity[];
  sessions: SessionData[];
}

export interface UserActivityResponse {
  success: boolean;
  data: UserActivityRecord[];
  meta: UserActivityMeta;
  summary: UserActivitySummary;
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
}

export interface ActionType {
  actionType: string;
  count: number;
}

/**
 * Hook para obtener y filtrar estadísticas de actividad de usuarios
 */
export function useUserActivityStats(filters: UserActivityFilters = {}) {
  const [localFilters, setLocalFilters] = useState<UserActivityFilters>(filters);
  
  const activityQuery = useQuery<UserActivityResponse>({
    queryKey: ['user-activity-stats', localFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (localFilters.userId) {
        params.append('userId', localFilters.userId.toString());
      }
      
      if (localFilters.startDate) {
        params.append('startDate', localFilters.startDate);
      }
      
      if (localFilters.endDate) {
        params.append('endDate', localFilters.endDate);
      }
      
      if (localFilters.actionType) {
        params.append('actionType', localFilters.actionType);
      }
      
      if (localFilters.limit) {
        params.append('limit', localFilters.limit.toString());
      }
      
      if (localFilters.offset) {
        params.append('offset', localFilters.offset.toString());
      }
      
      const { data } = await axios.get<UserActivityResponse>(
        `/api/stats/user-activity?${params.toString()}`
      );
      
      return data;
    },
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: false
  });
  
  const usersQuery = useQuery<{success: boolean, data: User[]}>({
    queryKey: ['user-activity-users'],
    queryFn: async () => {
      const { data } = await axios.get('/api/stats/user-activity/users');
      return data;
    },
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false
  });
  
  const actionTypesQuery = useQuery<{success: boolean, data: ActionType[]}>({
    queryKey: ['user-activity-action-types'],
    queryFn: async () => {
      const { data } = await axios.get('/api/stats/user-activity/action-types');
      return data;
    },
    staleTime: 300000, // 5 minutos
    refetchOnWindowFocus: false
  });
  
  const updateFilters = (newFilters: Partial<UserActivityFilters>) => {
    setLocalFilters(prev => ({
      ...prev,
      ...newFilters,
      // Si cambiamos cualquier filtro excepto la paginación, reseteamos offset
      offset: (newFilters.limit === undefined && newFilters.offset === undefined) ? 0 : (newFilters.offset ?? prev.offset)
    }));
  };
  
  const goToPage = (page: number) => {
    const limit = localFilters.limit || 100;
    updateFilters({ offset: page * limit });
  };
  
  return {
    data: activityQuery.data,
    users: usersQuery.data?.data || [],
    actionTypes: actionTypesQuery.data?.data || [],
    isLoading: activityQuery.isLoading || usersQuery.isLoading || actionTypesQuery.isLoading,
    error: activityQuery.error || usersQuery.error || actionTypesQuery.error,
    filters: localFilters,
    updateFilters,
    goToPage,
    refetch: activityQuery.refetch
  };
}