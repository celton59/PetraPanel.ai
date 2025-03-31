import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, ArrowUpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Añadimos un estilo personalizado para ocultar el botón de cierre
import "./version-info.css";

// Tipo para cada entrada de cambio
interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: 'new' | 'improved' | 'fixed' | 'removed';
    description: string;
  }[];
}

// Historial de versiones
const versionHistory: ChangelogEntry[] = [
  {
    version: '3.0.0',
    date: '31.03.2025',
    changes: [
      { 
        type: 'new', 
        description: 'Métricas de videos en tiempo real con datos reales de la base de datos'
      },
      { 
        type: 'new', 
        description: 'Widget de Sugerencias pendientes en el panel de control visible para todos los usuarios'
      },
      { 
        type: 'improved', 
        description: 'Actualización automática de métricas en el dashboard al cambiar entre páginas'
      },
      { 
        type: 'improved', 
        description: 'Refresco periódico de datos cada 60 segundos sin necesidad de interacción del usuario'
      },
      { 
        type: 'improved', 
        description: 'Notificaciones más prominentes sobre enlaces de afiliados en la descripción de videos'
      },
      { 
        type: 'fixed', 
        description: 'Solucionado problema con calendario de límites personalizados que realizaba peticiones infinitas'
      }
    ]
  },
  {
    version: '2.9.0',
    date: '26.05.2025',
    changes: [
      { 
        type: 'new', 
        description: 'Sistema de sugerencias para que los usuarios envíen feedback directamente a los administradores'
      },
      { 
        type: 'new', 
        description: 'Categorización de sugerencias para mejor organización y seguimiento'
      },
      { 
        type: 'new', 
        description: 'Panel de administración de sugerencias con control de estados (pendiente, revisión, implementado, rechazado)'
      },
      { 
        type: 'improved', 
        description: 'Acceso directo a Sugerencias desde el menú principal de navegación'
      },
      { 
        type: 'improved', 
        description: 'Notificaciones en tiempo real para actualizaciones del estado de sugerencias'
      }
    ]
  },
  {
    version: '2.8.0',
    date: '18.03.2025',
    changes: [
      { 
        type: 'new', 
        description: 'Nueva funcionalidad de selección directa de página en la paginación de videos'
      },
      { 
        type: 'improved', 
        description: 'Eliminada la limitación de 50 títulos en la carga masiva de videos'
      },
      { 
        type: 'improved', 
        description: 'Optimizada la interfaz del botón de creación masiva para mantener consistencia visual'
      },
      { 
        type: 'fixed', 
        description: 'Corregida la animación del botón de creación masiva de videos'
      }
    ]
  },
  {
    version: '2.7.0',
    date: '13.03.2025',
    changes: [
      { 
        type: 'improved', 
        description: 'Transición optimizada entre login y dashboard para una experiencia más fluida'
      },
      { 
        type: 'improved', 
        description: 'Prevención de solicitudes duplicadas durante el proceso de login'
      },
      { 
        type: 'fixed', 
        description: 'Corregido el problema de animaciones múltiples durante el inicio de sesión'
      },
      { 
        type: 'fixed', 
        description: 'Eliminadas las recargas innecesarias en campos de formulario de login'
      },
      { 
        type: 'improved', 
        description: 'Gestión de estados más eficiente durante la transición de autenticación'
      },
      { 
        type: 'improved', 
        description: 'Reducción de procesamiento en la interfaz de usuario durante el inicio de sesión'
      }
    ]
  },
  {
    version: '2.6.0',
    date: '12.03.2025',
    changes: [
      { 
        type: 'new', 
        description: 'Sistema de visualización adaptativo en modo móvil optimizado para la pestaña "Evergreen"'
      },
      { 
        type: 'new', 
        description: 'Sistema de avatares unificado con SVG predeterminado para todos los usuarios'
      },
      { 
        type: 'new', 
        description: 'Nueva información de "última conexión" y seguimiento de actividad de usuarios'
      },
      { 
        type: 'new', 
        description: 'Toasts mejorados: más compactos y menos intrusivos para una mejor experiencia de usuario'
      },
      { 
        type: 'improved', 
        description: 'Avatar predeterminado unificado en todos los indicadores de usuario para coherencia visual'
      },
      { 
        type: 'improved', 
        description: 'Formato de copia de video estandarizado con "S[número] - [título]" para todos los casos'
      },
      { 
        type: 'improved', 
        description: 'Experiencia táctil mejorada para todas las vistas de videos con controles accesibles'
      },
      { 
        type: 'improved', 
        description: 'Algoritmo de subida multiparte optimizado para transferencias hasta un 30% más rápidas'
      },
      { 
        type: 'improved', 
        description: 'Procesamiento paralelo de archivos para una subida más eficiente con WebWorkers'
      },
      { 
        type: 'fixed', 
        description: 'Corrección de la sincronización de estados de usuario en conexiones simultáneas'
      },
      { 
        type: 'fixed', 
        description: 'Corrección del bug del ícono de carga persistente al cerrar el diálogo de detalles de video'
      },
      { 
        type: 'fixed', 
        description: 'Solucionado problema con la columna "última conexión" en la base de datos'
      },
      { 
        type: 'improved', 
        description: 'Manejo optimizado de estados en diálogos y modales para prevenir estados inconsistentes'
      }
    ]
  },
  {
    version: '2.5.5',
    date: '07.03.2025',
    changes: [
      { 
        type: 'new', 
        description: 'Funcionalidad de creación masiva de videos con interfaz de pestañas'
      },
      { 
        type: 'new', 
        description: 'Soporte para importar metadatos de video desde archivos CSV'
      },
      { 
        type: 'improved', 
        description: 'Permisos extendidos para usuarios no administradores en la creación masiva'
      },
      { 
        type: 'improved', 
        description: 'Lógica de validación de datos mejorada para la creación de videos'
      },
      { 
        type: 'fixed', 
        description: 'Corrección del error de indicador de carga en diálogo de detalles del video'
      },
      { 
        type: 'fixed', 
        description: 'Manejo mejorado de errores en la gestión de estados de diálogos'
      }
    ]
  },
  {
    version: '2.5.0',
    date: '06.03.2025',
    changes: [
      { 
        type: 'new', 
        description: 'Sistema de versionado con historial detallado de cambios y actualizaciones'
      },
      { 
        type: 'new', 
        description: 'Vista optimizada para dispositivos móviles con interfaz de tarjetas y gestos táctiles'
      },
      { 
        type: 'new', 
        description: 'Sistema de notificaciones en tiempo real con WebSockets y persistencia'
      },
      { 
        type: 'new', 
        description: 'Indicadores de usuarios conectados en tiempo real con WebSockets'
      },
      { 
        type: 'improved', 
        description: 'Navegación por gestos desde los bordes de la pantalla con indicadores visuales'
      },
      { 
        type: 'improved', 
        description: 'Rendimiento mejorado en la carga de videos y miniaturas'
      },
      { 
        type: 'improved', 
        description: 'Experiencia táctil optimizada para dispositivos móviles'
      },
      { 
        type: 'fixed', 
        description: 'Corrección de errores en la visualización de estados de videos'
      },
      { 
        type: 'fixed', 
        description: 'Ajustes en el formato y presentación de fechas en la interfaz'
      }
    ]
  },
  {
    version: '2.4.2',
    date: '15.02.2025',
    changes: [
      { 
        type: 'improved', 
        description: 'Optimización del rendimiento general de la aplicación'
      },
      { 
        type: 'fixed', 
        description: 'Corrección de errores en la subida de archivos grandes'
      }
    ]
  },
  {
    version: '2.4.0',
    date: '01.02.2025',
    changes: [
      { 
        type: 'new', 
        description: 'Nueva funcionalidad de análisis de contenido con IA'
      },
      { 
        type: 'new', 
        description: 'Dashboard con métricas y estadísticas en tiempo real'
      },
      { 
        type: 'improved', 
        description: 'Interfaz de usuario más intuitiva y accesible'
      }
    ]
  },
  {
    version: '2.3.0',
    date: '15.01.2025',
    changes: [
      { 
        type: 'new', 
        description: 'Sistema de separación de voces mejorado con nuevo algoritmo'
      },
      { 
        type: 'improved', 
        description: 'Mayor precisión en las transcripciones automáticas'
      },
      { 
        type: 'fixed', 
        description: 'Errores en la sincronización de subtítulos'
      }
    ]
  },
  {
    version: '2.2.1',
    date: '01.01.2025',
    changes: [
      { 
        type: 'improved', 
        description: 'Mejoras en el rendimiento y estabilidad del sistema'
      },
      { 
        type: 'fixed', 
        description: 'Corrección de errores menores en la interfaz'
      }
    ]
  }
];

