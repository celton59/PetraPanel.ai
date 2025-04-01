import type { NextFunction, Request, Response } from "express";
import { eq, and, desc, getTableColumns, aliasedTable, isNull, inArray, or, sql, asc } from "drizzle-orm";
import {
  videos,
  users,
  projects,
  InsertVideo,
  User,
  projectAccess,
  VIDEO_STATUSES_ARRAY,
  VideoStatus,
} from "@db/schema";
import { db } from "@db";
import { z } from "zod";
import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  generateS3Key,
  initiateMultipartUpload as initiateS3Upload,
  completeMultipartUpload as completeS3Upload,
  abortMultipartUpload as abortS3Upload,
  getSignedUploadUrl,
  s3,
  getSignedUrl
} from "../services/s3"
import { canYoutuberTakeMoreVideos } from "../utils/youtuber-utils";
import { scanVideoForAffiliates } from "../controllers/affiliateController";

// Cliente S3 para métodos antiguos
import { type Express } from "express";
import multer from "multer";

const bucketName = process.env.AWS_BUCKET_NAME || "petrafiles";
const awsRegion = process.env.AWS_REGION || "eu-west-1";

const contentReviewer = aliasedTable(users, "contentReviewer");
const mediaReviewer = aliasedTable(users, "mediaReviewer");
const optimizer = aliasedTable(users, "optimizer");
const creator = aliasedTable(users, "creator");
const uploader = aliasedTable(users, "uploader");
const deleter = aliasedTable(users, "deleter");

const statusTransitions: Record<
  User["role"],
  Record<VideoStatus, VideoStatus[]>
> = {
  optimizer: {
    available: ["content_review"],
    content_corrections: ["content_review"],
    content_review: [],
    upload_media: [],
    media_corrections: [],
    media_review: [],
    final_review: [],
    completed: []
  },
  reviewer: {
    available: [],
    content_corrections: [],
    content_review: ["upload_media", 'content_corrections'],
    media_corrections: [],
    media_review: ["media_corrections", "final_review"],
    final_review: [],
    upload_media: [],
    completed: [],
  },
  content_reviewer: {
    available: [],
    content_corrections: [],
    content_review: ["upload_media", 'content_corrections'],
    media_corrections: [],
    media_review: [],
    final_review: [],
    upload_media: [],
    completed: [],
  },
  media_reviewer: {
    available: [],
    content_corrections: [],
    content_review: [],
    media_corrections: [],
    media_review: ["media_corrections", "final_review"],
    final_review: [],
    upload_media: [],
    completed: [],
  },
  admin: {
    // Validation not applied to admins
    available: [],
    content_corrections: [],
    content_review: [],
    media_corrections: [],
    media_review: [],
    final_review: [],
    upload_media: [],
    completed: []
  },
  youtuber: {
    available: [],
    content_corrections: [],
    content_review: [],
    media_corrections: ['media_review'],
    upload_media: ['media_review'],
    media_review: [],
    final_review: [],
    completed: []
  },
};

const updateVideoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z
    .enum(VIDEO_STATUSES_ARRAY)
    .optional(),
  tags: z.string().optional(),
  optimizedBy: z.number().optional(),
  optimizedDescription: z.string().optional(),
  optimizedTitle: z.string().optional(),
  contentReviewComments: z.string().array().optional(),
  contentReviewedBy: z.number().optional(),
  mediaReviewComments: z.string().array().optional(),
  mediaReviewedBy: z.number().optional(),
  mediaVideoNeedsCorrection: z.boolean().optional(),
  mediaThumbnailNeedsCorrection: z.boolean().optional(),
  contentUploadedBy: z.number().optional(),
  videoUrl: z.string().optional(),
});

type UpdateVideoSchema = z.infer<typeof updateVideoSchema>;

