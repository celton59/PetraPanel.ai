import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import readline from "readline";

/**
 * Script para configurar los límites de videos para usuarios con rol youtuber
 * Permite establecer un límite personalizado a un usuario específico o actualizar el límite predeterminado
 */
async function configureUserLimits() {
  try {
    // Obtener todos los usuarios con rol youtuber
    const youtubers = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        maxAssignedVideos: users.maxAssignedVideos
      })
      .from(users)
      .where(eq(users.role, "youtuber"));
    
    console.log(`\nConfiguración de límites de videos para youtubers`);
    console.log(`---------------------------------------------`);
    
    if (youtubers.length === 0) {
      console.log("No hay usuarios con rol 'youtuber' en la base de datos.");
      return;
    }
    
    // Mostrar lista de youtubers y sus límites actuales
    console.log("Youtubers actuales y sus límites:");
    console.log("ID | Usuario | Nombre | Límite");
    console.log("------------------------------");
    youtubers.forEach(user => {
      console.log(`${user.id} | ${user.username} | ${user.fullName} | ${user.maxAssignedVideos || 50}`);
    });
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Preguntar al administrador qué acción quiere realizar
    rl.question(`
¿Qué acción deseas realizar?
1. Configurar límite para un usuario específico
2. Configurar límite predeterminado para todos los usuarios
3. Salir
Opción: `, async (answer) => {
      switch (answer.trim()) {
        case "1":
          await configureSpecificUser(rl, youtubers);
          break;
        case "2":
          await configureDefaultLimit(rl, youtubers);
          break;
        case "3":
          console.log("Operación cancelada.");
          rl.close();
          break;
        default:
          console.log("Opción no válida.");
          rl.close();
      }
    });
  } catch (error) {
    console.error("Error al configurar límites:", error);
  }
}

/**
 * Configura el límite de videos para un usuario específico
 */
async function configureSpecificUser(rl: readline.Interface, youtubers: any[]) {
  rl.question("Ingresa el ID del usuario: ", (userId) => {
    const user = youtubers.find(u => u.id === parseInt(userId));
    
    if (!user) {
      console.log("Usuario no encontrado o no es un youtuber.");
      rl.close();
      return;
    }
    
    rl.question(`Ingresa el nuevo límite para ${user.username} (actualmente: ${user.maxAssignedVideos || 50}): `, async (limit) => {
      const newLimit = parseInt(limit);
      
      if (isNaN(newLimit) || newLimit < 1) {
        console.log("Límite no válido. Debe ser un número entero positivo.");
        rl.close();
        return;
      }
      
      try {
        // Actualizar el límite del usuario específico
        await db
          .update(users)
          .set({
            maxAssignedVideos: newLimit
          })
          .where(eq(users.id, user.id));
        
        console.log(`Límite actualizado correctamente para ${user.username}: ${newLimit} videos.`);
        rl.close();
      } catch (error) {
        console.error("Error al actualizar el límite:", error);
        rl.close();
      }
    });
  });
}

/**
 * Configura el límite predeterminado para todos los usuarios o para los que no tienen límite personalizado
 */
async function configureDefaultLimit(rl: readline.Interface, youtubers: any[]) {
  rl.question(`
¿Cómo deseas aplicar el nuevo límite predeterminado?
1. Solo para usuarios sin límite personalizado (NULL)
2. Para todos los usuarios youtuber (sobrescribir límites personalizados)
Opción: `, (option) => {
    if (option !== "1" && option !== "2") {
      console.log("Opción no válida.");
      rl.close();
      return;
    }
    
    rl.question("Ingresa el nuevo límite predeterminado: ", async (limit) => {
      const newLimit = parseInt(limit);
      
      if (isNaN(newLimit) || newLimit < 1) {
        console.log("Límite no válido. Debe ser un número entero positivo.");
        rl.close();
        return;
      }
      
      try {
        if (option === "1") {
          // Actualizar solo usuarios sin límite personalizado
          await db
            .update(users)
            .set({
              maxAssignedVideos: newLimit
            })
            .where(eq(users.role, "youtuber"));
          
          console.log(`Límite predeterminado actualizado a ${newLimit} para todos los usuarios youtuber sin límite personalizado.`);
        } else {
          // Actualizar todos los usuarios youtuber
          await db
            .update(users)
            .set({
              maxAssignedVideos: newLimit
            })
            .where(eq(users.role, "youtuber"));
          
          console.log(`Límite actualizado a ${newLimit} para todos los usuarios youtuber.`);
        }
        rl.close();
      } catch (error) {
        console.error("Error al actualizar los límites:", error);
        rl.close();
      }
    });
  });
}

// Auto-ejecutar si se llama directamente
if (require.main === module) {
  configureUserLimits()
    .catch(err => {
      console.error("Error en la ejecución del script:", err);
      process.exit(1);
    });
}

export default configureUserLimits;