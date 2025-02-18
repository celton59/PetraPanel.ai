import { VideoStatus, Video, User } from "@db/schema";



// Etiquetas específicas por rol
const roleSpecificLabels: Record<User['role'], Partial<Record<VideoStatus | string, string | ((previousStatus: string, metadata?: any, video?: any) => string)>>> = {
  optimizer: {
    pending: "Disponible",
    in_progress: "En Proceso",
    optimize_review: "En Revisión",
    title_corrections: "Con Correcciones",
    completed: "Completado",
    upload_review: "Completado",
    media_corrections: "Completado",
    youtube_ready: "Completado",
    disponible: "Título Disponible",
    en_revision: "En Revisión",
    needs_attention: "Necesita Atención"
  },
  reviewer: {
    optimize_review: (previousStatus: string, metadata?: any, video?: any) => {
      if (video?.title_corrected) {
        return "Corregido";
      }
      if (metadata?.optimization?.approvalHistory?.length > 0) {
        const lastAction = metadata.optimization.approvalHistory[metadata.optimization.approvalHistory.length - 1];
        if (lastAction.action === 'rejected') {
          return "A Revisar";
        }
      }
      if (metadata?.secondaryStatus?.type === 'title_rejected') {
        return "A Revisar";
      }
      return "Disponible";
    },
    title_corrections: "Correcciones de Título",
    upload_review: "Rev. Archivos",
    en_revision: "En Revisión"
  },
  youtuber: {
    video_disponible: "Video Disponible",
    asignado: "Asignado",
    youtube_ready: "Listo para YouTube"
  },
  uploader: {},
  admin: {}
};

// Etiquetas predeterminadas
const defaultLabels: Record<VideoStatus | string, string> = {
  pending: "Pendiente",
  in_progress: "En Proceso",
  title_corrections: "Correcciones de Título",
  optimize_review: "Rev. Optimización",
  upload_review: "Rev. Archivos",
  youtube_ready: "Listo YouTube",
  review: "Rev. Final",
  media_corrections: "Correcciones de Archivos",
  completed: "Completado",
  en_revision: "En Revisión",
  needs_attention: "Necesita Atención"
};

export const getStatusLabel = (status: VideoStatus | string, role?: User['role'], previousStatus?: string, video?: any): string => {
  // 1. Buscar etiqueta específica del rol
  if (role && roleSpecificLabels[role]?.[status]) {
    const label = roleSpecificLabels[role][status];
    return typeof label === 'function' ? label(previousStatus || '', undefined, video) : label;
  }

  // 2. Si no hay etiqueta específica, usar la predeterminada
  return defaultLabels[status] || status;
};


const statusLabels: Record<VideoStatus, string> = {
    pending: "Disponible",
    in_progress: "En Proceso",
    optimize_review: "En Revisión",
    title_corrections: "Necesita Correcciones",
    completed: "Completado",
    upload_review: "Revisión de subida",
    media_corrections: "Necesita Correcciones",
    youtube_ready: "Listo para Youtube",
    review: "En revisión"    
}


export function getStatusLabelNew (role: User['role'], video: Video): string {

  if ( role === 'reviewer' && video.status === 'optimize_review' && video.contentReviewComments?.at(0)) {
      return 'Corregido'
  }
  else 
    return statusLabels[video.status]
    
};