async function updateVideo(req: Request, res: Response): Promise<Response> {
  if (!req.user?.role)
    return res
      .status(403)
      .json({
        success: false,
        message: "No tienes permisos para editar videos",
      });

  const projectId = parseInt(req.params.projectId);
  const videoId = parseInt(req.params.videoId);
  const updates = req.body as UpdateVideoSchema;

  // Validar body con schema
  const validationResult = updateVideoSchema.safeParse(updates);
  if (!validationResult.success) {
    return res
      .status(400)
      .json({ success: false, message: validationResult.error.message });
  }

  try {
    // Obtener el video actual para preservar los datos existentes
    const [currentVideo] = await db
      .select()
      .from(videos)
      .where(and(eq(videos.id, videoId), eq(videos.projectId, projectId)))
      .limit(1);

    if (!currentVideo) {
      return res
        .status(404)
        .json({ success: false, message: "Video no encontrado" });
    }

    if (
      updates.status &&
      req.user.role !== "admin" &&
      !statusTransitions[req.user.role][currentVideo.status].includes(
        updates.status as VideoStatus,
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "No se puede actualizar a este estado",
        });
    }

    // Si el video está en estado "upload_media" y ya está asignado a otro youtuber, no permitir que otro lo tome
    if (req.user.role === "youtuber" &&
      currentVideo.status === "upload_media" &&
      currentVideo.contentUploadedBy !== null &&
      currentVideo.contentUploadedBy !== req.user.id) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Este video ya está siendo trabajado por otro youtuber",
        });
    }

    // Si se asigna un optimizador y el estado sigue siendo "available", actualizar estado a "en progreso"
    let updatedStatus = updates.status as VideoStatus;
    if (updates.optimizedBy && !updates.status && currentVideo?.status === "available") {
      updatedStatus = "content_corrections"; // Usamos content_corrections para indicar que está en progreso de optimización
    }

    // Para los youtubers que empiezan a trabajar en un video, verificamos el límite y luego asignamos
    if (req.user.role === "youtuber" &&
      currentVideo.status === "upload_media" &&
      !currentVideo.contentUploadedBy) {

      // Verificar el límite solo si el youtuber intenta asignarse el video a sí mismo
      if (!updates.contentUploadedBy) {
        // Verificar si el youtuber ha alcanzado su límite de videos
        const { canTakeMore, currentCount, maxAllowed } = await canYoutuberTakeMoreVideos(req.user.id);

        if (!canTakeMore) {
          return res.status(403).json({
            success: false,
            message: `Has alcanzado tu límite de ${maxAllowed} videos asignados simultáneamente`,
            currentCount,
            maxAllowed
          });
        }

        // Si no ha alcanzado el límite, asignamos el video al usuario actual
        updates.contentUploadedBy = req.user.id;
      }
    }

    // Actualizar el video con la metadata combinada
    const [result] = await db
      .update(videos)
      .set({
        title: updates.title,
        description: updates.description,
        status: updatedStatus,
        updatedAt: new Date(),
        optimizedBy: updates.optimizedBy,
        optimizedDescription: updates.optimizedDescription,
        tags: updates.tags,
        optimizedTitle: updates.optimizedTitle,
        contentReviewComments: updates.contentReviewComments,
        contentReviewedBy: updates.contentReviewedBy,
        contentLastReviewedAt: updates.contentReviewedBy ? new Date() : null,
        mediaReviewComments: updates.mediaReviewComments,
        mediaReviewedBy: updates.mediaReviewedBy,
        mediaLastReviewedAt: updates.mediaReviewedBy ? new Date() : null,
        mediaVideoNeedsCorrection: updates.mediaVideoNeedsCorrection,
        mediaThumbnailNeedsCorrection: updates.mediaThumbnailNeedsCorrection,
        contentUploadedBy: updates.contentUploadedBy,
        videoUrl: updates.videoUrl,
      })
      .where(and(eq(videos.id, videoId), eq(videos.projectId, projectId)))
      .returning();

    // Si se actualizó el título, escanear para detectar afiliados fuera de la transacción
    if (updates.title && result) {
      try {
        console.log(`🔍 Escaneando video ${result.id} con título actualizado "${updates.title}" fuera de la transacción...`);
        await scanVideoForAffiliates(result.id, updates.title);
      } catch (affError) {
        console.error(`❌ Error al escanear afiliados para video ${result.id} después de actualizar título:`, affError);
      }
    }

    return res
      .status(200)
      .json({
        success: true,
        data: result,
        message: "Video actualizado correctamente",
      });
  } catch (error) {
    console.error("Error updating video:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error al actualizar el video" });
  }
}

const videoToReviewSchema = z.object({
  optimizedBy: z.number().optional(),
  optimizedDescription: z.string().optional(),
  optimizedTitle: z.string().optional(),
});
type VideoToReviewSchema = z.infer<typeof videoToReviewSchema>;

async function sendVideoToReview(req: Request, res: Response): Promise<Response> {
  if (!req.user?.role)
    return res.status(403)
      .json({ success: false, message: "No tienes permisos para editar videos" });

  const videoId = parseInt(req.params.videoId);
  const updates = req.body as VideoToReviewSchema;

  // Validar body con schema
  const validationResult = videoToReviewSchema.safeParse(updates);
  if (!validationResult.success) {
    return res.status(400).json({ success: false, message: validationResult.error.message });
  }

  try {
    // Obtener el video actual para preservar los datos existentes
    const [currentVideo] = await db
      .select()
      .from(videos)
      .where( eq(videos.id, videoId) )
      .limit(1);

    if (!currentVideo) {
      return res.status(404).json({ success: false, message: "Video no encontrado" });
    }

    if (currentVideo.status !== 'available' && currentVideo.status != 'content_corrections') {
      return res.status(400).json({ success: false, message: "No se puede enviar este video a revisión" })
    }

    // Actualizar el video
    const [result] = await db
      .update(videos)
      .set({
        status: 'content_review',
        updatedAt: new Date(),
        optimizedBy: updates.optimizedBy,
        optimizedDescription: updates.optimizedDescription,
        optimizedTitle: updates.optimizedTitle,
      })
      .where( eq(videos.id, videoId) )
      .returning();

    return res.status(200).json({
        success: true,
        data: result,
        message: "Video actualizado correctamente",
      });
  } catch (error) {
    console.error("Error updating video:", error);
    return res.status(500)
      .json({ success: false, message: "Error al actualizar el video" });
  }
}


