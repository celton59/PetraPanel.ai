import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquareHeart, ChevronUp, Clock } from 'lucide-react';
import { Link } from 'wouter';
import { useSuggestions } from '@/hooks/useSuggestions';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export function SuggestionsWidget() {
  const { allSuggestions } = useSuggestions();
  
  // Si está cargando, mostrar un esqueleto
  if (allSuggestions.isLoading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-[200px]" />
          </CardTitle>
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="text-xs text-muted-foreground">
            <Skeleton className="h-4 w-[150px] mt-1" />
          </div>
          <div className="mt-3">
            <Skeleton className="h-2 w-full mt-2" />
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-8 w-full" />
        </CardFooter>
      </Card>
    );
  }
  
  // Si hay error, mostrar un widget simplificado
  if (allSuggestions.isError) {
    // Determinar si el error es de autenticación (401)
    const isAuthError = (allSuggestions.error as any)?.response?.status === 401;
    
    return (
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Sugerencias Pendientes</CardTitle>
          <div className="p-2 rounded-md bg-primary/10">
            <MessageSquareHeart className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">--</div>
          <p className="text-xs text-muted-foreground">
            {isAuthError 
              ? "Inicia sesión para ver sugerencias" 
              : "No se pudieron cargar los datos"}
          </p>
        </CardContent>
        <CardFooter className="p-0">
          <Link href={isAuthError ? "/auth" : "/sugerencias"}>
            <Button 
              variant="ghost" 
              className="w-full h-9 px-4 py-2 rounded-t-none justify-between"
            >
              <span>{isAuthError ? "Iniciar sesión" : "Gestionar sugerencias"}</span>
              <span className="h-4 w-4">→</span>
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }
  
  // Contar sugerencias pendientes y recientes
  const suggestions = allSuggestions.data || [];
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const recentSuggestions = suggestions.filter(s => {
    const date = new Date(s.created_at);
    const now = new Date();
    // Sugerencias de los últimos 7 días
    return (now.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000;
  });
  
  // Calcular cambio en comparación con la semana anterior
  const hasNewSuggestions = recentSuggestions.length > 0;
  const percentChange = hasNewSuggestions
    ? `+${recentSuggestions.length} nuevas esta semana` 
    : "Sin sugerencias nuevas esta semana";
  
  // Obtener la sugerencia más reciente para mostrarla
  const latestSuggestion = pendingSuggestions.length > 0 
    ? pendingSuggestions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] 
    : null;
  
  // Calcular el progreso: pendientes vs total
  const progressPercentage = suggestions.length > 0 
    ? Math.min(100, Math.round((pendingSuggestions.length / suggestions.length) * 100))
    : 0;
  
  // Animation variants
  const cardVariants = {
    hover: { 
      y: -5,
      transition: { duration: 0.2 }
    }
  };
  
  return (
    <motion.div
      whileHover="hover"
      initial="initial"
      animate="initial"
    >
      <motion.div variants={cardVariants}>
        <Card className="border shadow-sm transition-all duration-200 h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <span>Sugerencias Pendientes</span>
              {hasNewSuggestions && (
                <Badge variant="outline" className="text-[10px] h-4 bg-primary/5 text-primary ml-2">
                  Nuevas
                </Badge>
              )}
            </CardTitle>
            <div className="p-2 rounded-md bg-primary/10">
              <MessageSquareHeart className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          
          <CardContent className="pb-1">
            <div className="flex items-baseline gap-1">
              <div className="text-3xl font-bold">
                {pendingSuggestions.length}
              </div>
              <div className={cn(
                "text-xs font-medium flex items-center",
                hasNewSuggestions ? "text-emerald-500" : "text-muted-foreground"
              )}>
                {hasNewSuggestions && <ChevronUp className="h-3 w-3 mr-0.5" />}
                {percentChange}
              </div>
            </div>
            
            {/* Barra de progreso */}
            <div className="mt-2 space-y-1">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Pendientes vs. Total</span>
                <span>{pendingSuggestions.length}/{suggestions.length}</span>
              </div>
              <Progress value={progressPercentage} className="h-1.5" />
            </div>
            
            {/* Mostrar la sugerencia más reciente si existe */}
            {latestSuggestion && (
              <div className="mt-3 pt-3 border-t text-xs">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Clock className="h-3 w-3" />
                  <span>Sugerencia más reciente:</span>
                </div>
                <p className="font-medium truncate" title={latestSuggestion.title}>
                  {latestSuggestion.title}
                </p>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="p-0 mt-2">
            <Link href="/sugerencias">
              <Button 
                variant="ghost" 
                className="w-full h-10 px-4 py-2 rounded-t-none justify-between"
              >
                <span>Gestionar sugerencias</span>
                <span className="h-4 w-4">→</span>
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  );
}