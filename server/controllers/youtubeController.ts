import { Express, Request, Response, NextFunction } from 'express';
import { db } from '@db/index';
import { videos, youtubeChannels, projectYoutubeChannels } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import * as path from 'path';
import * as fs from 'fs';
import { 
  generateAuthUrl, 
  getTokensFromCode, 
  verifyAccessToken,
  refreshAccessToken,
  getAuthorizedChannel,
  getChannelById,
  uploadVideo
} from '../utils/youtube-api';

// Extender la interfaz de Session para incluir nuestros datos personalizados
declare module 'express-session' {
  interface SessionData {
    youtubeAuthChannel?: string;
  }
}

/**
 * Obtiene los canales de YouTube disponibles
 */
async function getYoutubeChannels(req: Request, res: Response): Promise<Response> {
  try {
    const channels = await db.select().from(youtubeChannels).where(
      eq(youtubeChannels.active, true)
    );
    
    return res.status(200).json({
      success: true,
      data: channels
    });
  } catch (error) {
    console.error('Error al obtener canales de YouTube:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener canales de YouTube'
    });
  }
}

/**
 * Crea un nuevo canal de YouTube
 */
async function createYoutubeChannel(req: Request, res: Response): Promise<Response> {
  try {
    const { channelId } = req.body;
    
    // Validar datos requeridos
    if (!channelId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del canal es obligatorio'
      });
    }
    
    // Comprobar si ya existe un canal con ese ID
    const existingChannel = await db.select().from(youtubeChannels).where(
      eq(youtubeChannels.channelId, channelId)
    );
    
    if (existingChannel.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un canal con ese ID'
      });
    }
    
    // Obtener datos del canal desde la API de YouTube
    try {
      const channelInfo = await getChannelById(channelId);
      
      if (!channelInfo) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró el canal en YouTube. Verifica el ID del canal.'
        });
      }
      
      // Extraer los datos del canal
      const name = channelInfo.snippet?.title || 'Canal sin nombre';
      const description = channelInfo.snippet?.description || '';
      const url = `https://www.youtube.com/channel/${channelId}`;
      const thumbnailUrl = channelInfo.snippet?.thumbnails?.default?.url || '';
      const subscriberCount = channelInfo.statistics?.subscriberCount || '0';
      const videoCount = parseInt(channelInfo.statistics?.videoCount || '0');
      
      // Crear el nuevo canal
      const [newChannel] = await db.insert(youtubeChannels).values({
        channelId,
        name,
        url,
        description,
        thumbnailUrl,
        subscriberCount,
        videoCount,
        active: true
      }).returning();
      
      return res.status(201).json({
        success: true,
        data: newChannel,
        message: 'Canal creado correctamente con datos obtenidos de YouTube'
      });
      
    } catch (apiError) {
      console.error('Error al obtener datos del canal desde YouTube:', apiError);
      
      // Si falla la API, usar los datos proporcionados por el usuario
      const { name = 'Canal sin nombre', url = `https://www.youtube.com/channel/${channelId}`, description = '' } = req.body;
      
      // Crear el canal con datos mínimos
      const [newChannel] = await db.insert(youtubeChannels).values({
        channelId,
        name,
        url,
        description,
        videoCount: 0,
        active: true
      }).returning();
      
      return res.status(201).json({
        success: true,
        data: newChannel,
        message: 'Canal creado correctamente (sin datos de YouTube)',
        warning: 'No se pudieron obtener datos completos desde YouTube. Se han utilizado datos básicos.'
      });
    }
    
  } catch (error) {
    console.error('Error al crear canal de YouTube:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear canal de YouTube'
    });
  }
}

/**
 * Vincula un canal de YouTube con un proyecto
 */