async function deleteVideo(req: Request, res: Response): Promise<Response> {
  const projectId = parseInt(req.params.projectId);
  const videoId = parseInt(req.params.videoId);
  const permanent = req.query.permanent === 'true';

  // Para eliminación solo administradores
  if (req.user!.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Solo los administradores pueden eliminar videos",
    });
  }

  try {
    // Buscar el video asegurándose que no esté ya en la papelera (a menos que sea eliminación permanente)
    const [video] = await db
      .select()
      .from(videos)
      .where(and(
        eq(videos.id, videoId),
        eq(videos.projectId, projectId),
        permanent ? undefined : eq(videos.isDeleted, false)
      ))
      .limit(1);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: permanent ? "Video no encontrado" : "Video no encontrado o ya está en la papelera",
      });
    }


    if (permanent) {
      // Eliminación permanente
      const [result] = await db
        .delete(videos)
        .where(and(eq(videos.id, videoId), eq(videos.projectId, projectId)))
        .returning();

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Video no encontrado",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Video eliminado permanentemente",
      });
    } else {
      // Mover a la papelera (eliminación lógica)
      const [result] = await db
        .update(videos)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.user!.id
        })
        .where(and(eq(videos.id, videoId), eq(videos.projectId, projectId)))
        .returning();

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Video no encontrado",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Video movido a la papelera",
      });
    }
  } catch (error) {
    console.error("Error procesando el video:", error);
    return res.status(500).json({
      success: false,
      message: permanent ? "Error al eliminar el video permanentemente" : "Error al mover el video a la papelera",
    });
  }
}

/**
 * Asigna un video a un youtuber cuando lo visualiza
 * @param req Request con ID del video y proyecto
 * @param res Response con el resultado de la asignación
 * @returns Response con resultado de la operación
 */
async function assignVideoToYoutuber(req: Request, res: Response): Promise<Response> {
  try {
    const projectId = parseInt(req.params.projectId);
    const videoId = parseInt(req.params.videoId);

    // Verificar que el usuario sea un youtuber
    if (req.user!.role !== "youtuber") {
      return res.status(403).json({
        success: false,
        message: "Solo los youtubers pueden ser asignados a videos"
      });
    }

    // Verificar que el video exista y esté en estado upload_media
    const [video] = await db
      .select()
      .from(videos)
      .where(and(
        eq(videos.id, videoId),
        eq(videos.projectId, projectId),
        eq(videos.status, "upload_media"),
        eq(videos.isDeleted, false)
      ))
      .limit(1);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video no encontrado o no está en estado de carga de medios"
      });
    }

    // Verificar si el video ya está asignado a otro youtuber
    if (video.contentUploadedBy !== null && video.contentUploadedBy !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: "Este video ya está asignado a otro youtuber"
      });
    }

    // Si ya está asignado al mismo youtuber, no hacemos nada
    if (video.contentUploadedBy === req.user!.id) {
      return res.status(200).json({
        success: true,
        message: "El video ya está asignado a este youtuber",
        videoId
      });
    }

    // Verificar si el youtuber ha alcanzado su límite de videos
    const { canTakeMore, currentCount, maxAllowed } = await canYoutuberTakeMoreVideos(req.user!.id);

    console.log(`Usuario ${req.user!.id} - Límite de videos:`, { canTakeMore, currentCount, maxAllowed });

    if (!canTakeMore) {
      return res.status(403).json({
        success: false,
        message: `Has alcanzado tu límite de ${maxAllowed} videos asignados simultáneamente`,
        currentCount,
        maxAllowed
      });
    }

    // Asignar el video al youtuber actual
    const [updatedVideo] = await db
      .update(videos)
      .set({
        contentUploadedBy: req.user!.id
      })
      .where(and(
        eq(videos.id, videoId),
        eq(videos.projectId, projectId)
      ))
      .returning();

    if (!updatedVideo) {
      return res.status(500).json({
        success: false,
        message: "Error al asignar el video"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Video asignado correctamente",
      videoId,
      currentCount: currentCount + 1, // Incrementar porque acabamos de asignar uno
      maxAllowed
    });

  } catch (error: any) {
    console.error("Error al asignar video:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error al asignar el video",
      stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined
    });
  }
}

/**
 * Elimina o mueve a la papelera múltiples videos en masa
 * @param req Request con IDs de videos a eliminar
 * @param res Response
 * @returns Response con resultado de la operación
 */
