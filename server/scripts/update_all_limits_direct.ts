/**
 * Script para actualizar directamente los límites de todos los usuarios en la base de datos
 * 
 * Este script NO requiere una API ni autenticación, se conecta directamente a la base de datos.
 * 
 * Modo de uso:
 * 1. Asegurar que DATABASE_URL esté configurado correctamente
 * 2. Ejecutar: npx tsx server/scripts/update_all_limits_direct.ts
 */

import { db } from "../../db";
import { users } from "../../db/schema";
import { count } from "drizzle-orm";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

// Configurar los nuevos límites que deseas aplicar
const NEW_ASSIGNED_VIDEOS_LIMIT = 50;
const NEW_MONTHLY_VIDEOS_LIMIT = 100;

async function updateAllUsersLimits() {
  try {
    console.log("Conectando a la base de datos...");
    
    // Verificar conexión a la base de datos
    if (!process.env.DATABASE_URL) {
      console.error("Error: No se encontró la variable de entorno DATABASE_URL");
      process.exit(1);
    }
    
    // Contar usuarios antes de actualizar
    const userCount = await db
      .select({ count: count() })
      .from(users);
      
    const totalUsers = userCount[0]?.count || 0;
    
    console.log(`Se encontraron ${totalUsers} usuarios en la base de datos`);
    
    // Confirmar actualización
    console.log(`Se actualizarán los siguientes límites para TODOS los usuarios:`);
    console.log(`- Vídeos asignados concurrentes: ${NEW_ASSIGNED_VIDEOS_LIMIT}`);
    console.log(`- Vídeos mensuales: ${NEW_MONTHLY_VIDEOS_LIMIT}`);
    console.log("\nActualizando límites...");
    
    // Actualizar todos los usuarios
    const result = await db
      .update(users)
      .set({
        maxAssignedVideos: NEW_ASSIGNED_VIDEOS_LIMIT,
        maxMonthlyVideos: NEW_MONTHLY_VIDEOS_LIMIT,
        updatedAt: new Date()
      });
    
    console.log(`\n✅ ÉXITO: Límites actualizados para todos los usuarios (${totalUsers})`);
    console.log(`Nuevos límites configurados:`);
    console.log(`- Vídeos asignados concurrentes: ${NEW_ASSIGNED_VIDEOS_LIMIT}`);
    console.log(`- Vídeos mensuales: ${NEW_MONTHLY_VIDEOS_LIMIT}`);
    
    return {
      success: true,
      totalUsers,
      newLimits: {
        maxAssignedVideos: NEW_ASSIGNED_VIDEOS_LIMIT,
        maxMonthlyVideos: NEW_MONTHLY_VIDEOS_LIMIT
      }
    };
  } catch (error) {
    console.error("❌ ERROR al actualizar límites:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  } finally {
    // Asegurarse de que el script termine
    process.exit(0);
  }
}

// Ejecutar el script directamente
updateAllUsersLimits();