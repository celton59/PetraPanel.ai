/**
 * Script de línea de comandos para actualizar límites de usuario
 * 
 * Este script se puede ejecutar directamente en el servidor:
 * npx tsx server/scripts/update_user_limits_cli.ts <userId> <maxAssignedVideos> <maxMonthlyVideos>
 * 
 * Ejemplo:
 * npx tsx server/scripts/update_user_limits_cli.ts 20 50 10
 * 
 * Uso avanzado:
 * npx tsx server/scripts/update_user_limits_cli.ts <userId> <maxAssignedVideos> <maxMonthlyVideos> --force
 * La opción --force omitirá cualquier validación adicional
 */

import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

async function updateUserLimits() {
  try {
    console.log('▶️ Iniciando script de actualización de límites de usuario');
    console.log('📊 Base de datos conectada');
    
    // Obtener argumentos
    const args = process.argv.slice(2);
    const forceMode = args.includes('--force');
    
    // Filtrar argumentos que no son opciones
    const numericArgs = args.filter(arg => !arg.startsWith('--'));
    
    if (numericArgs.length < 3) {
      console.error('\n❌ Error: Faltan argumentos requeridos');
      console.error('\nUso: npx tsx server/scripts/update_user_limits_cli.ts <userId> <maxAssignedVideos> <maxMonthlyVideos> [--force]');
      console.error('Ejemplo: npx tsx server/scripts/update_user_limits_cli.ts 20 50 10');
      process.exit(1);
    }

    const userId = parseInt(numericArgs[0], 10);
    const maxAssignedVideos = parseInt(numericArgs[1], 10);
    const maxMonthlyVideos = parseInt(numericArgs[2], 10);

    if (isNaN(userId) || isNaN(maxAssignedVideos) || isNaN(maxMonthlyVideos)) {
      console.error('\n❌ Error: Los argumentos deben ser números');
      process.exit(1);
    }

    console.log('\n📝 Parámetros recibidos:');
    console.log(`   ID de usuario: ${userId}`);
    console.log(`   Max. videos asignados: ${maxAssignedVideos}`);
    console.log(`   Max. videos mensuales: ${maxMonthlyVideos}`);
    if (forceMode) {
      console.log('   Modo: FORZADO (--force)');
    }

    // Verificar que el usuario existe
    console.log('\n🔍 Verificando usuario...');
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUsers.length === 0) {
      console.error(`\n❌ Error: No se encontró usuario con ID ${userId}`);
      process.exit(1);
    }

    const userInfo = existingUsers[0];
    console.log('\n✅ Usuario encontrado:');
    console.log(`   Username: ${userInfo.username}`);
    console.log(`   Nombre: ${userInfo.fullName || 'No especificado'}`);
    console.log(`   Rol: ${userInfo.role}`);
    console.log(`   Email: ${userInfo.email || 'No especificado'}`);
    
    console.log('\n📊 Límites actuales:');
    console.log(`   Max. videos asignados: ${userInfo.maxAssignedVideos || 'No especificado'}`);
    console.log(`   Max. videos mensuales: ${userInfo.maxMonthlyVideos || 'No especificado'}`);

    // Validaciones adicionales (omitidas en modo forzado)
    if (!forceMode) {
      if (maxAssignedVideos < 1 || maxMonthlyVideos < 1) {
        console.error('\n❌ Error: Los límites deben ser números positivos');
        console.error('   Usa --force para omitir esta validación');
        process.exit(1);
      }

      const currentAssigned = userInfo.maxAssignedVideos || 3;
      const currentMonthly = userInfo.maxMonthlyVideos || 10;
      
      // Solo advertir si se está reduciendo significativamente
      if (maxAssignedVideos < currentAssigned * 0.5 || maxMonthlyVideos < currentMonthly * 0.5) {
        console.log('\n⚠️ ADVERTENCIA: Estás reduciendo significativamente los límites actuales.');
        console.log('   Esto podría afectar la capacidad del usuario para manejar videos.');
        console.log('   Si estás seguro, ejecuta el comando con --force');
        
        // Esperar 3 segundos para que el usuario pueda cancelar
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Realizar la actualización
    console.log('\n🔄 Actualizando límites en la base de datos...');
    const updateResult = await db
      .update(users)
      .set({
        maxAssignedVideos,
        maxMonthlyVideos,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        maxAssignedVideos: users.maxAssignedVideos,
        maxMonthlyVideos: users.maxMonthlyVideos
      });

    if (!updateResult || updateResult.length === 0) {
      console.error('\n❌ Error: La actualización no devolvió resultados');
      process.exit(1);
    }

    console.log('\n✅ Actualización realizada con éxito:');
    console.log(JSON.stringify(updateResult[0], null, 2));
    
    // Verificación final
    console.log('\n🔍 Verificando actualización...');
    const verifyUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
      
    if (verifyUser.length > 0) {
      const updated = verifyUser[0];
      console.log('\n📊 Nuevos límites verificados:');
      console.log(`   Max. videos asignados: ${updated.maxAssignedVideos}`);
      console.log(`   Max. videos mensuales: ${updated.maxMonthlyVideos}`);
      
      if (updated.maxAssignedVideos !== maxAssignedVideos || updated.maxMonthlyVideos !== maxMonthlyVideos) {
        console.log('\n⚠️ ADVERTENCIA: Los valores actualizados no coinciden con los solicitados.');
      } else {
        console.log('\n🎉 Éxito: Límites actualizados correctamente.');
      }
    }
    
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error en la actualización:');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar el script
updateUserLimits().catch(error => {
  console.error('\n💥 Error fatal:');
  console.error(error);
  process.exit(1);
});