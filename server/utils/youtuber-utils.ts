import { db } from "@db";
import { videos, users, monthlyVideoLimits, MonthlyVideoLimit } from "@db/schema";
import { and, eq, not, or, sql, between, gte, lte } from "drizzle-orm";

/**
 * Cuenta el número de videos que un youtuber tiene asignados actualmente
 * Sólo considera los videos en estado "upload_media" o "media_corrections"
 * @param userId ID del usuario youtuber
 * @returns Número de videos asignados actualmente
 */
export async function countAssignedVideos(userId: number): Promise<number> {
  try {
    // Obtener todos los videos asignados al usuario en los estados relevantes
    const assignedVideos = await db
      .select({ id: videos.id })
      .from(videos)
      .where(
        and(
          eq(videos.contentUploadedBy, userId),
          or(
            eq(videos.status, "upload_media"),
            eq(videos.status, "media_corrections")
          ),
          eq(videos.isDeleted, false)
        )
      );
    
    // Contar manualmente los resultados y loguear para depuración
    console.log(`Videos asignados al usuario ${userId}:`, assignedVideos.length);
    return assignedVideos.length;
  } catch (error) {
    console.error("Error al contar videos asignados:", error);
    return 0;
  }
}

/**
 * Cuenta el número de videos que un youtuber ha realizado en el mes actual
 * @param userId ID del usuario youtuber
 * @returns Número de videos realizados en el mes actual
 */
export async function countMonthlyVideos(userId: number): Promise<number> {
  try {
    // Obtener el primer día del mes actual
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Formatear fechas para mostrar en log
    const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
    const lastDayStr = lastDayOfMonth.toISOString().split('T')[0];
    console.log(`Contando videos del mes (${firstDayStr} al ${lastDayStr}) para usuario ${userId}`);

    // Obtener todos los videos completados por el usuario en el mes actual
    // Ahora incluimos videos en estado final_review o completed
    const monthlyVideos = await db
      .select({ id: videos.id })
      .from(videos)
      .where(
        and(
          eq(videos.contentUploadedBy, userId),
          or(
            eq(videos.status, "final_review"),
            eq(videos.status, "completed")
          ),
          eq(videos.isDeleted, false),
          // Videos completados en el mes actual (basado en la fecha de última actualización)
          and(
            gte(videos.updatedAt, firstDayOfMonth),
            lte(videos.updatedAt, lastDayOfMonth)
          )
        )
      );

    console.log(`Videos del mes para usuario ${userId}:`, monthlyVideos.length);
    return monthlyVideos.length;
  } catch (error) {
    console.error("Error al contar videos mensuales:", error);
    return 0;
  }
}

/**
 * Verifica si un youtuber puede tomar más videos basado en su límite de asignación personal
 * @param userId ID del usuario youtuber
 * @returns { canTakeMore: boolean, currentCount: number, maxAllowed: number }
 */