async function bulkDeleteVideos(req: Request, res: Response): Promise<Response> {
  const projectId = parseInt(req.params.projectId);
  const { videoIds } = req.body;
  const permanent = req.query.permanent === 'true';

  // Para eliminación permanente solo administradores
  if (req.user!.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Solo los administradores pueden eliminar videos en masa",
    });
  }

  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Se requiere un array de IDs de videos a eliminar",
    });
  }

  try {
    // Validar que todos los IDs sean números
    const validVideoIds = videoIds.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));

    if (validVideoIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No se proporcionaron IDs de video válidos",
      });
    }

    // Utilizar transacción para asegurar que la operación sea atómica
    const results = await db.transaction(async (tx) => {
      // Verificar que todos los videos pertenezcan al proyecto y no estén ya en la papelera (para no permanentes)
      const videosToProcess = await tx
        .select({
          id: videos.id,
          createdBy: videos.createdBy
        })
        .from(videos)
        .where(and(
          eq(videos.projectId, projectId),
          inArray(videos.id, validVideoIds),
          permanent ? undefined : eq(videos.isDeleted, false)
        ));

      const foundIds = videosToProcess.map(v => v.id);

      if (videosToProcess.length === 0) {
        return {
          processed: 0,
          notFound: validVideoIds.length,
          notAuthorized: videosToProcess.length - foundIds.length
        };
      }

      if (permanent) {
        // Eliminar los videos permanentemente
        await tx
          .delete(videos)
          .where(and(
            eq(videos.projectId, projectId),
            inArray(videos.id, foundIds)
          ));
      } else {
        // Mover a la papelera (eliminación lógica)
        await tx
          .update(videos)
          .set({
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: req.user!.id
          })
          .where(and(
            eq(videos.projectId, projectId),
            inArray(videos.id, foundIds)
          ));
      }

      return {
        processed: foundIds.length,
        notFound: validVideoIds.length - videosToProcess.length,
        notAuthorized: videosToProcess.length - foundIds.length
      };
    });

    const action = permanent ? "eliminados permanentemente" : "movidos a la papelera";
    let message = `${results.processed} videos ${action} correctamente`;

    if (results.notFound > 0) {
      message += `, ${results.notFound} no encontrados`;
    }

    if (results.notAuthorized > 0) {
      message += `, ${results.notAuthorized} sin autorización`;
    }

    return res.status(200).json({
      success: true,
      message,
      processed: results.processed,
      notFound: results.notFound,
      notAuthorized: results.notAuthorized
    });
  } catch (error) {
    console.error("Error procesando videos en masa:", error);
    return res.status(500).json({
      success: false,
      message: permanent ? "Error al eliminar los videos permanentemente" : "Error al mover los videos a la papelera",
    });
  }
}

async function getVideos(req: Request, res: Response): Promise<Response> {
  // Parámetros de paginación (obligatorios)
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const sortField = (req.query.sortField as string) || 'updatedAt';
  const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

  // Validar parámetros de paginación
  if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
    return res.status(400).json({
      success: false,
      message: "Los parámetros de paginación son inválidos. 'page' y 'limit' son requeridos y deben ser números positivos."
    });
  }

  // Calcular el offset
  const offset = (page - 1) * limit;

  try {
    // Verificar si queremos mostrar elementos de la papelera
    const showDeleted = req.query.trash === 'true';

    // Preparamos los filtros comunes tanto para el count como para la consulta principal
    const commonFilters = and(
      // Filtro de papelera - mostrar solo videos en papelera o no en papelera según el parámetro
      showDeleted ? eq(videos.isDeleted, true) : eq(videos.isDeleted, false),

      // Filtros segun rol
      or(
        req.user?.role === "optimizer"
          ? eq(videos.status, "available")
          : undefined,
        req.user?.role === "optimizer"
          ? eq(videos.status, "content_corrections")
          : undefined,
        req.user?.role === "optimizer"
          ? eq(videos.optimizedBy, req.user!.id!)
          : undefined,
        req.user?.role === "optimizer"
          ? isNull(videos.optimizedBy)
          : undefined,
        req.user?.role === "reviewer" || req.user?.role === "content_reviewer"
          ? eq(videos.status, "content_review")
          : undefined,
        req.user?.role === "reviewer" || req.user?.role === "content_reviewer"
          ? eq(videos.contentReviewedBy, req.user!.id!)
          : undefined,
        req.user?.role === "reviewer" || req.user?.role === "content_reviewer"
          ? isNull(videos.contentReviewedBy)
          : undefined,
        req.user?.role === "youtuber"
          ? eq(videos.status, "upload_media")
          : undefined,
        req.user?.role === "youtuber"
          ? eq(videos.status, "media_corrections")
          : undefined,
        req.user?.role === "youtuber"
          ? eq(videos.contentUploadedBy, req.user!.id!)
          : undefined,
        req.user?.role === "youtuber"
          ? isNull(videos.contentUploadedBy)
          : undefined,
        req.user?.role === "reviewer" || req.user?.role === "media_reviewer"
          ? eq(videos.status, "media_review")
          : undefined,
        req.user?.role === "reviewer" || req.user?.role === "media_reviewer"
          ? eq(videos.mediaReviewedBy, req.user!.id!)
          : undefined,
        req.user?.role === "reviewer" || req.user?.role === "media_reviewer"
          ? isNull(videos.mediaReviewedBy)
          : undefined,
      ),

      // Acceso a proyectos (para usuarios no administradores)
      req.user?.role !== "admin"
        ? eq(projectAccess.userId, req.user!.id!)
        : undefined,
    );

    // Consulta para obtener el total de videos con los mismos filtros
    const countQuery = db.select({
      count: sql`count(distinct ${videos.id})`.mapWith(Number)
    })
      .from(videos)
      .leftJoin(projectAccess, eq(projectAccess.projectId, videos.projectId))
      .where(commonFilters);

    const [countResult] = await countQuery.execute();

    // Construir el objeto de ordenamiento
    let orderBy: any = {};
    switch (sortField) {
      case 'title':
        orderBy = sortOrder === 'asc' ? asc(videos.title) : desc(videos.title);
        break;
      case 'status':
        orderBy = sortOrder === 'asc' ? asc(videos.status) : desc(videos.status);
        break;
      case 'seriesNumber':
        orderBy = sortOrder === 'asc' ? asc(videos.seriesNumber) : desc(videos.seriesNumber);
        break;
      case 'createdAt':
        orderBy = sortOrder === 'asc' ? asc(videos.createdAt) : desc(videos.createdAt);
        break;
      default:
        orderBy = desc(videos.updatedAt);
    }

    const query = db
      .selectDistinct({
        ...getTableColumns(videos),

        // Datos del content reviewer
        contentReviewerName: contentReviewer.fullName,
        contentReviewerUsername: contentReviewer.username,

        // Datos del media reviewer
        mediaReviewerName: mediaReviewer.fullName,
        mediaReviewerUsername: mediaReviewer.username,

        // Datos del uploader
        uploaderName: uploader.fullName,
        uploaderUsername: uploader.username,

        // Datos del creador
        creatorName: creator.fullName,
        creatorUsername: creator.username,

        // Datos del optimizador
        optimizerName: optimizer.fullName,
        optimizerUsername: optimizer.username,

        // Datos de quien eliminó el video
        deletedByName: deleter.fullName,
        deletedByUsername: deleter.username
      })
      .from(videos)
      .leftJoin(contentReviewer, eq(videos.contentReviewedBy, contentReviewer.id))
      .leftJoin(mediaReviewer, eq(videos.mediaReviewedBy, mediaReviewer.id))
      .leftJoin(creator, eq(videos.createdBy, creator.id))
      .leftJoin(optimizer, eq(videos.optimizedBy, optimizer.id))
      .leftJoin(uploader, eq(videos.contentUploadedBy, uploader.id))
      .leftJoin(deleter, eq(videos.deletedBy, deleter.id))
      .leftJoin(projectAccess, eq(projectAccess.projectId, videos.projectId))
      .where(commonFilters)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const result = await query.execute();

    // Calcular metadata de paginación
    const totalVideos = countResult?.count || 0;
    const totalPages = Math.ceil(totalVideos / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      videos: result,
      pagination: {
        page,
        limit,
        totalVideos,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error("❌ Error general en getVideos:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener los videos",
      error: error instanceof Error ? error.message : "Error desconocido",
      stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined
    });
  }
}

