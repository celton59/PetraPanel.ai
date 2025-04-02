/**
 * Controlador para endpoints de compatibilidad
 * 
 * Este controlador proporciona endpoints alternativos para operaciones
 * que pueden tener problemas de permisos o compatibilidad en producción.
 */

import { Request, Response, NextFunction, Express } from "express";
import { updateUserLimits } from "../scripts/update_user_limits_script";
import { db } from "../../db";
import { users } from "../../db/schema";
import { z } from "zod";
import { eq, count, sql } from "drizzle-orm";
import crypto from "crypto";

// Clave secreta para el endpoint de gestión especial
// En producción, usar una variable de entorno (process.env.MANAGEMENT_API_KEY)
const MANAGEMENT_API_KEY = "petra_management_" + crypto.randomBytes(8).toString('hex');

// Imprimir la clave API en el log de inicio (solo en desarrollo)
console.log("\n⚠️ CLAVE API DE GESTIÓN (copiar y guardar): " + MANAGEMENT_API_KEY + "\n");

// Esquema de validación para actualización de límites
const updateLimitsSchema = z.object({
  userId: z.number().positive(),
  maxAssignedVideos: z.number().positive().optional(),
  maxMonthlyVideos: z.number().positive().optional()
}).refine(data => 
  data.maxAssignedVideos !== undefined || data.maxMonthlyVideos !== undefined, {
    message: "Debe proporcionar al menos un límite para actualizar"
  }
);

// Esquema para actualización masiva de límites
const updateAllLimitsSchema = z.object({
  maxAssignedVideos: z.number().positive(),
  maxMonthlyVideos: z.number().positive()
});

/**
 * Middleware para verificar la clave API de gestión
 * Esto permite acceso a funciones administrativas sin requerir login
 */
export function requireManagementKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-management-api-key'] || req.query.api_key;
  
  if (!apiKey || apiKey !== MANAGEMENT_API_KEY) {
    console.warn("[Compat] Intento de acceso a API de gestión con clave inválida:", 
      apiKey ? "Clave incorrecta" : "Sin clave");
    return res.status(401).json({
      success: false,
      message: "Clave API de gestión inválida o no proporcionada"
    });
  }
  
  next();
}

/**
 * Endpoint para actualizar límites de usuarios usando el script especializado
 * Esta es una alternativa compatible cuando otros métodos fallan por permisos
 */