async function linkChannelToProject(req: Request, res: Response): Promise<Response> {
  try {
    const { projectId, channelId, isDefault = false } = req.body;
    
    // Validar datos requeridos
    if (!projectId || !channelId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del proyecto y el ID del canal son obligatorios'
      });
    }
    
    // Comprobar si el canal existe
    const channel = await db.select().from(youtubeChannels).where(
      eq(youtubeChannels.channelId, channelId)
    );
    
    if (channel.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'El canal no existe'
      });
    }
    
    // Comprobar si ya existe la vinculación
    const existingLink = await db.select().from(projectYoutubeChannels).where(
      and(
        eq(projectYoutubeChannels.projectId, projectId),
        eq(projectYoutubeChannels.channelId, channelId)
      )
    );
    
    if (existingLink.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El canal ya está vinculado a este proyecto'
      });
    }
    
    // Si se va a establecer como predeterminado, quitar la marca de predeterminado a cualquier otro canal
    if (isDefault) {
      await db.update(projectYoutubeChannels)
        .set({ isDefault: false })
        .where(eq(projectYoutubeChannels.projectId, projectId));
    }
    
    // Crear la vinculación
    const [newLink] = await db.insert(projectYoutubeChannels).values({
      projectId,
      channelId,
      isDefault
    }).returning();
    
    return res.status(201).json({
      success: true,
      data: newLink,
      message: 'Canal vinculado al proyecto correctamente'
    });
  } catch (error) {
    console.error('Error al vincular canal al proyecto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al vincular canal al proyecto'
    });
  }
}

/**
 * Obtiene los canales vinculados a un proyecto
 */
async function getProjectChannels(req: Request, res: Response): Promise<Response> {
  try {
    const { projectId } = req.params;
    
    // Obtener los canales vinculados al proyecto
    const channelLinks = await db.select().from(projectYoutubeChannels).where(
      eq(projectYoutubeChannels.projectId, parseInt(projectId))
    );
    
    if (channelLinks.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No hay canales vinculados a este proyecto'
      });
    }
    
    // Obtener los detalles de cada canal
    const channels = await Promise.all(
      channelLinks.map(async (link) => {
        const [channel] = await db.select().from(youtubeChannels).where(
          eq(youtubeChannels.channelId, link.channelId)
        );
        
        return {
          ...channel,
          isDefault: link.isDefault,
          linkId: link.id
        };
      })
    );
    
    return res.status(200).json({
      success: true,
      data: channels
    });
  } catch (error) {
    console.error('Error al obtener canales del proyecto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener canales del proyecto'
    });
  }
}

/**
 * Elimina la vinculación entre un canal y un proyecto
 */
async function unlinkChannelFromProject(req: Request, res: Response): Promise<Response> {
  try {
    const { projectId, channelId } = req.params;
    
    // Comprobar si existe la vinculación
    const existingLink = await db.select().from(projectYoutubeChannels).where(
      and(
        eq(projectYoutubeChannels.projectId, parseInt(projectId)),
        eq(projectYoutubeChannels.channelId, channelId)
      )
    );
    
    if (existingLink.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'El canal no está vinculado a este proyecto'
      });
    }
    
    // Eliminar la vinculación
    await db.delete(projectYoutubeChannels).where(
      and(
        eq(projectYoutubeChannels.projectId, parseInt(projectId)),
        eq(projectYoutubeChannels.channelId, channelId)
      )
    );
    
    return res.status(200).json({
      success: true,
      message: 'Canal desvinculado del proyecto correctamente'
    });
  } catch (error) {
    console.error('Error al desvincular canal del proyecto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al desvincular canal del proyecto'
    });
  }
}

/**
 * Genera una URL para autorizar acceso a un canal de YouTube
 */
async function getYoutubeAuthUrl(req: Request, res: Response): Promise<Response> {
  try {
    const { channelId } = req.params;
    
    // Comprobar si el canal existe
    const [channel] = await db.select().from(youtubeChannels).where(
      eq(youtubeChannels.channelId, channelId)
    );
    
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'El canal no existe'
      });
    }
    
    // Generar URL de autorización
    const { authUrl } = generateAuthUrl();
    
    // Almacenar el ID del canal en la sesión para recuperarlo después
    req.session.youtubeAuthChannel = channelId;
    
    return res.status(200).json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Error al generar URL de autorización:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar URL de autorización'
    });
  }
}

/**
 * Maneja la redirección de OAuth después de autorización
 */
