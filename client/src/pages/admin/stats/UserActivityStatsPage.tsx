import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useUserActivityStats } from '@/hooks/useUserActivityStats';
import { format, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  BarChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  ClipboardList, 
  Clock, 
  Filter, 
  PieChart as PieChartIcon, 
  Search, 
  Table as TableIcon, 
  User, 
  Users 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

// Array de colores para gráficos
const CHART_COLORS = [
  '#2563eb', '#0891b2', '#7c3aed', '#db2777', '#ea580c', 
  '#65a30d', '#0d9488', '#475569', '#9333ea', '#f97316'
];

// Función para formatear fechas en español
const formatDate = (dateString: string) => {
  try {
    if (!dateString) return '';
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

// Formatea una fecha para mostrar solo el día
const formatDateShort = (dateString: string) => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, "d 'de' MMM", { locale: es });
  } catch (error) {
    return dateString;
  }
};

// Obtener nombre amigable para el tipo de acción
const getActionName = (actionType: string) => {
  const actionMap: Record<string, string> = {
    'video_creation': 'Creación de video',
    'video_update': 'Actualización de video',
    'video_delete': 'Eliminación de video',
    'project_creation': 'Creación de proyecto',
    'project_update': 'Actualización de proyecto',
    'project_delete': 'Eliminación de proyecto',
    'login': 'Inicio de sesión',
    'logout': 'Cierre de sesión',
    'user_creation': 'Creación de usuario',
    'user_update': 'Actualización de usuario',
    'status_change': 'Cambio de estado',
    'upload_media': 'Subida de medios',
    'content_review': 'Revisión de contenido',
    'media_review': 'Revisión de medios',
    'content_optimization': 'Optimización de contenido',
    'asset_generation': 'Generación de recursos',
    'comment_creation': 'Creación de comentario',
    'video_publish': 'Publicación de video',
  };
  
  return actionMap[actionType] || actionType;
};

// Obtener un icono para representar un tipo de acción
const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'video_creation':
    case 'video_update':
    case 'video_delete':
    case 'video_publish':
      return 'bg-blue-100 text-blue-700';
    case 'project_creation':
    case 'project_update':
    case 'project_delete':
      return 'bg-purple-100 text-purple-700';
    case 'login':
    case 'logout':
    case 'user_creation':
    case 'user_update':
      return 'bg-green-100 text-green-700';
    case 'status_change':
      return 'bg-yellow-100 text-yellow-700';
    case 'upload_media':
    case 'media_review':
      return 'bg-orange-100 text-orange-700';
    case 'content_review':
    case 'content_optimization':
      return 'bg-teal-100 text-teal-700';
    case 'asset_generation':
      return 'bg-indigo-100 text-indigo-700';
    case 'comment_creation':
      return 'bg-pink-100 text-pink-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

