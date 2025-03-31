import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import path from "path";
import fs from "fs";
import { db } from "../db";
import { setupOnlineUsersService } from "./services/online-users";
import { setupNotificationsService } from "./services/notifications";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Trust proxy settings específico para Cloudflare
// Esto le dice a Express que confíe en todas las cabeceras de proxy
// Es necesario para que Cloudflare pueda pasar las cabeceras correctamente
app.set("trust proxy", true);

// Set environment variable to production in non-development environments
if (app.get("env") !== "development") {
  process.env.NODE_ENV = "production";
}

// ======================================================
// SOLUCIÓN DEFINITIVA PARA CLOUDFLARE FLEXIBLE SSL
// ======================================================
app.use((req, res, next) => {
  // Información de diagnóstico completa
  const host = req.get("host") || "";
  const cfIp = req.headers["cf-connecting-ip"];
  const cfRay = req.headers["cf-ray"];
  const cfVisitor = req.headers["cf-visitor"];

  // Detección específica para petrapanel.ai con Cloudflare Flexible SSL
  const isPetraPanelDomain = host === "petrapanel.ai";
  const isCloudflare = cfRay || cfIp || cfVisitor;

  if (isPetraPanelDomain) {
    console.log(
      "Detectado dominio petrapanel.ai - Aplicando configuración Cloudflare Flexible SSL",
    );

    // SOLUCIÓN PARA EL ERROR ERR_TOO_MANY_REDIRECTS:
    // Con Cloudflare Flexible SSL, Cloudflare termina SSL pero se conecta a Replit por HTTP
    // Express ve la cabecera X-Forwarded-Proto: https y trata de redirigir a HTTPS
    // causando un bucle infinito. La solución es forzar el protocolo a HTTP.

    // SOLO para el dominio petrapanel.ai forzamos HTTP para evitar el bucle de redirecciones
    req.headers["x-forwarded-proto"] = "http";

    console.log("Configuración de protocolo HTTP para petrapanel.ai aplicada");
  } else if (isCloudflare) {
    // Para otros dominios de Cloudflare (no petrapanel.ai), respetamos el protocolo original
    console.log("Detectada conexión desde Cloudflare (no petrapanel.ai)");
  }

  next();
});

// Middleware para loggear peticiones API
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

// Configurar autenticación
console.log("Setting up authentication...");
setupAuth(app);
console.log("Authentication setup complete");

// Registrar rutas y obtener el servidor HTTP
const server = registerRoutes(app);

// Inicializar servicio de usuarios en línea
const onlineUsersService = setupOnlineUsersService(server);
console.log("Online users service initialized");

// Inicializar servicio de notificaciones
const notificationsService = setupNotificationsService(server);
console.log("Notifications service initialized");

// Middleware de manejo de errores
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Función para aplicar migraciones SQL
async function applyMigrations() {
  try {
    log("Verificando migraciones SQL", "migrations");
    
    // Crear tabla de migraciones si no existe
    await db.execute(`
      CREATE TABLE IF NOT EXISTS migrations_applied (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Obtener migraciones ya aplicadas
    const result = await db.execute(`SELECT name FROM migrations_applied`);
    const appliedMigrations = new Set(result.rows.map((row: any) => row.name));
    
    // Leer directorio de migraciones
    const migrationsDir = path.join(process.cwd(), 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      // Aplicar migraciones pendientes
      let applied = 0;
      for (const file of migrationFiles) {
        if (!appliedMigrations.has(file)) {
          log(`Aplicando migración: ${file}`, "migrations");
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
          
          try {
            await db.execute(sql);
            await db.execute(
              `INSERT INTO migrations_applied (name, applied_at) VALUES ('${file}', NOW())`
            );
            
            log(`✅ Migración aplicada: ${file}`, "migrations");
            applied++;
          } catch (err) {
            log(`❌ Error aplicando migración ${file}: ${err}`, "migrations");
            console.error(err);
          }
        }
      }
      
      log(`Migraciones completadas. ${applied} nuevas migraciones aplicadas.`, "migrations");
    } else {
      log("Directorio de migraciones no encontrado", "migrations");
    }
  } catch (err) {
    log(`Error verificando migraciones: ${err}`, "migrations");
    console.error("Error durante la aplicación de migraciones:", err);
  }
}

(async () => {
  try {
    // Aplicar migraciones SQL antes de arrancar el servidor
    await applyMigrations();

    // Configurar Vite en desarrollo o servir archivos estáticos en producción
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Iniciar el servidor en el puerto 5000 como requerido para deployments
    const PORT = process.env.PORT || 5000; // Use PORT environment variable or default to 5000
    server.listen(Number(PORT), "0.0.0.0", () => {
      const actualPort = (server.address() as any)?.port || PORT;
      console.log(`Server started on port ${actualPort}`);
      log(`Server running on http://0.0.0.0:${actualPort}`);
      console.log("Environment:", app.get("env"));
      console.log("Trust proxy setting:", app.get("trust proxy"));
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
