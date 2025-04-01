import React, { useState } from 'react';
import { 
  useAdStats, 
  useCompanyAdStats, 
  type AffiliateCompanyStat
} from '@/hooks/useAdStats';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
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
  BarChart4, 
  TrendingUp, 
  DollarSign, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  Building,
  FileText,
  PieChart as PieChartIcon,
  Users,
  Video,
  Search,
  BarChart as BarChartIcon,
  ListFilter,
  X,
  ExternalLink,
  FilterIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Array de colores para gráficos
const CHART_COLORS = [
  '#2563eb', '#0891b2', '#7c3aed', '#db2777', '#ea580c', 
  '#65a30d', '#0d9488', '#475569', '#9333ea', '#f97316'
];

// Formatear un número como porcentaje
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

// Formatear un número como moneda
const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

// Convertir fecha a formato legible en español
function formatDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-ES', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  }).format(date);
}

// Componente para mostrar estadísticas generales
const GeneralStatsCards: React.FC = () => {
  const { data, isLoading } = useAdStats();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
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
  
  const { overallStats } = data;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Building className="mr-2 h-4 w-4 text-primary" />
            Empresas Activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overallStats.activeAffiliateCompanies}</div>
          <p className="text-xs text-muted-foreground mt-1">
            De {overallStats.totalAffiliateCompanies} empresas en total
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Video className="mr-2 h-4 w-4 text-primary" />
            Videos con Anuncios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overallStats.totalMatchedVideos}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {overallStats.totalIncludedLinks} enlaces implementados
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <TrendingUp className="mr-2 h-4 w-4 text-primary" />
            Tasa de Conversión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(overallStats.overallConversionRate)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {overallStats.totalIncludedLinks} implementados / {overallStats.totalMatchedVideos} totales
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
            Mejor Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topPerformingCompanies.length > 0 ? (
            <>
              <div className="text-lg font-bold truncate">
                {data.topPerformingCompanies[0].companyName}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatPercent(data.topPerformingCompanies[0].conversionRate)} tasa de conversión
              </p>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Sin datos</div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <DollarSign className="mr-2 h-4 w-4 text-green-500" />
            Ingresos Estimados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${data.affiliateStats.reduce((sum, company) => sum + company.estimatedRevenue, 0).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Basado en {overallStats.totalIncludedLinks} enlaces
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente para mostrar gráficos de conversión y rendimiento
const ConversionCharts: React.FC = () => {
  const { data, isLoading } = useAdStats();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
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
  
  // Preparar datos para el gráfico de tendencia mensual
  const monthlyData = data.monthlyAffiliateStats.map(stat => ({
    name: stat.month,
    matched: stat.totalMatches,
    included: stat.includedCount,
    conversion: stat.conversionRate
  }));
  
  // Preparar datos para el gráfico de rendimiento por empresa
  const topCompaniesData = data.affiliateStats
    .filter(company => company.matchCount > 0)
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 10)
    .map(company => ({
      name: company.companyName,
      matched: company.matchCount,
      included: company.includedCount,
      conversion: company.conversionRate,
      revenue: company.estimatedRevenue
    }));
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <TrendingUp className="mr-2 h-5 w-5 text-primary" />
            Tendencia Mensual
          </CardTitle>
          <CardDescription>
            Tasa de conversión de enlaces afiliados por mes
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
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'conversion') return [formatPercent(Number(value)), 'Tasa de Conversión'];
                    return [value, name === 'matched' ? 'Coincidencias' : 'Implementados'];
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="matched"
                  name="Coincidencias"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="included"
                  name="Implementados"
                  stroke="#82ca9d"
                  activeDot={{ r: 8 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="conversion"
                  name="Tasa Conv. (%)"
                  stroke="#ff7300"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <BarChart4 className="mr-2 h-5 w-5 text-primary" />
            Top Empresas
          </CardTitle>
          <CardDescription>
            Rendimiento de conversión por empresa afiliada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topCompaniesData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  width={120}
                  tick={{fontSize: 12}}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'conversion') return [formatPercent(Number(value)), 'Conversión'];
                    if (name === 'revenue') return [formatCurrency(Number(value)), 'Ingresos Est.'];
                    return [value, name === 'matched' ? 'Coincidencias' : 'Implementados'];
                  }}
                />
                <Legend />
                <Bar dataKey="conversion" name="Conversión (%)" fill="#8884d8">
                  {topCompaniesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente para mostrar tabla de empresas afiliadas
const AffiliateCompaniesTable: React.FC<{
  onSelectCompany: (company: AffiliateCompanyStat) => void
}> = ({ onSelectCompany }) => {
  const { data, isLoading } = useAdStats();
  const [filterActive, setFilterActive] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <Skeleton className="h-5 w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  // Filtrar empresas por estado y término de búsqueda
  const filteredCompanies = data.affiliateStats
    .filter(company => !filterActive || company.status === 'active')
    .filter(company => 
      company.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => b.matchCount - a.matchCount);
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center text-lg justify-between">
          <div className="flex items-center">
            <Building className="mr-2 h-5 w-5 text-primary" />
            Empresas Afiliadas
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Buscar empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-[200px]"
              />
              <Button 
                variant={filterActive ? "default" : "outline"} 
                size="sm"
                onClick={() => setFilterActive(!filterActive)}
              >
                <FilterIcon className="h-4 w-4 mr-1" />
                Activas
              </Button>
            </div>
          </div>
        </CardTitle>
        <CardDescription>
          Rendimiento de conversión y métricas por empresa
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            <div className="grid grid-cols-7 gap-4 mb-2 text-sm font-medium text-muted-foreground">
              <div className="col-span-2">Empresa</div>
              <div className="text-center">Coincidencias</div>
              <div className="text-center">Implementados</div>
              <div className="text-center">Pendientes</div>
              <div className="text-center">Conversión</div>
              <div className="text-right">Ingresos Est.</div>
            </div>
            
            {filteredCompanies.map((company) => (
              <div 
                key={company.companyId}
                className="grid grid-cols-7 gap-4 py-3 items-center border-t hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onSelectCompany(company)}
              >
                <div className="col-span-2 flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="ml-2">
                    <div className="text-sm font-medium">{company.companyName}</div>
                    <Badge variant={company.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {company.status === 'active' ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>
                <div className="text-center">{company.matchCount}</div>
                <div className="text-center">{company.includedCount}</div>
                <div className="text-center">{company.pendingCount}</div>
                <div className="text-center font-medium">
                  {formatPercent(company.conversionRate)}
                </div>
                <div className="text-right font-medium">
                  {formatCurrency(company.estimatedRevenue)}
                </div>
                <div className="flex justify-end">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            ))}
            
            {filteredCompanies.length === 0 && (
              <div className="py-6 text-center text-muted-foreground">
                No se encontraron empresas que coincidan con los criterios de búsqueda.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Componente para mostrar los videos con más enlaces afiliados
const TopVideosCard: React.FC = () => {
  const { data, isLoading } = useAdStats();
  
  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <Skeleton className="h-5 w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Video className="mr-2 h-5 w-5 text-primary" />
          Top Videos con Enlaces
        </CardTitle>
        <CardDescription>
          Videos con mayor cantidad de enlaces afiliados implementados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[450px]">
          <div className="space-y-4">
            {data.topVideosWithAffiliates.map((video, index) => (
              <div key={video.videoId} className="flex items-start border-b pb-4">
                <div className="flex-shrink-0 mr-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="font-medium text-sm line-clamp-2">{video.videoTitle}</h3>
                  <div className="mt-1 flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
                    <Badge variant="outline">{video.projectName}</Badge>
                    <span className="text-xs">•</span>
                    <span className="text-xs">{formatDate(video.createdAt)}</span>
                    <span className="text-xs">•</span>
                    <span className="text-xs">Por {video.creatorName}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4 text-right">
                  <div className="font-semibold">{video.includedCount} / {video.affiliateCount}</div>
                  <div className="text-xs text-muted-foreground">Enlaces implementados</div>
                </div>
              </div>
            ))}
            
            {data.topVideosWithAffiliates.length === 0 && (
              <div className="py-6 text-center text-muted-foreground">
                No hay videos con enlaces afiliados implementados.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Componente para detalles de una empresa específica
const CompanyDetailDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  companyId: number | null;
}> = ({ open, onClose, companyId }) => {
  const { data, isLoading } = useCompanyAdStats(companyId);
  const [activeTab, setActiveTab] = useState('overview');
  
  if (!open) return null;
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Building className="mr-2 h-5 w-5 text-primary" />
              {isLoading ? (
                <Skeleton className="h-6 w-40" />
              ) : (
                data?.company.name || 'Detalles de Empresa'
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Estadísticas detalladas y rendimiento de afiliación
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : data ? (
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Conversión</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercent(data.overallStats.conversionRate)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.overallStats.includedMatches} implementados / {data.overallStats.totalMatches} coincidencias
                  </p>
                  <Progress 
                    value={data.overallStats.conversionRate} 
                    className="h-2 mt-3" 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos Estimados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data.overallStats.estimatedRevenue)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Basado en {data.overallStats.includedMatches} enlaces implementados
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Estado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Badge variant={data.company.status === 'active' ? 'default' : 'secondary'}>
                      {data.company.status === 'active' ? 'Activa' : 'Inactiva'}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-2">
                      Tarifa base: {formatCurrency(data.company.baseRate)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    <span className="font-medium">Dominio:</span> {data.company.domain || 'No especificado'}
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="overview" className="flex items-center">
                  <PieChartIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="projects" className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Proyectos</span>
                </TabsTrigger>
                <TabsTrigger value="trends" className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Tendencias</span>
                </TabsTrigger>
                <TabsTrigger value="creators" className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Creadores</span>
                </TabsTrigger>
                <TabsTrigger value="videos" className="flex items-center">
                  <Video className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Videos</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Distribución de Enlaces</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Implementados', value: data.overallStats.includedMatches },
                                { name: 'Pendientes', value: data.overallStats.pendingMatches }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                              nameKey="name"
                              label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              <Cell fill="#2563eb" />
                              <Cell fill="#d1d5db" />
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} enlaces`, '']} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Proyectos Principales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={data.projectStats.slice(0, 5).map(p => ({
                              name: p.projectName,
                              included: p.includedCount,
                              pending: p.pendingCount
                            }))}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={120} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="included" name="Implementados" fill="#2563eb" />
                            <Bar dataKey="pending" name="Pendientes" fill="#d1d5db" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="projects" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Rendimiento por Proyecto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-1">
                        <div className="grid grid-cols-6 gap-4 mb-2 text-sm font-medium text-muted-foreground">
                          <div className="col-span-2">Proyecto</div>
                          <div className="text-center">Coincidencias</div>
                          <div className="text-center">Implementados</div>
                          <div className="text-center">Pendientes</div>
                          <div className="text-center">Conversión</div>
                        </div>
                        
                        {data.projectStats.map((project) => (
                          <div 
                            key={project.projectId}
                            className="grid grid-cols-6 gap-4 py-3 items-center border-t"
                          >
                            <div className="col-span-2 flex items-center">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-primary" />
                                </div>
                              </div>
                              <div className="ml-2">
                                <div className="text-sm font-medium">{project.projectName}</div>
                                <Badge variant="outline" className="text-xs">
                                  {project.projectPrefix}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-center">{project.matchCount}</div>
                            <div className="text-center">{project.includedCount}</div>
                            <div className="text-center">{project.pendingCount}</div>
                            <div className="text-center font-medium">
                              {formatPercent(project.conversionRate)}
                            </div>
                          </div>
                        ))}
                        
                        {data.projectStats.length === 0 && (
                          <div className="py-6 text-center text-muted-foreground">
                            No hay datos de proyectos disponibles.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="trends" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tendencia Mensual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={data.monthlyStats.map(m => ({
                            month: m.month,
                            matched: m.totalMatches,
                            included: m.includedCount,
                            conversion: m.conversionRate
                          }))}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === 'conversion') return [formatPercent(Number(value)), 'Conversión'];
                              return [value, name === 'matched' ? 'Coincidencias' : 'Implementados'];
                            }}
                          />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="matched"
                            name="Coincidencias"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="included"
                            name="Implementados"
                            stroke="#82ca9d"
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="conversion"
                            name="Conversión (%)"
                            stroke="#ff7300"
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="creators" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Rendimiento por Creador</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-1">
                        <div className="grid grid-cols-6 gap-4 mb-2 text-sm font-medium text-muted-foreground">
                          <div className="col-span-2">Creador</div>
                          <div className="text-center">Coincidencias</div>
                          <div className="text-center">Implementados</div>
                          <div className="text-center">Pendientes</div>
                          <div className="text-center">Conversión</div>
                        </div>
                        
                        {data.creatorStats.map((creator) => (
                          <div 
                            key={creator.creatorId}
                            className="grid grid-cols-6 gap-4 py-3 items-center border-t"
                          >
                            <div className="col-span-2 flex items-center">
                              <Avatar className="h-8 w-8 border">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.creatorUsername}`} alt={creator.creatorName} />
                                <AvatarFallback>{creator.creatorName.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="ml-2">
                                <div className="text-sm font-medium">{creator.creatorName}</div>
                                <div className="text-xs text-muted-foreground">
                                  @{creator.creatorUsername}
                                </div>
                              </div>
                            </div>
                            <div className="text-center">{creator.matchCount}</div>
                            <div className="text-center">{creator.includedCount}</div>
                            <div className="text-center">{creator.pendingCount}</div>
                            <div className="text-center font-medium">
                              {formatPercent(creator.conversionRate)}
                            </div>
                          </div>
                        ))}
                        
                        {data.creatorStats.length === 0 && (
                          <div className="py-6 text-center text-muted-foreground">
                            No hay datos de creadores disponibles.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="videos" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Videos con Enlaces</CardTitle>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filtrar por..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="included">Implementados</SelectItem>
                        <SelectItem value="pending">Pendientes</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {data.videoList.map((video) => (
                          <div key={video.videoId} className="flex items-start border-b pb-4">
                            <div className="flex-shrink-0 mr-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${video.included ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                {video.included ? (
                                  <ArrowUpRight className="h-5 w-5" />
                                ) : (
                                  <ArrowDownRight className="h-5 w-5" />
                                )}
                              </div>
                            </div>
                            <div className="flex-grow">
                              <h3 className="font-medium text-sm line-clamp-2">{video.videoTitle}</h3>
                              <div className="mt-1 flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
                                <Badge variant="outline">{video.projectName}</Badge>
                                <span className="text-xs">•</span>
                                <span className="text-xs">{formatDate(video.createdAt)}</span>
                                <span className="text-xs">•</span>
                                <span className="text-xs capitalize">Estado: {video.videoStatus.replace('_', ' ')}</span>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                Creado por {video.creatorName}
                                {video.optimizerName && ` • Optimizado por ${video.optimizerName}`}
                              </div>
                            </div>
                            <div className="flex-shrink-0 ml-4 text-right">
                              <Badge variant={video.included ? 'default' : 'secondary'}>
                                {video.included ? 'Implementado' : 'Pendiente'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        
                        {data.videoList.length === 0 && (
                          <div className="py-6 text-center text-muted-foreground">
                            No hay videos disponibles.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            No se pudieron cargar los datos de la empresa.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Componente principal de la página
export default function AdStatsPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  
  const handleSelectCompany = (company: AffiliateCompanyStat) => {
    setSelectedCompanyId(company.companyId);
    setIsCompanyDialogOpen(true);
  };
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Estadísticas de Anuncios</h1>
            <p className="text-muted-foreground mt-1">
              Análisis detallado del rendimiento de anuncios y empresas afiliadas
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <BarChartIcon className="mr-2 h-4 w-4" />
              Exportar Datos
            </Button>
            <Button variant="outline" size="sm">
              <Search className="mr-2 h-4 w-4" />
              Búsqueda Avanzada
            </Button>
          </div>
        </div>
        
        <GeneralStatsCards />
        <ConversionCharts />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <AffiliateCompaniesTable onSelectCompany={handleSelectCompany} />
          </div>
          <div>
            <TopVideosCard />
          </div>
        </div>
        
        <CompanyDetailDialog 
          open={isCompanyDialogOpen}
          onClose={() => setIsCompanyDialogOpen(false)}
          companyId={selectedCompanyId}
        />
      </div>
    </AdminLayout>
  );
}