export async function canYoutuberTakeMoreVideos(userId: number): Promise<{
  canTakeMore: boolean;
  currentCount: number;
  maxAllowed: number;
}> {
  try {
    // Obtener el usuario para verificar su límite
    const [user] = await db
      .select({
        maxVideos: users.maxAssignedVideos
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user) {
      throw new Error("Usuario no encontrado");
    }
    
    // Obtener el número actual de videos asignados
    const currentCount = await countAssignedVideos(userId);
    const maxAllowed = user.maxVideos || 50; // Usar valor predeterminado 50 si no está definido
    
    return {
      canTakeMore: currentCount < maxAllowed,
      currentCount,
      maxAllowed
    };
  } catch (error) {
    console.error("Error al verificar límite de videos:", error);
    // En caso de error, devolvemos false para evitar asignaciones indebidas
    return {
      canTakeMore: false,
      currentCount: 0,
      maxAllowed: 0
    };
  }
}

/**
 * Verifica si un youtuber ha alcanzado su límite mensual de videos
 * @param userId ID del usuario youtuber
 * @returns { reachedMonthlyLimit: boolean, currentCount: number, monthlyLimit: number }
 */
export async function checkMonthlyVideoLimit(userId: number): Promise<{
  reachedMonthlyLimit: boolean;
  currentMonthCount: number;
  monthlyLimit: number;
  specificMonthlyLimit?: boolean;
}> {
  try {
    // Obtener la fecha actual
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript usa 0-11 para meses
    
    // Obtener el usuario para verificar su límite mensual
    const [user] = await db
      .select({
        maxMonthlyVideos: users.maxMonthlyVideos
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user) {
      throw new Error("Usuario no encontrado");
    }
    
    // Buscar si existe un límite específico para el mes actual
    const specificLimit = await getMonthlyLimit(userId, currentYear, currentMonth);
    
    // Obtener el número de videos completados en el mes actual
    const currentMonthCount = await countMonthlyVideos(userId);
    
    // Usar el límite específico si existe, o el límite general en caso contrario
    const monthlyLimit = specificLimit !== null ? specificLimit : (user.maxMonthlyVideos || 50);
    
    return {
      reachedMonthlyLimit: currentMonthCount >= monthlyLimit,
      currentMonthCount,
      monthlyLimit,
      specificMonthlyLimit: specificLimit !== null
    };
  } catch (error) {
    console.error("Error al verificar límite mensual:", error);
    // En caso de error, devolvemos que ha alcanzado el límite para evitar asignaciones indebidas
    return {
      reachedMonthlyLimit: true,
      currentMonthCount: 0,
      monthlyLimit: 0
    };
  }
}

/**
 * Obtiene toda la información de límites de videos para un youtuber
 * @param userId ID del usuario youtuber
 * @returns Objeto con toda la información de límites
 */
/**
 * Obtiene el límite mensual específico para un usuario y un mes/año concreto
 * @param userId ID del usuario youtuber
 * @param year Año (por defecto año actual)
 * @param month Mes (1-12) (por defecto mes actual)
 * @returns Límite mensual específico o null si no existe
 */
export async function getMonthlyLimit(
  userId: number,
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth() + 1
): Promise<number | null> {
  try {
    // Buscar si existe un límite específico para ese mes y usuario
    const [specificLimit] = await db
      .select({
        maxVideos: monthlyVideoLimits.maxVideos
      })
      .from(monthlyVideoLimits)
      .where(
        and(
          eq(monthlyVideoLimits.userId, userId),
          eq(monthlyVideoLimits.year, year),
          eq(monthlyVideoLimits.month, month)
        )
      )
      .limit(1);
      
    // Si existe un límite específico, lo devolvemos
    if (specificLimit) {
      console.log(`Límite específico encontrado para usuario ${userId}, ${month}/${year}: ${specificLimit.maxVideos}`);
      return specificLimit.maxVideos;
    }
    
    // Si no existe límite específico, devolvemos null
    console.log(`No se encontró límite específico para usuario ${userId}, ${month}/${year}`);
    return null;
  } catch (error) {
    console.error("Error al obtener límite mensual específico:", error);
    return null;
  }
}

/**
 * Establece un límite mensual específico para un usuario y un mes/año concreto
 * @param userId ID del usuario youtuber
 * @param maxVideos Número máximo de videos permitidos
 * @param year Año (por defecto año actual)
 * @param month Mes (1-12) (por defecto mes actual)
 * @param createdBy ID del usuario que establece el límite (admin)
 * @returns true si se estableció correctamente, false en caso contrario
 */
export async function setMonthlyLimit(
  userId: number,
  maxVideos: number,
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth() + 1,
  createdBy: number
): Promise<boolean> {
  try {
    // Verificar si ya existe un límite para ese mes y usuario
    const [existingLimit] = await db
      .select({
        id: monthlyVideoLimits.id
      })
      .from(monthlyVideoLimits)
      .where(
        and(
          eq(monthlyVideoLimits.userId, userId),
          eq(monthlyVideoLimits.year, year),
          eq(monthlyVideoLimits.month, month)
        )
      )
      .limit(1);
    
    if (existingLimit) {
      // Actualizar el límite existente
      await db
        .update(monthlyVideoLimits)
        .set({
          maxVideos,
          updatedAt: new Date(),
          createdBy
        })
        .where(eq(monthlyVideoLimits.id, existingLimit.id));
      
      console.log(`Límite mensual actualizado para usuario ${userId}, ${month}/${year}: ${maxVideos}`);
    } else {
      // Crear un nuevo límite
      await db
        .insert(monthlyVideoLimits)
        .values({
          userId,
          year,
          month,
          maxVideos,
          createdBy,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      
      console.log(`Límite mensual creado para usuario ${userId}, ${month}/${year}: ${maxVideos}`);
    }
    
    return true;
  } catch (error) {
    console.error("Error al establecer límite mensual específico:", error);
    return false;
  }
}

/**
 * Obtiene todos los límites mensuales específicos de un usuario
 * @param userId ID del usuario youtuber
 * @returns Array de límites mensuales específicos
 */
export async function getAllMonthlyLimits(userId: number): Promise<Pick<MonthlyVideoLimit,'year' | 'month' | 'maxVideos'>[]> {
  try {
    const limits = await db
      .select({
        year: monthlyVideoLimits.year,
        month: monthlyVideoLimits.month,
        maxVideos: monthlyVideoLimits.maxVideos
      })
      .from(monthlyVideoLimits)
      .where(eq(monthlyVideoLimits.userId, userId))
      .orderBy(monthlyVideoLimits.year, monthlyVideoLimits.month);
    
    console.log(`Límites mensuales para usuario ${userId}:`, limits);
    return limits;
  } catch (error) {
    console.error("Error al obtener límites mensuales:", error);
    return [];
  }
}

export async function getYoutuberVideoLimits(userId: number): Promise<{
  currentAssignedCount: number;
  maxAssignedAllowed: number;
  currentMonthCount: number;
  monthlyLimit: number;
  canTakeMoreVideos: boolean;
  reachedMonthlyLimit: boolean;
  specificMonthlyLimit?: boolean;
  monthlyLimits?: Array<{year: number; month: number; maxVideos: number}>;
}> {
  try {
    // Obtener el usuario para verificar sus límites
    const [user] = await db
      .select({
        id: users.id,
        role: users.role,
        maxAssignedVideos: users.maxAssignedVideos,
        maxMonthlyVideos: users.maxMonthlyVideos
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user) {
      throw new Error("Usuario no encontrado");
    }
    
    // Obtener la fecha actual
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript usa 0-11 para meses
    
    // Si el usuario no es youtuber, devolvemos valores predeterminados para límites
    // pero mantenemos los valores configurados en la base de datos (para admins que configuran límites)
    const isYoutuber = user.role === 'youtuber';
    
    // Contar videos asignados y mensuales solo si es youtuber
    const currentAssignedCount = isYoutuber ? await countAssignedVideos(userId) : 0;
    const currentMonthCount = isYoutuber ? await countMonthlyVideos(userId) : 0;
    
    // Obtener el límite específico para el mes actual si existe
    const specificLimit = await getMonthlyLimit(userId, currentYear, currentMonth);
    
    // Obtener todos los límites mensuales específicos
    const allMonthlyLimits = await getAllMonthlyLimits(userId);
    
    // Determinar qué límite mensual usar
    const maxAssignedAllowed = user.maxAssignedVideos || 50; 
    const monthlyLimit = specificLimit !== null ? specificLimit : (user.maxMonthlyVideos || 50);
    
    return {
      currentAssignedCount,
      maxAssignedAllowed,
      currentMonthCount,
      monthlyLimit,
      canTakeMoreVideos: currentAssignedCount < maxAssignedAllowed,
      reachedMonthlyLimit: currentMonthCount >= monthlyLimit,
      specificMonthlyLimit: specificLimit !== null,
      monthlyLimits: allMonthlyLimits
    };
  } catch (error) {
    console.error("Error al obtener límites de videos:", error);
    // En caso de error, devolvemos valores restrictivos
    return {
      currentAssignedCount: 0,
      maxAssignedAllowed: 0,
      currentMonthCount: 0,
      monthlyLimit: 0,
      canTakeMoreVideos: false,
      reachedMonthlyLimit: true
    };
  }
}