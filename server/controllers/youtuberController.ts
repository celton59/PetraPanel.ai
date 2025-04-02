import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { users, projectAccess } from "@db/schema";
import { eq, getTableColumns } from "drizzle-orm";
import { db } from "@db";
import { passwordUtils } from "../auth";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { type Express } from "express";

const scryptAsync = promisify(scrypt);

const createUserSchema = z.object({
  username: z.string().min(3, { message: "El nombre de usuario debe tener al menos 3 caracteres" }).max(30, { message: "El nombre de usuario debe tener como máximo 30 caracteres" }),
  email: z.string().email({ message: "Dirección de correo electrónico inválida" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }).max(30, { message: "La contraseña debe tener como máximo 30 caracteres" }),
  role: z.enum(["admin", "reviewer", "optimizer", "youtuber", "content_reviewer", "media_reviewer"], { message: "El rol debe ser uno de los valores permitidos" }),
  fullName: z.string({ message: 'Nombre completo es obligatorio' }).min(3, { message: "El nombre completo debe tener al menos 3 caracteres" }).max(30, { message: "El nombre completo debe tener como máximo 30 caracteres" }),
  phone: z.string().min(9, { message: "El número de teléfono debe tener al menos 9 caracteres" }).optional(),
  bio: z.string().min(3, { message: "La biografía debe tener al menos 3 caracteres" }).max(30, { message: "La biografía debe tener como máximo 30 caracteres" }).optional(),
  projectIds: z.array(z.number()).min(1, { message: "Debe tener al menos un proyecto asociado" }),
  maxAssignedVideos: z.number().min(1, { message: "El límite debe ser como mínimo 1" }).optional(),
});

const updateUserSchema = z.object({
  username: z.string().min(3, { message: "El nombre de usuario debe tener al menos 3 caracteres" }).max(30, { message: "El nombre de usuario debe tener como máximo 30 caracteres" }).optional(),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }).max(30, { message: "La contraseña debe tener como máximo 30 caracteres" }).optional(),
  fullName: z.string().min(3, { message: "El nombre completo debe tener al menos 3 caracteres" }).max(30, { message: "El nombre completo debe tener como máximo 30 caracteres" }).optional(),
  phone: z.string().min(9, { message: "El número de teléfono debe tener al menos 9 caracteres" }).optional(),
  bio: z.string().min(3, { message: "La biografía debe tener al menos 3 caracteres" }).max(30, { message: "La biografía debe tener como máximo 30 caracteres" }).optional(),
  projectIds: z.array(z.number()).min(1, { message: "Debe tener al menos un proyecto asociado" }).optional(),
  email: z.string().email({ message: "Dirección de correo electrónico inválida" }).optional(),
  role: z
    .enum(["admin", "reviewer", "optimizer", "youtuber", "content_reviewer", "media_reviewer"], { message: "El rol debe ser uno de los valores permitidos" })
    .optional(),
  maxAssignedVideos: z.number().min(1, { message: "El límite debe ser como mínimo 1" }).optional(),
});

type CreateUserSchema = z.infer<typeof createUserSchema>;
type UpdateUserSchema = z.infer<typeof updateUserSchema>;


export async function createUser(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para realizar esta acción",
      });
    }

    const body = req.body as CreateUserSchema;

    // Validar body con schema
    const validationResult = createUserSchema.safeParse(body);    
    if (!validationResult.success) {
      const errorMessages = JSON.parse(validationResult.error.message) as { message: string}[];
      return res
        .status(400)
        .json({ success: false, message: errorMessages.at(0)?.message });
    }

    const {
      username,
      password,
      email,
      fullName,
      phone,
      bio,
      role,
      projectIds,
      maxAssignedVideos,
    } = body;
    console.log("Creando nuevo usuario con datos:", body);

    // Verificar si el usuario ya existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: "El nombre de usuario ya está en uso",
      });
    }

    // Hash de la contraseña
    const hashedPassword = await passwordUtils.hashPassword(password);

    // Crear nuevo usuario
    const newUser = await db.transaction(async (tx) => {
      console.log("Iniciando transacción para crear usuario");

      // Insertar usuario
      const [user] = await tx
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email,
          fullName,
          bio,
          createdAt: new Date(),
          updatedAt: new Date(),
          phone,
          role,
          ...(role === "youtuber" && maxAssignedVideos !== undefined ? { maxAssignedVideos } : {}),
        })
        .returning();

      console.log("Usuario creado:", user.id);

      // Si hay projectIds, crear las relaciones
      if (projectIds && projectIds.length > 0) {
        console.log("Asignando proyectos al usuario:", projectIds);

        const projectAccessValues = projectIds.map((projectId) => ({
          userId: user.id,
          projectId,
        }));

        await tx.insert(projectAccess).values(projectAccessValues);

        console.log("Proyectos asignados correctamente");
      }

      // Obtener el usuario con sus relaciones
      const userWithProjects = await tx
        .select({
          ...getTableColumns(users),
          projectAccess: projectAccess,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .leftJoin(projectAccess, eq(users.id, projectAccess.userId))
        .execute();

      console.log("Usuario recuperado con proyectos:", userWithProjects);
      return [userWithProjects];
    });

    // Eliminar el password del objeto de respuesta
    if ("password" in newUser) delete newUser.password;

    return res.status(200).json({
      success: true,
      data: newUser,
      message: "Usuario creado correctamente",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      success: false,
      message: "Error al crear el usuario",
    });
  }
}