async function handleOAuthCallback(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.query;
    const channelId = req.session.youtubeAuthChannel;
    
    if (!code || !channelId) {
      res.redirect('/error?message=Autorización inválida');
      return;
    }
    
    // Obtener tokens de acceso
    const tokens = await getTokensFromCode(code as string);
    
    if (!tokens.access_token) {
      res.redirect('/error?message=No se pudo obtener el token de acceso');
      return;
    }
    
    // Obtener información del canal autorizado
    const channelInfo = await getAuthorizedChannel(tokens.access_token);
    
    if (!channelInfo || !channelInfo.id) {
      res.redirect('/error?message=No se pudo obtener información del canal');
      return;
    }
    
    // Verificar que el canal autorizado es el mismo que se está intentando autorizar
    if (channelInfo.id !== channelId) {
      res.redirect(`/error?message=El canal autorizado (${channelInfo.id}) no coincide con el canal seleccionado (${channelId})`);
      return;
    }
    
    // Actualizar el canal con los tokens
    await db.update(youtubeChannels)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        isAuthorized: true,
        updatedAt: new Date()
      })
      .where(eq(youtubeChannels.channelId, channelId));
    
    // Eliminar el ID del canal de la sesión
    delete req.session.youtubeAuthChannel;
    
    // Redirigir a una página de éxito
    res.redirect('/youtube-auth-success');
  } catch (error) {
    console.error('Error en callback de OAuth:', error);
    res.redirect('/error?message=Error durante la autorización');
  }
}

/**
 * Comprueba si un canal está autorizado para usar la API
 */
async function checkChannelAuthorization(req: Request, res: Response): Promise<Response> {
  try {
    const { channelId } = req.params;
    
    if (!channelId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del canal es obligatorio'
      });
    }
    
    // Obtener el canal
    const [channel] = await db.select().from(youtubeChannels).where(
      eq(youtubeChannels.channelId, channelId)
    );
    
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'El canal no existe'
      });
    }
    
    let isAuthorized = false;
    
    // Si tiene token de acceso, verificar si sigue siendo válido
    if (channel.accessToken) {
      isAuthorized = await verifyAccessToken(channel.accessToken);
      
      // Si el token no es válido pero hay token de actualización, intentar actualizarlo
      if (!isAuthorized && channel.refreshToken) {
        try {
          const newTokens = await refreshAccessToken(channel.refreshToken);
          
          if (newTokens.access_token) {
            // Actualizar el canal con los nuevos tokens
            await db.update(youtubeChannels)
              .set({
                accessToken: newTokens.access_token,
                tokenExpiryDate: newTokens.expiry_date ? new Date(newTokens.expiry_date) : undefined,
                isAuthorized: true,
                updatedAt: new Date()
              })
              .where(eq(youtubeChannels.channelId, channelId));
            
            isAuthorized = true;
          }
        } catch (refreshError) {
          console.error('Error al actualizar token:', refreshError);
          isAuthorized = false;
        }
      }
      
      // Actualizar el estado de autorización en la base de datos si ha cambiado
      if (channel.isAuthorized !== isAuthorized) {
        await db.update(youtubeChannels)
          .set({
            isAuthorized,
            updatedAt: new Date()
          })
          .where(eq(youtubeChannels.channelId, channelId));
      }
    }
    
    return res.status(200).json({
      success: true,
      isAuthorized
    });
  } catch (error) {
    console.error('Error al comprobar autorización del canal:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al comprobar autorización del canal'
    });
  }
}

/**
 * Publica un video en YouTube
 */
