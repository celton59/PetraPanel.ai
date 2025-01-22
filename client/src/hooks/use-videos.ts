import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Video, VideoStatus } from "@db/schema";
import { useToast } from "./use-toast";

// Tipos para metadata y sub-estados
export interface VideoMetadata {
  roleView?: {
    youtuber?: {
      status: 'video_disponible' | 'asignado' | 'completado';
      hideAssignment: boolean;
    };
    optimizer?: {
      status: 'disponible' | 'pendiente_revision' | 'en_revision' | 'completado';
      lastReviewedBy?: {
        userId: number;
        username: string;
        timestamp: string;
      };
    };
    reviewer?: {
      titleReview?: {
        status: 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';
        assignedAt?: string;
        lastUpdated?: string;
        comments?: string;
        history?: {
          status: string;
          timestamp: string;
          userId: number;
          username: string;
          comments?: string;
        }[];
      };
      contentReview?: {
        status: 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';
        assignedAt?: string;
        lastUpdated?: string;
        reviewAspects?: {
          titleQuality?: boolean;
          descriptionQuality?: boolean;
          thumbnailQuality?: boolean;
          videoQuality?: boolean;
        };
        comments?: string;
        history?: {
          status: string;
          timestamp: string;
          userId: number;
          username: string;
          comments?: string;
          changedAspects?: string[];
        }[];
      };
    };
  };
  optimization?: {
    assignedTo?: {
      userId: number;
      username: string;
      assignedAt: string;
    };
    reviewedBy?: {
      userId: number;
      username: string;
      approved: boolean;
      reviewedAt: string;
      comments?: string;
    };
    optimizedBy?: {
      userId: number;
      username: string;
      optimizedAt: string;
    };
  };
  secondaryStatus?: {
    type: 'title_approved' | 'needs_review' | 'in_review';
    timestamp: string;
    updatedBy?: {
      userId: number;
      username: string;
    };
  };
  customStatus?: 'en_revision' | 'needs_attention';
}

interface MediaCorrections {
  needsVideoCorrection: boolean;
  needsThumbnailCorrection: boolean;
  originalVideoUrl: string | null;
  originalThumbnailUrl: string | null;
}

export interface UpdateVideoData {
  title?: string;
  description?: string | null;
  status?: VideoStatus;
  optimizedTitle?: string | null;
  optimizedDescription?: string | null;
  tags?: string | null;
  currentReviewerId?: number | null;
  lastReviewComments?: string | null;
  mediaCorrections?: MediaCorrections;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  metadata?: VideoMetadata;
}

// Añadir la función determineNextStatus
export const determineNextStatus = (currentStatus: VideoStatus, userRole: string): VideoStatus | undefined => {
  // Si el usuario es viewer o el rol no existe, no cambiamos el estado
  if (userRole === 'viewer' || !userRole) {
    return undefined;
  }

  // Mapa de transiciones automáticas al asignar un video
  const autoTransitions: Record<string, Record<VideoStatus, VideoStatus | undefined>> = {
    optimizer: {
      pending: 'in_progress',  // Permitir que el optimizador cambie de pending a in_progress
      title_corrections: 'in_progress',
      in_progress: undefined,
      optimize_review: undefined,
      upload_review: undefined,
      youtube_ready: undefined,
      review: undefined,
      media_corrections: undefined,
      completed: undefined
    },
    reviewer: {
      pending: undefined,
      in_progress: undefined,
      title_corrections: undefined,
      optimize_review: 'youtube_ready',
      upload_review: 'optimize_review',
      youtube_ready: undefined,
      review: undefined,
      media_corrections: 'upload_review',
      completed: undefined
    },
    uploader: {
      pending: undefined,
      in_progress: undefined,
      title_corrections: undefined,
      optimize_review: undefined,
      upload_review: undefined,
      youtube_ready: undefined,
      review: undefined,
      media_corrections: 'upload_review',
      completed: undefined
    },
    admin: {
      pending: 'in_progress',
      in_progress: undefined,
      title_corrections: 'in_progress',
      optimize_review: 'youtube_ready',
      upload_review: 'optimize_review',
      youtube_ready: undefined,
      review: undefined,
      media_corrections: 'upload_review',
      completed: undefined
    }
  };

  return autoTransitions[userRole]?.[currentStatus];
};

