import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth.js";
import { db } from "@db";
import { 
  users, videos, projects, youtubeChannels
} from "@db/schema"; 
import { eq } from "drizzle-orm";
import path from "path";
import express from "express";
// import { BackupService } from "./services/backup";
import { StatsService } from "./services/stats";
import { getOnlineUsersService } from "./services/online-users";
import translatorRouter from "./routes/translator";
import { setUpVideoRoutes } from "./controllers/videoController";
import { setUpProjectRoutes } from "./controllers/projectController.js";
import { setUpYoutuberRoutes } from "./controllers/userController.js";
import { setUpUserRoutes } from "./controllers/youtuberController.js";
import { setUpTitulinRoutes } from "./controllers/titulinController.js";
import { setUpProfileRoutes } from "./controllers/profileController.js";
import { setupNotificationRoutes } from "./routes/notifications";
import { setupTitleComparisonRoutes } from "./controllers/titleComparisonController";
import { setupAffiliateRoutes } from "./controllers/affiliateController";
import { setupSuggestionRoutes } from "./controllers/suggestionController";
import { setUpAccountingRoutes } from "./controllers/accountingController.js";
import { setUpActivityRoutes } from "./controllers/activityController";
import { setupYoutubeRoutes } from "./controllers/youtubeController";
import { setupAdStatsRoutes } from "./controllers/adStatsController";
import { setupUserActivityStatsRoutes } from "./controllers/userActivityStatsController";
import { setupStatsRoutes } from "./controllers/statsController";
import { setupCompatRoutes } from "./controllers/compatController";