async function restoreVideo(req: Request, res: Response): Promise<Response> {
  const projectId = parseInt(req.params.projectId);
  const videoId = parseInt(req.params.videoId);

  try {
    // Verificar que el video exista y esté eliminado
    const [video] = await db
      .select()
      .from(videos)
      .where(and(
        eq(videos.id, videoId),
        eq(videos.projectId, projectId),
        eq(videos.isDeleted, true)
      ))
      .limit(1);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video no encontrado en la papelera",
      });
    }

    // Verificar permisos: el usuario debe ser admin o el creador del video
    if (req.user!.role !== "admin" && video.createdBy !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para restaurar este video",
      });
    }

    // Restaurar el video
    const [result] = await db
      .update(videos)
      .set({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null
      })
      .where(and(eq(videos.id, videoId), eq(videos.projectId, projectId)))
      .returning();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Error al restaurar el video",
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
      message: "Video restaurado correctamente",
    });
  } catch (error) {
    console.error("Error restaurando video:", error);
    return res.status(500).json({
      success: false,
      message: "Error al restaurar el video",
    });
  }
}

/**
 * Vacía la papelera (elimina permanentemente todos los videos en la papelera)
 * @param req Request con ID del proyecto
 * @param res Response
 * @returns Response con resultado de la operación
 */


async function emptyTrash(req: Request, res: Response): Promise<Response> {
  const projectId = parseInt(req.params.projectId);

  // Solo los administradores pueden vaciar la papelera
  if (req.user!.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Solo los administradores pueden vaciar la papelera",
    });
  }

  try {
    // Eliminar permanentemente todos los videos en la papelera del proyecto
    await db
      .delete(videos)
      .where(and(
        eq(videos.projectId, projectId),
        eq(videos.isDeleted, true)
      ));

    return res.status(200).json({
      success: true,
      message: "Papelera vaciada correctamente",
    });
  } catch (error) {
    console.error("Error vaciando la papelera:", error);
    return res.status(500).json({
      success: false,
      message: "Error al vaciar la papelera",
    });
  }
}

async function createVideo(req: Request, res: Response): Promise<Response> {
  const projectId = parseInt(req.params.projectId);
  const { title, description } = req.body;

  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Solo los administradores pueden crear videos",
    });
  }

  try {
    // Use transaction to ensure atomic operations
    const [result] = await db.transaction(async (tx) => {
      // Get project details
      const [project] = await tx
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!project) {
        throw new Error("Proyecto no encontrado");
      }

      // Generate series number
      const newNumber = (project.current_number || 0) + 1;
      const seriesNumber = project.prefix
        ? `${project.prefix}-${String(newNumber).padStart(4, "0")}`
        : String(newNumber).padStart(4, "0");

      // Update project's current number
      await tx
        .update(projects)
        .set({ current_number: newNumber })
        .where(eq(projects.id, projectId));

      // Create video
      const videoData: InsertVideo = {
        projectId,
        title,
        description,
        status: "available",
        seriesNumber,
        createdBy: req.user?.id,
      };

      const [video] = await tx.insert(videos).values(videoData).returning();
      return [video];
    });

    // Escanear el video para detectar afiliados fuera de la transacción
    if (result && result.title) {
      try {
        console.log(`🔍 Escaneando video ${result.id} con título "${result.title}" fuera de la transacción...`);
        await scanVideoForAffiliates(result.id, result.title);
      } catch (affError) {
        console.error(`❌ Error al escanear afiliados para video ${result.id}:`, affError);
      }
    }

    return res.json(result);
  } catch (error) {
    console.error("Error creating video:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Error al crear el video",
    });
  }
}

