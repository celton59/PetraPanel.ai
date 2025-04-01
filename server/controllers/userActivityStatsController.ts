import type { NextFunction, Request, Response } from "express";
import { type Express } from "express";
import { and, asc, between, count, desc, eq, gt, gte, lt, lte, sql } from "drizzle-orm";
import { db } from "@db";
import { users, userActions, videos, projects, userSessions } from "@db/schema";

/**
 * Obtener estadísticas detalladas de actividad por usuario
 * Permite filtrar por fecha y usuario
 */
async function getUserActivityStats(req: Request, res: Response): Promise<Response> {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Debes iniciar sesión para acceder a esta funcionalidad",
    });
  }

  try {
    // Parámetros de filtro
    const { 
      userId, 
      startDate, 
      endDate,
      actionType,
      limit = 100,
      offset = 0
    } = req.query;

    // Construir la consulta base
    let query = db
      .select({
        id: userActions.id,
        userId: userActions.userId,
        userName: users.username,
        userFullName: users.fullName,
        actionType: userActions.actionType,
        actionDetail: userActions.actionDetail,
        entityId: userActions.entityId, 
        entityType: userActions.entityType,
        entityName: sql<string>`
          CASE 
            WHEN ${userActions.entityType} = 'video' THEN (SELECT title FROM videos WHERE id = ${userActions.entityId})
            WHEN ${userActions.entityType} = 'project' THEN (SELECT name FROM projects WHERE id = ${userActions.entityId})
            WHEN ${userActions.entityType} = 'user' THEN (SELECT full_name FROM users WHERE id = ${userActions.entityId})
            ELSE ${userActions.entityType}
          END
        `,
        createdAt: userActions.createdAt,
        ipAddress: userActions.ipAddress,
        userAgent: userActions.userAgent
      })
      .from(userActions)
      .leftJoin(users, eq(userActions.userId, users.id));

    // Aplicar filtros
    const conditions = [];
    
    if (userId && !isNaN(Number(userId))) {
      conditions.push(eq(userActions.userId, Number(userId)));
    }
    
    if (startDate && isValidDateString(startDate as string)) {
      conditions.push(gte(userActions.createdAt, new Date(startDate as string)));
    }
    
    if (endDate && isValidDateString(endDate as string)) {
      // Añadir un día al final para incluir todo el día final
      const endDateObj = new Date(endDate as string);
      endDateObj.setDate(endDateObj.getDate() + 1);
      conditions.push(lt(userActions.createdAt, endDateObj));
    }
    
    if (actionType) {
      conditions.push(eq(userActions.actionType, actionType as string));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Ejecutar consulta con ordenamiento y paginación
    const data = await query
      .orderBy(desc(userActions.createdAt))
      .limit(Number(limit))
      .offset(Number(offset))
      .execute();
    
    // Obtener recuento total para paginación
    const totalCount = await db
      .select({ count: count() })
      .from(userActions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .execute();
    
    // Obtener resumen por tipo de acción
    const actionSummary = await db
      .select({
        actionType: userActions.actionType,
        count: count(),
      })
      .from(userActions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(userActions.actionType)
      .execute();
    
    // Obtener resumen por usuario
    const userSummary = await db
      .select({
        userId: userActions.userId,
        userName: users.username,
        userFullName: users.fullName,
        count: count(),
      })
      .from(userActions)
      .leftJoin(users, eq(userActions.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(userActions.userId, users.username, users.fullName)
      .orderBy(desc(count()))
      .limit(10)
      .execute();
    
    // Obtener datos por día
    const dailyActivity = await db
      .select({
        date: sql<string>`DATE_TRUNC('day', ${userActions.createdAt})::date`,
        count: count(),
      })
      .from(userActions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(sql`DATE_TRUNC('day', ${userActions.createdAt})::date`)
      .orderBy(asc(sql`DATE_TRUNC('day', ${userActions.createdAt})::date`))
      .execute();
    
    // Obtener datos de sesiones si se filtró por usuario
    let sessionData = [];
    if (userId && !isNaN(Number(userId))) {
      sessionData = await db
        .select({
          id: userSessions.id,
          userId: userSessions.userId,
          startTime: userSessions.startTime,
          endTime: userSessions.endTime,
          duration: sql<number>`EXTRACT(EPOCH FROM (${userSessions.endTime} - ${userSessions.startTime}))::integer`,
          ipAddress: userSessions.ipAddress,
          userAgent: userSessions.userAgent
        })
        .from(userSessions)
        .where(eq(userSessions.userId, Number(userId)))
        .orderBy(desc(userSessions.startTime))
        .limit(20)
        .execute();
    }
    
    // Devolver datos estructurados
    return res.status(200).json({
      success: true,
      data: data,
      meta: {
        total: totalCount[0]?.count || 0,
        filtered: data.length,
        limit: Number(limit),
        offset: Number(offset)
      },
      summary: {
        byAction: actionSummary,
        byUser: userSummary,
        byDate: dailyActivity,
        sessions: sessionData
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de actividad de usuarios:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al obtener estadísticas de actividad de usuarios',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

/**
 * Obtener la lista de usuarios para el selector de filtro
 */
async function getUsersForFilter(req: Request, res: Response): Promise<Response> {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Debes iniciar sesión para acceder a esta funcionalidad",
    });
  }

  try {
    const data = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        avatarUrl: users.avatarUrl
      })
      .from(users)
      .orderBy(asc(users.fullName))
      .execute();
    
    return res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error al obtener lista de usuarios:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al obtener lista de usuarios',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

/**
 * Obtener tipos de acciones para el selector de filtro
 */
async function getActionTypes(req: Request, res: Response): Promise<Response> {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Debes iniciar sesión para acceder a esta funcionalidad",
    });
  }

  try {
    const data = await db
      .select({
        actionType: userActions.actionType,
        count: count()
      })
      .from(userActions)
      .groupBy(userActions.actionType)
      .orderBy(desc(count()))
      .execute();
    
    return res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error al obtener tipos de acciones:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al obtener tipos de acciones',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

/**
 * Configurar las rutas de estadísticas de actividad de usuarios
 */
export function setupUserActivityStatsRoutes(
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  app: Express
) {
  // Endpoint para estadísticas de actividad de usuarios
  app.get("/api/stats/user-activity", requireAuth, getUserActivityStats);
  
  // Endpoint para obtener la lista de usuarios para el filtro
  app.get("/api/stats/user-activity/users", requireAuth, getUsersForFilter);
  
  // Endpoint para obtener los tipos de acciones para el filtro
  app.get("/api/stats/user-activity/action-types", requireAuth, getActionTypes);
}

// Helper para validar formato de fecha
function isValidDateString(dateStr: string): boolean {
  return !isNaN(Date.parse(dateStr));
}