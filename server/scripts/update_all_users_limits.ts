/**
 * Script para actualizar los límites de videos para TODOS los usuarios en la base de datos
 * 
 * Uso:
 * npx tsx server/scripts/update_all_users_limits.ts <maxAssignedVideos> <maxMonthlyVideos>
 * 
 * Ejemplo:
 * npx tsx server/scripts/update_all_users_limits.ts 50 25
 * 
 * PRECAUCIÓN: Este script modificará los límites para TODOS los usuarios.
 */

import { db } from "../../db";
import { users } from "../../db/schema";

async function updateAllUsersLimits() {
  try {
    // Obtener argumentos
    const args = process.argv.slice(2);
    if (args.length < 2) {
      console.error('Uso: npx tsx server/scripts/update_all_users_limits.ts <maxAssignedVideos> <maxMonthlyVideos>');
      console.error('Ejemplo: npx tsx server/scripts/update_all_users_limits.ts 50 25');
      process.exit(1);
    }

    const maxAssignedVideos = parseInt(args[0], 10);
    const maxMonthlyVideos = parseInt(args[1], 10);

    if (isNaN(maxAssignedVideos) || isNaN(maxMonthlyVideos)) {
      console.error('Error: Los argumentos deben ser números');
      process.exit(1);
    }

    console.log('⚠️ ADVERTENCIA: Este script actualizará los límites para TODOS los usuarios.');
    console.log(`Nuevos límites a aplicar: maxAssignedVideos=${maxAssignedVideos}, maxMonthlyVideos=${maxMonthlyVideos}`);
    
    // Esperar 5 segundos por seguridad
    console.log('Esperando 5 segundos antes de proceder... Presiona Ctrl+C para cancelar.');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Contador para verificación
    const allUsers = await db.select({ id: users.id }).from(users);
    console.log(`Total de usuarios a actualizar: ${allUsers.length}`);

    // Realizar la actualización
    const updateResult = await db
      .update(users)
      .set({
        maxAssignedVideos,
        maxMonthlyVideos,
        updatedAt: new Date()
      })
      .returning({
        count: users.id
      });

    console.log('\n✅ Actualización completada para todos los usuarios:');
    console.log(`Usuarios actualizados: ${allUsers.length}`);
    console.log(`Nuevos límites aplicados: maxAssignedVideos=${maxAssignedVideos}, maxMonthlyVideos=${maxMonthlyVideos}`);

    return true;
  } catch (error) {
    console.error('Error en la actualización masiva:', error);
    return false;
  }
}

// Ejecutar el script
updateAllUsersLimits()
  .then(success => {
    if (success) {
      console.log('✅ Actualización masiva completada con éxito');
    } else {
      console.log('❌ Error en la actualización masiva');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });