/**
 * Script para asegurar que los campos de límites de videos existen en la tabla de usuarios
 * 
 * Este script verifica la existencia de los campos maxAssignedVideos y maxMonthlyVideos
 * en la tabla users y los crea si no existen.
 * 
 * Uso:
 * npx tsx server/scripts/ensure_limits_fields.ts
 */

import { db } from "../../db";
import { sql } from "drizzle-orm";

async function ensureLimitsFields() {
  try {
    console.log('🔍 Verificando estructura de la tabla users...');
    
    // Verificar si los campos existen utilizando información del esquema de PostgreSQL
    const tableInfo = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    
    // Convertir a un array de nombres de columnas
    const columnNames = tableInfo.rows.map((row: any) => row.column_name);
    
    console.log('📊 Columnas actuales en la tabla users:');
    console.log(columnNames.join(', '));
    
    // Verificar si los campos de límites existen
    const needsMaxAssignedVideos = !columnNames.includes('max_assigned_videos');
    const needsMaxMonthlyVideos = !columnNames.includes('max_monthly_videos');
    
    if (!needsMaxAssignedVideos && !needsMaxMonthlyVideos) {
      console.log('✅ Los campos de límites ya existen en la tabla users.');
      return true;
    }
    
    // Crear los campos que faltan
    console.log('🔄 Añadiendo campos faltantes...');
    
    if (needsMaxAssignedVideos) {
      console.log('- Añadiendo campo max_assigned_videos...');
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS max_assigned_videos INTEGER DEFAULT 3
      `);
    }
    
    if (needsMaxMonthlyVideos) {
      console.log('- Añadiendo campo max_monthly_videos...');
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS max_monthly_videos INTEGER DEFAULT 10
      `);
    }
    
    // Verificar que los campos se crearon correctamente
    const updatedTableInfo = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    
    const updatedColumnNames = updatedTableInfo.rows.map((row: any) => row.column_name);
    
    const hasMaxAssignedVideos = updatedColumnNames.includes('max_assigned_videos');
    const hasMaxMonthlyVideos = updatedColumnNames.includes('max_monthly_videos');
    
    if (hasMaxAssignedVideos && hasMaxMonthlyVideos) {
      console.log('✅ Campos de límites creados correctamente.');
      return true;
    } else {
      console.error('❌ No se pudieron crear todos los campos necesarios.');
      console.log('Campos verificados:');
      console.log(`- max_assigned_videos: ${hasMaxAssignedVideos ? 'Presente' : 'Ausente'}`);
      console.log(`- max_monthly_videos: ${hasMaxMonthlyVideos ? 'Presente' : 'Ausente'}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error al verificar/crear campos de límites:', error);
    return false;
  }
}

// Ejecutar el script
ensureLimitsFields()
  .then(success => {
    if (success) {
      console.log('\n✅ Estructura de la base de datos verificada y actualizada correctamente.');
    } else {
      console.error('\n❌ Hubo problemas al actualizar la estructura de la base de datos.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });