import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { refreshCSRFToken } from '../lib/axios';

export type YoutubeChannel = {
  id: number;
  channelId: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  videoCount: number;
  active: boolean;
  isAuthorized?: boolean;
  accessToken?: string;
  createdAt: string;
  updatedAt: string;
  // Campos adicionales cuando se consulta como canal vinculado a proyecto
  isDefault?: boolean;
  linkId?: number;
};

export function useYoutubeChannels() {
  const queryClient = useQueryClient();

  // Obtener todos los canales de YouTube
  const {
    data: channels = [],
    isLoading: isLoadingChannels,
    refetch: refetchChannels,
  } = useQuery<YoutubeChannel[]>({
    queryKey: ['/api/youtube/channels'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/youtube/channels');
        return response.data.data || [];
      } catch (error) {
        console.error('Error al cargar canales de YouTube:', error);
        return [];
      }
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Crear un nuevo canal
  const createChannelMutation = useMutation({
    mutationFn: async (channelData: {
      channelId: string;
      name?: string;
      url?: string;
      description?: string;
    }) => {
      await refreshCSRFToken();
      const response = await api.post('/api/youtube/channels', channelData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/youtube/channels'] });
      if (data.warning) {
        toast.success('Canal de YouTube creado correctamente', {
          description: data.warning
        });
      } else {
        toast.success('Canal de YouTube creado correctamente', {
          description: 'La información del canal se ha obtenido automáticamente desde YouTube'
        });
      }
    },
    onError: (error: any) => {
      console.error('Error al crear canal:', error);
      toast.error('Error al crear canal de YouTube', {
        description: error.response?.data?.message || 'Se produjo un error al crear el canal'
      });
    }
  });

  // Obtener canales vinculados a un proyecto
  const getProjectChannels = (projectId: number) => {
    return useQuery<YoutubeChannel[]>({
      queryKey: [`/api/youtube/project/${projectId}/channels`],
      queryFn: async () => {
        try {
          const response = await api.get(`/api/youtube/project/${projectId}/channels`);
          return response.data.data || [];
        } catch (error) {
          console.error(`Error al cargar canales del proyecto ${projectId}:`, error);
          return [];
        }
      },
      enabled: !!projectId, // Sólo ejecutar si hay un ID de proyecto válido
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  };

  // Obtener el canal predeterminado de un proyecto
  const getDefaultProjectChannel = (projectId: number) => {
    return useQuery<YoutubeChannel | null>({
      queryKey: [`/api/youtube/project/${projectId}/default-channel`],
      queryFn: async () => {
        try {
          const response = await api.get(`/api/youtube/project/${projectId}/default-channel`);
          return response.data.data || null;
        } catch (error) {
          console.error(`Error al obtener canal predeterminado del proyecto ${projectId}:`, error);
          return null;
        }
      },
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  };

  // Vincular un canal a un proyecto
  const linkChannelToProjectMutation = useMutation({
    mutationFn: async (data: {
      projectId: number;
      channelId: string;
      isDefault?: boolean;
    }) => {
      await refreshCSRFToken();
      const response = await api.post('/api/youtube/project-channel', data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/youtube/project/${variables.projectId}/channels`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/youtube/project/${variables.projectId}/default-channel`] 
      });
      toast.success('Canal vinculado al proyecto correctamente');
    },
    onError: (error: any) => {
      console.error('Error al vincular canal con proyecto:', error);
      toast.error('Error al vincular canal con proyecto', {
        description: error.response?.data?.message || 'Se produjo un error al vincular el canal'
      });
    }
  });

  // Desvincular un canal de un proyecto
  const unlinkChannelFromProjectMutation = useMutation({
    mutationFn: async ({ projectId, channelId }: { projectId: number; channelId: string }) => {
      await refreshCSRFToken();
      const response = await api.delete(`/api/youtube/project/${projectId}/channel/${channelId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/youtube/project/${variables.projectId}/channels`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/youtube/project/${variables.projectId}/default-channel`] 
      });
      toast.success('Canal desvinculado del proyecto correctamente');
    },
    onError: (error: any) => {
      console.error('Error al desvincular canal del proyecto:', error);
      toast.error('Error al desvincular canal del proyecto', {
        description: error.response?.data?.message || 'Se produjo un error al desvincular el canal'
      });
    }
  });

  // Obtener URL para autorizar acceso a un canal
  const getAuthUrlMutation = useMutation({
    mutationFn: async (channelId: string) => {
      await refreshCSRFToken();
      const response = await api.get(`/api/youtube/channel/${channelId}/auth-url`);
      return response.data;
    },
    onSuccess: (data) => {
      // No invalidamos queries porque no cambia el estado del canal todavía
      // Esto devuelve la URL de autorización que se abrirá en una nueva ventana
      window.open(data.authUrl, '_blank');
    },
    onError: (error: any) => {
      console.error('Error al obtener URL de autorización:', error);
      toast.error('Error al iniciar proceso de autorización', {
        description: error.response?.data?.message || 'No se pudo generar la URL de autorización'
      });
    }
  });

  // Verificar si un canal está autorizado
  const checkChannelAuthorization = (channelId: string) => {
    return useQuery<{ isAuthorized: boolean }>({
      queryKey: [`/api/youtube/channel/${channelId}/check-auth`],
      queryFn: async () => {
        // Si no hay un ID de canal válido, devolver un objeto por defecto
        if (!channelId || channelId === '') {
          return { isAuthorized: false };
        }
        
        try {
          const response = await api.get(`/api/youtube/channel/${channelId}/check-auth`);
          return response.data || { isAuthorized: false };
        } catch (error) {
          console.error(`Error al comprobar autorización del canal ${channelId}:`, error);
          return { isAuthorized: false };
        }
      },
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 30 * 1000, // 30 segundos
      // Solo ejecutar si hay un ID de canal
      enabled: !!channelId
    });
  };

  // Publicar un video en YouTube
  const publishVideoToYoutubeMutation = useMutation({
    mutationFn: async ({ 
      videoId, 
      channelId, 
      videoData 
    }: { 
      videoId: number; 
      channelId: string;
      videoData: {
        title: string;
        description: string;
        tags?: string[];
        privacyStatus: 'private' | 'public' | 'unlisted';
      }
    }) => {
      await refreshCSRFToken();
      const response = await api.post(`/api/youtube/video/${videoId}/publish`, {
        channelId,
        ...videoData
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      
      toast.success('Video publicado en YouTube correctamente', {
        description: `El video está disponible en: ${data.data.youtubeUrl}`,
        action: {
          label: 'Ver en YouTube',
          onClick: () => window.open(data.data.youtubeUrl, '_blank')
        }
      });
    },
    onError: (error: any) => {
      console.error('Error al publicar video en YouTube:', error);
      
      // Si el error es que el canal no está autorizado
      if (error.response?.data?.needsAuthorization) {
        toast.error('Canal no autorizado', {
          description: 'El canal de YouTube no está autorizado para publicar videos. Debes autorizarlo primero.',
          action: {
            label: 'Autorizar',
            onClick: () => getAuthUrlMutation.mutate(error.response?.data?.channelId)
          }
        });
      } else {
        toast.error('Error al publicar video en YouTube', {
          description: error.response?.data?.message || 'Se produjo un error al publicar el video'
        });
      }
    }
  });

  // Eliminar un canal
  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      await refreshCSRFToken();
      const response = await api.delete(`/api/youtube/channels/${channelId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/youtube/channels'] });
      toast.success('Canal eliminado correctamente');
    },
    onError: (error: any) => {
      console.error('Error al eliminar canal:', error);
      toast.error('Error al eliminar canal', {
        description: error.response?.data?.message || 'Se produjo un error al eliminar el canal'
      });
    }
  });

  return {
    // Queries
    channels,
    isLoadingChannels,
    refetchChannels,
    getProjectChannels,
    getDefaultProjectChannel,
    checkChannelAuthorization,
    
    // Mutations
    createChannel: createChannelMutation.mutate,
    deleteChannel: deleteChannelMutation.mutate,
    linkChannelToProject: linkChannelToProjectMutation.mutate,
    unlinkChannelFromProject: unlinkChannelFromProjectMutation.mutate,
    getAuthUrl: getAuthUrlMutation.mutate,
    publishVideoToYoutube: publishVideoToYoutubeMutation.mutate,
    
    // Mutation states
    isCreatingChannel: createChannelMutation.isPending,
    isDeletingChannel: deleteChannelMutation.isPending,
    isLinkingChannel: linkChannelToProjectMutation.isPending,
    isUnlinkingChannel: unlinkChannelFromProjectMutation.isPending,
    isGettingAuthUrl: getAuthUrlMutation.isPending,
    isPublishingVideo: publishVideoToYoutubeMutation.isPending,
  };
}