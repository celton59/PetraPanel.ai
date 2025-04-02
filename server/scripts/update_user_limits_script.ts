/**
 * Script para actualizar límites de usuarios
 * 
 * Este script se puede ejecutar desde el cliente como una opción de último recurso
 * cuando las actualizaciones directas a través de API no funcionan.
 * 
 * Proporciona una alternativa para actualizar los límites de usuarios.
 */

import { db } from "../../db";
import { users, User } from "../../db/schema";
import { eq } from "drizzle-orm";

/**
 * Actualiza los límites de un usuario específico
 * 
 * @param userId ID del usuario a actualizar
 * @param maxAssignedVideos Nuevo límite de videos asignados concurrentemente
 * @param maxMonthlyVideos Nuevo límite mensual de videos
 * @returns Objeto con el resultado de la operación
 */
export async function updateUserLimits(
  userId: number,
  maxAssignedVideos?: number,
  maxMonthlyVideos?: number
): Promise<{
  success: boolean;
  data?: Pick<User, 'id' | 'maxAssignedVideos' | 'maxMonthlyVideos'>;
  message: string;
}> {
  try {
    console.log(`[Script] Actualizando límites para usuario ${userId}:`, {
      maxAssignedVideos, 
      maxMonthlyVideos
    });

    // Verificar que al menos uno de los campos está presente
    if (maxAssignedVideos === undefined && maxMonthlyVideos === undefined) {
      return {
        success: false,
        message: "Debe proporcionar al menos un límite para actualizar"
      };
    }

    // Validar valores numéricos positivos
    if (maxAssignedVideos !== undefined && (typeof maxAssignedVideos !== 'number' || maxAssignedVideos < 1)) {
      return {
        success: false,
        message: "El límite de videos asignados debe ser un número positivo"
      };
    }

    if (maxMonthlyVideos !== undefined && (typeof maxMonthlyVideos !== 'number' || maxMonthlyVideos < 1)) {
      return {
        success: false,
        message: "El límite de videos mensuales debe ser un número positivo"
      };
    }

    // Construir objeto de actualización con los campos proporcionados
    const updateData: Record<string, any> = {
      updatedAt: new Date()
    };

    if (maxAssignedVideos !== undefined) {
      updateData.maxAssignedVideos = maxAssignedVideos;
    }

    if (maxMonthlyVideos !== undefined) {
      updateData.maxMonthlyVideos = maxMonthlyVideos;
    }

    // Verificar que el usuario existe
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      return {
        success: false,
        message: "Usuario no encontrado"
      };
    }

    // Actualizar usuario
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        maxAssignedVideos: users.maxAssignedVideos,
        maxMonthlyVideos: users.maxMonthlyVideos
      });

    if (!updatedUser) {
      return {
        success: false,
        message: "Error al actualizar los límites del usuario"
      };
    }

    console.log("[Script] Límites actualizados correctamente:", updatedUser);

    return {
      success: true,
      data: updatedUser,
      message: "Límites de usuario actualizados correctamente"
    };
  } catch (error) {
    console.error("[Script] Error actualizando límites:", error);
    
    return {
      success: false,
      message: error instanceof Error 
        ? `Error: ${error.message}` 
        : "Error desconocido al actualizar los límites"
    };
  }
}

/**
 * Punto de entrada para ejecutar desde línea de comandos
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log("Uso: npx tsx server/scripts/update_user_limits_script.ts <userId> <maxAssignedVideos> <maxMonthlyVideos>");
    process.exit(1);
  }
  
  const userId = parseInt(args[0], 10);
  const maxAssignedVideos = parseInt(args[1], 10);
  const maxMonthlyVideos = parseInt(args[2], 10);
  
  if (isNaN(userId) || isNaN(maxAssignedVideos) || isNaN(maxMonthlyVideos)) {
    console.error("Error: Todos los argumentos deben ser números");
    process.exit(1);
  }
  
  const result = await updateUserLimits(userId, maxAssignedVideos, maxMonthlyVideos);
  console.log(result);
  process.exit(result.success ? 0 : 1);
}

// Nota: Para ejecutar directamente usa:
// npx tsx server/scripts/update_user_limits_script.ts <userId> <maxAssignedVideos> <maxMonthlyVideos>
// En módulos ESM no se puede usar require.main === module