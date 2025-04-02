import { db } from "@db";
import { log } from "../vite";

/**
 * Script para añadir la columna max_assigned_videos a la tabla users
 */
async function addMaxAssignedVideosColumn() {
  try {
    // Utiliza SQL nativo para verificar si la columna existe
    const result = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'max_assigned_videos'
      );
    `);
    
    const columnExists = result.rows?.[0]?.exists === true;
    
    if (!columnExists) {
      log('La columna max_assigned_videos no existe, creándola...', 'add-column');
      
      // Si la columna no existe, la añadimos
      await db.execute(`
        ALTER TABLE users ADD COLUMN max_assigned_videos INTEGER DEFAULT 50;
      `);
      
      log('Columna max_assigned_videos añadida con éxito', 'add-column');
    } else {
      log('La columna max_assigned_videos ya existe', 'add-column');
    }
    
    return true;
  } catch (error) {
    console.error('Error al verificar o crear la columna max_assigned_videos:', error);
    return false;
  }
}

// Auto-ejecutar al importar
addMaxAssignedVideosColumn()
  .then(success => {
    if (success) {
      log('Verificación de columna max_assigned_videos completada', 'add-column');
    } else {
      log('Error al verificar la columna max_assigned_videos', 'add-column');
    }
  })
  .catch(err => {
    console.error('Error inesperado:', err);
  });

export default addMaxAssignedVideosColumn;