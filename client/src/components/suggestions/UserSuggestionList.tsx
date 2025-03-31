import React from 'react';
import { useSuggestions, Suggestion } from '@/hooks/useSuggestions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Loader2, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  Calendar,
  Tag,
  Sparkles
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function UserSuggestionList() {
  const { userSuggestions } = useSuggestions();

  // Estados de carga y error
  if (userSuggestions.isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-8 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-full" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (userSuggestions.isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          No se pudieron cargar tus sugerencias. Por favor, intenta de nuevo más tarde.
        </AlertDescription>
      </Alert>
    );
  }

  const suggestions = userSuggestions.data;
  
  // Ordenar sugerencias por fecha (más recientes primero)
  const sortedSuggestions = [...(suggestions || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Función para obtener el color del badge según el estado
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'reviewed':
        return 'outline';
      case 'implemented':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Función para obtener el icono de estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'reviewed':
        return <MessageSquare className="h-4 w-4" />;
      case 'implemented':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Función para traducir el estado
  const getStatusTranslation = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'reviewed':
        return 'En revisión';
      case 'implemented':
        return 'Implementada';
      case 'rejected':
        return 'Rechazada';
      default:
        return status;
    }
  };
  
  // Función para determinar el color de fondo basado en el estado
  const getStatusBackgroundClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/5 border-amber-500/20';
      case 'reviewed':
        return 'bg-blue-500/5 border-blue-500/20';
      case 'implemented':
        return 'bg-emerald-500/5 border-emerald-500/20';
      case 'rejected':
        return 'bg-red-500/5 border-red-500/20';
      default:
        return 'bg-card';
    }
  };

  // Obtener tiempo relativo desde la creación
  const getRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: es 
    });
  };

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Mis sugerencias
        </CardTitle>
        <CardDescription>
          Historial de sugerencias que has enviado y su estado actual
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {suggestions && (suggestions.length > 0) ? (
          <div className="space-y-6">
            {sortedSuggestions.map((suggestion: Suggestion) => (
              <div 
                key={suggestion.id} 
                className={cn(
                  "border rounded-xl p-5 space-y-3 transition-all duration-200",
                  getStatusBackgroundClass(suggestion.status),
                  "hover:shadow-md"
                )}
              >
                <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-2">
                  <h3 className="text-lg font-semibold">{suggestion.title}</h3>
                  <Badge variant={getStatusBadgeVariant(suggestion.status)} className="h-6">
                    <span className="flex items-center gap-1.5">
                      {getStatusIcon(suggestion.status)}
                      {getStatusTranslation(suggestion.status)}
                    </span>
                  </Badge>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    <span>{suggestion.category}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span title={format(new Date(suggestion.created_at), "d 'de' MMMM, yyyy, HH:mm", { locale: es })}>
                      {getRelativeTime(suggestion.created_at)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 text-sm">
                  <p className="whitespace-pre-line">{suggestion.description}</p>
                </div>
                
                {suggestion.adminNotes && (
                  <div className={cn(
                    "mt-4 p-4 rounded-lg border relative",
                    suggestion.status === 'implemented' ? "bg-emerald-500/5 border-emerald-500/20" : 
                    suggestion.status === 'rejected' ? "bg-red-500/5 border-red-500/20" : 
                    "bg-blue-500/5 border-blue-500/20"
                  )}>
                    <div className="absolute top-0 left-6 transform -translate-y-1/2 px-2 text-xs font-medium bg-background">
                      Respuesta
                    </div>
                    
                    {suggestion.status === 'implemented' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        <p className="text-sm font-medium text-emerald-600">¡Sugerencia implementada!</p>
                      </div>
                    )}
                    
                    <p className="text-sm whitespace-pre-line">{suggestion.adminNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-6 rounded-lg border border-dashed">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-full bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-medium mb-1">No has enviado sugerencias aún</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Tus ideas son importantes. Ayúdanos a mejorar compartiendo tus sugerencias sobre funcionalidades que te gustaría ver implementadas.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}