export async function updateUserLimitsCompat(req: Request, res: Response) {
  try {
    console.log("[Compat] Intentando actualizar límites:", req.body);
    
    // Verificar si es un administrador
    if (req.user?.role !== "admin") {
      console.log("[Compat] Acceso denegado - El usuario no es admin:", req.user?.username);
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para realizar esta acción"
      });
    }
    
    // Comprobar si es una actualización masiva
    if (req.body.allUsers === true) {
      console.log("[Compat] Detectada actualización masiva de límites desde la UI");
      
      const maxAssignedVideos = req.body.maxAssignedVideos;
      const maxMonthlyVideos = req.body.maxMonthlyVideos;
      
      if (!maxAssignedVideos || !maxMonthlyVideos) {
        return res.status(400).json({
          success: false,
          message: "Debe proporcionar maxAssignedVideos y maxMonthlyVideos para actualización masiva"
        });
      }
      
      // Actualizar todos los usuarios inmediatamente
      try {
        // Contar usuarios antes de actualizar
        const userCount = await db
          .select({ count: count() })
          .from(users);
          
        const totalUsers = userCount[0]?.count || 0;
        
        // Actualizar SOLO usuarios youtuber
        const result = await db
          .update(users)
          .set({
            maxAssignedVideos,
            maxMonthlyVideos,
            updatedAt: new Date()
          })
          .where(eq(users.role, "youtuber"));
          
        // También debemos buscar y actualizar los límites mensuales específicos en la tabla monthlyVideoLimits
        try {
          // Importamos el esquema de la tabla
          const { monthlyVideoLimits } = await import("../../db/schema");
          
          // Obtenemos el mes y año actual
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth() + 1; // getMonth() devuelve 0-11
          
          console.log(`[Compat] Actualizando límites mensuales específicos para año ${currentYear}, mes ${currentMonth} y posteriores`);
          
          // 1. Primero actualizamos los límites existentes
          const updateResult = await db.execute(
            sql`UPDATE "monthly_video_limits" 
                SET "max_videos" = ${maxMonthlyVideos}, "updated_at" = NOW() 
                WHERE ("year" > ${currentYear}) OR 
                      ("year" = ${currentYear} AND "month" >= ${currentMonth})`
          );
          
          console.log(`[Compat] Actualizados límites mensuales específicos existentes`);
          
          // 2. Obtenemos los youtubers activos
          const youtuberIds = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.role, "youtuber"))
            .then(results => results.map(r => r.id));
          
          if (youtuberIds.length > 0) {
            // 3. Para cada youtuber, asegurar que tenga un registro para el mes actual
            for (const userId of youtuberIds) {
              // Verificar si ya existe un registro para este mes
              const existingLimit = await db
                .select()
                .from(monthlyVideoLimits)
                .where(
                  sql`${monthlyVideoLimits.userId} = ${userId} AND 
                  ${monthlyVideoLimits.year} = ${currentYear} AND 
                  ${monthlyVideoLimits.month} = ${currentMonth}`
                );
              
              // Si no existe, crear uno nuevo
              if (existingLimit.length === 0) {
                await db.insert(monthlyVideoLimits).values({
                  userId: userId,
                  year: currentYear,
                  month: currentMonth,
                  maxVideos: maxMonthlyVideos,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
                console.log(`[Compat] Creado nuevo límite mensual para usuario ${userId}, ${currentMonth}/${currentYear}`);
              }
            }
          }
          
          console.log(`[Compat] Límites mensuales específicos actualizados correctamente`);
        } catch (specificLimitsError) {
          console.error("[Compat] Error actualizando límites mensuales específicos:", specificLimitsError);
          // No detenemos la ejecución, simplemente registramos el error
        }
        
        console.log(`[Compat] Actualización masiva exitosa! Actualizados: ${totalUsers} usuarios`);
        return res.json({
          success: true,
          message: `Límites actualizados para todos los youtubers (${totalUsers})`,
          data: {
            totalUsers,
            newLimits: {
              maxAssignedVideos,
              maxMonthlyVideos
            }
          }
        });
      } catch (dbError) {
        console.error("[Compat] Error en actualización masiva:", dbError);
        return res.status(500).json({
          success: false,
          message: "Error actualizando todos los límites de usuarios"
        });
      }
    }
    
    // Actualización individual
    // Validar datos de entrada con esquema mínimo para facilitar uso
    const userId = req.body.userId;
    const maxAssignedVideos = req.body.maxAssignedVideos;
    const maxMonthlyVideos = req.body.maxMonthlyVideos;
    
    if (!userId || typeof userId !== 'number') {
      return res.status(400).json({
        success: false,
        message: "ID de usuario requerido y debe ser un número"
      });
    }
    
    if ((!maxAssignedVideos && !maxMonthlyVideos) || 
        (maxAssignedVideos && typeof maxAssignedVideos !== 'number') || 
        (maxMonthlyVideos && typeof maxMonthlyVideos !== 'number')) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar al menos un límite válido para actualizar"
      });
    }
    
    // Actualizar el usuario directamente sin validaciones adicionales
    try {
      const updateData: any = { updatedAt: new Date() };
      
      if (maxAssignedVideos) updateData.maxAssignedVideos = maxAssignedVideos;
      if (maxMonthlyVideos) updateData.maxMonthlyVideos = maxMonthlyVideos;
      
      const updatedUser = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          username: users.username,
          maxAssignedVideos: users.maxAssignedVideos,
          maxMonthlyVideos: users.maxMonthlyVideos
        });
        
      if (!updatedUser || updatedUser.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado"
        });
      }
      
      console.log(`[Compat] Usuario ${updatedUser[0].username} actualizado correctamente:`, 
        updatedUser[0]);
      
      return res.json({
        success: true,
        message: "Límites de usuario actualizados correctamente",
        data: updatedUser[0]
      });
    } catch (dbError) {
      console.error("[Compat] Error en actualización individual:", dbError);
      return res.status(500).json({
        success: false,
        message: "Error actualizando límites del usuario"
      });
    }
  } catch (error) {
    console.error("[Compat] Error en actualización de límites:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Error en la actualización de límites"
    });
  }
}

/**
 * Endpoint especial para actualizar límites de usuarios con clave API
 * Esto permite actualizar límites sin necesidad de autorización normal
 */