// Formatear duración en segundos a formato legible (HH:MM:SS)
const formatDuration = (seconds: number | null) => {
  if (seconds === null) return "En curso";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${remainingSeconds}s`);
  
  return parts.join(' ');
};

interface FilterSectionProps {
  users: any[];
  actionTypes: any[];
  currentFilters: any;
  updateFilters: (filters: any) => void;
}

// Componente para los filtros
const FilterSection: React.FC<FilterSectionProps> = ({ 
  users, 
  actionTypes, 
  currentFilters, 
  updateFilters 
}) => {
  const [startDate, setStartDate] = useState<Date | undefined>(
    currentFilters.startDate ? parseISO(currentFilters.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    currentFilters.endDate ? parseISO(currentFilters.endDate) : undefined
  );
  
  const handleDateChange = (type: 'start' | 'end', date?: Date) => {
    if (type === 'start') {
      setStartDate(date);
      if (date) {
        updateFilters({ startDate: format(date, 'yyyy-MM-dd') });
      } else {
        updateFilters({ startDate: null });
      }
    } else {
      setEndDate(date);
      if (date) {
        updateFilters({ endDate: format(date, 'yyyy-MM-dd') });
      } else {
        updateFilters({ endDate: null });
      }
    }
  };
  
  const applyQuickDateFilter = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setStartDate(start);
    setEndDate(end);
    updateFilters({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Filter className="mr-2 h-5 w-5" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label htmlFor="userFilter" className="text-sm font-medium">Usuario</label>
            <Select
              value={currentFilters.userId?.toString() || "all"}
              onValueChange={(value) => updateFilters({ userId: value === "all" ? null : parseInt(value) })}
            >
              <SelectTrigger id="userFilter">
                <SelectValue placeholder="Todos los usuarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.fullName || user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="actionFilter" className="text-sm font-medium">Tipo de Acción</label>
            <Select
              value={currentFilters.actionType || "all"}
              onValueChange={(value) => updateFilters({ actionType: value === "all" ? null : value })}
            >
              <SelectTrigger id="actionFilter">
                <SelectValue placeholder="Todas las acciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {actionTypes.map(actionType => (
                  <SelectItem key={actionType.actionType} value={actionType.actionType}>
                    {getActionName(actionType.actionType)} ({actionType.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha Inicio</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "d MMM yyyy", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => handleDateChange('start', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha Fin</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "d MMM yyyy", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => handleDateChange('end', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          <Button size="sm" variant="outline" onClick={() => applyQuickDateFilter(7)}>
            Última semana
          </Button>
          <Button size="sm" variant="outline" onClick={() => applyQuickDateFilter(30)}>
            Último mes
          </Button>
          <Button size="sm" variant="outline" onClick={() => applyQuickDateFilter(90)}>
            Últimos 3 meses
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="ml-auto"
            onClick={() => {
              setStartDate(undefined);
              setEndDate(undefined);
              updateFilters({
                userId: null,
                actionType: null,
                startDate: null,
                endDate: null
              });
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente para la tabla de actividad
const ActivityTable: React.FC<{
  data: any[] | undefined;
  isLoading: boolean;
  meta: any;
  onPageChange: (page: number) => void;
}> = ({ data, isLoading, meta, onPageChange }) => {
  const currentPage = meta ? Math.floor(meta.offset / meta.limit) : 0;
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-[250px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <TableIcon className="mr-2 h-5 w-5" />
            Registros de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-muted-foreground">
            No se encontraron registros de actividad que coincidan con los filtros seleccionados.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <TableIcon className="mr-2 h-5 w-5" />
            Registros de Actividad
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            Mostrando {meta.offset + 1}-{Math.min(meta.offset + data.length, meta.total)} de {meta.total} registros
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead className="w-[180px]">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.userName}`} alt={activity.userName} />
                        <AvatarFallback>{activity.userFullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{activity.userFullName}</div>
                        <div className="text-xs text-muted-foreground">@{activity.userName}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActionIcon(activity.actionType)}`}>
                        <ClipboardList className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{getActionName(activity.actionType)}</div>
                        {activity.actionDetail && (
                          <div className="text-xs text-muted-foreground">{activity.actionDetail}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {activity.entityName ? (
                      <div>
                        <div className="font-medium">{activity.entityName}</div>
                        <div className="text-xs text-muted-foreground">{activity.entityType}</div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">-</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDate(activity.createdAt)}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => onPageChange(Math.max(0, currentPage - 1))} 
                    disabled={currentPage === 0}
                  />
                </PaginationItem>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  // Lógica para mostrar páginas alrededor de la actual
                  let pageToShow;
                  if (totalPages <= 5) {
                    pageToShow = i;
                  } else if (currentPage < 2) {
                    pageToShow = i;
                  } else if (currentPage > totalPages - 3) {
                    pageToShow = totalPages - 5 + i;
                  } else {
                    pageToShow = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={pageToShow}>
                      <PaginationLink
                        isActive={pageToShow === currentPage}
                        onClick={() => onPageChange(pageToShow)}
                      >
                        {pageToShow + 1}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                {totalPages > 5 && currentPage < totalPages - 3 && (
                  <>
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink onClick={() => onPageChange(totalPages - 1)}>
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))} 
                    disabled={currentPage === totalPages - 1}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Componente para los gráficos de resumen
const SummaryCharts: React.FC<{
  summary: any;
  isLoading: boolean;
}> = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-[200px]" />
          </CardHeader>
          <CardContent className="h-[300px]">
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-[200px]" />
          </CardHeader>
          <CardContent className="h-[300px]">
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!summary) return null;
  
  const { byAction, byUser, byDate } = summary;
  
  // Preparar datos para el gráfico de acciones
  const actionChartData = byAction
    .slice(0, 10)
    .map((item: any) => ({
      name: getActionName(item.actionType),
      value: item.count
    }));
  
  // Preparar datos para el gráfico de usuarios
  const userChartData = byUser
    .slice(0, 10)
    .map((item: any) => ({
      name: item.userFullName || item.userName,
      value: item.count
    }));
  
  // Preparar datos para el gráfico diario
  const dateChartData = byDate
    .map((item: any) => ({
      name: formatDateShort(item.date),
      value: item.count,
      fullDate: item.date
    }))
    .sort((a: any, b: any) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <PieChartIcon className="mr-2 h-5 w-5" />
            Distribución por Tipo de Acción
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={actionChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {actionChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CHART_COLORS[index % CHART_COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} acciones`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Actividad por Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={userChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  width={120}
                  tick={{fontSize: 12}}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Acciones" fill="#2563eb">
                  {userChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CHART_COLORS[index % CHART_COLORS.length]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Actividad por Día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dateChartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} acciones`, 'Cantidad']}
                  labelFormatter={(label) => `Fecha: ${label}`} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name="Actividad" 
                  stroke="#2563eb" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente para detalles de sesiones de usuario
const UserSessions: React.FC<{
  sessions: any[];
  userName?: string;
}> = ({ sessions, userName }) => {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        No hay sesiones disponibles para este usuario.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">
        Sesiones recientes {userName ? `de ${userName}` : ''}
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Navegador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>{formatDate(session.startTime)}</TableCell>
                <TableCell>
                  {session.endTime ? formatDate(session.endTime) : "Sesión activa"}
                </TableCell>
                <TableCell>{formatDuration(session.duration)}</TableCell>
                <TableCell>{session.ipAddress}</TableCell>
                <TableCell className="truncate max-w-[200px]">{session.userAgent}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default function UserActivityStatsPage() {
  const { 
    data, 
    users, 
    actionTypes,
    isLoading, 
    error, 
    filters, 
    updateFilters, 
    goToPage 
  } = useUserActivityStats({
    limit: 20,
    offset: 0
  });
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Estadísticas de Actividad de Usuarios</h1>
          <p className="text-muted-foreground mt-1">
            Analiza y filtra la actividad de los usuarios por fechas, acciones y más
          </p>
        </div>
        
        <FilterSection 
          users={users} 
          actionTypes={actionTypes}
          currentFilters={filters}
          updateFilters={updateFilters}
        />
        
        <Tabs defaultValue="table">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="table" className="flex items-center">
              <TableIcon className="mr-2 h-4 w-4" />
              Actividad
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center">
              <PieChartIcon className="mr-2 h-4 w-4" />
              Estadísticas
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="table" className="space-y-4">
            <ActivityTable 
              data={data?.data} 
              isLoading={isLoading}
              meta={data?.meta}
              onPageChange={goToPage}
            />
            
            {data?.summary?.sessions && data.summary.sessions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Sesiones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <UserSessions 
                    sessions={data.summary.sessions}
                    userName={filters.userId ? users.find(u => u.id === filters.userId)?.fullName : undefined}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="charts" className="space-y-4">
            <SummaryCharts 
              summary={data?.summary} 
              isLoading={isLoading} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}