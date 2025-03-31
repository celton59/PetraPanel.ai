import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, RefreshCw, Video, FileCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useDashboardVideoStats } from "@/hooks/useDashboardVideoStats";

export function VideoStats() {
  const { data, isLoading, error } = useDashboardVideoStats();
  
  // Definiciones de los íconos y colores para los diferentes estados
  const statusConfig = {
    upload_media: {
      label: "Subiendo Media",
      icon: Upload,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    content_corrections: {
      label: "En Corrección",
      icon: RefreshCw,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    available: {
      label: "Disponibles",
      icon: Video,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    final_review: {
      label: "Revisión Final",
      icon: FileCheck,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    }
  };
  
  // Si estamos cargando, mostrar estado de carga
  if (isLoading) {
    return (
      <Card className="border border-muted/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"></div>
        <CardHeader className="border-b border-muted/30 bg-muted/10 backdrop-blur-sm">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5 text-primary" />
            Métricas de Videos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Cargando estadísticas...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Si hay un error, mostrar mensaje de error
  if (error) {
    return (
      <Card className="border border-muted/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-red-500 to-red-700"></div>
        <CardHeader className="border-b border-muted/30 bg-muted/10 backdrop-blur-sm">
          <CardTitle className="flex items-center gap-2 text-lg text-red-500">
            <Video className="h-5 w-5" />
            Error al cargar métricas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">No se pudieron cargar las estadísticas de videos.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Transformar los datos en el formato que necesita el componente
  const metrics = Object.entries(data?.stateCounts || {}).map(([key, value]) => ({
    label: statusConfig[key as keyof typeof statusConfig]?.label || key,
    value,
    icon: statusConfig[key as keyof typeof statusConfig]?.icon || Video,
    color: statusConfig[key as keyof typeof statusConfig]?.color || "text-gray-500",
    bgColor: statusConfig[key as keyof typeof statusConfig]?.bgColor || "bg-gray-500/10"
  }));

  const total = data?.totalVideos || 0;

  return (
    <Card className="border border-muted/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"></div>

      <CardHeader className="border-b border-muted/30 bg-muted/10 backdrop-blur-sm">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-5 w-5 text-primary" />
          Métricas de Videos
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-6">
          {metrics.map((metric, index) => (
            <motion.div 
              key={metric.label}
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-md", metric.bgColor)}>
                    <metric.icon className={cn("h-4 w-4", metric.color)} />
                  </div>
                  <span className="text-sm font-medium">{metric.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{metric.value}</span>
                  <span className="text-xs text-muted-foreground">
                    ({((metric.value / total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                <motion.div 
                  className={cn("h-full", metric.color.replace("text-", "bg-"))}
                  initial={{ width: 0 }}
                  animate={{ width: `${(metric.value / total) * 100}%` }}
                  transition={{ duration: 1, delay: 0.2 + index * 0.1 }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-muted/30">
          <span className="text-sm font-medium text-muted-foreground">Total de videos</span>
          <span className="text-xl font-bold">{total}</span>
        </div>
      </CardContent>
    </Card>
  );
}