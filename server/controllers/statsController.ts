import type { NextFunction, Request, Response } from "express";
import { count, eq, desc, sql, and, gte, lt, inArray } from "drizzle-orm";
import { db } from "@db";
import { videos, projects, users, VIDEO_STATUSES_ARRAY } from "@db/schema";
import { type Express } from "express";

/**
 * Obtener estadísticas generales para el dashboard
 * Incluye:
 * - Conteo de videos por estado
 * - Conteo de videos por proyecto
 * - Conteo de videos creados por mes
 * - Top usuarios por videos creados
 */
async function getDashboardStats(req: Request, res: Response): Promise<Response> {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Debes iniciar sesión para acceder a esta funcionalidad",
    });
  }

  try {
    // 1. Obtener conteo de videos por estado
    const stateCountsPromise = db
      .select({
        status: videos.status,
        count: count()
      })
      .from(videos)
      .where(eq(videos.isDeleted, false))
      .groupBy(videos.status)
      .execute();
    
    // 2. Obtener conteo de videos por proyecto
    const projectStatsPromise = db
      .select({
        projectId: videos.projectId,
        projectName: projects.name,
        projectPrefix: projects.prefix,
        count: count()
      })
      .from(videos)
      .where(eq(videos.isDeleted, false))
      .innerJoin(projects, eq(videos.projectId, projects.id))
      .groupBy(videos.projectId, projects.name, projects.prefix)
      .orderBy(desc(count()))
      .limit(5)
      .execute();
    
    // 3. Obtener conteo de videos eliminados
    const deletedCountPromise = db
      .select({
        deletedCount: count()
      })
      .from(videos)
      .where(eq(videos.isDeleted, true))
      .execute();
    
    // 4. Obtener conteo de videos creados en los últimos 6 meses agrupados por mes
    // Calculamos la fecha de hace 6 meses
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyStatsPromise = db
      .select({
        month: sql`to_char(created_at, 'YYYY-MM')`,
        count: count()
      })
      .from(videos)
      .where(gte(videos.createdAt, sixMonthsAgo))
      .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(created_at, 'YYYY-MM')`)
      .execute();
    
    // 5. Top 5 usuarios por videos creados
    const topUsersPromise = db
      .select({
        userId: videos.createdBy,
        username: users.username,
        fullName: users.fullName,
        count: count()
      })
      .from(videos)
      .where(and(eq(videos.isDeleted, false), inArray(videos.status, ['completed', 'final_review'])))
      .innerJoin(users, eq(videos.createdBy, users.id))
      .groupBy(videos.createdBy, users.username, users.fullName)
      .orderBy(desc(count()))
      .limit(5)
      .execute();
    
    // 6. Optimizadores más activos - videos optimizados
    const topOptimizersPromise = db
      .select({
        userId: videos.optimizedBy,
        username: users.username,
        fullName: users.fullName,
        count: count()
      })
      .from(videos)
      .where(and(
        eq(videos.isDeleted, false),
        sql`optimized_by IS NOT NULL`
      ))
      .innerJoin(users, eq(videos.optimizedBy, users.id))
      .groupBy(videos.optimizedBy, users.username, users.fullName)
      .orderBy(desc(count()))
      .limit(5)
      .execute();
    
    // Ejecutar todas las promesas en paralelo
    const [
      stateCounts, 
      projectStats, 
      deletedResult, 
      monthlyStats, 
      topUsers,
      topOptimizers
    ] = await Promise.all([
      stateCountsPromise, 
      projectStatsPromise, 
      deletedCountPromise, 
      monthlyStatsPromise, 
      topUsersPromise,
      topOptimizersPromise
    ]);
    
    // Formatear los datos para la respuesta
    // Convertir el array de conteos por estado a un objeto
    const stateCountsObj: Record<string, number> = {};
    VIDEO_STATUSES_ARRAY.forEach(status => {
      stateCountsObj[status] = 0;
    });
    
    stateCounts.forEach(item => {
      if (item.status) {
        stateCountsObj[item.status] = Number(item.count);
      }
    });
    
    // Calcular el total de videos (excluyendo eliminados)
    const totalVideos = Object.values(stateCountsObj).reduce((sum, count) => sum + count, 0);
    const deletedCount = deletedResult[0]?.deletedCount || 0;
    
    return res.status(200).json({
      totalVideos,
      stateCounts: stateCountsObj,
      deletedCount,
      projectStats: projectStats.map(p => ({
        projectId: p.projectId,
        name: p.projectName,
        prefix: p.projectPrefix,
        count: Number(p.count)
      })),
      monthlyStats: monthlyStats.map(m => ({
        month: m.month,
        count: Number(m.count)
      })),
      topUsers: topUsers.map(u => ({
        userId: u.userId,
        username: u.username,
        fullName: u.fullName || u.username,
        count: Number(u.count)
      })),
      topOptimizers: topOptimizers.map(o => ({
        userId: o.userId,
        username: o.username,
        fullName: o.fullName || o.username,
        count: Number(o.count)
      }))
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    return res.status(500).json({ 
      error: 'Error al obtener estadísticas del dashboard',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

/**
 * Obtener estadísticas de proyectos
 */
async function getProjectStats(req: Request, res: Response): Promise<Response> {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Debes iniciar sesión para acceder a esta funcionalidad",
    });
  }

  try {
    // Obtener estadísticas por proyecto
    const projectStatsPromise = db
      .select({
        projectId: videos.projectId,
        projectName: projects.name,
        projectPrefix: projects.prefix,
        count: count(),
        available: count(sql`CASE WHEN status = 'available' THEN 1 END`),
        contentCorrections: count(sql`CASE WHEN status = 'content_corrections' THEN 1 END`),
        contentReview: count(sql`CASE WHEN status = 'content_review' THEN 1 END`),
        uploadMedia: count(sql`CASE WHEN status = 'upload_media' THEN 1 END`),
        mediaCorrections: count(sql`CASE WHEN status = 'media_corrections' THEN 1 END`),
        mediaReview: count(sql`CASE WHEN status = 'media_review' THEN 1 END`),
        finalReview: count(sql`CASE WHEN status = 'final_review' THEN 1 END`),
        completed: count(sql`CASE WHEN status = 'completed' THEN 1 END`),
      })
      .from(videos)
      .where(eq(videos.isDeleted, false))
      .innerJoin(projects, eq(videos.projectId, projects.id))
      .groupBy(videos.projectId, projects.name, projects.prefix)
      .orderBy(desc(count()))
      .execute();
    
    // Formatear los datos para la respuesta
    const projectStats = await projectStatsPromise;
    
    return res.status(200).json({
      projects: projectStats.map(p => ({
        id: p.projectId,
        name: p.projectName,
        prefix: p.projectPrefix,
        totalVideos: Number(p.count),
        stateCounts: {
          available: Number(p.available),
          content_corrections: Number(p.contentCorrections),
          content_review: Number(p.contentReview),
          upload_media: Number(p.uploadMedia),
          media_corrections: Number(p.mediaCorrections),
          media_review: Number(p.mediaReview),
          final_review: Number(p.finalReview),
          completed: Number(p.completed)
        }
      }))
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de proyectos:', error);
    return res.status(500).json({ 
      error: 'Error al obtener estadísticas de proyectos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

/**
 * Obtener estadísticas de usuarios
 */
async function getUserStats(req: Request, res: Response): Promise<Response> {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Debes iniciar sesión para acceder a esta funcionalidad",
    });
  }

  try {
    // Obtener estadísticas por rol de usuario
    const creatorStatsPromise = db
      .select({
        userId: videos.createdBy,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        totalVideos: count(),
        completed: count(sql`CASE WHEN status = 'completed' THEN 1 END`),
        inProgress: count(sql`CASE WHEN status != 'completed' THEN 1 END`)
      })
      .from(videos)
      .where(eq(videos.isDeleted, false))
      .innerJoin(users, eq(videos.createdBy, users.id))
      .groupBy(videos.createdBy, users.username, users.fullName, users.role)
      .orderBy(desc(count()))
      .execute();
    
    const optimizerStatsPromise = db
      .select({
        userId: videos.optimizedBy,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        totalOptimized: count(),
        completed: count(sql`CASE WHEN status = 'completed' THEN 1 END`),
        inReview: count(sql`CASE WHEN status IN ('content_review', 'upload_media', 'media_corrections', 'media_review', 'final_review') THEN 1 END`)
      })
      .from(videos)
      .where(and(
        eq(videos.isDeleted, false),
        sql`optimized_by IS NOT NULL`
      ))
      .innerJoin(users, eq(videos.optimizedBy, users.id))
      .groupBy(videos.optimizedBy, users.username, users.fullName, users.role)
      .orderBy(desc(count()))
      .execute();
    
    const reviewerStatsPromise = db
      .select({
        userId: videos.contentReviewedBy,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        totalReviewed: count(),
        approved: count(sql`CASE WHEN status IN ('upload_media', 'media_corrections', 'media_review', 'final_review', 'completed') THEN 1 END`),
        rejected: count(sql`CASE WHEN status = 'content_corrections' THEN 1 END`)
      })
      .from(videos)
      .where(and(
        eq(videos.isDeleted, false),
        sql`content_reviewed_by IS NOT NULL`
      ))
      .innerJoin(users, eq(videos.contentReviewedBy, users.id))
      .groupBy(videos.contentReviewedBy, users.username, users.fullName, users.role)
      .orderBy(desc(count()))
      .execute();
    
    const mediaReviewerStatsPromise = db
      .select({
        userId: videos.mediaReviewedBy,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        totalReviewed: count(),
        approved: count(sql`CASE WHEN status IN ('final_review', 'completed') THEN 1 END`),
        rejected: count(sql`CASE WHEN status = 'media_corrections' THEN 1 END`)
      })
      .from(videos)
      .where(and(
        eq(videos.isDeleted, false),
        sql`media_reviewed_by IS NOT NULL`
      ))
      .innerJoin(users, eq(videos.mediaReviewedBy, users.id))
      .groupBy(videos.mediaReviewedBy, users.username, users.fullName, users.role)
      .orderBy(desc(count()))
      .execute();
    
    // Ejecutar todas las promesas en paralelo
    const [
      creatorStats,
      optimizerStats,
      reviewerStats,
      mediaReviewerStats
    ] = await Promise.all([
      creatorStatsPromise,
      optimizerStatsPromise,
      reviewerStatsPromise,
      mediaReviewerStatsPromise
    ]);
    
    return res.status(200).json({
      creators: creatorStats.map(u => ({
        userId: u.userId,
        username: u.username,
        fullName: u.fullName || u.username,
        role: u.role,
        totalVideos: Number(u.totalVideos),
        completed: Number(u.completed),
        inProgress: Number(u.inProgress)
      })),
      optimizers: optimizerStats.map(u => ({
        userId: u.userId,
        username: u.username,
        fullName: u.fullName || u.username,
        role: u.role,
        totalOptimized: Number(u.totalOptimized),
        completed: Number(u.completed),
        inReview: Number(u.inReview)
      })),
      contentReviewers: reviewerStats.map(u => ({
        userId: u.userId,
        username: u.username,
        fullName: u.fullName || u.username,
        role: u.role,
        totalReviewed: Number(u.totalReviewed),
        approved: Number(u.approved),
        rejected: Number(u.rejected)
      })),
      mediaReviewers: mediaReviewerStats.map(u => ({
        userId: u.userId,
        username: u.username,
        fullName: u.fullName || u.username,
        role: u.role,
        totalReviewed: Number(u.totalReviewed),
        approved: Number(u.approved),
        rejected: Number(u.rejected)
      }))
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de usuarios:', error);
    return res.status(500).json({ 
      error: 'Error al obtener estadísticas de usuarios',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

/**
 * Configurar las rutas de estadísticas
 */
export function setupStatsRoutes(
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  app: Express
) {
  // Endpoint para estadísticas generales del dashboard
  app.get("/api/stats/dashboard", requireAuth, getDashboardStats);
  
  // Endpoint para estadísticas detalladas por proyecto
  app.get("/api/stats/projects", requireAuth, getProjectStats);
  
  // Endpoint para estadísticas de usuarios
  app.get("/api/stats/users", requireAuth, getUserStats);
}