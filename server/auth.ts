import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users, type User as DBUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { 
  securityUtils, 
  checkAccountLockout, 
  recordFailedLoginAttempt, 
  resetFailedLoginAttempts,
  SECURITY_CONSTANTS
} from "./services/security";

// Extender SessionData para incluir datos personalizados
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
    youtubeAuthChannel?: string;
  }
}

// Extend Express.User
declare global {
  namespace Express {
    interface User extends DBUser {}
  }
}

import 'express-session';

declare module "express-serve-static-core" {
  interface Request {
    csrfToken?: () => string | undefined;
    validatedData?: any
  }
}


// Exportamos las utilidades de manejo de contraseñas mejoradas
export const passwordUtils = securityUtils;

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  
  // Para Cloudflare Flexible, necesitamos un middleware que configure las cookies dinámicamente
  app.use((req, res, next) => {
    const host = req.get('host') || '';
    const isCloudflareFlexible = host === 'petrapanel.ai';
    
    // La cookie la establecemos a través de un middleware en vez de en la configuración
    if (isCloudflareFlexible) {
      console.log('Configuración para petrapanel.ai (Cloudflare Flexible) aplicada');
    }
    
    next();
  });
  
  // Configuración mejorada de sesiones con más seguridad
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || process.env.REPL_ID || "petra-panel-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      // SIEMPRE poner secure: false para Cloudflare Flexible SSL
      secure: false,
      httpOnly: true,
      maxAge: SECURITY_CONSTANTS.SESSION_EXPIRY,
      path: '/',
      sameSite: 'lax' // 'none' puede causar problemas, usamos 'lax'
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // 24 horas
    }),
    proxy: true, // Mantener proxy para manejar las cabeceras correctamente
    // Agregar más flags para prevenir vulnerabilidades de XSS y CSRF
    name: 'petrapanel_sid', // Nombre de cookie personalizado
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Middleware de seguridad para protección contra CSRF

  app.use((req: Request, res: Response, next: NextFunction) => {
    // Si no hay una sesión de usuario, generamos un token de todas formas
    if (!req.session) {
      return next();
    }
    
    // Generar un token CSRF en la sesión si no existe
    if (!req.session.csrfToken) {
      req.session.csrfToken = securityUtils.generateCSRFToken();
    }
    
    // Establecer un encabezado X-CSRF-Token para que el cliente pueda leerlo
    res.setHeader('X-CSRF-Token', req.session.csrfToken);
    
    // Añadir un método csrfToken a la solicitud
    req.csrfToken = () => req.session.csrfToken || "";
    
    // CSRF protection solo se aplica a métodos no seguros
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Verificar el token CSRF para peticiones mutantes (POST, PUT, DELETE, etc.)
    const requestToken = req.headers['x-csrf-token'] || req.body?.csrfToken;
    
    if (!requestToken || requestToken !== req.session.csrfToken) {
      // Solo aplicamos en producción o si está habilitado explícitamente
      if (process.env.NODE_ENV === 'production' || process.env.ENFORCE_CSRF === 'true') {
        console.error('CSRF token mismatch', {
          sessionToken: req.session.csrfToken,
          requestToken
        });
        return res.status(403).json({
          success: false,
          message: "Error de validación de seguridad. Por favor, recarga la página."
        });
      } else {
        // En desarrollo, solo registramos el error pero permitimos la petición
        console.warn('CSRF token mismatch, but allowing in development mode', {
          sessionToken: req.session.csrfToken,
          requestToken
        });
      }
    }
    
    next();
  });
  
  // Headers de seguridad adicionales
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Prevenir que el navegador haga MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevenir clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // Habilitar la protección XSS en navegadores antiguos
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Establecer la política del cargador de servicio (para HTTPS)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Service-Worker-Allowed', '/');
    }
    
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Verificar si la cuenta está bloqueada por intentos fallidos
        const lockoutCheck = checkAccountLockout(username);
        if (lockoutCheck.locked) {
          console.log(`Account ${username} is locked due to multiple failed attempts. Remaining time: ${lockoutCheck.remainingTime} seconds`);
          return done(null, false, { 
            message: `Cuenta temporalmente bloqueada por múltiples intentos fallidos. Inténtalo de nuevo en ${lockoutCheck.remainingTime} segundos.`
          });
        }
        
        console.log("Authenticating user:", username);
        
        // Seleccionar todos los campos pero manejamos posibles errores
        const usersResult = await db
          .select()
          .from(users);
          
        // Normalizar el nombre de usuario para comparación
        const normalizedUsername = username.toLowerCase();
        
        // Filtrar manualmente con comparación normalizada
        const user = usersResult.find(u => 
          u.username.toLowerCase() === normalizedUsername
        );

        // Si no encontramos usuario, registramos un intento fallido
        if (!user) {
          // Registramos el intento fallido usando el username proporcionado
          const failedAttempt = recordFailedLoginAttempt(username);
          
          // Mensaje genérico por seguridad (no revelar si el usuario existe o no)
          const message = failedAttempt.locked 
            ? `Cuenta temporalmente bloqueada por múltiples intentos fallidos. Inténtalo de nuevo más tarde.` 
            : "Nombre de usuario o contraseña incorrectos.";
            
          return done(null, false, { message });
        }

        // Verificar contraseña con timing-safe compare
        console.log(`Verificando contraseña para ${username} (rol: ${user.role})`);
        const isMatch = await passwordUtils.comparePassword(password, user.password);
        
        if (!isMatch) {
          console.log(`Contraseña incorrecta para ${username} (rol: ${user.role})`);
          
          // Para desarrollo, mostramos más detalles del error
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Contraseña proporcionada: '${password}'`);
            console.log(`Hash almacenado: '${user.password.substring(0, 20)}...'`);
          }
          
          // Registramos el intento fallido
          const failedAttempt = recordFailedLoginAttempt(user.username);
          
          // Mensaje específico basado en los intentos
          const message = failedAttempt.locked 
            ? `Cuenta temporalmente bloqueada por múltiples intentos fallidos. Inténtalo de nuevo más tarde.` 
            : "Nombre de usuario o contraseña incorrectos.";
            
          return done(null, false, { message });
        } else {
          console.log(`Autenticación exitosa para ${username} (rol: ${user.role})`);
        }

        // Login exitoso, reseteamos los intentos fallidos
        resetFailedLoginAttempts(user.username);
        
        return done(null, user);
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
      // Seleccionar todos los campos
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log("User not found during deserialization, id:", id);
        return done(null, false);
      }

      done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    try {
      console.log("Login successful for user:", req.user?.username);
      const userToReturn = JSON.parse(JSON.stringify(req.user))
      delete userToReturn.password;
      
      if (req.user?.id) {
        try {          

          await db.update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, req.user.id))
          
        } catch (err) {
          console.error("Error al actualizar último login:", err);
          // Continuamos de todas formas, ya que esto no es crítico
        }
      }
      
      res.json(userToReturn);
    } catch (error) {
      console.error("Error en el proceso de login:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error interno del servidor" 
      });
    }
  });


  app.post("/api/logout", (req, res) => {
    const username = req.user?.username;
    req.logout((err) => {
      if (err) {
        console.error("Logout error for user:", username, err);
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      console.log("User logged out successfully:", username);
      res.json({ message: "Sesión cerrada correctamente" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const userToReturn = JSON.parse(JSON.stringify(req.user))
      delete userToReturn.password;
      
      // Log adicional para ayudar en la depuración
      console.log(`API User response for ${userToReturn.username} (ID: ${userToReturn.id}, role: ${userToReturn.role})`);
      
      return res.json(userToReturn);
    }
    
    // Respuesta mejorada para indicar claramente el estado de autenticación
    return res.status(401).json({ 
      success: false,
      message: "No autenticado",
      authenticated: false
    });
  });
}