export async function updateUserLimitsSpecial(req: Request, res: Response) {
  try {
    console.log("[Compat] Actualización especial de límites:", req.body);
    
    // Validar datos de entrada
    const validationResult = updateLimitsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false, 
        message: validationResult.error.message
      });
    }
    
    const { userId, maxAssignedVideos, maxMonthlyVideos } = validationResult.data;
    
    // Verificar que el usuario existe
    const userExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
      
    if (userExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No se encontró ningún usuario con ID ${userId}`
      });
    }
    
    // Actualizar el usuario directamente en la base de datos
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (maxAssignedVideos !== undefined) {
      updateData.maxAssignedVideos = maxAssignedVideos;
    }
    
    if (maxMonthlyVideos !== undefined) {
      updateData.maxMonthlyVideos = maxMonthlyVideos;
    }
    
    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        maxAssignedVideos: users.maxAssignedVideos,
        maxMonthlyVideos: users.maxMonthlyVideos
      });
      
    if (!updatedUser || updatedUser.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Error al actualizar el usuario"
      });
    }
    
    return res.json({
      success: true,
      message: "Límites de usuario actualizados correctamente",
      data: updatedUser[0]
    });
  } catch (error) {
    console.error("[Compat] Error en actualización especial de límites:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Error en la actualización especial de límites"
    });
  }
}

/**
 * Endpoint especial para actualizar límites de TODOS los usuarios con clave API
 */
export async function updateAllUsersLimitsSpecial(req: Request, res: Response) {
  try {
    console.log("[Compat] Actualización masiva de límites:", req.body);
    
    // Validar datos de entrada
    const validationResult = updateAllLimitsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false, 
        message: validationResult.error.message
      });
    }
    
    const { maxAssignedVideos, maxMonthlyVideos } = validationResult.data;
    
    // Contar usuarios antes de actualizar
    const userCount = await db
      .select({ count: count() })
      .from(users);
      
    const totalUsers = userCount[0]?.count || 0;
    
    // Actualizar todos los usuarios
    await db
      .update(users)
      .set({
        maxAssignedVideos,
        maxMonthlyVideos,
        updatedAt: new Date()
      });
    
    return res.json({
      success: true,
      message: `Límites actualizados para todos los usuarios (${totalUsers})`,
      data: {
        totalUsers,
        newLimits: {
          maxAssignedVideos,
          maxMonthlyVideos
        }
      }
    });
  } catch (error) {
    console.error("[Compat] Error en actualización masiva de límites:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Error en la actualización masiva de límites"
    });
  }
}

/**
 * Endpoint para obtener un informe sobre los límites actuales de los usuarios
 */
export async function getLimitsReportSpecial(req: Request, res: Response) {
  try {
    console.log("[Compat] Generando informe de límites");
    
    // Obtener todos los usuarios con sus límites
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        maxAssignedVideos: users.maxAssignedVideos,
        maxMonthlyVideos: users.maxMonthlyVideos
      })
      .from(users)
      .orderBy(users.id);
      
    // Generar estadísticas
    const stats = {
      totalUsers: allUsers.length,
      usersWithCustomLimits: allUsers.filter(u => u.maxAssignedVideos !== null).length,
      usersWithDefaultLimits: allUsers.filter(u => u.maxAssignedVideos === null).length,
      averageAssignedLimit: Math.round(
        allUsers.reduce((sum, u) => sum + (u.maxAssignedVideos || 3), 0) / allUsers.length
      )
    };
    
    return res.json({
      success: true,
      message: "Informe de límites generado correctamente",
      data: {
        stats,
        users: allUsers
      }
    });
  } catch (error) {
    console.error("[Compat] Error al generar informe de límites:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Error al generar informe de límites"
    });
  }
}

/**
 * Configuración de rutas de compatibilidad
 */
export function setupCompatRoutes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void
) {
  // Endpoint alternativo para actualizar límites de usuarios (con autenticación normal)
  app.post("/api/compat/update-limits", requireAuth, updateUserLimitsCompat);
  
  // Endpoints especiales con autenticación por clave API (no necesitan login)
  app.put("/api/management/limits/user/:userId", requireManagementKey, (req, res) => {
    // Fusionar parámetros de la URL con el cuerpo
    req.body.userId = parseInt(req.params.userId, 10);
    updateUserLimitsSpecial(req, res);
  });
  
  app.post("/api/management/limits/all-users", requireManagementKey, updateAllUsersLimitsSpecial);
  app.get("/api/management/limits/report", requireManagementKey, getLimitsReportSpecial);
  
  console.log("[Compat] Rutas de compatibilidad configuradas");
}