const statusTransitions: Record<string, Record<VideoStatus, VideoStatus[]>> = {
  optimizer: {
    pending: ["in_progress"],  // Permitir que el optimizador vea y trabaje con videos pending
    in_progress: ["optimize_review"],
    title_corrections: ["optimize_review"],
    optimize_review: ["youtube_ready"],
    upload_review: ["youtube_ready"],
    youtube_ready: ["completed"],
    review: [],
    media_corrections: [],
    completed: []
  },
  reviewer: {
    pending: [],
    in_progress: [],
    title_corrections: [],
    optimize_review: ["title_corrections", "upload_review", "youtube_ready"],
    upload_review: ["optimize_review", "youtube_ready"],
    youtube_ready: ["completed"],
    review: [],
    media_corrections: ["upload_review", "youtube_ready"],
    completed: []
  },
  uploader: {
    pending: [],
    in_progress: [],
    title_corrections: [],
    optimize_review: ["youtube_ready"],
    upload_review: ["optimize_review", "youtube_ready"],
    youtube_ready: ["completed"],
    review: [],
    media_corrections: ["upload_review", "youtube_ready"],
    completed: []
  },
  admin: {
    pending: ["in_progress"],
    in_progress: ["optimize_review", "youtube_ready"],
    title_corrections: ["optimize_review", "youtube_ready"],
    optimize_review: ["youtube_ready", "completed"],
    upload_review: ["optimize_review", "youtube_ready", "completed"],
    youtube_ready: ["completed"],
    review: [],
    media_corrections: ["upload_review", "youtube_ready", "completed"],
    completed: []
  }
};

const canUpdateVideoStatus = (currentRole: string, currentStatus: VideoStatus, newStatus: VideoStatus): boolean => {
  // Si es admin, permitir todas las transiciones
  if (currentRole === 'admin') {
    return true;
  }

  // Si el estado actual es in_progress y el rol es optimizer, permitir la edición
  if (currentStatus === 'in_progress' && currentRole === 'optimizer') {
    return true;
  }

  const allowedTransitions = statusTransitions[currentRole]?.[currentStatus] || [];
  return newStatus ? allowedTransitions.includes(newStatus) : true;
};

// Función mejorada para obtener el estado efectivo considerando metadata
const getEffectiveStatus = (video: any, userRole?: string, currentUser?: any) => {
  const roleStatus = getRoleStatus(video.status as VideoStatus);

  // Verificar si el rol actual tiene acceso al video
  if (!roleStatus[userRole as string] || roleStatus[userRole as string] === 'no_disponible') {
    return 'no_disponible';
  }

  // Si el video tiene un estado personalizado en metadata, tiene prioridad
  if (video.metadata?.customStatus) {
    return video.metadata.customStatus;
  }

  // Estados específicos por rol
  switch (userRole) {
    case 'youtuber':
      if (video.status === 'upload_review' || video.status === 'youtube_ready') {
        return video.currentReviewerId === currentUser?.id ? 'asignado' : 'video_disponible';
      }
      break;

    case 'optimizer':
      if (['pending', 'in_progress', 'optimize_review', 'title_corrections'].includes(video.status)) {
        return video.metadata?.optimization?.assignedTo?.userId === currentUser?.id ?
          'en_proceso' : 'disponible';
      }
      break;

    case 'reviewer':
      if (['optimize_review', 'title_corrections'].includes(video.status)) {
        if (!video.currentReviewerId) {
          return 'disponible';
        }
        return video.currentReviewerId === currentUser?.id ? 'revisando_titulo' : 'en_revision';
      }
      break;

    case 'uploader':
      if (['media_corrections', 'youtube_ready'].includes(video.status)) {
        return 'disponible';
      }
      break;
  }

  // Si no hay estados especiales, devolver el estado basado en el rol
  return roleStatus[userRole as string] || video.status;
};