async function uploadThumbnail( req: Request, res: Response ): Promise<Response> {
  if (!req.user?.role)
    return res.status(403).json({ success: false, message: "No tienes permisos para editar videos" })

  const projectId = parseInt(req.params.projectId);
  const videoId = parseInt(req.params.videoId);

  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, message: "No se subió ningún archivo" });
  }

  try {

    const fileExtension = file.originalname.substring(file.originalname.lastIndexOf('.') + 1);
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension}`;
    const objectKey = `videos/thumbnail/${uniqueFilename}`; // Ruta simple y organizada

    const fileUrl = `https://${bucketName}.s3.${awsRegion}.amazonaws.com/${objectKey}`;

    // Si es una miniatura, procesarla con sharp en diferentes resoluciones
    // Crear versión optimizada para tamaño completo (1280x720)
    const processedImageFull = await sharp(file.buffer)
      .resize({
        width: 1280,
        height: 720,
        fit: 'cover',
        position: 'centre'
      })
      .jpeg({ quality: 90, progressive: true })
      .toBuffer();

    // Crear versión para vista previa (640x360)
    const processedImagePreview = await sharp(file.buffer)
      .resize({
        width: 640,
        height: 360,
        fit: 'cover',
        position: 'centre'
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Crear versión thumbnail para listas (320x180)
    const processedImageThumb = await sharp(file.buffer)
      .resize({
        width: 320,
        height: 180,
        fit: 'cover',
        position: 'centre'
      })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();


    // Subir la miniatura procesada en sus diferentes versiones al bucket
    await Promise.all([
      s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: processedImageFull,
        ContentType: 'image/jpeg'
      })),
      s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey.replace('.jpg', '_preview.jpg'),
        Body: processedImagePreview,
        ContentType: 'image/jpeg'
      })),
      s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey.replace('.jpg', '_thumb.jpg'),
        Body: processedImageThumb,
        ContentType: 'image/jpeg'
      }))
    ]);

    await db
      .update(videos)
      .set({ thumbnailUrl: fileUrl })
      .where(and(eq(videos.id, videoId), eq(videos.projectId, projectId)));

    return res.json({
      success: true,
      url: fileUrl,
      message: 'Miniatura subida correctamente'
    });

  } catch (error: any) {
    console.error("Error processing file:", error)
    return res.status(500).json({
      success: false,
      message: error?.message || 'Error al procesar la miniatura'
    });
  }
}

/**
 * Inicia una carga multiparte para un video
 * @param req Request con el nombre original del archivo y tamaño del video
 * @param res Response
 * @returns Response con las URLs firmadas para cada parte y el ID de la carga
 */
async function initiateMultipartUpload( req: Request, res: Response ): Promise<Response> {
  if (!req.user?.role) {
    return res.status(403)
      .json({ success: false, message: "No tienes permisos para editar videos" });
  }

  const { originalName, fileSize, contentType = 'video/mp4' } = req.body;

  if (!originalName || !fileSize) {
    return res.status(400).json({
      success: false,
      message: "Se requiere el nombre y tamaño del archivo"
    });
  }

  // MODO SIMULACIÓN solo si está explícitamente activado
  const useMockS3 = process.env.MOCK_S3 === 'true';
  if (useMockS3) {
    console.log("[MOCK S3] Simulando carga multiparte para:", originalName);

    // Generar una clave única para el objeto
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1e9);
    const extension = originalName.split('.').pop() || 'mp4';
    const key = `videos/video/${timestamp}-${randomId}.${extension}`;

    // Simular upload ID único
    const uploadId = `mockupload-${timestamp}-${randomId}`;

    // Calculamos el tamaño de cada parte (5MB mínimo)
    const partSize = Math.max(5 * 1024 * 1024, Math.ceil(fileSize / 10000));

    // Calculamos el número de partes
    const numParts = Math.ceil(fileSize / partSize);

    // Generar URLs simuladas para cada parte
    const parts = Array.from({ length: numParts }, (_, i) => ({
      partNumber: i + 1,
      url: `http://localhost:5000/mock-s3-upload/${key}/${uploadId}/${i + 1}`
    }));

    // URL simulada del archivo final
    const fileUrl = `http://localhost:5000/mock-s3/${key}`;

    return res.json({
      success: true,
      message: 'Carga multiparte iniciada (SIMULACIÓN)',
      data: {
        uploadId,
        key,
        parts,
        fileUrl,
        numParts,
        partSize
      }
    });
  }

  try {
    // Determinar el número de partes basado en el tamaño del archivo
    // Cada parte será de aproximadamente 5MB, excepto posiblemente la última
    const PART_SIZE = 5 * 1024 * 1024; // 5MB en bytes
    const numParts = Math.ceil(fileSize / PART_SIZE);

    if (numParts > 10000) {
      return res.status(400).json({
        success: false,
        message: "El archivo es demasiado grande para la carga multiparte (máximo 10,000 partes)"
      });
    }

    // Generar nombre de archivo único
    const fileExtension = originalName.substring(originalName.lastIndexOf('.') + 1);
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExtension}`;
    const objectKey = `videos/video/${uniqueFilename}`;

    // URL final del archivo
    const fileUrl = `https://${bucketName}.s3.${awsRegion}.amazonaws.com/${objectKey}`;

    // Usar nuestra función de utilidad para iniciar la carga multiparte
    const result = await initiateS3Upload(
      objectKey,
      contentType,
      fileSize,
      3600 // URL expira en 1 hora
    );

    // Responder con la información necesaria para continuar la carga
    return res.status(200).json({
      success: true,
      data: {
        uploadId: result.uploadId,
        key: result.key,
        parts: result.parts,
        fileUrl: result.fileUrl,
        numParts,
        partSize: PART_SIZE
      },
      message: 'Carga multiparte iniciada correctamente',
    });

  } catch (error: any) {
    console.error("Error al iniciar carga multiparte:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Error al iniciar la carga del video',
    });
  }
}

