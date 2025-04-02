/**
 * Script para actualizar directamente los límites de un usuario específico en la base de datos
 * 
 * Este script NO requiere una API ni autenticación, se conecta directamente a la base de datos.
 * 
 * Modo de uso:
 * 1. Asegurar que DATABASE_URL esté configurado correctamente
 * 2. Ejecutar: npx tsx server/scripts/update_user_limit_direct.ts USUARIO_ID MAX_ASIGNADOS MAX_MENSUALES
 *    Ejemplo: npx tsx server/scripts/update_user_limit_direct.ts 5 50 100
 */

import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

async function updateUserLimits(userId: number, maxAssigned: number, maxMonthly: number) {
  try {
    console.log("Conectando a la base de datos...");
    
    // Verificar conexión a la base de datos
    if (!process.env.DATABASE_URL) {
      console.error("Error: No se encontró la variable de entorno DATABASE_URL");
      process.exit(1);
    }
    
    // Verificar que el usuario existe
    const userExists = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
      
    if (userExists.length === 0) {
      console.error(`❌ ERROR: No se encontró ningún usuario con ID ${userId}`);
      process.exit(1);
    }
    
    const username = userExists[0].username;
    
    // Confirmar actualización
    console.log(`Se actualizarán los siguientes límites para el usuario ${username} (ID: ${userId}):`);
    console.log(`- Vídeos asignados concurrentes: ${maxAssigned}`);
    console.log(`- Vídeos mensuales: ${maxMonthly}`);
    console.log("\nActualizando límites...");
    
    // Actualizar el usuario
    const result = await db
      .update(users)
      .set({
        maxAssignedVideos: maxAssigned,
        maxMonthlyVideos: maxMonthly,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        maxAssignedVideos: users.maxAssignedVideos,
        maxMonthlyVideos: users.maxMonthlyVideos
      });
    
    if (!result || result.length === 0) {
      console.error(`❌ ERROR: No se pudo actualizar el usuario con ID ${userId}`);
      process.exit(1);
    }
    
    console.log(`\n✅ ÉXITO: Límites actualizados para el usuario ${username} (ID: ${userId})`);
    console.log(`Nuevos límites configurados:`);
    console.log(`- Vídeos asignados concurrentes: ${result[0].maxAssignedVideos}`);
    console.log(`- Vídeos mensuales: ${result[0].maxMonthlyVideos}`);
    
    return {
      success: true,
      user: result[0]
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

// Procesar argumentos de la línea de comandos
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error(`
Uso: npx tsx server/scripts/update_user_limit_direct.ts USUARIO_ID MAX_ASIGNADOS MAX_MENSUALES

Ejemplo: npx tsx server/scripts/update_user_limit_direct.ts 5 50 100
  `);
  process.exit(1);
}

const userId = parseInt(args[0], 10);
const maxAssigned = parseInt(args[1], 10);
const maxMonthly = parseInt(args[2], 10);

if (isNaN(userId) || isNaN(maxAssigned) || isNaN(maxMonthly)) {
  console.error("Error: Los argumentos deben ser números válidos");
  process.exit(1);
}

// Ejecutar el script
updateUserLimits(userId, maxAssigned, maxMonthly);