async function publishVideoToYoutube(req: Request, res: Response): Promise<Response> {
  try {
    const { videoId } = req.params;
    const { channelId, title, description, tags, privacyStatus } = req.body;
    
    // Validar datos requeridos
    if (!videoId || !channelId || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'El ID del video, ID del canal, título y descripción son obligatorios'
      });
    }
    
    // Obtener el video
    const [video] = await db.select().from(videos).where(
      eq(videos.id, parseInt(videoId))
    );
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'El video no existe'
      });
    }
    
    if (!video.videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'El video no tiene archivo asociado'
      });
    }
    
    // Obtener el canal
    const [channel] = await db.select().from(youtubeChannels).where(
      eq(youtubeChannels.channelId, channelId)
    );
    
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'El canal no existe'
      });
    }
    
    // Verificar si el canal está autorizado
    if (!channel.isAuthorized || !channel.accessToken) {
      return res.status(401).json({
        success: false,
        message: 'El canal no está autorizado para publicar videos',
        needsAuthorization: true,
        channelId
      });
    }
    
    // Obtener la ruta completa al archivo de video
    const videoFilePath = path.join(process.cwd(), video.videoUrl);
    
    if (!fs.existsSync(videoFilePath)) {
      return res.status(404).json({
        success: false,
        message: 'El archivo de video no existe en el servidor'
      });
    }
    
    // Subir el video a YouTube
    const uploadedVideo = await uploadVideo(
      channel.accessToken,
      videoFilePath,
      {
        title,
        description,
        tags: tags || (video.tags ? video.tags.split(',').map(tag => tag.trim()) : []),
        privacyStatus: privacyStatus || 'unlisted'
      }
    );
    
    if (!uploadedVideo || !uploadedVideo.id) {
      return res.status(500).json({
        success: false,
        message: 'Error al subir el video a YouTube'
      });
    }
    
    // Construir la URL de YouTube
    const youtubeUrl = `https://www.youtube.com/watch?v=${uploadedVideo.id}`;
    
    // Actualizar el video con la URL de YouTube
    await db.update(videos)
      .set({
        youtubeUrl,
        status: 'completed',
        publishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(videos.id, parseInt(videoId)));
    
    return res.status(200).json({
      success: true,
      data: {
        youtubeUrl,
        videoId: uploadedVideo.id
      },
      message: 'Video publicado en YouTube correctamente'
    });
  } catch (error) {
    console.error('Error al publicar video en YouTube:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al publicar video en YouTube'
    });
  }
}

/**
 * Obtiene el canal predeterminado para un proyecto
 */
async function getDefaultProjectChannel(req: Request, res: Response): Promise<Response> {
  try {
    const { projectId } = req.params;
    
    // Obtener el canal predeterminado del proyecto
    const [channelLink] = await db.select().from(projectYoutubeChannels).where(
      and(
        eq(projectYoutubeChannels.projectId, parseInt(projectId)),
        eq(projectYoutubeChannels.isDefault, true)
      )
    );
    
    if (!channelLink) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'El proyecto no tiene un canal predeterminado'
      });
    }
    
    // Obtener los detalles del canal
    const [channel] = await db.select().from(youtubeChannels).where(
      eq(youtubeChannels.channelId, channelLink.channelId)
    );
    
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'El canal predeterminado no existe'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        ...channel,
        isDefault: true,
        linkId: channelLink.id
      }
    });
  } catch (error) {
    console.error('Error al obtener canal predeterminado:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener canal predeterminado'
    });
  }
}

/**
 * Configura las rutas para el controlador de YouTube
 */
export function setupYoutubeRoutes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void
) {
  // Rutas públicas
  app.get('/api/youtube/oauth-callback', handleOAuthCallback);
  
  // Rutas protegidas
  app.get('/api/youtube/channels', requireAuth, getYoutubeChannels);
  app.post('/api/youtube/channels', requireAuth, createYoutubeChannel);
  app.get('/api/youtube/project/:projectId/channels', requireAuth, getProjectChannels);
  app.get('/api/youtube/project/:projectId/default-channel', requireAuth, getDefaultProjectChannel);
  app.post('/api/youtube/project-channel', requireAuth, linkChannelToProject);
  app.delete('/api/youtube/project/:projectId/channel/:channelId', requireAuth, unlinkChannelFromProject);
  app.get('/api/youtube/channel/:channelId/auth-url', requireAuth, getYoutubeAuthUrl);
  app.get('/api/youtube/channel/:channelId/check-auth', requireAuth, checkChannelAuthorization);
  app.post('/api/youtube/video/:videoId/publish', requireAuth, publishVideoToYoutube);
}