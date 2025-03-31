import type { NextFunction, Request, Response } from "express";
import {
  eq,
  and,
  ilike,
  getTableColumns,
  count,
  desc,
  asc,
  sql,
  inArray,
  isNotNull,
} from "drizzle-orm";
import {
  youtubeVideos,
  youtubeChannels,
  videos,
  trainingTitleExamples,
  TrainingTitleExample,
  InsertTrainingTitleExample
} from "@db/schema";
import { db } from "@db";
import { type Express } from "express";
import { youtubeService } from "server/services/youtubeService";
import {
  analyzeTitle,
  findSimilarTitles,
} from "server/services/vectorAnalysis";
import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { processTrainingExamplesVectors } from '../services/vectorAnalysis';

async function addChannel(req: Request, res: Response): Promise<Response> {
  if (!req.user?.role || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "No tienes permisos para agregar canales",
    });
  }

  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL requerida" });
    }

    const channelInfo = await youtubeService.getChannelInfo(url);

    const [newChannel] = await db
      .insert(youtubeChannels)
      .values({
        channelId: channelInfo.channelId!,
        name: channelInfo.name || "Sin nombre",
        url: url,
        description: channelInfo.description || null,
        thumbnailUrl: channelInfo.thumbnailUrl || null,
        subscriberCount: channelInfo.subscriberCount || 0,
        videoCount: channelInfo.videoCount || 0,
        active: true
      })
      .returning();

    return res.json(newChannel);
  } catch (error) {
    console.error("Error adding channel:", error);
    return res.status(500).json({
      error: "Error al añadir canal",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

async function getVideos(req: Request, res: Response): Promise<Response> {
  if (!req.user?.role || req.user.role !== "admin") {

    return res.status(403).json({
      success: false,
      message: "No tienes permisos para obtener videos",
    });
  }

  // Obtener parámetros para paginación y filtrado
  const { channelId, title, isEvergreen, analyzed } = req.query;
  const page = Number(req.query.page || "1");
  const sortFieldRequested = (req.query.sortField as string) || 'publishedAt';
  const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
  const limit = Number(req.query.limit || "20");
  const offset = (page - 1) * limit;

  let sortField
  switch (sortFieldRequested) {
    case 'viewCount':
      sortField = youtubeVideos.viewCount;
      break;
    case 'likeCount':
      sortField = youtubeVideos.likeCount;
      break;
    case 'publishedAt':
      sortField = youtubeVideos.publishedAt;
      break;
    case 'title':
      sortField = youtubeVideos.title;
      break;
    case 'channelId':
      sortField = youtubeVideos.channelId;
      break;
    default:
      sortField = youtubeVideos.publishedAt;
  }

  try {
    const conditions = and(
      title ? ilike(youtubeVideos.title, `%${title}%`) : undefined,
      isEvergreen ? eq(youtubeVideos.isEvergreen, true) : undefined,
      channelId ? eq(youtubeVideos.channelId, channelId.toString()) : undefined,
      analyzed ? isNotNull(youtubeVideos.embedding) : undefined,
    );

    // Primero obtenemos el total de videos (para la paginación)
    const [totalResult] = await db
      .select({ count: count() })
      .from(youtubeVideos)
      .where(conditions)
      .execute()

    const total = Number(totalResult?.count || 0);

    // Consulta principal para obtener los videos paginados
    const query = db
      .select()
      .from(youtubeVideos)
      .where(conditions)
      .orderBy( sortOrder === 'desc' ? desc(sortField) : asc(sortField))
      .limit(limit)
      .offset(offset);

    const result = await query.execute();

    return res.status(200).json({
      videos: result,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting YouTube videos:", error);
    return res.status(500).json({
      success: false,
      message: "Error obteniendo videos de YouTube",
    });
  }
}

async function getChannels(req: Request, res: Response): Promise<Response> {
  if (!req.user?.role || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "No tienes permisos para obtener canales",
    });
  }

  try {
    // Usamos select() sin argumentos para evitar problemas con los nombres de columnas
    const result = await db.select().from(youtubeChannels).execute();

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error al obtener canales", error);
    return res.status(500).json({
      error: "Error al obtener canales",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

async function deleteChannel(req: Request, res: Response): Promise<Response> {
  if (!req.user?.role || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "No tienes permisos para eliminar canales",
    });
  }

  // Obtener channelId del path
  const { channelId } = req.params;

  try {
    // 1. Primero obtener los videos relacionados para obtener sus IDs
    const channelVideos = await db.query.youtubeVideos.findMany({
      where: eq(youtubeVideos.channelId, channelId),
      columns: { id: true, youtubeId: true },
    });

    console.log(
      `Encontrados ${channelVideos.length} videos asociados al canal ${channelId}`,
    );

    // Procesamos por lotes para manejar grandes volúmenes de datos
    const BATCH_SIZE = 1000;
    let processedCount = 0;

    // Extraer IDs para utilizarlos en la eliminación
    const youtubeVideoIds = channelVideos.map((v) => v.youtubeId);
    const dbVideoIds = channelVideos.map((v) => v.id);

    // Procesamiento por lotes de la eliminación
    for (let i = 0; i < channelVideos.length; i += BATCH_SIZE) {
      const batchVideoIds = youtubeVideoIds.slice(i, i + BATCH_SIZE);
      const batchDbIds = dbVideoIds.slice(i, i + BATCH_SIZE);

      if (batchVideoIds.length === 0) continue;

      await db.transaction(async (trx) => {
        // Eliminar los ejemplos de entrenamiento basados en los títulos de estos videos
        await trx
          .delete(trainingTitleExamples)
          .where(inArray(trainingTitleExamples.youtubeId, batchVideoIds));
        // Eliminar los videos de este lote
        await trx
          .delete(youtubeVideos)
          .where(inArray(youtubeVideos.id, batchDbIds))
          .execute();
      });

      processedCount += batchVideoIds.length;
      console.log(
        `Procesado lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(channelVideos.length / BATCH_SIZE)}: ${processedCount}/${channelVideos.length} videos eliminados del canal ${channelId}`,
      );
    }

    // Finalmente eliminamos el canal
    await db
      .delete(youtubeChannels)
      .where(eq(youtubeChannels.id, parseInt(channelId)))
      .execute();

    console.log("Canal y sus datos asociados eliminados correctamente");
    return res.status(200).json({
      success: true,
      message: `Canal eliminado correctamente junto con ${channelVideos.length} videos y sus ejemplos de entrenamiento asociados`,
    });
  } catch (error) {
    console.error("Error al eliminar canal", error);
    return res.status(500).json({
      error: "Error al eliminar canal y sus datos asociados",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

async function analyzeVideo(req: Request, res: Response): Promise<Response> {
  if (!req.user?.role || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "No tienes permisos para esta acción",
    });
  }

  const { videoId } = req.params;
  const videoIdNum = parseInt(videoId);

  try {
    console.log(
      `Iniciando análisis de evergreen para video ${videoId} usando vectores`,
    );

    const video = await db
      .select()
      .from(youtubeVideos)
      .where(eq(youtubeVideos.id, videoIdNum))
      .limit(1)
      .execute();

    if (!video || video.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Video no encontrado",
      });
    }

    const videoData = video[0];
    const title = videoData.title || "";

    // Usar el servicio de análisis vectorial para analizar el título
    console.log(`Analizando título: "${title}"`);
    const { similarTitles, result: analysisResult } = await analyzeTitle(
      title,
      videoIdNum,
    );

    console.log(
      `Análisis completado para video ${videoId}: Evergreen: ${analysisResult.isEvergreen}, Confianza: ${analysisResult.confidence}`,
    );

    return res.status(200).json({
      success: true,
      data: {
        videoId: videoIdNum,
        title: videoData.title,
        isEvergreen: analysisResult.isEvergreen,
        confidence: analysisResult.confidence,
        reason: analysisResult.reason,
        similarTitles: similarTitles.map((st) => ({
          videoId: videoIdNum,
          title: st.title,
          similarity: st.similarity,
          isEvergreen: st.isEvergreen,
        })),
      },
    });
  } catch (error) {
    console.error(`Error al analizar video ${videoId}:`, error);
    return res.status(500).json({
      success: false,
      message: "Error al analizar video",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

// Función para obtener estadísticas de videos
// Todos los usuarios pueden acceder a las estadísticas para el dashboard
async function getVideoStats(req: Request, res: Response): Promise<Response> {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Debes iniciar sesión para acceder a esta funcionalidad",
    });
  }

  try {

    console.log('Obteniendo estadísticas de titulin videos...');

    // Obtener el total y conteos por estado de la tabla videos, excluyendo los eliminados
    const [videoStats] = await db
      .select({
        total_videos: count(),
        upload_media_count: count(sql`CASE WHEN status = 'upload_media' THEN 1 END`),
        content_corrections_count: count(sql`CASE WHEN status = 'content_corrections' THEN 1 END`),
        available_count: count(sql`CASE WHEN status = 'available' THEN 1 END`),
        final_review_count: count(sql`CASE WHEN status = 'final_review' THEN 1 END`)
      })
      .from(videos)
      .where(eq(videos.isDeleted, false)) // Filtramos solo videos activos
      .execute();

    // Consulta adicional para obtener el recuento de videos eliminados
    const [deletedStats] = await db
      .select({
        deleted_count: count()
      })
      .from(videos)
      .where(eq(videos.isDeleted, true))
      .execute();

    // Asegurar que los valores son números
    const totalVideos = videoStats.total_videos ?? 0;
    const deletedCount = deletedStats.deleted_count ?? 0;
    
    const stateCountsObj = {
      'upload_media': videoStats.upload_media_count || 0,
      'content_corrections': videoStats.content_corrections_count || 0,
      'available': videoStats.available_count || 0,
      'final_review': videoStats.final_review_count || 0,
      'deleted': deletedCount // Añadimos el conteo de videos eliminados
    };

    console.log('Respuesta final:', {
      totalVideos,
      stateCounts: stateCountsObj,
      deletedCount // Log para confirmar
    });

    return res.status(200).json({
      totalVideos,
      stateCounts: stateCountsObj,
      deletedCount // Incluimos el conteo de videos eliminados en la respuesta
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de videos:', error);
    return res.status(500).json({ 
      error: 'Error al obtener estadísticas de videos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

export async function getSuggestions(req: Request, res: Response) {
  try {
    const query = req.query.query as string;

    if (!query || query.length < 2) {
      return res.status(400).json({
        message: "El término de búsqueda debe tener al menos 2 caracteres",
        suggestions: []
      });
    }

    // Limpiamos y normalizamos la consulta para la búsqueda
    const normalizedQuery = query.trim().toLowerCase();

    // Consulta SQL para encontrar sugerencias basadas en palabras comunes en los títulos
    // que coincidan con el término de búsqueda
    const wordResults = await db.execute(sql`
      WITH words AS (
        SELECT DISTINCT
          word,
          COUNT(*) OVER (PARTITION BY word) as count
        FROM
          youtube_videos,
          LATERAL unnest(string_to_array(lower(title), ' ')) as word
        WHERE
          word LIKE ${`%${normalizedQuery}%`}
          AND length(word) >= 3
      )
      SELECT word as title, count
      FROM words
      WHERE count > 1
      ORDER BY count DESC, word
      LIMIT 10
    `);

    // Convertir el resultado a un array de sugerencias
    const suggestions: Array<{title: string, count: number}> = [];

    // Agregar los resultados de palabras al array
    if (Array.isArray(wordResults)) {
      wordResults.forEach(result => {
        if (result && typeof result === 'object' && 'title' in result && 'count' in result) {
          suggestions.push({
            title: String(result.title),
            count: Number(result.count)
          });
        }
      });
    }

    // Si no hay suficientes resultados por palabras individuales, buscar en títulos completos
    if (suggestions.length < 5) {
      const titleResults = await db
        .select({
          title: youtubeVideos.title,
          count: sql`COUNT(*)`
        })
        .from(youtubeVideos)
        .where(ilike(youtubeVideos.title, `%${normalizedQuery}%`))
        .groupBy(youtubeVideos.title)
        .orderBy(desc(sql`count`), asc(youtubeVideos.title))
        .limit(10 - suggestions.length)
        .execute();

      // Agregar los resultados de títulos al array
      if (Array.isArray(titleResults)) {
        titleResults.forEach(result => {
          if (result && typeof result === 'object' && 'title' in result && 'count' in result) {
            suggestions.push({
              title: String(result.title),
              count: Number(result.count)
            });
          }
        });
      }
    }

    return res.json({
      suggestions
    });
  } catch (error) {
    console.error("Error getting title suggestions:", error);
    return res.status(500).json({
      message: "Error al obtener sugerencias",
      error: (error as Error).message
    });
  }
}

// Función para obtener canales para ejemplos de entrenamiento (sin restricción de rol)
async function getChannelsForTraining(req: Request,res: Response): Promise<Response> {
  try {
    // Obtener lista simplificada de canales para selector
    const result = await db
      .select({
        id: youtubeChannels.id,
        channelId: youtubeChannels.channelId,
        name: youtubeChannels.name,
        thumbnailUrl: youtubeChannels.thumbnailUrl,
      })
      .from(youtubeChannels)
      .where(eq(youtubeChannels.active, true))
      .execute();

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error al obtener canales para training examples:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener canales",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

async function syncChannel(req: Request, res: Response): Promise<Response> {
  if (!req.user?.role || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "No tienes permisos para sincronizar canales",
    });
  }

  const channelId = req.params.channelId;

  if (!channelId) {
    return res.status(400).json({
      success: false,
      message: "No se ha especificado el canal",
    });
  }

  try {
    const now = new Date();
    const videos = await youtubeService.getChannelVideos(channelId);

    console.info(
      `Fetched ${videos.length} videos for batch update for channel ${channelId}`,
    );

    // No videos to process
    if (videos.length === 0) {
      console.info(`No videos to update for channel ${channelId}`);

      // Still update the channel's last fetch time
      await db
        .update(youtubeChannels)
        .set({
          lastVideoFetch: now,
          updatedAt: now,
        })
        .where(eq(youtubeChannels.channelId, channelId));
    }

    // Use the optimized DbUtils function for batch upsert
    const startTime = Date.now();
    const successCount = await youtubeService.upsertYoutubeVideos(videos);

    const queryTime = Date.now() - startTime;
    if (queryTime > 500) {
      console.debug(
        `Slow batch operation detected: ${queryTime}ms for ${videos.length} videos`,
      );
    }

    console.info(
      `Successfully processed ${successCount} videos for channel ${channelId}`,
    );

    // Update channel's last fetch time
    await db
      .update(youtubeChannels)
      .set({
        lastVideoFetch: now,
        updatedAt: now,
      })
      .where(eq(youtubeChannels.channelId, channelId));

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("Error syncing channel:", error);
    return res.status(500).json({
      error: "Error al sincronizar el canal",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
}

async function sendToOptimize(req: Request, res: Response): Promise<Response> {

  if (!req.user?.role || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "No tienes permisos para agregar canales",
    });
  }

  try {
    const { videoId } = req.params;
    // Get videoId and projectId from body
    const { projectId } = req.body as { projectId: number };
    // Check if videoId and projectId are provided
    if (!videoId || !projectId) {
      return res.status(400).json({
        success: false,
        message: "No se ha especificado el videoId o el projectId",
      });
    }

    // Get the youtube video from the database
    const youtubeVideo = await db
      .select({
        ...getTableColumns(youtubeVideos),
      })
      .from(youtubeVideos)
      .where(eq(youtubeVideos.id, parseInt(videoId)))
      .execute();

    // Check if the youtube video exists
    if (!youtubeVideo.at(0)) {
      return res.status(404).json({
        success: false,
        message: "No se ha encontrado el video",
      });
    }

    if (youtubeVideo.at(0)?.sentToOptimize) {
      return res.status(400).json({
        success: false,
        message: "El video ya está optimizado",
      });
    }

    // Insert the video into the database and set the sentToOptimize flag to true
    await db.transaction(async (trx) => {
      await trx
        .insert(videos)
        .values({
          projectId: projectId,
          title: youtubeVideo.at(0)!.title,
          createdBy: req.user?.id,
          description: youtubeVideo.at(0)!.description,
          status: "available",
          tags: youtubeVideo.at(0)!.tags?.toString(),
          thumbnailUrl: youtubeVideo.at(0)!.thumbnailUrl,
          youtubeUrl: `https://www.youtube.com/watch?v=${youtubeVideo.at(0)!.youtubeId}`,
        })
        .returning();

      await trx
        .update(youtubeVideos)
        .set({
          sentToOptimize: true,
          updatedAt: new Date(),
        })
        .where(eq(youtubeVideos.id, parseInt(videoId)));
    });

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("Error sending to optimize:", error);
    return res.status(500).json({
      error: "Error al añadir canal",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

async function cleanOrphans(req: Request, res: Response): Promise<Response> {
  if (!req.user?.role || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "No tienes permisos para esta acción",
    });
  }

  try {
    // 1. Identificar videos huérfanos (videos cuyo channelId no existe en la tabla de canales)
    const orphanedVideosQuery = await db.execute(sql`
      SELECT y.id, y.video_id, y.title
      FROM youtube_videos y
      LEFT JOIN youtube_channels c ON y.channel_id = c.channel_id
      WHERE c.channel_id IS NULL
    `);

    // Extraer los resultados según el formato de la respuesta
    const orphanedVideos = Array.isArray(orphanedVideosQuery)
      ? orphanedVideosQuery
      : orphanedVideosQuery.rows
        ? orphanedVideosQuery.rows
        : [];

    if (orphanedVideos.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No se encontraron videos huérfanos",
        videosDeleted: 0,
      });
    }

    // Obtener IDs para eliminar
    const videoIds = orphanedVideos.map((v: any) => v.id);
    const videoIdsYouTube = orphanedVideos.map((v: any) => v.video_id);

    // 2. Eliminar ejemplos de entrenamiento relacionados con estos videos
    // Procesar en lotes para manejar grandes volúmenes de datos
    const BATCH_SIZE = 1000;
    let deletedCount = 0;
    const totalCount = orphanedVideos.length;

    for (let i = 0; i < totalCount; i += BATCH_SIZE) {
      const batchIds = videoIds.slice(i, i + BATCH_SIZE);

      if (batchIds.length === 0) continue;

      await db.transaction(async (trx) => {
        // Eliminar los ejemplos de entrenamiento basados en los títulos de estos videos
        await trx.execute(sql`
          DELETE FROM training_title_examples 
          WHERE title IN (SELECT title FROM youtube_videos WHERE id IN (${sql.join(batchIds, sql`,`)}))
        `);

        // Luego eliminar los videos huérfanos usando SQL directo
        await trx.execute(sql`
          DELETE FROM youtube_videos
          WHERE id IN (${sql.join(batchIds, sql`,`)})
        `);
      });

      deletedCount += batchIds.length;
      console.log(
        `Procesado lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(totalCount / BATCH_SIZE)}: ${deletedCount}/${totalCount} videos huérfanos eliminados`,
      );
    }

    return res.status(200).json({
      success: true,
      message: `Se eliminaron ${orphanedVideos.length} videos huérfanos y sus ejemplos de entrenamiento asociados`,
      videosDeleted: orphanedVideos.length,
      videosSample: orphanedVideos
        .slice(0, 10)
        .map((v: any) => ({ id: v.id, title: v.title })),
    });
  } catch (error) {
    console.error("Error al eliminar videos huérfanos:", error);
    return res.status(500).json({
      success: false,
      message: "Error al eliminar videos huérfanos",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

async function getSimilarVideos(req: Request,res: Response ): Promise<Response> {
  if (!req.user?.role || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "No tienes permisos para esta acción",
    });
  }

  const { videoId } = req.params;
  const limit = Number(req.query.limit || "5");

  try {
    const video = await db
      .select()
      .from(youtubeVideos)
      .where(eq(youtubeVideos.id, parseInt(videoId)))
      .limit(1)
      .execute();

    if (!video || video.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Video no encontrado",
      });
    }

    const title = video[0].title || "";
    const similarTitles = await findSimilarTitles(title, limit);

    return res.status(200).json({
      success: true,
      data: {
        videoId: parseInt(videoId),
        title: title,
        similarTitles: similarTitles,
      },
    });
  } catch (error) {
    console.error(`Error al buscar títulos similares para ${videoId}:`, error);
    return res.status(500).json({
      success: false,
      message: "Error al buscar títulos similares",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

async function getTrainingExamples(req: Request, res: Response): Promise<Response> {
  try {
    // Parámetros de paginación
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Parámetros de filtrado
    const search = (req.query.search as string) || '';
    const type = (req.query.type as string) || 'all';
    const sortBy = (req.query.sortBy as string) || 'id';
    const sortDir = (req.query.sortDir as string) === 'desc' ? 'DESC' : 'ASC';
    const createdBy = parseInt(req.query.createdBy as string) || null;

    const whereConditions = and(
      search ? ilike(trainingTitleExamples.title, `%${search}%`) : undefined,
      type === 'evergreen' ? eq(trainingTitleExamples.isEvergreen, true) : undefined,
      type === 'not-evergreen' ? eq(trainingTitleExamples.isEvergreen, false) : undefined,
      createdBy ? eq(trainingTitleExamples.createdBy, createdBy) : undefined
    )

    const [countResult] = await db
    .select({ count: count() })
    .from(trainingTitleExamples)
    .where(whereConditions)
    .execute()

    // Consulta paginada con filtros
    // Construcción segura de la consulta SQL
    const sortBySQL = sortBy ? sql.raw(sortBy) : sql.raw('id');
    const orderBySQL = sortDir === 'ASC' ? asc(sortBySQL) : desc(sortBySQL)

    const examples = await db.select()
    .from(trainingTitleExamples)
    .where(whereConditions)
    .orderBy(orderBySQL)
    .limit(limit)
    .offset(offset)

    // Calcular metadatos de paginación
    const totalPages = Math.ceil(countResult.count / limit);

    return res.status(200).json({
      success: true,
      data: examples,
      pagination: {
        total: countResult.count,
        page,
        limit,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('Error al obtener ejemplos de entrenamiento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener ejemplos de entrenamiento',
      details: error.message
    });
  }
}

async function createTrainingExample(req: Request, res: Response): Promise<Response> {
  try {
    const { title, isEvergreen } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'El título es obligatorio'
      });
    }

    // Insertar ejemplo
    const result = await db.insert(trainingTitleExamples)
    .values({ title, isEvergreen: Boolean(isEvergreen), createdBy: req.user!.id! })
    .returning()

    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error al crear ejemplo de entrenamiento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear ejemplo de entrenamiento',
      details: error.message
    });
  }
}

async function deleteTrainingExample(req: Request, res: Response): Promise<Response> {
  try {
    const { id } = req.params;

    // Verificar que el ejemplo existe
    const example = await db.select({ id: trainingTitleExamples.id })
    .from(trainingTitleExamples).where(eq(trainingTitleExamples.id, parseInt(id)))

    if (!example || example.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ejemplo no encontrado'
      });
    }

    // Eliminar ejemplo
    await db.delete(trainingTitleExamples).where(eq(trainingTitleExamples.id, parseInt(id)))

    return res.status(200).json({
      success: true,
      message: 'Ejemplo eliminado correctamente'
    });
  } catch (error: any) {
    console.error('Error al eliminar ejemplo de entrenamiento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar ejemplo de entrenamiento',
      details: error.message
    });
  }
}

async function importTrainingExamplesFromYTChannel(req: Request, res: Response): Promise<Response> {
  try {
    const { channelId, isEvergreen = true } = req.body;

    if (!channelId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del canal es obligatorio'
      });
    }

    // Obtener usuario actual
    const userId = req.user?.id;

    // Obtener videos del canal desde la base de datos
    // Nota: channelId es el ID del canal de YouTube (string), no el ID numérico de la tabla
    const channel = await db.select({ 
      channelId: youtubeChannels.channelId,
      videoCount: youtubeChannels.videoCount
    })
    .from(youtubeChannels)
    .where(eq(youtubeChannels.channelId, channelId))

    if (channel.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Canal no encontrado'
      });
    }

    const youtubeChannelId = channel[0].channelId;
    const totalVideos = channel[0].videoCount;

    console.log(`Total de videos encontrados para el canal ${youtubeChannelId}: ${totalVideos}`);

    if (totalVideos === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron videos para este canal'
      });
    }

    // Configuración para paginación
    const pageSize = 500;
    const totalPages = Math.ceil(totalVideos / pageSize);

    // Colección para todos los títulos
    let allTitles: string[] = [];
    
    // Obtener todos los videos del canal usando paginación
    for (let page = 0; page < totalPages; page++) {
      const offset = page * pageSize;

      console.log(`Obteniendo página ${page + 1} de ${totalPages} (offset: ${offset}, limit: ${pageSize})`);

      const titles = await db.select({ title: youtubeVideos.title })
      .from(youtubeVideos)
      .where(eq(youtubeVideos.channelId, youtubeChannelId))
      .orderBy(youtubeVideos.id)
      .limit(pageSize)
      .offset(offset)  

      console.log(`Obtenidos ${titles.length} títulos de la página ${page + 1}`);
        allTitles = allTitles.concat(titles.map( bdt => bdt.title ))
    }

    if (allTitles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se pudieron obtener títulos para este canal'
      });
    }

    console.log(`Total de títulos recopilados: ${allTitles.length}`);

    // Preparar los títulos para inserción
    const titles = allTitles;

    // Insertar en lotes
    let insertedCount = 0;
    const batchSize = 50;

    for (let i = 0; i < titles.length; i += batchSize) {
      const batch = titles.slice(i, i + batchSize);

      const result = await db.insert(trainingTitleExamples)
      .values(batch.map( b => {
        return { createdBy: userId!, title: b, isEvergreen: !!isEvergreen }
      }))
      .returning()
      insertedCount += result.length;
    }

    return res.status(200).json({
      success: true,
      message: `${insertedCount} títulos importados como ${isEvergreen ? 'evergreen' : 'no evergreen'} desde el canal de YouTube`,
      totalProcessed: allTitles.length,
      totalImported: insertedCount
    });
  } catch (error: any) {
    console.error('Error al importar desde canal:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al importar títulos desde el canal de YouTube',
      details: error.message
    });
  }
}

interface BulkOperation {
  ids?: number[];
  titles?: string[];
  operation: 'delete' | 'update' | 'create';
  data?: {
    is_evergreen?: boolean;
  };
  isEvergreen?: boolean;
}

async function bulkOperationTrainingExamples(req: Request, res: Response): Promise<Response> {
  try {
    const { operation, ids, titles, isEvergreen, data } = req.body as BulkOperation;

    if (!operation || !['delete', 'update', 'create'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'Operación inválida'
      });
    }

    let result: TrainingTitleExample[] = [];

    // Operación de creación masiva
    if (operation === 'create') {
      if (!titles || !Array.isArray(titles) || titles.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lista de títulos vacía o inválida'
        });
      }

      // Obtener usuario actual
      const userId = req.user!.id!;

      // Insertar en lotes
      let insertedCount = 0;
      const batchSize = 50;

      for (let i = 0; i < titles.length; i += batchSize) {
        const batch = titles.slice(i, i + batchSize);

        const batchResult = await db.insert(trainingTitleExamples)
        .values(batch.map(title => ({ title, isEvergreen, createdBy: userId })))    
        .returning()        

        insertedCount += batchResult.length;
      }

      return res.status(200).json({
        success: true,
        message: `${insertedCount} títulos importados como ${isEvergreen ? 'evergreen' : 'no evergreen'}`,
        totalProcessed: titles.length,
        insertedCount
      });
    } 
    // Operaciones sobre IDs existentes (eliminar o actualizar)
    else if (operation === 'delete' || operation === 'update') {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lista de IDs vacía o inválida'
        });
      }

      // Validar que todos los IDs sean numéricos
      const numericIds = ids.map(id => parseInt(String(id), 10))
                            .filter(id => !isNaN(id));

      if (numericIds.length !== ids.length) {
        return res.status(400).json({
          success: false,
          message: 'Algunos IDs no son válidos'
        });
      }

      if (operation === 'delete') {
        // Eliminar múltiples ejemplos
        result = await db.delete(trainingTitleExamples)
        .where(inArray(trainingTitleExamples.id, numericIds))
        .returning()
      } else if (operation === 'update' && data) {
        // Actualizar múltiples ejemplos
        // Solo actualizamos is_evergreen por ahora
        if (data.is_evergreen !== undefined) {
          result = await db.update(trainingTitleExamples)
          .set({ isEvergreen: data.is_evergreen })
          .where(inArray(trainingTitleExamples.id, numericIds))
          .returning();
        } 
        else {
          return res.status(400).json({
            success: false,
            message: 'No se proporcionaron datos para actualizar'
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Operación ${operation} completada exitosamente`,
      affectedCount: result.length,
      data: result
    });
  } catch (error: any) {
    console.error(`Error en operación masiva de ejemplos:`, error);
    return res.status(500).json({
      success: false,
      message: 'Error al realizar la operación masiva',
      details: error.message
    });
  }
}

async function exportTrainingExamples(req: Request, res: Response): Promise<Response> {
  try {
    // Parámetros de filtrado para la exportación
    const type = (req.query.type as string) || 'all';

    // Obtener todos los ejemplos que coincidan con el filtro
    const examples = await db.select()
    .from(trainingTitleExamples)
    .where(and(
      type === 'evergreen' ? eq(trainingTitleExamples.isEvergreen, true) : undefined,
      type === 'not-evergreen' ? eq(trainingTitleExamples.isEvergreen, false) : undefined
    ))
    .orderBy(asc(trainingTitleExamples.id))
    
    // Formatear para CSV
    const csvHeader = 'ID,Título,Evergreen,Fecha de Creación\n';
    const csvRows = examples.map(row => {
      return `${row.id},"${row.title.replace(/"/g, '""')}",${row.isEvergreen ? 'Sí' : 'No'},"${row.createdAt!.toISOString()}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    // Configurar cabeceras para descarga
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=ejemplos-entrenamiento-${new Date().toISOString().split('T')[0]}.csv`);

    return res.status(200).send(csvContent);
  } catch (error: any) {
    console.error('Error al exportar ejemplos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al exportar ejemplos de entrenamiento',
      details: error.message
    });
  }
}

// Configuración para la carga de archivos CSV
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'temp');
    // Asegurarse de que el directorio existe
    fs.mkdir(uploadsDir, { recursive: true })
      .then(() => cb(null, uploadsDir))
      .catch(err => cb(err, ''));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'csv-import-' + uniqueSuffix + '.csv');
  }
});

// Filtro para solo permitir archivos CSV
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos CSV'));
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB máximo
});

async function importTrainingExamplesFromCSV(req: Request, res: Response): Promise<Response> {
  try {
    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }

    // Obtener usuario actual
    const userId = req.user?.id;

    // Leer el archivo
    const fileContent = await fs.readFile(req.file.path, 'utf8');

    // Procesar el CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      skip_records_with_empty_values: true
    });

    // Verificar que hay registros
    if (!records || !Array.isArray(records) || records.length === 0) {
      await fs.unlink(req.file.path);  // Eliminar el archivo temporal
      return res.status(400).json({
        success: false,
        message: 'El archivo no contiene registros válidos'
      });
    }

    // Preparar datos para inserción en lotes
    const insertData: InsertTrainingTitleExample[] = [];

    // Validar y transformar registros
    for (const record of records) {
      // Determinar las columnas reales
      const columns = Object.keys(record);

      // Verificar que al menos están las columnas mínimas necesarias
      const hasTitle = columns.some(col => 
        col.toLowerCase() === 'título' || 
        col.toLowerCase() === 'titulo' || 
        col.toLowerCase() === 'title'
      );

      const hasEvergreen = columns.some(col => 
        col.toLowerCase() === 'evergreen' || 
        col.toLowerCase() === 'es_evergreen' || 
        col.toLowerCase() === 'is_evergreen'
      );

      if (!hasTitle || !hasEvergreen) {
        continue; // Saltamos este registro
      }

      // Obtener los valores
      const titleKey = columns.find(col => 
        col.toLowerCase() === 'título' || 
        col.toLowerCase() === 'titulo' || 
        col.toLowerCase() === 'title'
      ) || '';

      const evergreenKey = columns.find(col => 
        col.toLowerCase() === 'evergreen' || 
        col.toLowerCase() === 'es_evergreen' || 
        col.toLowerCase() === 'is_evergreen'
      ) || '';

      const title = record[titleKey];
      let isEvergreen = record[evergreenKey];

      // Validar título
      if (!title || typeof title !== 'string' || title.trim() === '') {
        continue;
      }

      // Normalizar el valor de evergreen
      if (typeof isEvergreen === 'string') {
        isEvergreen = isEvergreen.toLowerCase();
        isEvergreen = isEvergreen === 'true' || 
                      isEvergreen === 'sí' || 
                      isEvergreen === 'si' ||
                      isEvergreen === 'yes' || 
                      isEvergreen === '1' ||
                      isEvergreen === 'verdadero';
      } else {
        isEvergreen = !!isEvergreen;
      }

      // Añadir a los datos de inserción
      insertData.push({
        createdBy: userId!,
        title,
        isEvergreen: Boolean(isEvergreen)
      });
    }

    // Verificar que hay datos para importar
    if (insertData.length === 0) {
      await fs.unlink(req.file.path);  // Eliminar el archivo temporal
      return res.status(400).json({
        success: false,
        message: 'No se encontraron registros válidos para importar'
      });
    }

    // Insertar los registros en lotes
    let insertedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < insertData.length; i += batchSize) {
      const batch = insertData.slice(i, i + batchSize);

      const result = await db.insert(trainingTitleExamples)
      .values(batch)
      .returning()

      insertedCount += result.length;
    }

    // Eliminar el archivo temporal
    await fs.unlink(req.file.path);

    return res.status(200).json({
      success: true,
      message: `${insertedCount} ejemplos importados correctamente de ${insertData.length} registros procesados`,
      totalProcessed: insertData.length,
      totalImported: insertedCount
    });
  } catch (error: any) {
    console.error('Error al importar ejemplos:', error);

    // Intentar eliminar el archivo temporal en caso de error
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo temporal:', unlinkError);
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Error al importar ejemplos de entrenamiento',
      details: error.message
    });
  }
}

async function processVectorsFromTrainingExamples(req: Request, res: Response): Promise<Response> {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de IDs vacía o inválida'
      });
    }

    // Validar que todos los IDs sean numéricos
    const numericIds = ids.map(id => parseInt(String(id), 10))
                          .filter(id => !isNaN(id));

    if (numericIds.length !== ids.length) {
      return res.status(400).json({
        success: false,
        message: 'Algunos IDs no son válidos'
      });
    }

    // Procesar vectores utilizando el servicio
    const processedCount = await processTrainingExamplesVectors(numericIds);

    return res.status(200).json({
      success: true,
      message: `${processedCount} ejemplos procesados correctamente`,
      processedCount
    });
  } catch (error: any) {
    console.error('Error al procesar vectores de ejemplos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar vectores de ejemplos',
      details: error.message
    });
  }
}

async function setCategoryToExamples(req: Request, res: Response): Promise<Response> {

  // Obtain category and examples ids from request body
  const { category, exampleIds } = req.body;

  // Validate inputs separately
  if (!category) {
    return res.status(400).json({
      success: false,
      message: 'Debe proporcionar una categoría'
    });
  }

  if (!exampleIds || !Array.isArray(exampleIds) || exampleIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Debe proporcionar una lista de ejemplos'
    });
  }

  try {

    await db.update(trainingTitleExamples).set({ category })
      .where( inArray(trainingTitleExamples.id, exampleIds) )
    
    return res.status(200).json({ success: true })
  }
  catch (error) {
    console.error('Error al asignar categoría a ejemplos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al asignar categoría a los ejemplos'
    })
  }
  
  
  
}

export function setUpTitulinRoutes(
  requireAuth: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Response<any, Record<string, any>> | undefined,
  app: Express,
) {
  app.post("/api/titulin/channels", requireAuth, addChannel);
  app.get("/api/titulin/channels", requireAuth, getChannels);
  app.delete("/api/titulin/channels/:channelId", requireAuth, deleteChannel);
  app.post("/api/titulin/channels/:channelId/sync", requireAuth, syncChannel);
  app.get("/api/titulin/videos", requireAuth, getVideos);
  app.post("/api/titulin/videos/:videoId/send-to-optimize", requireAuth, sendToOptimize );
  app.get("/api/titulin/videos/stats", requireAuth, getVideoStats);

  // Nuevas rutas
  app.post("/api/titulin/videos/:videoId/analyze", requireAuth, analyzeVideo);

  // Ruta para limpieza de datos huérfanos
  app.post("/api/titulin/cleanup/orphaned-videos", requireAuth, cleanOrphans);

  // API de sugerencias para autocompletado
  app.get("/api/titulin/suggestions", requireAuth, getSuggestions);

  // Endpoint público para obtener canales (para ejemplos de entrenamiento)
  app.get( "/api/titulin/channels/for-training", requireAuth, getChannelsForTraining );

  // Nueva ruta para búsqueda de títulos similares
  app.get("/api/titulin/videos/:videoId/similar", requireAuth, getSimilarVideos);

  // Obtener ejemplos de títulos con paginación y filtros
  app.get('/api/titulin/training-examples', requireAuth, getTrainingExamples);

  // Añadir un nuevo ejemplo de título
  app.post('/api/titulin/training-examples', requireAuth, createTrainingExample);

  // Eliminar un ejemplo de título
  app.delete('/api/titulin/training-examples/:id', requireAuth, deleteTrainingExample);

  // Operaciones en lote para ejemplos de entrenamiento (crear múltiples, eliminar múltiples, actualizar múltiples)
  app.post('/api/titulin/training-examples/bulk', requireAuth, bulkOperationTrainingExamples );

  // Exportar ejemplos de entrenamiento (CSV)
  app.get('/api/titulin/training-examples/export', requireAuth, exportTrainingExamples);

  // Importar ejemplos de entrenamiento desde un canal de YouTube
  app.post('/api/titulin/training-examples/import-from-channel', requireAuth, importTrainingExamplesFromYTChannel);

  // Importar ejemplos de entrenamiento desde CSV
  app.post('/api/titulin/training-examples/import', requireAuth, upload.single('file'), importTrainingExamplesFromCSV );

  // Procesar vectores para ejemplos de entrenamiento
  app.post('/api/titulin/training-examples/process-vectors', requireAuth, processVectorsFromTrainingExamples );

  // Aplicar categoria a un ejemplo de título
  app.post('/api/titulin/training-examples/category', requireAuth, setCategoryToExamples );

}