const getRoleStatus = (status: VideoStatus): Record<string, string> => {
  const roleStatuses = {
    pending: {
      optimizer: 'disponible', // Optimizer puede ver títulos pendientes para optimizar
      reviewer: 'no_disponible', // Reviewer no necesita ver títulos pendientes
      youtuber: 'no_disponible', // Youtuber no debe ver títulos en proceso
      uploader: 'no_disponible' // Uploader no necesita ver títulos pendientes
    },
    in_progress: {
      optimizer: 'disponible', // Optimizer puede ver títulos en proceso
      reviewer: 'no_disponible',
      youtuber: 'no_disponible',
      uploader: 'no_disponible'
    },
    optimize_review: {
      optimizer: 'disponible', // Optimizer puede ver títulos en revisión
      reviewer: 'disponible', // Reviewer necesita ver títulos para revisar
      youtuber: 'no_disponible',
      uploader: 'no_disponible'
    },
    title_corrections: {
      optimizer: 'disponible', // Optimizer puede ver títulos que necesitan correcciones
      reviewer: 'disponible', // Reviewer puede ver títulos para verificar correcciones
      youtuber: 'no_disponible',
      uploader: 'no_disponible'
    },
    media_corrections: {
      optimizer: 'no_disponible',
      reviewer: 'no_disponible',
      youtuber: 'disponible', // Youtuber puede ver títulos cuando hay correcciones de media
      uploader: 'disponible' // Uploader puede ver títulos durante correcciones
    },
    upload_review: {
      optimizer: 'no_disponible',
      reviewer: 'no_disponible',
      youtuber: 'disponible', // Youtuber puede ver títulos durante la revisión de subida
      uploader: 'disponible' // Uploader puede ver títulos durante la revisión
    },
    youtube_ready: {
      optimizer: 'no_disponible',
      reviewer: 'no_disponible',
      youtuber: 'disponible', // Youtuber puede ver títulos listos para YouTube
      uploader: 'disponible' // Uploader puede ver títulos listos
    },
    completed: {
      optimizer: 'no_disponible',
      reviewer: 'no_disponible',
      youtuber: 'disponible', // Youtuber puede ver títulos completados
      uploader: 'disponible' // Uploader puede ver títulos completados
    }
  };
  return roleStatuses[status] || {};
};


export function useVideos(projectId?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = projectId ? [`/api/projects/${projectId}/videos`] : ['/api/videos'];

  const { data: videos, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(queryKey[0], {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Error al cargar los videos");
      }
      return res.json();
    },
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Datos considerados frescos por 5 minutos
    gcTime: 30 * 60 * 1000 // Tiempo de recolección de basura (antes cacheTime)
  });

  const createVideoMutation = useMutation({
    mutationFn: async (video: Pick<Video, "title" | "description" | "projectId">) => {
      const res = await fetch(`/api/projects/${video.projectId}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(video),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Error al crear el video");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${data.projectId}/videos`] });
      toast({
        title: "Video creado",
        description: "El video se ha creado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el video",
        variant: "destructive",
      });
    },
  });

  const updateVideoMutation = useMutation({
    mutationFn: async ({ videoId, data, currentRole, currentUser }: { videoId: number; data: UpdateVideoData; currentRole: string; currentUser?: any }) => {
      if (data.status && videos) {
        const currentVideo = videos.find((v: Video) => v.id === videoId);
        if (currentVideo && !canUpdateVideoStatus(currentRole, currentVideo.status as VideoStatus, data.status)) {
          throw new Error("No tienes permiso para realizar esta transición de estado");
        }
      }

      const res = await fetch(`/api/videos/${videoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Error al actualizar el video");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Video actualizado",
        description: "El video se ha actualizado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el video",
        variant: "destructive",
      });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: number) => {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Error al eliminar el video");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Video eliminado",
        description: "El video se ha eliminado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el video",
        variant: "destructive",
      });
    },
  });

  return {
    videos: videos?.map((video: any) => ({ ...video, effectiveStatus: getEffectiveStatus(video, localStorage.getItem('userRole'), JSON.parse(localStorage.getItem('currentUser') || '{}')) })),
    isLoading,
    createVideo: createVideoMutation.mutateAsync,
    updateVideo: updateVideoMutation.mutateAsync,
    deleteVideo: deleteVideoMutation.mutateAsync,
  };
}