// Componente para mostrar la versión actual y un diálogo con el historial completo
export function VersionInfo() {
  const currentVersion = versionHistory[0];
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground h-auto py-1"
            onClick={() => setOpen(true)}
            data-version-info="true"
          >
            <span className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              PetraPanel v{currentVersion.version} • Actualizado: {currentVersion.date}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ver historial de versiones</p>
        </TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] version-dialog">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Historial de versiones</span>
              <span className="text-xs text-muted-foreground">PetraPanel</span>
            </DialogTitle>
            <DialogDescription>
              Registro de cambios y mejoras implementadas en la plataforma
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="mt-4 max-h-[400px] pr-4">
            <div className="space-y-8">
              {versionHistory.map((entry, index) => (
                <div key={entry.version} className="relative pl-6">
                  {/* Línea vertical de conexión */}
                  {index < versionHistory.length - 1 && (
                    <div className="absolute left-[0.6rem] top-6 w-0.5 h-[calc(100%+2rem)] -ml-px bg-border" />
                  )}
                  
                  {/* Indicador de versión */}
                  <div className="absolute left-0 top-1 rounded-full border border-primary/40 bg-background p-1">
                    <ArrowUpCircle className="h-3 w-3 text-primary" />
                  </div>
                  
                  {/* Encabezado de versión */}
                  <div className="flex items-center space-x-3">
                    <h4 className="text-sm font-medium">Versión {entry.version}</h4>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                  
                  {/* Lista de cambios */}
                  <ul className="mt-2 space-y-2">
                    {entry.changes.map((change, changeIndex) => (
                      <li key={changeIndex} className="flex items-start">
                        <Badge 
                          variant={
                            change.type === 'new' ? 'default' : 
                            change.type === 'improved' ? 'secondary' :
                            change.type === 'fixed' ? 'outline' : 'destructive'
                          }
                          className="mr-2 capitalize text-xs"
                        >
                          {change.type}
                        </Badge>
                        <span className="text-sm">{change.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}