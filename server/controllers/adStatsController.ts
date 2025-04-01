import type { NextFunction, Request, Response } from "express";
import { type Express } from "express";

/**
 * Obtener estadísticas detalladas de anuncios para cada video
 * Incluye:
 * - Detalles de cada anuncio
 * - Métricas de conversión
 * - Ingresos generados
 * - Tendencias de rendimiento
 */
async function getAdDetailStats(req: Request, res: Response): Promise<Response> {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Debes iniciar sesión para acceder a esta funcionalidad",
    });
  }

  try {
    // Datos simulados para demostración - estos datos se recuperarían de la base de datos en producción
    const mockData = {
      overallStats: {
        totalMatchedVideos: 258,
        totalIncludedLinks: 156,
        overallConversionRate: 60.47,
        totalAffiliateCompanies: 8,
        activeAffiliateCompanies: 6
      },
      affiliateStats: [
        {
          companyId: 1,
          companyName: "Amazon",
          status: "active",
          matchCount: 87,
          includedCount: 65,
          pendingCount: 22,
          conversionRate: 74.71,
          estimatedRevenue: 195.00
        },
        {
          companyId: 2,
          companyName: "DigitalOcean",
          status: "active",
          matchCount: 55,
          includedCount: 40,
          pendingCount: 15,
          conversionRate: 72.73,
          estimatedRevenue: 120.00
        },
        {
          companyId: 3,
          companyName: "Shopify",
          status: "active",
          matchCount: 42,
          includedCount: 28,
          pendingCount: 14,
          conversionRate: 66.67,
          estimatedRevenue: 98.00
        },
        {
          companyId: 4,
          companyName: "Udemy",
          status: "active",
          matchCount: 35,
          includedCount: 12,
          pendingCount: 23,
          conversionRate: 34.29,
          estimatedRevenue: 36.00
        },
        {
          companyId: 5,
          companyName: "Hostinger",
          status: "active",
          matchCount: 18,
          includedCount: 7,
          pendingCount: 11,
          conversionRate: 38.89,
          estimatedRevenue: 17.50
        },
        {
          companyId: 6,
          companyName: "Bluehost",
          status: "active",
          matchCount: 12,
          includedCount: 4,
          pendingCount: 8,
          conversionRate: 33.33,
          estimatedRevenue: 12.00
        },
        {
          companyId: 7,
          companyName: "Fiverr",
          status: "inactive",
          matchCount: 6,
          includedCount: 0,
          pendingCount: 6,
          conversionRate: 0,
          estimatedRevenue: 0
        },
        {
          companyId: 8,
          companyName: "Coursera",
          status: "inactive",
          matchCount: 3,
          includedCount: 0,
          pendingCount: 3,
          conversionRate: 0,
          estimatedRevenue: 0
        }
      ],
      projectAffiliateStats: [
        {
          companyId: 1,
          companyName: "Amazon",
          projectId: 1,
          projectName: "Recetas de cocina",
          projectPrefix: "RC",
          matchCount: 32,
          includedCount: 24,
          pendingCount: 8
        },
        {
          companyId: 1,
          companyName: "Amazon",
          projectId: 2,
          projectName: "Tutoriales de maquillaje",
          projectPrefix: "TM",
          matchCount: 28,
          includedCount: 22,
          pendingCount: 6
        },
        {
          companyId: 2,
          companyName: "DigitalOcean",
          projectId: 3,
          projectName: "Programación para principiantes",
          projectPrefix: "PP",
          matchCount: 35,
          includedCount: 28,
          pendingCount: 7
        },
        {
          companyId: 2,
          companyName: "DigitalOcean",
          projectId: 4,
          projectName: "Hosting y servidores",
          projectPrefix: "HS",
          matchCount: 20,
          includedCount: 12,
          pendingCount: 8
        },
        {
          companyId: 3,
          companyName: "Shopify",
          projectId: 5,
          projectName: "Tiendas online",
          projectPrefix: "TO",
          matchCount: 42,
          includedCount: 28,
          pendingCount: 14
        }
      ],
      monthlyAffiliateStats: [
        {
          month: "2024-10",
          totalMatches: 48,
          includedCount: 28,
          pendingCount: 20,
          conversionRate: 58.33
        },
        {
          month: "2024-11",
          totalMatches: 52,
          includedCount: 32,
          pendingCount: 20,
          conversionRate: 61.54
        },
        {
          month: "2024-12",
          totalMatches: 56,
          includedCount: 36,
          pendingCount: 20,
          conversionRate: 64.29
        },
        {
          month: "2025-01",
          totalMatches: 45,
          includedCount: 28,
          pendingCount: 17,
          conversionRate: 62.22
        },
        {
          month: "2025-02",
          totalMatches: 30,
          includedCount: 20,
          pendingCount: 10,
          conversionRate: 66.67
        },
        {
          month: "2025-03",
          totalMatches: 27,
          includedCount: 12,
          pendingCount: 15,
          conversionRate: 44.44
        }
      ],
      topVideosWithAffiliates: [
        {
          videoId: 245,
          videoTitle: "Mejores accesorios de cocina para principiantes",
          projectId: 1,
          projectName: "Recetas de cocina",
          affiliateCount: 8,
          includedCount: 6,
          createdAt: "2025-01-15T14:30:00Z",
          videoStatus: "completed",
          creatorName: "María López"
        },
        {
          videoId: 187,
          videoTitle: "Cómo montar tu primera tienda en Shopify",
          projectId: 5,
          projectName: "Tiendas online",
          affiliateCount: 7,
          includedCount: 5,
          createdAt: "2024-12-05T10:15:00Z",
          videoStatus: "completed",
          creatorName: "Carlos Ruiz"
        },
        {
          videoId: 312,
          videoTitle: "Tutoriales de maquillaje para fiestas",
          projectId: 2,
          projectName: "Tutoriales de maquillaje",
          affiliateCount: 6,
          includedCount: 5,
          createdAt: "2025-02-22T16:45:00Z",
          videoStatus: "completed",
          creatorName: "Ana García"
        },
        {
          videoId: 156,
          videoTitle: "Despliegue de aplicaciones web en DigitalOcean",
          projectId: 3,
          projectName: "Programación para principiantes",
          affiliateCount: 5,
          includedCount: 4,
          createdAt: "2024-11-18T09:20:00Z",
          videoStatus: "completed",
          creatorName: "Javier Martínez"
        },
        {
          videoId: 278,
          videoTitle: "Configuración de servidor VPS para principiantes",
          projectId: 4,
          projectName: "Hosting y servidores",
          affiliateCount: 5,
          includedCount: 4,
          createdAt: "2025-01-30T13:10:00Z",
          videoStatus: "completed",
          creatorName: "Javier Martínez"
        }
      ],
      topPerformingCompanies: [
        {
          companyId: 1,
          companyName: "Amazon",
          status: "active",
          matchCount: 87,
          includedCount: 65,
          conversionRate: 74.71
        },
        {
          companyId: 2,
          companyName: "DigitalOcean",
          status: "active",
          matchCount: 55,
          includedCount: 40,
          conversionRate: 72.73
        },
        {
          companyId: 3,
          companyName: "Shopify",
          status: "active",
          matchCount: 42,
          includedCount: 28,
          conversionRate: 66.67
        },
        {
          companyId: 4,
          companyName: "Udemy",
          status: "active",
          matchCount: 35,
          includedCount: 12,
          conversionRate: 34.29
        },
        {
          companyId: 5,
          companyName: "Hostinger",
          status: "active",
          matchCount: 18,
          includedCount: 7,
          conversionRate: 38.89
        }
      ]
    };

    return res.status(200).json(mockData);
  } catch (error) {
    console.error('Error al obtener estadísticas de anuncios:', error);
    return res.status(500).json({ 
      error: 'Error al obtener estadísticas de anuncios',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

/**
 * Obtener estadísticas detalladas para una empresa afiliada específica
 */
async function getCompanyAdStats(req: Request, res: Response): Promise<Response> {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Debes iniciar sesión para acceder a esta funcionalidad",
    });
  }

  const { companyId } = req.params;
  
  if (!companyId || isNaN(parseInt(companyId))) {
    return res.status(400).json({
      success: false,
      message: "ID de empresa no válido",
    });
  }

  try {
    // Datos simulados para demostración - estos datos se recuperarían de la base de datos en producción
    const companyIdNum = parseInt(companyId);
    
    // Información de empresa estática para pruebas
    const companyDetails = {
      1: {
        name: "Amazon",
        domain: "amazon.com",
        status: "active",
        baseRate: 3.0
      },
      2: {
        name: "DigitalOcean",
        domain: "digitalocean.com",
        status: "active",
        baseRate: 3.0
      },
      3: {
        name: "Shopify",
        domain: "shopify.com",
        status: "active",
        baseRate: 3.5
      },
      4: {
        name: "Udemy",
        domain: "udemy.com",
        status: "active",
        baseRate: 3.0
      },
      5: {
        name: "Hostinger",
        domain: "hostinger.com",
        status: "active",
        baseRate: 2.5
      }
    };
    
    // Si la empresa no existe en nuestros datos de demostración
    if (!companyDetails[companyIdNum as keyof typeof companyDetails]) {
      return res.status(404).json({
        success: false,
        message: "Empresa afiliada no encontrada",
      });
    }
    
    const company = companyDetails[companyIdNum as keyof typeof companyDetails];
    
    // Crear datos para la empresa seleccionada
    const mockData = {
      company: {
        id: companyIdNum,
        name: company.name,
        status: company.status,
        domain: company.domain,
        baseRate: company.baseRate,
        createdat: "2024-08-15T10:30:00Z"
      },
      overallStats: {
        totalMatches: companyIdNum === 1 ? 87 : companyIdNum === 2 ? 55 : companyIdNum === 3 ? 42 : companyIdNum === 4 ? 35 : 18,
        includedMatches: companyIdNum === 1 ? 65 : companyIdNum === 2 ? 40 : companyIdNum === 3 ? 28 : companyIdNum === 4 ? 12 : 7,
        pendingMatches: companyIdNum === 1 ? 22 : companyIdNum === 2 ? 15 : companyIdNum === 3 ? 14 : companyIdNum === 4 ? 23 : 11,
        conversionRate: companyIdNum === 1 ? 74.71 : companyIdNum === 2 ? 72.73 : companyIdNum === 3 ? 66.67 : companyIdNum === 4 ? 34.29 : 38.89,
        estimatedRevenue: companyIdNum === 1 ? 195.00 : companyIdNum === 2 ? 120.00 : companyIdNum === 3 ? 98.00 : companyIdNum === 4 ? 36.00 : 17.50
      },
      projectStats: [
        {
          projectId: 1,
          projectName: "Recetas de cocina",
          projectPrefix: "RC",
          matchCount: 32,
          includedCount: 24,
          pendingCount: 8,
          conversionRate: 75.00
        },
        {
          projectId: 2,
          projectName: "Tutoriales de maquillaje",
          projectPrefix: "TM",
          matchCount: 28,
          includedCount: 22,
          pendingCount: 6,
          conversionRate: 78.57
        },
        {
          projectId: 3,
          projectName: "Programación para principiantes",
          projectPrefix: "PP",
          matchCount: 15,
          includedCount: 11,
          pendingCount: 4,
          conversionRate: 73.33
        },
        {
          projectId: 5,
          projectName: "Tiendas online",
          projectPrefix: "TO",
          matchCount: 12,
          includedCount: 8,
          pendingCount: 4,
          conversionRate: 66.67
        }
      ],
      monthlyStats: [
        {
          month: "2024-10",
          totalMatches: 18,
          includedCount: 12,
          pendingCount: 6,
          conversionRate: 66.67
        },
        {
          month: "2024-11",
          totalMatches: 20,
          includedCount: 15,
          pendingCount: 5,
          conversionRate: 75.00
        },
        {
          month: "2024-12",
          totalMatches: 22,
          includedCount: 16,
          pendingCount: 6,
          conversionRate: 72.73
        },
        {
          month: "2025-01",
          totalMatches: 15,
          includedCount: 12,
          pendingCount: 3,
          conversionRate: 80.00
        },
        {
          month: "2025-02",
          totalMatches: 8,
          includedCount: 6,
          pendingCount: 2,
          conversionRate: 75.00
        },
        {
          month: "2025-03",
          totalMatches: 4,
          includedCount: 3,
          pendingCount: 1,
          conversionRate: 75.00
        }
      ],
      creatorStats: [
        {
          creatorId: 1,
          creatorName: "María López",
          creatorUsername: "maria_lopez",
          matchCount: 35,
          includedCount: 28,
          pendingCount: 7,
          conversionRate: 80.00
        },
        {
          creatorId: 2,
          creatorName: "Carlos Ruiz",
          creatorUsername: "carlos_ruiz",
          matchCount: 25,
          includedCount: 18,
          pendingCount: 7,
          conversionRate: 72.00
        },
        {
          creatorId: 3,
          creatorName: "Ana García",
          creatorUsername: "ana_garcia",
          matchCount: 15,
          includedCount: 10,
          pendingCount: 5,
          conversionRate: 66.67
        },
        {
          creatorId: 4,
          creatorName: "Javier Martínez",
          creatorUsername: "javier_martinez",
          matchCount: 12,
          includedCount: 9,
          pendingCount: 3,
          conversionRate: 75.00
        }
      ],
      videoList: [
        {
          videoId: 245,
          videoTitle: "Mejores accesorios de cocina para principiantes",
          projectId: 1,
          projectName: "Recetas de cocina",
          included: true,
          createdAt: "2025-01-15T14:30:00Z",
          videoStatus: "completed",
          creatorName: "María López",
          optimizerName: "Juan Pérez"
        },
        {
          videoId: 187,
          videoTitle: "Cómo montar tu primera tienda en Shopify",
          projectId: 5,
          projectName: "Tiendas online",
          included: true,
          createdAt: "2024-12-05T10:15:00Z",
          videoStatus: "completed",
          creatorName: "Carlos Ruiz",
          optimizerName: "Laura Sánchez"
        },
        {
          videoId: 312,
          videoTitle: "Tutoriales de maquillaje para fiestas",
          projectId: 2,
          projectName: "Tutoriales de maquillaje",
          included: true,
          createdAt: "2025-02-22T16:45:00Z",
          videoStatus: "completed",
          creatorName: "Ana García",
          optimizerName: "Juan Pérez"
        },
        {
          videoId: 156,
          videoTitle: "Despliegue de aplicaciones web en DigitalOcean",
          projectId: 3,
          projectName: "Programación para principiantes",
          included: true,
          createdAt: "2024-11-18T09:20:00Z",
          videoStatus: "completed",
          creatorName: "Javier Martínez",
          optimizerName: "Laura Sánchez"
        },
        {
          videoId: 278,
          videoTitle: "Configuración de servidor VPS para principiantes",
          projectId: 4,
          projectName: "Hosting y servidores",
          included: true,
          createdAt: "2025-01-30T13:10:00Z",
          videoStatus: "completed",
          creatorName: "Javier Martínez",
          optimizerName: "Juan Pérez"
        },
        {
          videoId: 301,
          videoTitle: "Mejores plugins para WooCommerce",
          projectId: 5,
          projectName: "Tiendas online",
          included: false,
          createdAt: "2025-02-10T11:25:00Z",
          videoStatus: "final_review",
          creatorName: "Carlos Ruiz",
          optimizerName: null
        },
        {
          videoId: 210,
          videoTitle: "Técnicas de maquillaje para principiantes",
          projectId: 2,
          projectName: "Tutoriales de maquillaje",
          included: false,
          createdAt: "2024-12-15T15:40:00Z",
          videoStatus: "content_review",
          creatorName: "Ana García",
          optimizerName: null
        }
      ]
    };

    return res.status(200).json(mockData);
  } catch (error) {
    console.error('Error al obtener estadísticas de empresa afiliada:', error);
    return res.status(500).json({ 
      error: 'Error al obtener estadísticas de empresa afiliada',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

/**
 * Configurar las rutas de estadísticas de anuncios
 */
export function setupAdStatsRoutes(
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  app: Express
) {
  // Endpoint para estadísticas generales de anuncios
  app.get("/api/stats/ads", requireAuth, getAdDetailStats);
  
  // Endpoint para estadísticas de una empresa afiliada específica
  app.get("/api/stats/ads/company/:companyId", requireAuth, getCompanyAdStats);
}