export async function updateUser(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para realizar esta acción",
      });
    }

    const body = req.body;
    const { id } = req.params;
    const referer = req.headers.referer || '';
    
    // Caso especial: actualización solo de límites (detecta request específica)
    // Detectamos si la petición es desde la página de límites por el referer o la estructura de datos
    const isFromLimitsPage = (
      // Si contiene estas URLs en el referer, muy probablemente es del panel de límites
      (referer.includes('/configuration/limits') || referer.includes('/admin/configuration')) ||
      // O por la estructura de la petición que solo incluye límites y nada más
      (Object.keys(body).length <= 2 && 
       (body.maxAssignedVideos !== undefined || body.maxMonthlyVideos !== undefined) &&
       !body.username && !body.fullName && !body.password && !body.email && !body.projectIds)
    );
    
    if (isFromLimitsPage) {
      console.log("Detectada actualización de límites:", {
        body,
        from: referer || 'unknown',
        userId: id
      });
      
      // Para estas actualizaciones, simplificamos y solo actualizamos los límites
      // sin requerir todos los campos del esquema de validación
      const updateData: Record<string, any> = {
        updatedAt: new Date()
      };
      
      if (body.maxAssignedVideos !== undefined && typeof body.maxAssignedVideos === 'number' && body.maxAssignedVideos > 0) {
        updateData.maxAssignedVideos = body.maxAssignedVideos;
      }
      
      if (body.maxMonthlyVideos !== undefined && typeof body.maxMonthlyVideos === 'number' && body.maxMonthlyVideos > 0) {
        updateData.maxMonthlyVideos = body.maxMonthlyVideos;
      }
      
      console.log("Actualizando solo límites con:", updateData);
      
      try {
        // Actualizar directamente solo los límites sin validación completa
        const [updatedUser] = await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, parseInt(id)))
          .returning();
          
        if (!updatedUser) {
          return res.status(404).json({
            success: false,
            message: "Usuario no encontrado"
          });
        }
        
        console.log("Límites actualizados correctamente:", {
          id: updatedUser.id,
          maxAssignedVideos: updatedUser.maxAssignedVideos,
          maxMonthlyVideos: updatedUser.maxMonthlyVideos
        });
        
        return res.json({
          success: true,
          data: {
            id: updatedUser.id,
            maxAssignedVideos: updatedUser.maxAssignedVideos,
            maxMonthlyVideos: updatedUser.maxMonthlyVideos  
          },
          message: "Límites actualizados correctamente"
        });
      } catch (error) {
        console.error("Error actualizando límites:", error);
        return res.status(500).json({
          success: false,
          message: "Error actualizando límites de usuario"
        });
      }
    }
    
    // Para todas las demás actualizaciones, procedemos con la validación completa
    // Validar body con schema para actualizaciones completas de usuario
    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return res
        .status(400)
        .json({ success: false, message: validationResult.error.message });
    }

    const {
      fullName,
      username,
      phone,
      bio,
      projectIds,
      password,
      email,
      role,
      maxAssignedVideos,
    } = body as UpdateUserSchema;
    console.log("Actualizando usuario:", { id, projectIds });

    // Hash password if provided and user is admin
    const hashedPassword = password ? await passwordUtils.hashPassword(password) : undefined;

    const [updatedUser] = await db.transaction(async (tx) => {
      // Verificar si el usuario existe
      const [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.id, parseInt(id)))
        .limit(1);

      if (!existingUser) {
        throw new Error("Usuario no encontrado");
      }

      // Actualizar usuario
      const [user] = await tx
        .update(users)
        .set({
          fullName,
          username,
          email,
          phone,
          bio,
          role,
          ...(hashedPassword && { password: hashedPassword }),
          ...(role === "youtuber" && maxAssignedVideos !== undefined ? { maxAssignedVideos } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, parseInt(id)))
        .returning();

      console.log("Usuario actualizado:", user);

      // Eliminar accesos anteriores
      await tx.delete(projectAccess).where(eq(projectAccess.userId, user.id));

      // Si hay projectIds, crear las nuevas relaciones
      if (projectIds && projectIds.length > 0) {
        console.log("Asignando nuevos proyectos:", projectIds);

        const projectAccessValues = projectIds.map((projectId) => ({
          userId: user.id,
          projectId,
        }));

        await tx.insert(projectAccess).values(projectAccessValues);
      }

      // Obtener el usuario actualizado con sus proyectos
      const userProjects = await tx
        .select({
          id: projectAccess.id,
          projectId: projectAccess.projectId,
          userId: projectAccess.userId,
          createdAt: projectAccess.createdAt,
        })
        .from(projectAccess)
        .where(eq(projectAccess.userId, user.id));

      console.log("Usuario recuperado con proyectos:", {
        ...user,
        projectAccess: userProjects,
      });
      return [{ ...user, projectAccess: userProjects }];
    });

    return res.json({
      success: true,
      data: updatedUser,
      message: "Usuario actualizado correctamente",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Error al actualizar el usuario",
    });
  }
}

