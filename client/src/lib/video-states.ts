import { VideoStatus } from "@db/schema";

export type VideoStateTransition = {
  from: VideoStatus;
  to: VideoStatus;
  allowedRoles: string[];
};

// Definir el flujo de estados como un grafo direccionado
export const VIDEO_STATE_FLOW: Record<VideoStatus, VideoStatus | null> = {
  // Estado inicial
  "pending": null,

  // Flujo de optimización
  "in_progress": "pending",
  "optimize_review": "in_progress",
  "title_corrections": "optimize_review",

  // Flujo de contenido
  "content_review": "title_corrections",
  "content_corrections": "content_review",

  // Flujo de media
  "available": "content_review",
  "upload_media": "media_review", // Cambiado: al desasignar vuelve a media_review
  "media_review": "content_review",
  "media_corrections": "media_review",

  // Estados finales
  "youtube_ready": "media_review",
  "completed": "youtube_ready",
  "en_revision": "completed"
};

// Definir los permisos de reversión por rol
export const REVERT_PERMISSIONS: Record<string, VideoStatus[]> = {
  "admin": Object.keys(VIDEO_STATE_FLOW) as VideoStatus[],
  "optimizer": ["in_progress", "optimize_review", "title_corrections"],
  "content_reviewer": ["content_review", "content_corrections"],
  "media_reviewer": ["media_review", "media_corrections"],
  "youtuber": ["upload_media", "media_corrections"],
  "reviewer": ["optimize_review", "title_corrections", "youtube_ready", "completed"]
};

// Función para obtener el estado anterior según el rol y estado actual
export function getPreviousState(currentState: VideoStatus): VideoStatus | null {
  return VIDEO_STATE_FLOW[currentState];
}

// Función para verificar si un usuario puede revertir un estado
export function canRevertState(userRole: string, currentState: VideoStatus): boolean {
  return REVERT_PERMISSIONS[userRole]?.includes(currentState) ?? false;
}

// Función para verificar si un video puede ser desasignado
export function canUnassignVideo(userRole: string, videoStatus: VideoStatus): boolean {
  // Solo admin y youtuber pueden desasignar videos
  if (userRole !== "admin" && userRole !== "youtuber") return false;

  // Youtubers solo pueden desasignar videos en estados específicos
  if (userRole === "youtuber") {
    return ["upload_media", "media_corrections"].includes(videoStatus);
  }

  // Admin puede desasignar en cualquier estado excepto los finales
  return !["completed", "youtube_ready", "en_revision"].includes(videoStatus);
}

// Función para obtener el estado al que debe volver un video cuando es desasignado
export function getUnassignedState(currentState: VideoStatus): VideoStatus {
  switch (currentState) {
    case "upload_media":
      return "media_review"; // Vuelve al estado de revisión de media
    case "media_corrections":
      return "media_review"; // También vuelve al estado de revisión de media
    default:
      return "available"; // Por defecto vuelve a disponible (para casos no manejados)
  }
}