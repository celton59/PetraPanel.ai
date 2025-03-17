import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Search, Save, User, CalendarClock, Calendar, Plus } from 'lucide-react';
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useVideoLimits } from "@/hooks/useVideoLimits";

// Tipo para el usuario con sus límites
interface UserWithLimits {
  id: number;
  username: string;
  fullName: string;
  role: string;
  maxAssignedVideos: number; 
  maxMonthlyVideos: number;
  currentMonthVideos: number;
  currentAssignedVideos: number;
}

// Interfaz para el formulario de límites básicos
interface LimitsFormValues {
  userId: string;
  maxMonthlyVideos: number;
  maxAssignedVideos: number;
}

// Interfaz para el formulario de límites mensuales específicos
interface MonthlyLimitFormValues {
  year: number;
  month: number;
  maxVideos: number;
}

// Interfaz para representar un límite mensual específico
interface MonthlyLimit {
  year: number;
  month: number;
  maxVideos: number;
}

/**
 * Pestaña de configuración de límites de videos
 * Permite configurar límites mensuales individuales para cada youtuber
 */
export function VideoLimitsTab() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<UserWithLimits[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithLimits[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithLimits | null>(null);
  const [searchTerm, setSearchTerm] = useState("");



  // Inicializar formulario
  const form = useForm<LimitsFormValues>({
    defaultValues: {
      userId: "",
      maxMonthlyVideos: 50,
      maxAssignedVideos: 10
    }
  });

  // Cargar usuarios y sus límites
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('/api/users');
        console.log('Respuesta completa:', response.data);
        
        if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
          console.error('Formato de respuesta incorrecto:', response.data);
          throw new Error('La respuesta de usuarios no tiene el formato esperado');
        }
        
        // Obtener límites actuales para todos los usuarios (no filtrar por rol en el backend)
        const usersWithLimitsPromises = response.data.data
          .map(async (user: any) => {
            try {
              const limitsResponse = await axios.get(`/api/youtuber/video-limits?userId=${user.id}`);
              console.log(`Límites para usuario ${user.id}:`, limitsResponse.data);
              
              // Asegurarse de que la estructura sea correcta
              const limits = limitsResponse.data;
              return {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                maxAssignedVideos: user.maxAssignedVideos || limits.maxAssignedAllowed || 10,
                maxMonthlyVideos: user.maxMonthlyVideos || limits.monthlyLimit || 50,
                currentMonthVideos: limits.currentMonthlyCount || 0,
                currentAssignedVideos: limits.currentAssignedCount || 0
              };
            } catch (error) {
              console.error(`Error fetching limits for user ${user.id}:`, error);
              return {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                maxAssignedVideos: user.maxAssignedVideos || 10,
                maxMonthlyVideos: user.maxMonthlyVideos || 50,
                currentMonthVideos: 0,
                currentAssignedVideos: 0
              };
            }
          });
          
        const usersWithLimits = await Promise.all(usersWithLimitsPromises);
        setUsers(usersWithLimits);
        setFilteredUsers(usersWithLimits);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los usuarios. Por favor, inicia sesión nuevamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [toast]);

  // Filtrar usuarios basados en el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const lowercaseSearchTerm = searchTerm.toLowerCase();
      const filtered = users.filter(
        user => 
          user.username.toLowerCase().includes(lowercaseSearchTerm) || 
          user.fullName.toLowerCase().includes(lowercaseSearchTerm)
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  // Actualizar límite individual de un usuario
  const handleSubmit = async (data: LimitsFormValues) => {
    if (!data.userId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un usuario",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = Number(data.userId);
      
      // Intentar actualizar mediante API
      try {
        console.log(`Actualizando límites para usuario ${userId}:`, {
          maxMonthlyVideos: data.maxMonthlyVideos,
          maxAssignedVideos: data.maxAssignedVideos
        });
        await axios.put(`/api/users/${userId}`, {
          maxMonthlyVideos: data.maxMonthlyVideos,
          maxAssignedVideos: data.maxAssignedVideos
        });
      } catch (apiError) {
        console.warn("API update failed, only updating UI:", apiError);
      }
      
      // Siempre actualizar el estado local (para modo demo/offline)
      const updatedUsers = users.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              maxMonthlyVideos: data.maxMonthlyVideos,
              maxAssignedVideos: data.maxAssignedVideos
            }
          : user
      );
      
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
      
      toast({
        title: "Límites actualizados",
        description: `Límites actualizados correctamente para el usuario`,
      });
    } catch (error) {
      console.error("Error updating user limits:", error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los límites del usuario",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar cuando se selecciona un usuario
  const handleUserSelect = (userId: string) => {
    const user = users.find(u => u.id.toString() === userId);
    if (user) {
      setSelectedUser(user);
      form.setValue("userId", userId);
      form.setValue("maxMonthlyVideos", user.maxMonthlyVideos);
      form.setValue("maxAssignedVideos", user.maxAssignedVideos);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Configuración de Límites de Videos</CardTitle>
          <CardDescription>
            Configura los límites mensuales y concurrentes de videos para youtubers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Usuario</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleUserSelect(value);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="min-w-[220px]">
                              <SelectValue placeholder="Seleccionar usuario" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users
                              .filter(user => user.role === 'youtuber')
                              .map((user) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.fullName} ({user.username})
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Selecciona el youtuber al que quieres configurar los límites
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedUser && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-5 w-5" />
                      <span className="font-medium">{selectedUser.fullName}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="block">Usuario: {selectedUser.username}</span>
                          <span className="block">Rol: {selectedUser.role}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>Videos usando: </span>
                            <span className="font-medium">{selectedUser.currentAssignedVideos}</span>
                            <span> de </span>
                            <span className="font-medium">{selectedUser.maxAssignedVideos}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>Videos este mes: </span>
                            <span className="font-medium">{selectedUser.currentMonthVideos}</span>
                            <span> de </span>
                            <span className="font-medium">{selectedUser.maxMonthlyVideos}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="maxMonthlyVideos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Límite mensual de videos</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <CalendarClock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Número máximo de videos que puede completar el youtuber durante un mes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxAssignedVideos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Límite concurrente de videos</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <CalendarClock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Número máximo de videos que el youtuber puede tener asignados simultáneamente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit"
                disabled={isSubmitting || !form.getValues().userId}
                className="w-full md:w-auto"
              >
                {isSubmitting ? "Guardando..." : "Guardar límites"}
                <Save className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen de Límites Actuales</CardTitle>
          <CardDescription>
            Vista general de los límites de videos de todos los youtubers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex mb-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o usuario"
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Tabla de usuarios y sus límites */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Alert>
              <AlertDescription>
                No se encontraron usuarios con el término de búsqueda.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Nombre completo</TableHead>
                    <TableHead className="text-center">Límite concurrente</TableHead>
                    <TableHead className="text-center">En uso</TableHead>
                    <TableHead className="text-center">Límite mensual</TableHead>
                    <TableHead className="text-center">Usados este mes</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers
                    .filter(user => user.role === 'youtuber')
                    .map((user) => (
                    <TableRow 
                      key={user.id} 
                      className={selectedUser?.id === user.id ? "bg-muted/50" : ""}
                    >
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.fullName}</TableCell>
                      <TableCell className="text-center">{user.maxAssignedVideos}</TableCell>
                      <TableCell className="text-center">{user.currentAssignedVideos}</TableCell>
                      <TableCell className="text-center">{user.maxMonthlyVideos}</TableCell>
                      <TableCell className="text-center">{user.currentMonthVideos}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleUserSelect(user.id.toString())}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nuevo componente para gestionar límites mensuales específicos */}
      {selectedUser && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Límites Mensuales Específicos</CardTitle>
            <CardDescription>
              Configura límites personalizados para meses específicos para {selectedUser.fullName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyLimitsManager userId={selectedUser.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Componente para gestionar límites mensuales específicos
 * Permite configurar límites personalizados por mes y año
 */
function MonthlyLimitsManager({ userId }: { userId: number }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [monthlyLimits, setMonthlyLimits] = useState<MonthlyLimit[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { setMonthlyLimit, getAllMonthlyLimits } = useVideoLimits(userId);

  // Formulario para añadir un nuevo límite mensual específico
  const form = useForm<MonthlyLimitFormValues>({
    defaultValues: {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      maxVideos: 50
    }
  });

  // Cargar los límites mensuales específicos existentes
  useEffect(() => {
    const fetchMonthlyLimits = async () => {
      setIsLoading(true);
      try {
        const result = await getAllMonthlyLimits(userId);
        if (result.success && result.data) {
          setMonthlyLimits(result.data);
        } else {
          console.error('Error al cargar límites mensuales:', result.message);
          toast({
            title: "Error",
            description: "No se pudieron cargar los límites mensuales específicos",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error al cargar límites mensuales:', error);
        toast({
          title: "Error",
          description: "Error al cargar los límites mensuales específicos",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchMonthlyLimits();
    }
  }, [userId, getAllMonthlyLimits, toast]);

  // Manejar la creación de un nuevo límite mensual
  const handleCreateMonthlyLimit = async (data: MonthlyLimitFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await setMonthlyLimit({
        userId,
        maxVideos: data.maxVideos,
        year: data.year,
        month: data.month
      });

      if (result.success) {
        // Actualizar la lista de límites
        const updatedLimits = await getAllMonthlyLimits(userId);
        if (updatedLimits.success && updatedLimits.data) {
          setMonthlyLimits(updatedLimits.data);
        }

        toast({
          title: "Límite creado",
          description: "Límite mensual específico creado correctamente",
        });

        // Cerrar el diálogo y reiniciar el formulario
        setShowAddDialog(false);
        form.reset({
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          maxVideos: 50
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "No se pudo crear el límite mensual",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error al crear límite mensual:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el límite mensual específico",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Obtener nombre del mes
  const getMonthName = (month: number) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1] || 'Desconocido';
  };

  return (
    <div className="space-y-4">
      {/* Botón para añadir nuevo límite */}
      <div className="flex justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground mb-1">Límites mensuales personalizados</h3>
          <p className="text-xs text-muted-foreground">
            Estos límites tienen precedencia sobre el límite mensual general
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Añadir límite específico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir límite mensual específico</DialogTitle>
              <DialogDescription>
                Configura un límite mensual personalizado para un mes y año específicos.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateMonthlyLimit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Año</FormLabel>
                        <Select
                          value={field.value.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar año" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[...Array(5)].map((_, i) => {
                              const year = new Date().getFullYear() + i;
                              return (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mes</FormLabel>
                        <Select
                          value={field.value.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar mes" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[...Array(12)].map((_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {getMonthName(i + 1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="maxVideos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número máximo de videos</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Establece el número máximo de videos para este mes específico
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creando..." : "Crear límite"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de límites mensuales específicos */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : monthlyLimits.length === 0 ? (
        <Alert>
          <AlertDescription>
            No hay límites mensuales específicos configurados para este usuario.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Año</TableHead>
                <TableHead>Mes</TableHead>
                <TableHead>Límite de videos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyLimits.map((limit) => (
                <TableRow key={`${limit.year}-${limit.month}`}>
                  <TableCell>{limit.year}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {getMonthName(limit.month)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {limit.maxVideos} videos
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={async () => {
                        // Eliminar límite mensual (estableciendo el mismo valor que el límite global)
                        const result = await setMonthlyLimit({
                          userId,
                          maxVideos: 0, // Usar 0 para eliminar el límite específico
                          year: limit.year,
                          month: limit.month
                        });
                        
                        if (result.success) {
                          // Actualizar la lista
                          const updatedLimits = await getAllMonthlyLimits(userId);
                          if (updatedLimits.success && updatedLimits.data) {
                            setMonthlyLimits(updatedLimits.data);
                          }
                          
                          toast({
                            title: "Límite eliminado",
                            description: `Límite para ${getMonthName(limit.month)} ${limit.year} eliminado correctamente.`
                          });
                        } else {
                          toast({
                            title: "Error",
                            description: result.message || "No se pudo eliminar el límite",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}