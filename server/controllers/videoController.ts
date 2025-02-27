import type { Request, Response } from "express";
import { eq, and, or, desc, getTableColumns, aliasedTable } from "drizzle-orm";
import {
  videos,
  users,
  projects,
  InsertVideo,
  User,
  Video,
  projectAccess,
  VIDEO_STATUSES_ARRAY,
  VideoStatus,
} from "@db/schema";
import { db } from "@db";
import { z } from "zod";
import fs from "fs";
import sharp from "sharp";
import path from "path";
import { s3, PutObjectCommand } from "../lib/s3"

const bucketName = process.env.AWS_BUCKET_NAME!;
const awsRegion = process.env.AWS_REGION!;

const contentReviewer = aliasedTable(users, "contentReviewer");
const mediaReviewer = aliasedTable(users, "mediaReviewer");
const optimizer = aliasedTable(users, "optimizer");
const creator = aliasedTable(users, "creator");
const uploader = aliasedTable(users, "uploader");

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

    // Actualizar el video con la metadata combinada
    const [result] = await db
      .update(videos)
      .set({
        title: updates.title,
        description: updates.description,
        status: updates.status as VideoStatus,
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
      })
      .where(and(eq(videos.id, videoId), eq(videos.projectId, projectId)))
      .returning();

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

async function deleteVideo(req: Request, res: Response): Promise<Response> {
  const projectId = parseInt(req.params.projectId);
  const videoId = parseInt(req.params.videoId);

  // Verificar si el usuario es administrador
  if (req.user!.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Solo los administradores pueden eliminar videos",
    });
  }

  try {
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
      message: "Video eliminado correctamente",
    });
  } catch (error) {
    console.error("Error deleting video:", error);
    return res.status(500).json({
      success: false,
      message: "Error al eliminar el video",
    });
  }
}

async function getVideos(req: Request, res: Response): Promise<Response> {
  try {
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
      })
      .from(videos)
      .leftJoin(
        contentReviewer,
        eq(videos.contentReviewedBy, contentReviewer.id),
      )
      .leftJoin(mediaReviewer, eq(videos.mediaReviewedBy, mediaReviewer.id))
      .leftJoin(creator, eq(videos.createdBy, creator.id))
      .leftJoin(optimizer, eq(videos.optimizedBy, optimizer.id))
      .leftJoin(uploader, eq(videos.contentUploadedBy, uploader.id))
      .leftJoin(projectAccess, eq(projectAccess.projectId, videos.projectId)) // Join with projectAccess table
      .where(
        and(
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
            req.user?.role === "reviewer"
              ? eq(videos.status, "content_review")
              : undefined,
            req.user?.role === "reviewer"
              ? eq(videos.contentReviewedBy, req.user!.id!)
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
            req.user?.role === "reviewer"
              ? eq(videos.status, "media_review")
              : undefined,
            req.user?.role === "reviewer"
              ? eq(videos.mediaReviewedBy, req.user!.id!)
              : undefined,
          ),
          req.user?.role === "admin"
            ? undefined
            : eq(projectAccess.userId, req.user!.id!),
        ),
      )
      .orderBy(desc(videos.updatedAt)); // Moved orderBy after where

    const result = await query.execute();

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching all videos:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener los videos",
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

async function uploadContentVideo(
  req: Request,
  res: Response,
): Promise<Response> {
  if (!req.user?.role)
    return res
      .status(403)
      .json({
        success: false,
        message: "No tienes permisos para editar videos",
      });

  const projectId = parseInt(req.params.projectId);
  const videoId = parseInt(req.params.videoId);

  const file = req.file;
  const { type } = req.body;

  if (!file) {
    return res
      .status(400)
      .json({ success: false, message: "No se subió ningún archivo" });
  }

  try {
    const fileExt = path.extname(file.path);
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
    const objectKey = `videos/${type}/${uniqueFilename}`; // Ruta simple y organizada

    // Si es una miniatura, procesarla con sharp
    if (type === "thumbnail") {
      const processedPath = file.path.replace(fileExt, "_processed" + fileExt);
      await sharp(file.path).resize(1280, 720).toFile(processedPath);

      // Subir la miniatura procesada al bucket
      await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: fs.createReadStream(processedPath)
      }));
            
      // Limpiar archivos temporales
      fs.unlinkSync(file.path);
      fs.unlinkSync(processedPath);
    } else {
      // Subir el video directamente 
      await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: fs.createReadStream(file.path)
      }))

      // Limpiar archivo temporal
      fs.unlinkSync(file.path);
    }

    const fileUrl = `https://${bucketName}.s3.${awsRegion}.amazonaws.com/${objectKey}`;
    
    // Actualizar la URL en la base de datos si se proporciona videoId
    if (videoId) {
      const urlField = type === "video" ? "videoUrl" : "thumbnailUrl";
      await db
        .update(videos)
        .set({ [urlField]: fileUrl })
        .where(and(eq(videos.id, videoId), eq(videos.projectId, projectId)));
    }

    return res.json({
      success: true,
      url: fileUrl,
      message: `${type === "video" ? "Video" : "Miniatura"} subido correctamente`,
    });
  } catch (error: any) {
    console.error("Error processing file:", error);
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        `Error al procesar el ${type === "video" ? "video" : "miniatura"}`,
    });
  }
}

const VideoController = {
  updateVideo,
  deleteVideo,
  getVideos,
  createVideo,
  uploadContentVideo,
};

export default VideoController;