/**
 * Completa una carga multiparte para un video
 * @param req Request con el ID de la carga, la clave del objeto y las partes
 * @param res Response
 * @returns Response con la URL del archivo final
 */
async function completeMultipartUpload( req: Request, res: Response ): Promise<Response> {
  if (!req.user?.role) {
    return res.status(403).json({
      success: false,
      message: "No tienes permisos para editar videos"
    });
  }

  const { uploadId, key, parts } = req.body;

  if (!uploadId || !key || !parts?.length) {
    return res.status(400).json({
      success: false,
      message: "Se requieren ID de carga, clave y partes para completar la carga"
    });
  }

  // MODO SIMULACIÓN solo si está explícitamente activado
  const useMockS3 = process.env.MOCK_S3 === 'true';
  if (useMockS3) {
    console.log("[MOCK S3] Simulando completado de carga multiparte para:", key);
    console.log("[MOCK S3] Upload ID:", uploadId);
    console.log("[MOCK S3] Partes recibidas:", parts.length);

    // URL simulada del archivo final
    const fileUrl = `http://localhost:5000/mock-s3/${key}`;

    return res.json({
      success: true,
      url: fileUrl,
      message: 'Carga multiparte completada correctamente (SIMULACIÓN)',
    });
  }

  try {
    // Usar nuestra función de utilidad para completar la carga multiparte
    const fileUrl = await completeS3Upload(key, uploadId, parts);

    return res.status(200).json({
      success: true,
      url: fileUrl,
      message: 'Carga multiparte completada correctamente',
    });

  } catch (error: any) {
    console.error("Error al completar carga multiparte:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Error al completar la carga del video',
    });
  }
}

/**
 * Aborta una carga multiparte para un video
 * @param req Request con el ID de la carga y la clave del objeto
 * @param res Response
 * @returns Response con la confirmación de la cancelación
 */
async function abortMultipartUpload( req: Request, res: Response ): Promise<Response> {
  if (!req.user?.role) {
    return res.status(403).json({
      success: false,
      message: "No tienes permisos para editar videos"
    });
  }

  const { uploadId, key } = req.body;

  if (!uploadId || !key) {
    return res.status(400).json({
      success: false,
      message: "Se requieren ID de carga y clave para abortar la carga"
    });
  }

  // MODO SIMULACIÓN solo si está explícitamente activado
  const useMockS3 = process.env.MOCK_S3 === 'true';
  if (useMockS3) {
    console.log("[MOCK S3] Simulando aborto de carga multiparte para:", key);
    console.log("[MOCK S3] Upload ID a abortar:", uploadId);

    return res.json({
      success: true,
      message: 'Carga multiparte abortada correctamente (SIMULACIÓN)',
    });
  }

  try {
    // Usar nuestra función de utilidad para abortar la carga multiparte
    await abortS3Upload(key, uploadId);

    return res.status(200).json({
      success: true,
      message: 'Carga multiparte abortada correctamente',
    });

  } catch (error: any) {
    console.error("Error al abortar carga multiparte:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Error al abortar la carga del video',
    });
  }
}

/**
 * Método anterior para compatibilidad (será deprecado)
 * Obtiene una URL firmada para subir un video directamente
 */
async function getVideoUploadUrl( req: Request, res: Response ): Promise<Response> {
  if (!req.user?.role)
    return res.status(403).json({ success: false, message: "No tienes permisos para editar videos" })

  const { originalName } = req.body

  if (!originalName)
    return res.status(400).json({ success: false, message: "No se subió ningún archivo" })

  // MODO SIMULACIÓN solo si está explícitamente activado
  const useMockS3 = process.env.MOCK_S3 === 'true';
  if (useMockS3) {
    console.log("[MOCK S3] Simulando generación de URL firmada para:", originalName);

    // Generar una clave única para el objeto
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1e9);
    const extension = originalName.split('.').pop() || 'mp4';
    const key = `videos/video/${timestamp}-${randomId}.${extension}`;

    // URLs simuladas
    const uploadUrl = `http://localhost:5000/mock-s3-upload/${key}`;
    const fileUrl = `http://localhost:5000/mock-s3/${key}`;

    return res.json({
      success: true,
      url: fileUrl,
      uploadUrl: uploadUrl,
      message: 'Presigned URL generada (SIMULACIÓN)',
    });
  }

  try {
    // Generar clave única para el objeto en S3
    const objectKey = generateS3Key(originalName, 'videos/video');

    // Obtener URL firmada usando nuestra función de utilidad
    const { uploadUrl: signedUrl, fileUrl } = await getSignedUploadUrl(
      objectKey,
      'video/mp4',
      60 * 5
    );

    return res.json({
      success: true,
      url: fileUrl,
      uploadUrl: signedUrl,
      message: 'Presigned URL generada',
    });

  } catch (error: any) {
    console.error("Error processing file:", error)
    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        'Error al procesar el video',
    });
  }
}


