import { db } from "@db";
import { users } from "@db/schema";
import { eq, isNull } from "drizzle-orm";

/**
 * Script para actualizar los límites de videos por defecto para todos los usuarios
 * que no tienen un límite personalizado establecido
 */
async function updateDefaultLimits() {
  try {
    console.log("Actualizando límites por defecto de videos asignados...");
    
    // Actualizar los usuarios que tienen el valor por defecto (3)
    const result = await db
      .update(users)
      .set({
        maxAssignedVideos: 50
      })
      .where(
        eq(users.maxAssignedVideos, 3)
      );
    
    console.log("Límites actualizados para usuarios con valor por defecto. Actualizando también usuarios sin límite...");
    
    // También actualizar los usuarios que tienen NULL en maxAssignedVideos
    const resultNull = await db
      .update(users)
      .set({
        maxAssignedVideos: 50
      })
      .where(
        isNull(users.maxAssignedVideos)
      );
    
    console.log("Actualización de límites completada.");
    return true;
  } catch (error) {
    console.error("Error al actualizar los límites por defecto:", error);
    return false;
  }
}

// Auto-ejecutar al importar
updateDefaultLimits()
  .then(success => {
    if (success) {
      console.log("✅ Actualización de límites por defecto completada con éxito");
    } else {
      console.log("❌ Error al actualizar los límites por defecto");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error("Error inesperado:", err);
    process.exit(1);
  });

export default updateDefaultLimits;