export async function getUsers(req: Request, res: Response): Promise<Response> {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para acceder a esta función",
      });
    }

    const usersList = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        bio: users.bio,
        role: users.role,
        avatarUrl: users.avatarUrl,
        maxAssignedVideos: users.maxAssignedVideos,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users);

    // Get project access for each user
    const usersWithProjects = await Promise.all(
      usersList.map(async (user) => {
        const projectAccessList = await db
          .select({
            id: projectAccess.id,
            projectId: projectAccess.projectId,
            userId: projectAccess.userId,
            createdAt: projectAccess.createdAt,
          })
          .from(projectAccess)
          .where(eq(projectAccess.userId, user.id));

        return {
          ...user,
          projectAccess: projectAccessList,
        };
      }),
    );

    return res.json({
      success: true,
      data: usersWithProjects,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener usuarios",
    });
  }
}

export async function deleteUser(
  req: Request,
  res: Response,
): Promise<Response> {

  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "No tienes permisos para acceder a esta función",
    });
  }
  
  const { id } = req.params;

  try {

    // Verificar que el usuario existe
    const [userToDelete] = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    // Eliminar primero las relaciones en projectAccess
    await db
      .delete(projectAccess)
      .where(eq(projectAccess.userId, parseInt(id)));

    // Eliminar el usuario
    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, parseInt(id)))
      .returning();

    if (!deletedUser) {
      throw new Error("Error al eliminar el usuario");
    }

    // Si el usuario eliminado es el mismo que está logueado, cerrar su sesión
    if (req.user?.id === parseInt(id)) {
      req.logout((err) => {
        if (err) {
          console.error("Error logging out user:", err);
        }
      });
    }

    return res.json({
      success: true,
      message: "Usuario eliminado correctamente",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Error al eliminar el usuario",
    });
  }
}


/**
 * Actualiza solo los límites de videos de un usuario
 * Endpoint especializado para el panel de administración de límites
 */
export async function updateUserLimits(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para realizar esta acción",
      });
    }

    const { id } = req.params;
    const { maxAssignedVideos, maxMonthlyVideos } = req.body;
    
    console.log(`Actualizando límites para usuario ${id}:`, { maxAssignedVideos, maxMonthlyVideos });

    // Verificar que al menos uno de los campos está presente
    if (maxAssignedVideos === undefined && maxMonthlyVideos === undefined) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar al menos un límite para actualizar"
      });
    }

    // Validar valores numéricos positivos
    if (maxAssignedVideos !== undefined && (typeof maxAssignedVideos !== 'number' || maxAssignedVideos < 1)) {
      return res.status(400).json({
        success: false,
        message: "El límite de videos asignados debe ser un número positivo"
      });
    }

    if (maxMonthlyVideos !== undefined && (typeof maxMonthlyVideos !== 'number' || maxMonthlyVideos < 1)) {
      return res.status(400).json({
        success: false,
        message: "El límite de videos mensuales debe ser un número positivo"
      });
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

    // Actualizar usuario
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, parseInt(id)))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    console.log("Límites actualizados correctamente:", updatedUser);

    return res.json({
      success: true,
      data: {
        id: updatedUser.id,
        maxAssignedVideos: updatedUser.maxAssignedVideos,
        maxMonthlyVideos: updatedUser.maxMonthlyVideos
      },
      message: "Límites de usuario actualizados correctamente",
    });
  } catch (error) {
    console.error("Error updating user limits:", error);
    return res.status(500).json({
      success: false,
      message: "Error al actualizar los límites del usuario",
    });
  }
}

export function setUpUserRoutes (requireAuth: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined, app: Express) {
  app.post("/api/users", requireAuth, createUser);

  app.put("/api/users/:id", requireAuth, updateUser);
  
  // Nueva ruta específica para actualizar sólo los límites
  app.put("/api/users/:id/limits", requireAuth, updateUserLimits);

  app.get("/api/users", requireAuth, getUsers);

  app.delete("/api/users/:id", requireAuth, deleteUser);
}