/**
 * Crea múltiples videos basados en una lista de títulos
 */
async function createBulkVideos(req: Request, res: Response): Promise<Response> {
  const projectId = parseInt(req.params.projectId);
  const { titles } = req.body;

  if (!Array.isArray(titles) || titles.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Se requiere un array de títulos"
    });
  }

  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Solo los administradores pueden crear videos",
    });
  }

  try {
    // Use transaction to ensure atomic operations
    const results = await db.transaction(async (tx) => {
      // Get project details
      const [project] = await tx
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!project) {
        throw new Error("Proyecto no encontrado");
      }

      let currentNumber = project.current_number || 0;
      const createdVideos = [];

      // Crear cada video
      for (const title of titles) {
        if (typeof title !== 'string' || !title.trim()) continue;

        // Generate series number
        currentNumber++;
        const seriesNumber = project.prefix
          ? `${project.prefix}-${String(currentNumber).padStart(4, "0")}`
          : String(currentNumber).padStart(4, "0");

        // Create video
        const videoData: InsertVideo = {
          projectId,
          title: title.trim(),
          status: "available",
          seriesNumber,
          createdBy: req.user?.id,
        };

        const [newVideo] = await tx.insert(videos).values(videoData).returning();
        createdVideos.push(newVideo);
      }

      // Update project's current number
      await tx
        .update(projects)
        .set({ current_number: currentNumber })
        .where(eq(projects.id, projectId));

      return createdVideos;
    });

    // Escanear los videos creados para detectar afiliados fuera de la transacción
    for (const video of results) {
      if (video.title) {
        try {
          console.log(`🔍 Escaneando video ${video.id} con título "${video.title}" fuera de la transacción...`);
          await scanVideoForAffiliates(video.id, video.title);
        } catch (affError) {
          console.error(`❌ Error al escanear afiliados para video ${video.id}:`, affError);
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: `${results.length} videos creados correctamente`,
      data: results
    });
  } catch (error) {
    console.error("Error creating videos in bulk:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Error al crear los videos",
    });
  }
}

export function setUpVideoRoutes(requireAuth: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined, app: Express) {
  // Videos normales (no eliminados)
  app.get("/api/videos", requireAuth, getVideos);

  // Creación de videos
  app.post("/api/projects/:projectId/videos", requireAuth, createVideo);
  app.post("/api/projects/:projectId/videos/bulk", requireAuth, createBulkVideos);

  // Actualización de videos
  app.patch("/api/projects/:projectId/videos/:videoId", requireAuth, updateVideo);
  app.patch("/api/projects/:projectId/videos/:videoId/sendToReview", requireAuth, sendVideoToReview);

  // Asignación de video a youtuber cuando lo visualiza
  app.post("/api/projects/:projectId/videos/:videoId/assign", requireAuth, assignVideoToYoutuber);

  // Eliminación de videos (mover a papelera o eliminación permanente)
  app.delete("/api/projects/:projectId/videos/:videoId", requireAuth, deleteVideo);
  app.delete("/api/projects/:projectId/videos", requireAuth, bulkDeleteVideos);

  // Rutas relacionadas con la papelera
  app.post("/api/projects/:projectId/videos/:videoId/restore", requireAuth, restoreVideo);
  app.delete("/api/projects/:projectId/trash", requireAuth, emptyTrash);
  // Ruta para obtener videos en la papelera
  app.get("/api/projects/:projectId/videos", requireAuth, getVideos);

  // Video upload endpoint
  const thumbailUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 1024 * 1024 * 1024 // 1GB limit
    }
  });

  // Endpoint para cargar miniaturas
  app.post("/api/projects/:projectId/videos/:videoId/uploadThumbnail",
    requireAuth,
    thumbailUpload.single('file'),
    uploadThumbnail
  );

  // Endpoint para iniciar carga multiparte (nuevo método recomendado)
  app.post("/api/projects/:projectId/videos/:videoId/initiate-multipart-upload",
    requireAuth,
    initiateMultipartUpload
  );

  // Endpoint para completar carga multiparte
  app.post("/api/projects/:projectId/videos/:videoId/complete-multipart-upload",
    requireAuth,
    completeMultipartUpload
  );

  // Endpoint para abortar carga multiparte
  app.post("/api/projects/:projectId/videos/:videoId/abort-multipart-upload",
    requireAuth,
    abortMultipartUpload
  );

  // Endpoint legado para compatibilidad con versiones anteriores
  app.post("/api/projects/:projectId/videos/:videoId/uploadVideo",
    requireAuth,
    getVideoUploadUrl
  );
}