/**
 * Script para generar un informe de los límites actuales de todos los usuarios
 * 
 * Este script NO requiere una API ni autenticación, se conecta directamente a la base de datos.
 * 
 * Modo de uso:
 * 1. Asegurar que DATABASE_URL esté configurado correctamente
 * 2. Ejecutar: npx tsx server/scripts/get_limits_report_direct.ts
 * 3. Opcionalmente, agregar "json" como argumento para obtener la salida en formato JSON
 *    Ejemplo: npx tsx server/scripts/get_limits_report_direct.ts json > informe_limites.json
 */

import { db } from "../../db";
import { users } from "../../db/schema";
import dotenv from "dotenv";
import fs from "fs";

// Cargar variables de entorno
dotenv.config();

async function generateLimitsReport() {
  try {
    console.log("Conectando a la base de datos...");
    
    // Verificar conexión a la base de datos
    if (!process.env.DATABASE_URL) {
      console.error("Error: No se encontró la variable de entorno DATABASE_URL");
      process.exit(1);
    }
    
    // Obtener todos los usuarios con sus límites
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        maxAssignedVideos: users.maxAssignedVideos,
        maxMonthlyVideos: users.maxMonthlyVideos,
        updatedAt: users.updatedAt
      })
      .from(users)
      .orderBy(users.id);
    
    // Generar estadísticas
    const stats = {
      totalUsers: allUsers.length,
      usersWithCustomLimits: allUsers.filter(u => u.maxAssignedVideos !== null).length,
      usersWithDefaultLimits: allUsers.filter(u => u.maxAssignedVideos === null).length,
      averageAssignedLimit: Math.round(
        allUsers.reduce((sum, u) => sum + (u.maxAssignedVideos || 10), 0) / allUsers.length
      ),
      averageMonthlyLimit: Math.round(
        allUsers.reduce((sum, u) => sum + (u.maxMonthlyVideos || 30), 0) / allUsers.length
      )
    };
    
    // Preparar datos para la salida
    const result = {
      success: true,
      generatedAt: new Date().toISOString(),
      stats,
      users: allUsers
    };
    
    return result;
  } catch (error) {
    console.error("❌ ERROR al generar el informe:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}

// Función para imprimir el informe en formato legible
function printReportTable(report: any) {
  if (!report.success) {
    console.error("Error al generar el informe:", report.error);
    return;
  }
  
  console.log("\n📊 INFORME DE LÍMITES DE USUARIOS");
  console.log("================================");
  console.log(`Generado: ${new Date(report.generatedAt).toLocaleString()}`);
  console.log("\n📈 ESTADÍSTICAS:");
  console.log(`- Total de usuarios: ${report.stats.totalUsers}`);
  console.log(`- Usuarios con límites personalizados: ${report.stats.usersWithCustomLimits}`);
  console.log(`- Usuarios con límites por defecto: ${report.stats.usersWithDefaultLimits}`);
  console.log(`- Promedio de vídeos asignados concurrentes: ${report.stats.averageAssignedLimit}`);
  console.log(`- Promedio de vídeos mensuales: ${report.stats.averageMonthlyLimit}`);
  
  console.log("\n📋 DETALLES DE USUARIOS:");
  console.log("ID  | Usuario               | Rol      | Concurrentes | Mensuales | Actualizado");
  console.log("----|-----------------------|----------|--------------|-----------|------------");
  
  report.users.forEach((user: any) => {
    const id = user.id.toString().padEnd(3);
    const username = user.username.padEnd(22);
    const role = user.role.padEnd(9);
    const maxAssigned = (user.maxAssignedVideos || "defecto").toString().padEnd(13);
    const maxMonthly = (user.maxMonthlyVideos || "defecto").toString().padEnd(10);
    const updated = user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : "---";
    
    console.log(`${id} | ${username} | ${role} | ${maxAssigned} | ${maxMonthly} | ${updated}`);
  });
  
  console.log("\n✅ Fin del informe");
}

// Ejecutar el script
async function main() {
  const report = await generateLimitsReport();
  
  // Verificar si se solicitó formato JSON
  const args = process.argv.slice(2);
  if (args.length > 0 && args[0].toLowerCase() === "json") {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReportTable(report);
  }
  
  process.exit(0);
}

main();