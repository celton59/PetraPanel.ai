import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import api from "../../../lib/axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
// Eliminada la importación de componentes de paginación
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Loader2, 
  Plus, 
  Trash, 
  Search, 
  FileUp, 
  FileDown, 
  Download,
  CheckCircle, 
  XCircle,
  Filter,
  ChevronDown,
  AlertCircle,
  ListPlus,
  Video,
  BarChart4,
  Layers,
  Cpu
} from "lucide-react";

// Importar los nuevos componentes de visualización
import { DataQualityMetrics } from "./visualization/DataQualityMetrics";
import { EmbeddingVisualizer } from "./visualization/EmbeddingVisualizer";
import { AdvancedCategorizationPanel } from "./visualization/AdvancedCategorizationPanel";

interface TrainingExample {
  id: number;
  title: string;
  is_evergreen: boolean;
  created_at: string;
  created_by?: number;
  confidence?: number;
  category?: string;
  similarity_score?: number;
  embedding?: number[];
  vector_processed?: boolean;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface TrainingExamplesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrainingExamplesDialog({
  open,
  onOpenChange,
}: TrainingExamplesDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [isEvergreen, setIsEvergreen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // Estado para paginación
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 100, // Aumentado el límite predeterminado
    totalPages: 0
  });
  
  // Estado para operaciones por lotes
  const [selectedExamples, setSelectedExamples] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Estado para importación/exportación
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImportingFromYoutube, setIsImportingFromYoutube] = useState(false);
  const [youtubeChannelOpen, setYoutubeChannelOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<{id: string, name: string, channelId: string} | null>(null);
  const [channels, setChannels] = useState<{id: string, name: string, channelId: string}[]>([]);
  const [importAsEvergreen, setImportAsEvergreen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para importación masiva
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  
  // Estado para procesamiento de vectores
  const [isProcessingVectors, setIsProcessingVectors] = useState(false);
  const [unprocessedCount, setUnprocessedCount] = useState(0);
  const [bulkTitles, setBulkTitles] = useState("");
  const [bulkIsEvergreen, setBulkIsEvergreen] = useState(true);
  const [isImportingBulk, setIsImportingBulk] = useState(false);
  
  // Estado para ordenamiento
  const [sortBy, setSortBy] = useState<string>("id");
  const [sortDir, setSortDir] = useState<string>("asc");

  // Cargar ejemplos - siempre muestra todos
  const loadExamples = async () => {
    setIsLoading(true);
    setSelectedExamples([]);
    setSelectAll(false);

    try {
      // Construir parámetros de consulta - ya no usamos paginación
      const params = new URLSearchParams({
        limit: "10000", // Valor muy alto para traer todos los registros
        sortBy,
        sortDir
      });

      // Añadir parámetros adicionales solo si tienen valor
      if (searchTerm) params.append('search', searchTerm);
      if (activeTab !== 'all') params.append('type', activeTab);

      console.log("Cargando todos los ejemplos de entrenamiento");
      const response = await api.get(`/api/titulin/training-examples?${params}`);
      
      if (response.data.success) {
        setExamples(response.data.data);
        setPagination(response.data.pagination);
        
        // Contar ejemplos sin procesar
        const unprocessed = response.data.data.filter((example: TrainingExample) => !example.vector_processed).length;
        setUnprocessedCount(unprocessed);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al cargar ejemplos de entrenamiento");
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar ejemplos y canales al abrir el diálogo
  useEffect(() => {
    if (open) {
      loadExamples();
      loadChannels();
    }
  }, [open]);
  
  // Cargar canales de YouTube
  const loadChannels = async () => {
    try {
      const response = await axios.get('/api/titulin/channels/for-training');
      if (response.data && Array.isArray(response.data)) {
        setChannels(response.data.map(channel => ({
          id: channel.id, // ID interno del canal
          channelId: channel.channelId, // ID de YouTube
          name: channel.name
        })));
      }
    } catch (error) {
      console.error('Error al cargar canales de YouTube:', error);
      toast.error('No se pudieron cargar los canales de YouTube');
    }
  };
  
  // Efecto para aplicar filtros con un debounce para la búsqueda
  useEffect(() => {
    if (!open) return;
    
    const timer = setTimeout(() => {
      // Cargar con los nuevos filtros
      loadExamples();
    }, 300); // Esperar 300ms después de terminar de escribir
    
    return () => clearTimeout(timer);
  }, [searchTerm, activeTab, sortBy, sortDir]);
  
  // Manejar ordenamiento y selección múltiple
  const toggleSort = (column: string) => {
    if (sortBy === column) {
      // Si ya se está ordenando por esta columna, cambiar la dirección
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      // Cambiar la columna de ordenamiento y resetear a ascendente
      setSortBy(column);
      setSortDir('asc');
    }
  };

  // Añadir nuevo ejemplo
  const addExample = async () => {
    if (!newTitle.trim()) {
      toast.error("El título no puede estar vacío");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post("/api/titulin/training-examples", {
        title: newTitle,
        isEvergreen,
      });

      if (response.data.success) {
        toast.success("Ejemplo añadido correctamente");
        setNewTitle("");
        loadExamples();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al añadir ejemplo");
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar ejemplo
  const deleteExample = async (id: number) => {
    setIsLoading(true);
    try {
      const response = await axios.delete(`/api/titulin/training-examples/${id}`);
      if (response.data.success) {
        toast.success("Ejemplo eliminado correctamente");
        loadExamples();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al eliminar ejemplo");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar ejemplos según la pestaña activa y término de búsqueda
  const filteredExamples = useMemo(() => {
    return examples.filter((example) => {
      // Filtrar por tipo (pestaña activa)
      const matchesTab = 
        activeTab === "all" || 
        (activeTab === "evergreen" && example.is_evergreen === true) || 
        (activeTab === "not-evergreen" && example.is_evergreen === false);
      
      // Filtrar por término de búsqueda
      const matchesSearch = 
        !searchTerm.trim() || 
        example.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesTab && matchesSearch;
    });
  }, [examples, activeTab, searchTerm]);
  
  // Contador de resultados filtrados por tipo para mostrar en las pestañas
  const evergreenCount = useMemo(() => examples.filter(e => e.is_evergreen === true).length, [examples]);
  const notEvergreenCount = useMemo(() => examples.filter(e => e.is_evergreen === false).length, [examples]);
  
  // Función para cambiar de pestaña y limpiar la búsqueda
  const handleTabChange = (value: string) => {
    setSearchTerm('');
    setActiveTab(value);
    loadExamples();
  };
  
  // Función para exportar ejemplos
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Crear la URL con los parámetros de filtrado
      let url = '/api/titulin/training-examples/export';
      if (activeTab !== 'all') {
        url += `?type=${activeTab.replace('evergreen', 'evergreen').replace('not-evergreen', 'not-evergreen')}`;
      }
      
      // Realizar la petición con responseType blob para descargar el archivo
      const response = await axios.get(url, { responseType: 'blob' });
      
      // Crear un objeto URL para el blob
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      
      // Crear un enlace temporal y hacer clic en él
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `ejemplos-entrenamiento-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Archivo CSV exportado correctamente');
    } catch (error: any) {
      toast.error('Error al exportar ejemplos');
      console.error('Error exportando ejemplos:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Función para abrir el diálogo de selección de archivo
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Función para importar ejemplos desde un canal de YouTube
  const handleImportFromYoutube = async () => {
    if (!selectedChannel) {
      toast.error('Seleccione un canal primero');
      return;
    }
    
    if (!selectedChannel.channelId) {
      toast.error('El canal seleccionado no tiene un ID de YouTube válido');
      return;
    }
    
    setIsImportingFromYoutube(true);
    try {
      console.log('Importando desde canal:', selectedChannel);
      
      // Enviamos el channelId que corresponde al campo channelId de la tabla youtube_channels
      const response = await axios.post('/api/titulin/training-examples/import-from-channel', {
        channelId: selectedChannel.channelId, // Ahora usamos el channelId de YouTube, no el ID interno
        isEvergreen: importAsEvergreen
      });
      
      if (response.data.success) {
        toast.success(response.data.message || `Títulos del canal ${selectedChannel.name} importados como ${importAsEvergreen ? 'evergreen' : 'no evergreen'}`);
        loadExamples(); // Recargar ejemplos
        setYoutubeChannelOpen(false); // Cerrar el diálogo
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al importar títulos desde YouTube';
      toast.error(errorMessage);
      console.error('Error importando desde YouTube:', error);
      
      // Mensajes más descriptivos para errores comunes
      if (error.response?.status === 404) {
        toast.error('No se encontró el canal o no tiene videos disponibles');
      } else if (error.response?.status === 500) {
        toast.error('Error del servidor al procesar la importación. Intente nuevamente.');
      }
    } finally {
      setIsImportingFromYoutube(false);
    }
  };
  
  // Función para importar ejemplos desde CSV
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validar que es un archivo CSV
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Por favor, seleccione un archivo CSV válido');
      return;
    }
    
    setIsUploading(true);
    try {
      // Crear un formulario con el archivo
      const formData = new FormData();
      formData.append('file', file);
      
      // Enviar la petición
      const response = await axios.post('/api/titulin/training-examples/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true  // Asegura que se envíen las cookies de autenticación
      });
      
      if (response.data.success) {
        toast.success(response.data.message || 'Ejemplos importados correctamente');
        loadExamples(); // Recargar ejemplos
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al importar ejemplos');
      console.error('Error importando ejemplos:', error);
    } finally {
      setIsUploading(false);
      // Limpiar input para permitir seleccionar el mismo archivo nuevamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Función para manejar la importación masiva de ejemplos
  const handleBulkImport = async () => {
    if (!bulkTitles.trim()) {
      toast.error('Ingrese al menos un título');
      return;
    }
    
    setIsImportingBulk(true);
    try {
      // Dividir los títulos por saltos de línea y filtrar líneas vacías
      const titles = bulkTitles
        .split('\n')
        .map(title => title.trim())
        .filter(title => title.length > 0);
      
      if (titles.length === 0) {
        toast.error('No se encontraron títulos válidos');
        return;
      }
      
      // Enviar la petición
      const response = await axios.post('/api/titulin/training-examples/bulk', {
        operation: 'create',
        titles,
        isEvergreen: bulkIsEvergreen
      }, {
        withCredentials: true  // Asegura que se envíen las cookies de autenticación
      });
      
      if (response.data.success) {
        toast.success(`${response.data.insertedCount || titles.length} ejemplos importados correctamente`);
        loadExamples(); // Recargar ejemplos
        setBulkTitles(''); // Limpiar el textarea
        setBulkImportOpen(false); // Cerrar diálogo
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al importar ejemplos en masa');
      console.error('Error importando ejemplos en masa:', error);
    } finally {
      setIsImportingBulk(false);
    }
  };
  
  // Función para gestionar operaciones en lote
  const handleBulkOperation = async (operation: 'delete' | 'update', data?: { is_evergreen?: boolean }) => {
    if (selectedExamples.length === 0) {
      toast.error('No hay ejemplos seleccionados');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post('/api/titulin/training-examples/bulk', {
        operation,
        ids: selectedExamples,
        data
      });
      
      if (response.data.success) {
        toast.success(`${response.data.affectedCount} ejemplos ${operation === 'delete' ? 'eliminados' : 'actualizados'} correctamente`);
        loadExamples();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Error en operación masiva: ${operation}`);
    } finally {
      setIsLoading(false);
      setSelectedExamples([]);
      setSelectAll(false);
    }
  };
  
  // Función para aplicar categoría a ejemplos
  const handleCategorizeExamples = async (exampleIds: number[], category: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/titulin/training-examples/bulk', {
        operation: 'update',
        ids: exampleIds,
        data: { category }
      });
      
      if (response.data.success) {
        toast.success(`${response.data.affectedCount} ejemplos categorizados como "${category}" correctamente`);
        loadExamples();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al categorizar ejemplos");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para procesar vectores en lote
  const processVectors = async () => {
    if (unprocessedCount === 0) {
      toast.info('No hay ejemplos pendientes para procesar');
      return;
    }
    
    setIsProcessingVectors(true);
    try {
      // Obtener sólo los IDs de ejemplos no procesados
      const unprocessedIds = examples
        .filter(ex => !ex.vector_processed)
        .map(ex => ex.id);
      
      if (unprocessedIds.length === 0) {
        toast.info('No hay ejemplos pendientes para procesar');
        return;
      }
      
      // Enviar petición al servidor para procesar los vectores
      const response = await axios.post('/api/titulin/training-examples/process-vectors', {
        ids: unprocessedIds
      }, {
        withCredentials: true  // Asegura que se envíen las cookies de autenticación
      });
      
      if (response.data.success) {
        toast.success(`${response.data.processedCount || unprocessedIds.length} ejemplos procesados correctamente`);
        loadExamples(); // Recargar ejemplos
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al procesar vectores');
      console.error('Error procesando vectores:', error);
    } finally {
      setIsProcessingVectors(false);
    }
  };
  
  // Calcular métricas para visualización
  const dataMetrics = useMemo(() => {
    return {
      totalExamples: examples.length,
      evergreenExamples: evergreenCount,
      nonEvergreenExamples: notEvergreenCount,
      processedVectors: examples.filter(ex => ex.vector_processed).length,
      avgConfidence: examples.reduce((acc, ex) => acc + (ex.confidence || 0), 0) / 
                    (examples.filter(ex => ex.confidence !== undefined).length || 1)
    };
  }, [examples, evergreenCount, notEvergreenCount]);

  return (
    <>
      {/* Diálogo para importación masiva de ejemplos */}
      <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Importar ejemplos en masa</DialogTitle>
            <DialogDescription>
              Ingrese un título por línea. Todos los títulos serán importados como el tipo seleccionado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-titles">Títulos (uno por línea)</Label>
              <textarea
                id="bulk-titles"
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Ingrese un título por línea, por ejemplo:
Como ganar dinero con YouTube en 2023
10 trucos para mejorar tu SEO
Los mejores plugins de WordPress
..."
                value={bulkTitles}
                onChange={(e) => setBulkTitles(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="bulk-is-evergreen"
                checked={bulkIsEvergreen}
                onCheckedChange={setBulkIsEvergreen}
              />
              <Label htmlFor="bulk-is-evergreen">
                Importar como contenido evergreen (atemporal)
              </Label>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Si un título ya existe en la base de datos, se omitirá.
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkImportOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleBulkImport}
              disabled={isImportingBulk || !bulkTitles.trim()}
            >
              {isImportingBulk ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <ListPlus className="mr-2 h-4 w-4" />
                  Importar títulos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para importar desde canal de YouTube */}
      <Dialog open={youtubeChannelOpen} onOpenChange={setYoutubeChannelOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importar desde canal de YouTube</DialogTitle>
            <DialogDescription>
              Seleccione un canal e indique si los títulos deben considerarse como contenido evergreen (atemporal) o no evergreen (temporal).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="channel-selector">Canal de YouTube</Label>
              <Select
                value={selectedChannel?.id || ""}
                onValueChange={(value) => {
                  const channel = channels.find(c => c.id === value);
                  if (channel) {
                    setSelectedChannel({ 
                      id: channel.id, 
                      name: channel.name,
                      channelId: channel.channelId
                    });
                  }
                }}
              >
                <SelectTrigger id="channel-selector">
                  <SelectValue placeholder="Seleccionar un canal" />
                </SelectTrigger>
                <SelectContent>
                  {channels.length === 0 ? (
                    <SelectItem value="" disabled>No hay canales disponibles</SelectItem>
                  ) : (
                    channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="import-as-evergreen"
                checked={importAsEvergreen}
                onCheckedChange={setImportAsEvergreen}
              />
              <Label htmlFor="import-as-evergreen">
                Importar como contenido evergreen (atemporal)
              </Label>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Se importarán todos los títulos de videos del canal seleccionado.
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setYoutubeChannelOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImportFromYoutube}
              disabled={isImportingFromYoutube || !selectedChannel}
            >
              {isImportingFromYoutube ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Importar títulos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo principal de ejemplos de entrenamiento */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-6">
          <DialogHeader className="pb-4">
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle>Ejemplos de entrenamiento para análisis de contenido</DialogTitle>
                <DialogDescription>
                  Estos ejemplos ayudan a mejorar la precisión del análisis de títulos, enseñando a la IA a distinguir entre contenido evergreen (atemporal) y no evergreen (temporal). Cuantos más ejemplos de calidad agregue, mejores serán los resultados del análisis.
                </DialogDescription>
              </div>
              <div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleImportClick} 
                    disabled={isUploading} 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center"
                  >
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="mr-2 h-4 w-4" />
                    )}
                    CSV
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".csv"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => setBulkImportOpen(true)}
                    size="sm"
                    className="flex items-center"
                  >
                    <ListPlus className="mr-2 h-4 w-4" />
                    Texto
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setYoutubeChannelOpen(true)}
                    disabled={isImportingFromYoutube}
                    size="sm"
                    className="flex items-center"
                  >
                    {isImportingFromYoutube ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Video className="mr-2 h-4 w-4" />
                    )}
                    YouTube
                  </Button>
                  <Button 
                    variant="default"
                    onClick={processVectors}
                    disabled={isProcessingVectors || unprocessedCount === 0}
                    size="sm"
                    className="flex items-center"
                  >
                    {isProcessingVectors ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Cpu className="mr-2 h-4 w-4" />
                    )}
                    {isProcessingVectors ? 'Procesando...' : `Procesar vectores (${unprocessedCount})`}
                  </Button>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="all">
                    Todos
                    <Badge variant="secondary" className="ml-2 bg-muted">
                      {examples.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="evergreen">
                    Evergreen
                    <Badge variant="secondary" className="ml-2 bg-green-50 text-green-700">
                      {evergreenCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="not-evergreen">
                    No Evergreen
                    <Badge variant="secondary" className="ml-2 bg-amber-50 text-amber-700">
                      {notEvergreenCount}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Contenido principal */}
              <div className="flex-1 overflow-auto">
                <TabsContent value="all" className="space-y-4">
                  {/* Panel de visualización avanzada */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <DataQualityMetrics 
                      totalExamples={dataMetrics.totalExamples}
                      evergreenExamples={dataMetrics.evergreenExamples}
                      nonEvergreenExamples={dataMetrics.nonEvergreenExamples}
                      processedVectors={dataMetrics.processedVectors}
                      avgConfidence={dataMetrics.avgConfidence}
                    />
                    
                    <Tabs defaultValue="embedding" className="h-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="embedding" className="flex items-center">
                          <BarChart4 className="h-4 w-4 mr-2" />
                          <span>Visualización</span>
                        </TabsTrigger>
                        <TabsTrigger value="category" className="flex items-center">
                          <Layers className="h-4 w-4 mr-2" />
                          <span>Categorización</span>
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="embedding" className="h-full">
                        <EmbeddingVisualizer 
                          examples={examples}
                          className="h-full"
                        />
                      </TabsContent>
                      
                      <TabsContent value="category" className="h-full">
                        <AdvancedCategorizationPanel 
                          examples={examples}
                          onCategorize={handleCategorizeExamples}
                          className="h-full"
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  {/* Formulario de entrada de ejemplos */}
                  <Card className="mb-4">
                    <CardHeader className="py-4">
                      <CardTitle className="text-base">Añadir nuevo ejemplo de entrenamiento</CardTitle>
                      <CardDescription>
                        Estos ejemplos ayudan a la IA a determinar si un título es evergreen o no
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="title">Título del video</Label>
                          <div className="flex gap-2">
                            <Input
                              id="title"
                              placeholder="Ingrese un título de ejemplo para el análisis"
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              onClick={addExample}
                              disabled={isLoading || !newTitle.trim()}
                              className="whitespace-nowrap"
                            >
                              {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="mr-2 h-4 w-4" />
                              )}
                              Añadir
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 mt-1">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="is-evergreen"
                              checked={isEvergreen}
                              onCheckedChange={setIsEvergreen}
                            />
                            <Label htmlFor="is-evergreen" className="font-medium">
                              {isEvergreen ? (
                                <span className="text-green-600 flex items-center">
                                  Es contenido evergreen
                                  <Badge variant="outline" className="ml-2 bg-green-50 text-green-600 border-green-200">
                                    Evergreen
                                  </Badge>
                                </span>
                              ) : (
                                <span className="text-amber-600 flex items-center">
                                  No es contenido evergreen
                                  <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-600 border-amber-200">
                                    No Evergreen
                                  </Badge>
                                </span>
                              )}
                            </Label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="mb-4 flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        placeholder="Buscar ejemplos..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-10" 
                      />
                    </div>
                    <Badge className="ml-2">
                      {filteredExamples.length} resultado{filteredExamples.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="rounded-md border overflow-auto max-h-[400px] bg-card">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background border-b z-10">
                        <TableRow>
                          <TableHead className="w-[60%]">Título</TableHead>
                          <TableHead className="w-[20%]">Tipo</TableHead>
                          <TableHead className="w-[20%] text-center">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExamples.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                              <div className="flex flex-col items-center space-y-2">
                                <AlertCircle className="h-10 w-10 text-muted" />
                                <div className="text-base font-medium">No hay ejemplos disponibles</div>
                                <div className="text-sm text-muted-foreground max-w-sm text-center">
                                  {activeTab === "evergreen" ? (
                                    "No hay ejemplos marcados como 'evergreen'. Agrega algunos para mejorar el análisis."
                                  ) : activeTab === "not-evergreen" ? (
                                    "No hay ejemplos marcados como 'no evergreen'. Agrega algunos para mejorar el análisis."
                                  ) : (
                                    "No hay ejemplos de entrenamiento. Agrega algunos o importa desde diferentes fuentes."
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredExamples.map((example) => (
                            <TableRow key={example.id} className="hover:bg-muted/20">
                              <TableCell className="font-medium">{example.title}</TableCell>
                              <TableCell>
                                {example.is_evergreen ? (
                                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                                    Evergreen
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                                    No Evergreen
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteExample(example.id)}
                                  className="hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash className="h-4 w-4 text-red-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <div className="space-x-2">
                      <Button variant="outline" onClick={handleExport} disabled={isExporting}>
                        {isExporting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileDown className="mr-2 h-4 w-4" />
                        )}
                        Exportar CSV
                      </Button>
                    </div>

                    {/* Información sobre el total de ejemplos */}
                    <div className="flex items-center justify-end py-2">
                      <div className="text-xs text-muted-foreground">
                        Mostrando un total de <span className="font-medium">{filteredExamples.length}</span> ejemplos
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="evergreen" className="space-y-4">
                  <div className="rounded-md border overflow-auto max-h-[600px] bg-card">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background border-b z-10">
                        <TableRow>
                          <TableHead className="w-[60%]">Título</TableHead>
                          <TableHead className="w-[20%]">Tipo</TableHead>
                          <TableHead className="w-[20%] text-center">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(examples.filter(ex => ex.is_evergreen).length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                              <div className="flex flex-col items-center space-y-2">
                                <AlertCircle className="h-10 w-10 text-muted" />
                                <div className="text-base font-medium">No hay ejemplos evergreen</div>
                                <div className="text-sm text-muted-foreground max-w-sm text-center">
                                  Agrega algunos títulos evergreen para mejorar el análisis y la precisión del modelo.
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          examples.filter(ex => ex.is_evergreen).map((example) => (
                            <TableRow key={example.id} className="hover:bg-muted/20">
                              <TableCell className="font-medium">{example.title}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                                  Evergreen
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteExample(example.id)}
                                  className="hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash className="h-4 w-4 text-red-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                <TabsContent value="not-evergreen" className="space-y-4">
                  <div className="rounded-md border overflow-auto max-h-[600px] bg-card">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background border-b z-10">
                        <TableRow>
                          <TableHead className="w-[60%]">Título</TableHead>
                          <TableHead className="w-[20%]">Tipo</TableHead>
                          <TableHead className="w-[20%] text-center">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(examples.filter(ex => !ex.is_evergreen).length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                              <div className="flex flex-col items-center space-y-2">
                                <AlertCircle className="h-10 w-10 text-muted" />
                                <div className="text-base font-medium">No hay ejemplos no evergreen</div>
                                <div className="text-sm text-muted-foreground max-w-sm text-center">
                                  Agrega algunos títulos que no son evergreen para mejorar el análisis y la precisión del modelo.
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          examples.filter(ex => !ex.is_evergreen).map((example) => (
                            <TableRow key={example.id} className="hover:bg-muted/20">
                              <TableCell className="font-medium">{example.title}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                                  No Evergreen
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteExample(example.id)}
                                  className="hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash className="h-4 w-4 text-red-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <DialogFooter className="border-t mt-4 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}