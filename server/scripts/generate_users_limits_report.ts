/**
 * Script para generar un informe completo sobre los límites de videos de todos los usuarios
 * 
 * Uso:
 * npx tsx server/scripts/generate_users_limits_report.ts [--csv]
 * 
 * La opción --csv genera un archivo CSV con el informe
 */

import { db } from "../../db";
import { users, videos } from "../../db/schema";
import { eq, count, and, isNotNull } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

interface UserLimitsReport {
  id: number;
  username: string;
  fullName: string | null;
  role: string;
  maxAssignedVideos: number | null;
  maxMonthlyVideos: number | null;
  activeVideos: number;
  percentUsed: number;
}

async function generateUsersLimitsReport() {
  try {
    console.log('🔍 Generando informe de límites de usuarios...');
    
    // Obtener argumentos
    const args = process.argv.slice(2);
    const generateCsv = args.includes('--csv');
    
    // Obtener todos los usuarios con sus límites
    const allUsers = await db.select().from(users);
    console.log(`📊 Encontrados ${allUsers.length} usuarios en total`);
    
    // Reporte completo
    const report: UserLimitsReport[] = [];
    
    // Procesar cada usuario
    for (const user of allUsers) {
      // Contar videos activos asignados al usuario
      const videoCount = await db
        .select({ count: count() })
        .from(videos)
        .where(
          and(
            eq(videos.contentUploadedBy, user.id),
            isNotNull(videos.id)
          )
        );
      
      const activeVideos = videoCount[0]?.count || 0;
      const maxAssigned = user.maxAssignedVideos || 3; // Valor por defecto si es null
      const percentUsed = maxAssigned > 0 ? Math.round((activeVideos / maxAssigned) * 100) : 0;
      
      // Añadir al reporte
      report.push({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        maxAssignedVideos: user.maxAssignedVideos,
        maxMonthlyVideos: user.maxMonthlyVideos,
        activeVideos,
        percentUsed
      });
    }
    
    // Ordenar por porcentaje de uso (descendente)
    report.sort((a, b) => b.percentUsed - a.percentUsed);
    
    // Mostrar resultados en consola
    console.log('\n📊 INFORME DE LÍMITES DE USUARIOS');
    console.log('==============================\n');
    
    // Cabecera de tabla
    console.log('ID | Usuario | Nombre | Rol | Max Asignados | Max Mensuales | Activos | % Uso');
    console.log('-------------------------------------------------------------------------------');
    
    for (const item of report) {
      console.log(
        `${item.id.toString().padEnd(3)} | ` +
        `${item.username.padEnd(15)} | ` +
        `${(item.fullName || 'N/A').padEnd(15)} | ` +
        `${item.role.padEnd(10)} | ` +
        `${(item.maxAssignedVideos?.toString() || 'N/A').padEnd(13)} | ` +
        `${(item.maxMonthlyVideos?.toString() || 'N/A').padEnd(13)} | ` +
        `${item.activeVideos.toString().padEnd(7)} | ` +
        `${item.percentUsed}%`
      );
    }
    
    // Generar CSV si se solicitó
    if (generateCsv) {
      const csvContent = [
        // Cabecera CSV
        'ID,Usuario,Nombre,Rol,Max Asignados,Max Mensuales,Videos Activos,Porcentaje Uso',
        // Filas de datos
        ...report.map(item => 
          `${item.id},` +
          `"${item.username}",` +
          `"${item.fullName || ''}",` +
          `${item.role},` +
          `${item.maxAssignedVideos || ''},` +
          `${item.maxMonthlyVideos || ''},` +
          `${item.activeVideos},` +
          `${item.percentUsed}`
        )
      ].join('\n');
      
      // Guardar en archivo
      const fileName = `user_limits_report_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = path.join(process.cwd(), fileName);
      fs.writeFileSync(filePath, csvContent);
      
      console.log(`\n✅ Reporte CSV generado: ${fileName}`);
    }
    
    // Estadísticas
    const stats = {
      totalUsers: report.length,
      usersWithCustomLimits: report.filter(u => u.maxAssignedVideos !== null).length,
      usersWithDefaultLimits: report.filter(u => u.maxAssignedVideos === null).length,
      usersNearLimit: report.filter(u => u.percentUsed >= 80).length,
      usersOverLimit: report.filter(u => u.percentUsed > 100).length,
      totalActiveVideos: report.reduce((sum, u) => sum + u.activeVideos, 0)
    };
    
    console.log('\n📈 ESTADÍSTICAS GENERALES');
    console.log('========================');
    console.log(`Total de usuarios: ${stats.totalUsers}`);
    console.log(`Usuarios con límites personalizados: ${stats.usersWithCustomLimits}`);
    console.log(`Usuarios con límites por defecto: ${stats.usersWithDefaultLimits}`);
    console.log(`Usuarios cerca del límite (>80%): ${stats.usersNearLimit}`);
    console.log(`Usuarios sobre el límite (>100%): ${stats.usersOverLimit}`);
    console.log(`Total de videos activos: ${stats.totalActiveVideos}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error al generar el informe:', error);
    return false;
  }
}

// Ejecutar el script
generateUsersLimitsReport()
  .then(success => {
    if (success) {
      console.log('\n✅ Informe generado correctamente');
    } else {
      console.log('\n❌ Error al generar el informe');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });