import React, { useState } from 'react';
import { useSuggestions, Suggestion } from '@/hooks/useSuggestions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  AlertCircle, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Tag,
  MessageSquare,
  Sparkles,
  LayoutDashboard
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function AdminSuggestionList() {
  const { allSuggestions, updateSuggestionStatus, filters, setFilters, categories } = useSuggestions();
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'pending'>('pending');

  // Estados de carga y error
  if (allSuggestions.isLoading) {
    return (
      <Card className="w-full shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                <Skeleton className="h-8 w-48" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-full mt-2" />
              </CardDescription>
            </div>
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="mt-4 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-[80px] rounded-full" />
                </div>
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-16 w-full" />
                <div className="flex justify-end">
                  <Skeleton className="h-9 w-32 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allSuggestions.isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          No se pudieron cargar las sugerencias. Por favor, intenta de nuevo más tarde.
        </AlertDescription>
      </Alert>
    );
  }

  const suggestions = allSuggestions.data || [];
  
  // Filtrar por modo de vista (pendientes o todas)
  const filteredByViewMode = viewMode === 'pending'
    ? suggestions.filter(s => s.status === 'pending')
    : suggestions;
    
  // Ordenar por fecha (más recientes primero)
  const sortedSuggestions = [...filteredByViewMode].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  // Contadores para resumen
  const pendingCount = suggestions.filter(s => s.status === 'pending').length;
  const implementedCount = suggestions.filter(s => s.status === 'implemented').length;
  const inReviewCount = suggestions.filter(s => s.status === 'reviewed').length;
  const rejectedCount = suggestions.filter(s => s.status === 'rejected').length;

  const handleStatusUpdate = async () => {
    if (!selectedSuggestion || !status) return;

    await updateSuggestionStatus.mutateAsync({
      id: selectedSuggestion,
      data: {
        status,
        adminNotes: adminNotes.trim() || undefined
      }
    });

    setDialogOpen(false);
    setSelectedSuggestion(null);
    setStatus('');
    setAdminNotes('');
  };

  const openUpdateDialog = (suggestionId: number, currentStatus: string, currentNotes?: string) => {
    setSelectedSuggestion(suggestionId);
    setStatus(currentStatus);
    setAdminNotes(currentNotes || '');
    setDialogOpen(true);
  };

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
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              Administración de sugerencias
            </CardTitle>
            <CardDescription className="mt-1">
              Gestiona las sugerencias de los usuarios y actualiza su estado
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Tabs
              value={viewMode}
              onValueChange={(value) => setViewMode(value as 'all' | 'pending')}
              className="hidden md:block"
            >
              <TabsList className="h-9">
                <TabsTrigger
                  value="pending"
                  className="text-xs px-3 h-8 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  Pendientes
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 text-[10px]">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="all"
                  className="text-xs px-3 h-8 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  Todas
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button 
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="h-9 w-9"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Vista móvil del selector de modo */}
        <div className="md:hidden mb-4">
          <Select
            value={viewMode}
            onValueChange={(value) => setViewMode(value as 'all' | 'pending')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona el modo de vista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">
                Pendientes ({pendingCount})
              </SelectItem>
              <SelectItem value="all">
                Todas las sugerencias
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Controles de filtrado */}
        <div className="flex justify-end mb-4">
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          </Button>
        </div>
        
        {/* Filtros */}
        {showFilters && (
          <div className="mb-6 p-4 border rounded-lg grid gap-4 grid-cols-1 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar sugerencias..."
                  className="pl-8"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Categoría</label>
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters({ ...filters, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {(categories.data || []).map((category: string) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Estado</label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="reviewed">En revisión</SelectItem>
                  <SelectItem value="implemented">Implementada</SelectItem>
                  <SelectItem value="rejected">Rechazada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Lista de sugerencias */}
        {sortedSuggestions.length > 0 ? (
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
                    <User className="h-3.5 w-3.5" />
                    <span>{suggestion.userName || 'Usuario'}</span>
                  </div>
                  
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
                      Respuesta del administrador
                    </div>
                    
                    {suggestion.status === 'implemented' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        <p className="text-sm font-medium text-emerald-600">¡Implementada con éxito!</p>
                      </div>
                    )}
                    
                    <p className="text-sm whitespace-pre-line">{suggestion.adminNotes}</p>
                  </div>
                )}
                
                <div className="flex justify-end pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openUpdateDialog(suggestion.id, suggestion.status, suggestion.adminNotes)}
                    className="gap-2"
                  >
                    {status === 'pending' && <Clock className="h-4 w-4" />}
                    {status === 'implemented' && <CheckCircle className="h-4 w-4" />}
                    Actualizar estado
                  </Button>
                </div>
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
            <h3 className="text-lg font-medium mb-1">No hay sugerencias que coincidan</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {viewMode === 'pending' 
                ? "No hay sugerencias pendientes de revisión." 
                : "No se encontraron sugerencias con los filtros seleccionados."}
            </p>
          </div>
        )}

        {/* Diálogo para actualizar sugerencias */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Actualizar estado de la sugerencia</DialogTitle>
              <DialogDescription>
                Cambia el estado de la sugerencia y proporciona retroalimentación al usuario.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending" className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500 inline mr-1" />
                      Pendiente
                    </SelectItem>
                    <SelectItem value="reviewed" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500 inline mr-1" />
                      En revisión
                    </SelectItem>
                    <SelectItem value="implemented" className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500 inline mr-1" />
                      Implementada
                    </SelectItem>
                    <SelectItem value="rejected" className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500 inline mr-1" />
                      Rechazada
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Comentarios (opcional)</label>
                <Textarea
                  placeholder="Proporciona retroalimentación o más información para el usuario..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleStatusUpdate}
                disabled={updateSuggestionStatus.isPending || !status}
                className="gap-2"
              >
                {updateSuggestionStatus.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Guardar cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}