export function registerRoutes(app: Express): Server {
  try {
    // Configuración de CORS para permitir credenciales
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Middleware to check authentication
    const requireAuth = (req: Request, res: Response, next: NextFunction) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }
      next();
    };

    setupAuth(app); // Authentication setup moved here
    
    // Ruta específica para obtener un token CSRF, no requiere autenticación
    app.get("/api/csrf-token", (req: Request, res: Response) => {
      // El token CSRF ya está adjunto a la respuesta por el middleware de Express
      res.json({ 
        success: true, 
        message: "CSRF token generated",
        csrfToken: req.csrfToken?.() || null
      });
    });
    

    // Serve uploaded files
    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

    // Register translator routes. Requiring authentication.
    app.use('/api/translator', requireAuth, translatorRouter);

    // Projects routes
    setUpProjectRoutes(requireAuth, app)

    // Videos routes
    setUpVideoRoutes(requireAuth, app)

    // Titulin
    setUpTitulinRoutes(requireAuth, app)
        
    // Notificaciones
    setupNotificationRoutes(app, requireAuth)
    
    // Comparación de títulos
    setupTitleComparisonRoutes(app, requireAuth)
    
    // Sistema de afiliados
    setupAffiliateRoutes(app, requireAuth)
    
    // Sistema de sugerencias y mejoras
    setupSuggestionRoutes(app, requireAuth)

    // Users routes
    setUpYoutuberRoutes(requireAuth, app)
    setUpUserRoutes(requireAuth, app)

    // Profile routes
    setUpProfileRoutes(requireAuth, app)

    // Stats routes
    app.get("/api/stats/overall", requireAuth, async (req: Request, res: Response) => {
      try {
        const stats = await StatsService.getOverallStats();
        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        console.error("Error fetching overall stats:", error);
        res.status(500).json({
          success: false,
          message: "Error al obtener estadísticas generales"
        });
      }
    });
    // Rutas para el sistema de contabilidad
    setUpAccountingRoutes(requireAuth, app)
    

    // Ruta para obtener usuarios en línea (alternativa REST al WebSocket)
    app.get("/api/online-users", requireAuth, async (req: Request, res: Response) => {
      try {
        const onlineUsersService = getOnlineUsersService();
        if (!onlineUsersService) {
          return res.status(503).json({
            success: false,
            message: "El servicio de usuarios en línea no está disponible"
          });
        }
        

        // Registra la actividad del usuario actual mediante REST
        if (req.user) {
          onlineUsersService.registerUserActivity(req.user);
        }
        

        const activeUsers = onlineUsersService.getActiveUsers();
        res.json({
          success: true,
          data: activeUsers
        });
      } catch (error) {
        console.error("Error fetching online users:", error);
        res.status(500).json({
          success: false,
          message: "Error al obtener usuarios en línea"
        });
      }
    });
    

    // Endpoint para búsqueda global
    app.get("/api/search", requireAuth, async (req: Request, res: Response) => {
      try {
        const query = (req.query.q as string || '').toLowerCase();
        

        // Si no hay query, devolver resultados vacíos
        if (!query || query.length < 2) {
          return res.json({ results: [] });
        }
        

        // Arrays para almacenar los diferentes tipos de resultados
        let dbUsers: SearchResponseItem[] = []
        let dbVideos: SearchResponseItem[] = []
        let dbProjects: SearchResponseItem[] = []
        let dbYoutubeChannels: SearchResponseItem[] = []
        

        // 1. Obtener usuarios de la base de datos
        try {
          const usersResult = await db.select().from(users).limit(20);
          

          dbUsers = usersResult.map<SearchResponseItem>(user => ({
            id: user.id,
            title: user.fullName || user.username,
            subtitle: user.email || `@${user.username}`,
            type: 'user' as const,
            url: `/users/${user.id}`,
            thumbnail: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
          }));
          

          console.log(`Encontrados ${dbUsers.length} usuarios en la base de datos`);
        } catch (error) {
          console.error('Error al obtener usuarios de la base de datos:', error);
        }
        

        // 2. Obtener videos de la base de datos
        try {
          const videosResult = await db.select({
            id: videos.id,
            title: videos.title,
            description: videos.description,
            status: videos.status,
            projectId: videos.projectId,
            projectName: projects.name,
            thumbnailUrl: videos.thumbnailUrl,
            createdAt: videos.createdAt,
            tags: videos.tags
          })
          .from(videos)
          .leftJoin(projects, eq(videos.projectId, projects.id))
          .limit(30);
          

          dbVideos = videosResult.map(video => ({
            id: video.id,
            title: video.title,
            subtitle: video.projectName ? `Proyecto: ${video.projectName}` : (video.description || 'Sin descripción'),
            type: 'video' as const,
            url: `/videos/${video.id}`,
            thumbnail: video.thumbnailUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=video${video.id}`,
            status: video.status,
            date: video.createdAt ? video.createdAt.toISOString() : undefined,
            tags: video.tags?.split(',') || [],
          }));
          

          console.log(`Encontrados ${dbVideos.length} videos en la base de datos`);
        } catch (error) {
          console.error('Error al obtener videos de la base de datos:', error);
        }
                        

        // 3. Obtener proyectos de la base de datos
        try {
          const projectsResult = await db.select().from(projects).limit(20);
          

          dbProjects = projectsResult.map(project => ({
            id: project.id,
            title: project.name,
            subtitle: project.description || 'Proyecto',
            type: 'project' as const,
            url: `/projects/${project.id}`,
            icon: project.prefix || '📁',
          }));
          

          console.log(`Encontrados ${dbProjects.length} proyectos en la base de datos`);
        } catch (error) {
          console.error('Error al obtener proyectos de la base de datos:', error);
        }
        

        // 4. Obtener canales de YouTube
        try {
          const channelsResult = await db.select().from(youtubeChannels).limit(15);
          

          dbYoutubeChannels = channelsResult.map(channel => ({
            id: channel.id,
            title: channel.name,
            subtitle: 'Canal YouTube',
            type: 'channel' as const,
            url: `/titulin/channels/${channel.id}`,
            thumbnail: channel.thumbnailUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${channel.name}`,
            icon: '📺',
          }));
          

          console.log(`Encontrados ${dbYoutubeChannels.length} canales de YouTube en la base de datos`);
        } catch (error) {
          console.error('Error al obtener canales de YouTube de la base de datos:', error);
        }
        

        // 5. Configuración y elementos estáticos
        const settingsItems: SearchResponseItem[] = [
          {
            id: -1,
            title: 'Ajustes de perfil',
            type: 'settings',
            url: '/profile',
            icon: '⚙️',
          },
          {
            id: -1,
            title: 'Configuración de notificaciones',
            type: 'settings',
            url: '/settings/notifications',
            icon: '🔔',
          },
          {
            id: -1,
            title: 'Gestión de usuarios',
            type: 'settings',
            url: '/admin/users',
            icon: '👥',
          },
          {
            id: -1,
            title: 'Configuración de búsqueda',
            type: 'settings',
            url: '/settings/search',
            icon: '🔍',
          }
        ];
        

        // Combinamos todos los resultados con prioridad a los datos reales
        const allResults: SearchResponseItem[] = [
          ...dbUsers,           // Usuarios reales de la base de datos
          ...dbVideos,          // Videos reales de la base de datos
          ...dbProjects,        // Proyectos reales de la base de datos
          ...dbYoutubeChannels, // Canales reales de YouTube
          ...settingsItems,     // Items estáticos de configuración
        ];
        

        // Filtrar resultados según query (mejorado para ser más inclusivo)
        const filteredResults = allResults.filter(item => {
          const titleMatch = item.title?.toLowerCase().includes(query);
          const subtitleMatch = item.subtitle?.toLowerCase().includes(query);
          const tagsMatch = item.tags?.some(tag => tag.toLowerCase().includes(query));
          

          // Buscamos también coincidencias parciales en palabras
          const words = item.title?.toLowerCase().split(' ') || [];
          const wordMatch = words.some(word => word.startsWith(query));
          

          return titleMatch || subtitleMatch || tagsMatch || wordMatch;
        });
        

        console.log(`Búsqueda "${query}" encontró ${filteredResults.length} resultados`);
        

        return res.json({ results: filteredResults });
      } catch (error) {
        console.error('Error en búsqueda global:', error);
        return res.status(500).json({ success: false, message: 'Error al realizar la búsqueda' });
      }
    });

    // Actividad de usuarios
    setUpActivityRoutes(requireAuth, app);
    
    // YouTube API y canales
    setupYoutubeRoutes(app, requireAuth);
    
    // Estadísticas avanzadas
    setupStatsRoutes(requireAuth, app);
    
    // Estadísticas de anuncios
    setupAdStatsRoutes(requireAuth, app);
    
    // Estadísticas de actividad de usuarios
    setupUserActivityStatsRoutes(requireAuth, app);
    // Rutas de compatibilidad para lidiar con problemas específicos
    // Estas rutas son alternativas a rutas existentes para resolver problemas de permiso
    setupCompatRoutes(app, requireAuth);

    const httpServer = createServer(app);
    return httpServer;
  } catch (error) {
    console.error("Error setting up routes:", error);
    throw error;
  }
}

interface SearchResponseItem {
  id: number;
  title: string;
  subtitle?: string;
  type: 'user' | 'video' | 'project' | 'channel' | 'settings';
  url: string;
  thumbnail?: string;
  status?: string;
  date?: string;
  tags?: string[];
  icon?: string
}