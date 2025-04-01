import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SendNotificationDialog } from './SendNotificationDialog';
import { 
  BellRing, 
  Bell, 
  Check, 
  X, 
  Trash2, 
  RotateCw, 
  User,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AdminLayout } from "@/components/layout/AdminLayout";

interface NotificationItem {
  id: number;
  userId: number;
  username?: string;
  fullName?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  read: boolean;
  archived: boolean;
  actionUrl?: string;
  actionLabel?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  createdAt: Date;
  createdBy?: {
    id: number;
    username: string;
    fullName?: string;
  };
}

export default function NotificationsAdminPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Esta función obtendría las notificaciones de la API
  // Por ahora usaremos datos de ejemplo
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // En una implementación real, este sería un fetch a la API
      // Por ahora usamos datos de ejemplo

      // Simulamos una llamada a la API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockNotifications: NotificationItem[] = [
        {
          id: 1,
          userId: 2,
          username: 'hola',
          fullName: 'Usuario Demo',
          title: 'Nuevo video asignado',
          message: 'Se te ha asignado un nuevo video para optimizar: "Introducción a la IA"',
          type: 'info',
          read: true,
          archived: false,
          actionUrl: '/videos/1',
          actionLabel: 'Ver video',
          relatedEntityType: 'video',
          relatedEntityId: 1,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 días atrás
          createdBy: {
            id: 1,
            username: 'admin',
            fullName: 'Administrador'
          }
        },
        {
          id: 2,
          userId: 2,
          username: 'hola',
          fullName: 'Usuario Demo',
          title: 'Actualización de sistema',
          message: 'Se ha lanzado una nueva actualización del sistema con mejoras en la interfaz',
          type: 'system',
          read: false,
          archived: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 horas atrás
        },
        {
          id: 3,
          userId: 3,
          username: 'aitor',
          fullName: 'Aitor Demo',
          title: 'Optimización completada',
          message: 'Tu video "Tutoriales avanzados" ha sido optimizado exitosamente',
          type: 'success',
          read: true,
          archived: true,
          actionUrl: '/videos/2',
          actionLabel: 'Ver optimización',
          relatedEntityType: 'video',
          relatedEntityId: 2,
          createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutos atrás
          createdBy: {
            id: 2,
            username: 'hola',
            fullName: 'Usuario Demo'
          }
        },
        {
          id: 4,
          userId: 1,
          username: 'admin',
          fullName: 'Administrador',
          title: 'Error en la subida',
          message: 'Ha ocurrido un error al procesar tu último video. Por favor, verifica el formato.',
          type: 'error',
          read: false,
          archived: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 10), // 10 minutos atrás
        },
      ];
      
      setNotifications(mockNotifications);
      setError(null);
    } catch (err) {
      console.error('Error al obtener notificaciones:', err);
      setError('Error al cargar las notificaciones. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getTypeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'info':
        return <Bell className="h-4 w-4 text-blue-500" />;
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <X className="h-4 w-4 text-red-500" />;
      case 'system':
        return <BellRing className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: NotificationItem['type']) => {
    switch (type) {
      case 'info':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Información</Badge>;
      case 'success':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Éxito</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">Advertencia</Badge>;
      case 'error':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Error</Badge>;
      case 'system':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Sistema</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      // En un caso real, aquí haríamos un fetch DELETE a /api/admin/notifications/{id}
      // Por ahora solo actualizamos el estado local
      setNotifications(prev => prev.filter(notification => notification.id !== id));
      toast({
        title: "Notificación eliminada",
        description: "La notificación ha sido eliminada correctamente",
      });
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la notificación",
        variant: "destructive"
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Notificaciones</h1>
            <p className="text-muted-foreground">
              Administra y envía notificaciones a los usuarios de la plataforma
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchNotifications}
              className="gap-1"
              disabled={loading}
            >
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <SendNotificationDialog />
          </div>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unread">No leídas</TabsTrigger>
            <TabsTrigger value="archived">Archivadas</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Todas las notificaciones</CardTitle>
                <CardDescription>
                  Lista completa de notificaciones enviadas a los usuarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {error && (
                      <div className="p-4 text-red-600 bg-red-50 rounded-md">
                        {error}
                      </div>
                    )}
                    
                    {loading ? (
                      <div className="flex justify-center p-4">
                        <RotateCw className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center p-4 text-muted-foreground">
                        No hay notificaciones disponibles
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div 
                          key={notification.id} 
                          className={`p-4 rounded-lg border ${notification.read ? '' : 'bg-muted/30'}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="mt-1">
                              {getTypeIcon(notification.type)}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between items-start">
                                <h4 className="text-base font-semibold">{notification.title}</h4>
                                <div className="flex items-center gap-2">
                                  {getTypeBadge(notification.type)}
                                  <button 
                                    onClick={() => deleteNotification(notification.id)}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{notification.message}</p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{notification.fullName || notification.username}</span>
                                </div>
                                <div>
                                  {formatDate(notification.createdAt, true)}
                                </div>
                                {notification.read ? (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    Leída
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                    No leída
                                  </Badge>
                                )}
                                {notification.archived && (
                                  <Badge variant="outline" className="text-xs">
                                    Archivada
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="unread" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Notificaciones no leídas</CardTitle>
                <CardDescription>
                  Notificaciones que aún no han sido marcadas como leídas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {notifications
                      .filter(notification => !notification.read)
                      .map(notification => (
                        <div 
                          key={notification.id} 
                          className="p-4 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-start gap-4">
                            <div className="mt-1">
                              {getTypeIcon(notification.type)}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between items-start">
                                <h4 className="text-base font-semibold">{notification.title}</h4>
                                <div className="flex items-center gap-2">
                                  {getTypeBadge(notification.type)}
                                  <button 
                                    onClick={() => deleteNotification(notification.id)}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{notification.message}</p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{notification.fullName || notification.username}</span>
                                </div>
                                <div>
                                  {formatDate(notification.createdAt, true)}
                                </div>
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                  No leída
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                    ))}
                    {notifications.filter(notification => !notification.read).length === 0 && (
                      <div className="text-center p-4 text-muted-foreground">
                        No hay notificaciones sin leer
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="archived" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Notificaciones archivadas</CardTitle>
                <CardDescription>
                  Notificaciones que han sido archivadas por los usuarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {notifications
                      .filter(notification => notification.archived)
                      .map(notification => (
                        <div 
                          key={notification.id} 
                          className="p-4 rounded-lg border"
                        >
                          <div className="flex items-start gap-4">
                            <div className="mt-1">
                              {getTypeIcon(notification.type)}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between items-start">
                                <h4 className="text-base font-semibold">{notification.title}</h4>
                                <div className="flex items-center gap-2">
                                  {getTypeBadge(notification.type)}
                                  <button 
                                    onClick={() => deleteNotification(notification.id)}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{notification.message}</p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{notification.fullName || notification.username}</span>
                                </div>
                                <div>
                                  {formatDate(notification.createdAt, true)}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  Archivada
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                    ))}
                    {notifications.filter(notification => notification.archived).length === 0 && (
                      <div className="text-center p-4 text-muted-foreground">
                        No hay notificaciones archivadas
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="system" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Notificaciones del sistema</CardTitle>
                <CardDescription>
                  Notificaciones importantes generadas por el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {notifications
                      .filter(notification => notification.type === 'system')
                      .map(notification => (
                        <div 
                          key={notification.id} 
                          className={`p-4 rounded-lg border ${notification.read ? '' : 'bg-muted/30'}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="mt-1">
                              <BellRing className="h-4 w-4 text-purple-500" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between items-start">
                                <h4 className="text-base font-semibold">{notification.title}</h4>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">Sistema</Badge>
                                  <button 
                                    onClick={() => deleteNotification(notification.id)}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{notification.message}</p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                                <div>
                                  {formatDate(notification.createdAt, true)}
                                </div>
                                {notification.read ? (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    Leída
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                    No leída
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                    ))}
                    {notifications.filter(notification => notification.type === 'system').length === 0 && (
                      <div className="text-center p-4 text-muted-foreground">
                        No hay notificaciones del sistema
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}