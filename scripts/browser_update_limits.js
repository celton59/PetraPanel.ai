/**
 * Script para actualizar límites de usuarios desde el navegador
 * 
 * INSTRUCCIONES:
 * 1. Inicia sesión en tu panel de administración de PetraPanel
 * 2. Abre la consola de desarrollador (F12 o Clic derecho > Inspeccionar > Consola)
 * 3. Copia y pega todo este código en la consola
 * 4. Presiona Enter para ejecutar
 * 
 * IMPORTANTE: Este script debe ejecutarse estando ya autenticado como administrador
 */

// Configuración - Ajusta estos valores según tus necesidades
const SETTINGS = {
  // Límites a establecer
  maxAssignedVideos: 50,  // Vídeos concurrentes
  maxMonthlyVideos: 100,  // Vídeos mensuales
  
  // Modo de operación: 'all' para todos los usuarios, 'list' para una lista específica
  mode: 'all',
  
  // Lista de IDs de usuario (solo se usa si mode='list')
  userIds: [1, 2, 3],
  
  // URL base de la API (no cambiar a menos que sea necesario)
  apiBaseUrl: window.location.origin + '/api',
  
  // Tiempo de espera entre peticiones (ms) para no sobrecargar el servidor
  requestDelay: 500,
  
  // Número máximo de intentos por usuario en caso de error
  maxRetries: 3
};

// Función para obtener el token CSRF
async function getCsrfToken() {
  try {
    const response = await fetch(`${SETTINGS.apiBaseUrl}/csrf-token`);
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error('❌ Error al obtener token CSRF:', error);
    throw new Error('No se pudo obtener el token CSRF. ¿Estás conectado?');
  }
}

// Función para obtener la lista de todos los usuarios
async function getAllUsers(csrfToken) {
  try {
    const response = await fetch(`${SETTINGS.apiBaseUrl}/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener usuarios (${response.status}): ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('❌ Error al obtener lista de usuarios:', error);
    throw error;
  }
}

// Función para actualizar los límites de un usuario
async function updateUserLimits(userId, csrfToken) {
  try {
    // Intentar los tres endpoints posibles
    const endpoints = [
      `${SETTINGS.apiBaseUrl}/users/${userId}/limits`,
      `${SETTINGS.apiBaseUrl}/admin/users/${userId}/limits`,
      `${SETTINGS.apiBaseUrl}/compat/update-limits`
    ];
    
    let success = false;
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        // Preparar datos según el endpoint
        const isCompat = endpoint.includes('compat');
        const payload = isCompat 
          ? { userId, ...SETTINGS } 
          : SETTINGS;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          success = true;
          return await response.json();
        }
      } catch (e) {
        lastError = e;
        // Continuar con el siguiente endpoint
      }
    }
    
    if (!success) {
      throw lastError || new Error(`No se pudo actualizar el usuario ${userId} con ningún endpoint`);
    }
  } catch (error) {
    console.error(`❌ Error al actualizar usuario ${userId}:`, error);
    throw error;
  }
}

// Función principal para actualizar todos los usuarios
async function updateAllUsersLimits() {
  console.log('🔄 Iniciando actualización de límites de usuarios...');
  console.log(`📊 Configuración: ${SETTINGS.maxAssignedVideos} vídeos concurrentes, ${SETTINGS.maxMonthlyVideos} vídeos mensuales`);
  
  try {
    // Obtener token CSRF
    console.log('🔑 Obteniendo token CSRF...');
    const csrfToken = await getCsrfToken();
    console.log('✅ Token CSRF obtenido');
    
    let usersToUpdate = [];
    
    // Determinar qué usuarios actualizar según el modo
    if (SETTINGS.mode === 'all') {
      console.log('👥 Obteniendo lista de todos los usuarios...');
      const allUsers = await getAllUsers(csrfToken);
      usersToUpdate = allUsers;
      console.log(`✅ Se encontraron ${allUsers.length} usuarios`);
    } else if (SETTINGS.mode === 'list') {
      usersToUpdate = SETTINGS.userIds.map(id => ({ id }));
      console.log(`👥 Utilizando lista predefinida de ${usersToUpdate.length} usuarios`);
    }
    
    // Actualizar cada usuario con retraso entre peticiones
    console.log('🔄 Comenzando a actualizar usuarios...');
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < usersToUpdate.length; i++) {
      const user = usersToUpdate[i];
      console.log(`[${i+1}/${usersToUpdate.length}] Actualizando usuario ${user.username || user.id}...`);
      
      let success = false;
      let attempts = 0;
      
      while (!success && attempts < SETTINGS.maxRetries) {
        attempts++;
        try {
          await updateUserLimits(user.id, csrfToken);
          success = true;
          successCount++;
          console.log(`✅ Usuario ${user.username || user.id} actualizado correctamente`);
        } catch (error) {
          if (attempts < SETTINGS.maxRetries) {
            console.log(`⚠️ Intento ${attempts}/${SETTINGS.maxRetries} fallido, reintentando...`);
            // Esperar antes de reintentar
            await new Promise(resolve => setTimeout(resolve, SETTINGS.requestDelay));
          } else {
            console.error(`❌ No se pudo actualizar el usuario ${user.username || user.id} después de ${SETTINGS.maxRetries} intentos`);
            errorCount++;
          }
        }
      }
      
      // Esperar antes de la siguiente petición
      if (i < usersToUpdate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, SETTINGS.requestDelay));
      }
    }
    
    // Mostrar resumen final
    console.log('\n📋 RESUMEN DE LA ACTUALIZACIÓN:');
    console.log(`✅ Usuarios actualizados exitosamente: ${successCount}`);
    console.log(`❌ Usuarios con errores: ${errorCount}`);
    console.log(`📊 Total de usuarios procesados: ${usersToUpdate.length}`);
    
    if (successCount === usersToUpdate.length) {
      console.log('🎉 Actualización completada con éxito para todos los usuarios');
    } else if (successCount > 0) {
      console.log('⚠️ Actualización parcialmente completada, algunos usuarios no pudieron ser actualizados');
    } else {
      console.log('❌ No se pudo actualizar ningún usuario');
    }
    
  } catch (error) {
    console.error('❌ Error general durante la actualización:', error);
  }
}

// Ejecutar el script
updateAllUsersLimits();