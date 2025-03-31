import { google, youtube_v3 } from 'googleapis';
import * as fs from 'fs-extra';
import * as path from 'path';

// Configuración OAuth para YouTube API
const YOUTUBE_OAUTH_CONFIG = {
  clientId: process.env.YOUTUBE_CLIENT_ID,
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  redirectUrl: 'https://aa787a20-7419-4e5c-97d6-f6f4527efda1-00-2avvuq1cco2qv.spock.replit.dev/api/youtube/oauth-callback'
};

// Registrar la configuración de OAuth para depuración
console.log('=== Configuración OAuth de YouTube ===');
console.log('REDIRECT_URI:', YOUTUBE_OAUTH_CONFIG.redirectUrl);
console.log('CLIENT_ID presente:', YOUTUBE_OAUTH_CONFIG.clientId ? 'Sí' : 'No');
console.log('CLIENT_SECRET presente:', YOUTUBE_OAUTH_CONFIG.clientSecret ? 'Sí' : 'No');
console.log('====================================');

/**
 * Crea una nueva instancia del cliente OAuth2 para la API de YouTube
 */
export function createOAuthClient() {
  return new google.auth.OAuth2(
    YOUTUBE_OAUTH_CONFIG.clientId,
    YOUTUBE_OAUTH_CONFIG.clientSecret,
    YOUTUBE_OAUTH_CONFIG.redirectUrl
  );
}

/**
 * Genera una URL para autorizar acceso a un canal de YouTube
 * @returns URL de autorización y objeto OAuth2Client
 */
export function generateAuthUrl() {
  const oauth2Client = createOAuthClient();
  
  const scopes = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly'
  ];
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    include_granted_scopes: true
  });
  
  return { authUrl, oauth2Client };
}

/**
 * Intercambia el código de autorización por tokens de acceso
 * @param code Código recibido del flujo de autorización
 * @returns Tokens de acceso
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Crea un cliente autenticado para la API de YouTube usando tokens
 * @param accessToken Token de acceso
 * @param refreshToken Token de actualización
 * @returns Cliente autenticado para la API de YouTube
 */
export function createYoutubeClient(accessToken: string, refreshToken?: string) {
  const oauth2Client = createOAuthClient();
  
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  
  return google.youtube({
    version: 'v3',
    auth: oauth2Client
  });
}

/**
 * Comprueba si un token de acceso es válido
 * @param accessToken Token de acceso a verificar
 * @returns true si el token es válido, false en caso contrario
 */
export async function verifyAccessToken(accessToken: string): Promise<boolean> {
  try {
    const youtube = createYoutubeClient(accessToken);
    // Intenta obtener información del canal para verificar si el token es válido
    await youtube.channels.list({
      part: ['snippet'],
      mine: true
    });
    return true;
  } catch (error) {
    console.error('Error verificando token de acceso:', error);
    return false;
  }
}

/**
 * Actualiza un token de acceso usando el token de actualización
 * @param refreshToken Token de actualización
 * @returns Nuevos tokens
 */
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });
  
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('Error actualizando token de acceso:', error);
    throw error;
  }
}

/**
 * Obtiene información del canal autorizado
 * @param accessToken Token de acceso
 * @returns Información del canal
 */
export async function getAuthorizedChannel(accessToken: string): Promise<youtube_v3.Schema$Channel | null> {
  try {
    const youtube = createYoutubeClient(accessToken);
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }
    
    return response.data.items[0];
  } catch (error) {
    console.error('Error obteniendo información del canal:', error);
    throw error;
  }
}

/**
 * Obtiene información de un canal específico usando su ID
 * @param channelId ID del canal de YouTube
 * @returns Información del canal
 */
export async function getChannelById(channelId: string): Promise<youtube_v3.Schema$Channel | null> {
  try {
    // Usar una clave de API para acceder a información pública del canal sin autenticación
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
    
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      id: [channelId]
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }
    
    return response.data.items[0];
  } catch (error) {
    console.error('Error obteniendo información del canal por ID:', error);
    throw error;
  }
}

/**
 * Sube un video a YouTube
 * @param accessToken Token de acceso
 * @param videoPath Ruta al archivo de video
 * @param metadata Metadatos del video (título, descripción, etc.)
 * @returns Información del video subido
 */
export async function uploadVideo(
  accessToken: string,
  videoPath: string,
  metadata: {
    title: string;
    description: string;
    tags?: string[];
    categoryId?: string;
    privacyStatus?: 'private' | 'public' | 'unlisted';
  }
): Promise<youtube_v3.Schema$Video> {
  try {
    const youtube = createYoutubeClient(accessToken);
    
    if (!fs.existsSync(videoPath)) {
      throw new Error(`El archivo de video no existe en la ruta: ${videoPath}`);
    }
    
    const fileSize = fs.statSync(videoPath).size;
    const fileStream = fs.createReadStream(videoPath);
    
    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          categoryId: metadata.categoryId || '22'  // 22 es "People & Blogs" por defecto
        },
        status: {
          privacyStatus: metadata.privacyStatus || 'unlisted',
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fileStream
      }
    }, {
      // Para manejar archivos grandes
      onUploadProgress: evt => {
        const progress = (evt.bytesRead / fileSize) * 100;
        console.log(`Upload progress: ${Math.round(progress)}%`);
      }
    });
    
    if (!response.data) {
      throw new Error('No se recibió respuesta al subir el video');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error al subir video a YouTube:', error);
    throw error;
  }
}