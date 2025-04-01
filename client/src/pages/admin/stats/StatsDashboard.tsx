import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  useDashboardStats,
  useProjectStats,
  useUserStats
} from '@/hooks/useDashboardStats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Sector
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  Video,
  Layers,
  Award,
  ClipboardList,
  X,
  CheckCheck
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

// Colores para diferentes estados de videos
const statusColors: {[key: string]: string} = {
  available: '#3498db',
  content_corrections: '#e74c3c',
  content_review: '#f39c12',
  upload_media: '#2ecc71',
  media_corrections: '#e67e22',
  media_review: '#9b59b6',
  final_review: '#1abc9c',
  completed: '#2c3e50',
  deleted: '#95a5a6'
};

// Lista de meses en español para formatear fechas
const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Componente para mostrar estadísticas generales
const GeneralStatsCards: React.FC = () => {
  const { data, isLoading } = useDashboardStats();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-1/3 mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (!data) return null;
  
  const totalActive = data.totalVideos;
  const totalDeleted = data.deletedCount;
  const totalCompleted = data.stateCounts.completed || 0;
  const totalInProgress = totalActive - totalCompleted;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Video className="mr-2 h-4 w-4 text-primary" />
            Videos Totales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalActive + totalDeleted}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalActive} activos · {totalDeleted} eliminados
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
            Videos Completados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCompleted}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {((totalCompleted / totalActive) * 100).toFixed(1)}% del total activo
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Clock className="mr-2 h-4 w-4 text-amber-500" />
            Videos en Proceso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalInProgress}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {((totalInProgress / totalActive) * 100).toFixed(1)}% del total activo
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Layers className="mr-2 h-4 w-4 text-indigo-500" />
            Proyectos Activos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.projectStats.length}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Con {data.projectStats.reduce((sum, p) => sum + p.count, 0)} videos asociados
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente para gráficos de estadísticas
const StatsCharts: React.FC = () => {
  const { data, isLoading } = useDashboardStats();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-1/3" />
          </CardHeader>
          <CardContent className="h-[300px]">
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-1/3" />
          </CardHeader>
          <CardContent className="h-[300px]">
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!data) return null;
  
  // Preparar datos para el gráfico de estados
  const statusData = Object.entries(data.stateCounts).map(([status, count]) => ({
    name: status.replace('_', ' '),
    value: count,
    status
  })).filter(item => item.value > 0);
  
  // Preparar datos para el gráfico de tendencia mensual
  const monthlyData = data.monthlyStats.map(stat => {
    const [year, month] = stat.month.split('-');
    return {
      month: `${monthNames[parseInt(month) - 1].substring(0, 3)} ${year.substring(2)}`,
      count: stat.count,
      fullMonth: stat.month
    };
  });
  
  // Preparar datos para el gráfico de proyectos
  const projectData = data.projectStats.map(project => ({
    name: project.name,
    count: project.count,
    prefix: project.prefix
  }));
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Activity className="mr-2 h-5 w-5 text-primary" />
            Estado de Videos
          </CardTitle>
          <CardDescription>
            Distribución de videos por estado actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={statusColors[entry.status as keyof typeof statusColors] || '#777'} 
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} videos`, 'Cantidad']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <BarChart3 className="mr-2 h-5 w-5 text-primary" />
            Tendencia de Creación
          </CardTitle>
          <CardDescription>
            Cantidad de videos creados por mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} videos`, 'Creados']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  name="Videos Creados" 
                  stroke="#3b82f6" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Layers className="mr-2 h-5 w-5 text-primary" />
            Videos por Proyecto
          </CardTitle>
          <CardDescription>
            Distribución de videos entre los proyectos activos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projectData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} videos`, 'Total']} />
                <Legend />
                <Bar dataKey="count" name="Cantidad de Videos" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente para mostrar listas de usuarios destacados
const TopUsersSection: React.FC = () => {
  const { data, isLoading } = useDashboardStats();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="flex items-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="ml-4 space-y-1 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-6" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (!data) return null;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Video className="mr-2 h-5 w-5 text-primary" />
            Top Creadores
          </CardTitle>
          <CardDescription>
            Usuarios con más videos creados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {data.topUsers.map((user, index) => (
                <div key={user.userId} className="flex items-center">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt={user.fullName} />
                    <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none flex items-center">
                      {user.fullName}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {user.count} videos
                      </Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{user.username}
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <FileText className="mr-2 h-5 w-5 text-primary" />
            Top Optimizadores
          </CardTitle>
          <CardDescription>
            Usuarios con más videos optimizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {data.topOptimizers.map((user, index) => (
                <div key={user.userId} className="flex items-center">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt={user.fullName} />
                    <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none flex items-center">
                      {user.fullName}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {user.count} videos
                      </Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{user.username}
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente para estadísticas detalladas de proyectos
const ProjectStatsSection: React.FC = () => {
  const { data, isLoading } = useProjectStats();
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Layers className="mr-2 h-5 w-5 text-primary" />
          Estadísticas por Proyecto
        </CardTitle>
        <CardDescription>
          Estado actual de los videos en cada proyecto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {data.projects.map((project) => {
              const totalInProject = project.totalVideos;
              const completedPercent = (project.stateCounts.completed / totalInProject) * 100 || 0;
              
              return (
                <div key={project.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.prefix} · {totalInProject} videos</p>
                    </div>
                    <Badge variant={completedPercent > 75 ? "secondary" : "outline"} className={completedPercent > 75 ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>
                      {completedPercent.toFixed(0)}% completado
                    </Badge>
                  </div>
                  
                  <Progress value={completedPercent} className="h-2" />
                  
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {Object.entries(project.stateCounts)
                      .filter(([status, count]) => count > 0)
                      .map(([status, count]) => (
                        <div key={status} className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/50">
                          <span className="text-xs font-medium capitalize">{status.replace('_', ' ')}</span>
                          <span className="text-sm font-bold">{count}</span>
                        </div>
                    ))}
                  </div>
                  
                  <Separator className="my-2" />
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Componente para estadísticas de usuarios
const UserStatsSection: React.FC = () => {
  const { data, isLoading } = useUserStats();
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-1/3" />
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="creators">
            <TabsList className="w-full">
              <TabsTrigger value="creators" className="flex-1">
                <Skeleton className="h-4 w-20" />
              </TabsTrigger>
              <TabsTrigger value="optimizers" className="flex-1">
                <Skeleton className="h-4 w-20" />
              </TabsTrigger>
              <TabsTrigger value="reviewers" className="flex-1">
                <Skeleton className="h-4 w-20" />
              </TabsTrigger>
            </TabsList>
            <TabsContent value="creators" className="mt-4">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-1/3 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Users className="mr-2 h-5 w-5 text-primary" />
          Rendimiento de Usuarios
        </CardTitle>
        <CardDescription>
          Estadísticas de productividad por rol de usuario
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="creators">
          <TabsList className="w-full">
            <TabsTrigger value="creators" className="flex-1">
              <Video className="h-4 w-4 mr-2" />
              Creadores
            </TabsTrigger>
            <TabsTrigger value="optimizers" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Optimizadores
            </TabsTrigger>
            <TabsTrigger value="reviewers" className="flex-1">
              <ClipboardList className="h-4 w-4 mr-2" />
              Revisores
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="creators" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4">
                {data.creators.map((user) => (
                  <div key={user.userId} className="space-y-2">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt={user.fullName} />
                        <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                      <Badge variant="outline" className="ml-auto">
                        {user.totalVideos} videos
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center p-2 rounded-lg bg-muted/50">
                        <CheckCheck className="h-4 w-4 mr-2 text-green-500" />
                        <div>
                          <p className="text-xs font-medium">Completados</p>
                          <p className="text-sm font-bold">{user.completed}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center p-2 rounded-lg bg-muted/50">
                        <Clock className="h-4 w-4 mr-2 text-amber-500" />
                        <div>
                          <p className="text-xs font-medium">En progreso</p>
                          <p className="text-sm font-bold">{user.inProgress}</p>
                        </div>
                      </div>
                    </div>
                    
                    <Progress 
                      value={(user.completed / user.totalVideos) * 100} 
                      className="h-2" 
                    />
                    
                    <Separator className="my-2" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="optimizers" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4">
                {data.optimizers.map((user) => (
                  <div key={user.userId} className="space-y-2">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt={user.fullName} />
                        <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                      <Badge variant="outline" className="ml-auto">
                        {user.totalOptimized} optimizados
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center p-2 rounded-lg bg-muted/50">
                        <CheckCheck className="h-4 w-4 mr-2 text-green-500" />
                        <div>
                          <p className="text-xs font-medium">Completados</p>
                          <p className="text-sm font-bold">{user.completed}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center p-2 rounded-lg bg-muted/50">
                        <Clock className="h-4 w-4 mr-2 text-blue-500" />
                        <div>
                          <p className="text-xs font-medium">En revisión</p>
                          <p className="text-sm font-bold">{user.inReview}</p>
                        </div>
                      </div>
                    </div>
                    
                    <Progress 
                      value={(user.completed / user.totalOptimized) * 100} 
                      className="h-2" 
                    />
                    
                    <Separator className="my-2" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="reviewers" className="mt-4">
            <Tabs defaultValue="content">
              <TabsList className="w-full">
                <TabsTrigger value="content" className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Contenido
                </TabsTrigger>
                <TabsTrigger value="media" className="flex-1">
                  <Video className="h-4 w-4 mr-2" />
                  Media
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="content" className="mt-4">
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {data.contentReviewers.map((user) => (
                      <div key={user.userId} className="space-y-2">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt={user.fullName} />
                            <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.fullName}</p>
                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                          </div>
                          <Badge variant="outline" className="ml-auto">
                            {user.totalReviewed} revisados
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center p-2 rounded-lg bg-muted/50">
                            <CheckCheck className="h-4 w-4 mr-2 text-green-500" />
                            <div>
                              <p className="text-xs font-medium">Aprobados</p>
                              <p className="text-sm font-bold">{user.approved}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center p-2 rounded-lg bg-muted/50">
                            <X className="h-4 w-4 mr-2 text-red-500" />
                            <div>
                              <p className="text-xs font-medium">Rechazados</p>
                              <p className="text-sm font-bold">{user.rejected}</p>
                            </div>
                          </div>
                        </div>
                        
                        <Progress 
                          value={(user.approved / user.totalReviewed) * 100} 
                          className="h-2" 
                        />
                        
                        <Separator className="my-2" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="media" className="mt-4">
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {data.mediaReviewers.map((user) => (
                      <div key={user.userId} className="space-y-2">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt={user.fullName} />
                            <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.fullName}</p>
                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                          </div>
                          <Badge variant="outline" className="ml-auto">
                            {user.totalReviewed} revisados
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center p-2 rounded-lg bg-muted/50">
                            <CheckCheck className="h-4 w-4 mr-2 text-green-500" />
                            <div>
                              <p className="text-xs font-medium">Aprobados</p>
                              <p className="text-sm font-bold">{user.approved}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center p-2 rounded-lg bg-muted/50">
                            <X className="h-4 w-4 mr-2 text-red-500" />
                            <div>
                              <p className="text-xs font-medium">Rechazados</p>
                              <p className="text-sm font-bold">{user.rejected}</p>
                            </div>
                          </div>
                        </div>
                        
                        <Progress 
                          value={(user.approved / user.totalReviewed) * 100} 
                          className="h-2" 
                        />
                        
                        <Separator className="my-2" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Componente principal del dashboard de estadísticas
export default function StatsDashboard() {
  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
        <p className="text-muted-foreground">
          Panel de estadísticas detalladas sobre videos, proyectos y usuarios
        </p>
      </div>
      
      <div className="space-y-8">
        <GeneralStatsCards />
        <StatsCharts />
        <TopUsersSection />
        
        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="w-full max-w-md mx-auto">
            <TabsTrigger value="projects" className="flex-1">
              <Layers className="h-4 w-4 mr-2" />
              Proyectos
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1">
              <Users className="h-4 w-4 mr-2" />
              Usuarios
            </TabsTrigger>
          </TabsList>
          <TabsContent value="projects">
            <ProjectStatsSection />
          </TabsContent>
          <TabsContent value="users">
            <UserStatsSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}