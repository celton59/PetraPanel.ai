import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, X, Check, Save, PlusCircle, Upload, FileText, AlertCircle, Search } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AdminLayout } from "@/components/layout/AdminLayout";

interface AffiliateCompany {
  id: number;
  name: string;
  description: string | null;
  logo_url: string | null;
  affiliate_url: string;
  keywords: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  description: string;
  logo_url: string;
  affiliate_url: string;
  keywords: string;
  active: boolean;
}

export default function AffiliatesPage() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<AffiliateCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [currentCompanyId, setCurrentCompanyId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    logo_url: '',
    affiliate_url: '',
    keywords: '',
    active: true
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<AffiliateCompany | null>(null);
  
  // Estados para la importación masiva
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [bulkNames, setBulkNames] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/affiliates/companies');
      setCompanies(response.data);
    } catch (error) {
      console.error('Error al cargar empresas afiliadas:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar las empresas afiliadas'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = () => {
    setDialogMode('create');
    setFormData({
      name: '',
      description: '',
      logo_url: '',
      affiliate_url: '',
      keywords: '',
      active: true
    });
    setOpenDialog(true);
  };

  const handleEditCompany = (company: AffiliateCompany) => {
    setDialogMode('edit');
    setCurrentCompanyId(company.id);
    setFormData({
      name: company.name,
      description: company.description || '',
      logo_url: company.logo_url || '',
      affiliate_url: company.affiliate_url,
      keywords: company.keywords.join(', '),
      active: company.active
    });
    setOpenDialog(true);
  };

  const handleDeleteClick = (company: AffiliateCompany) => {
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!companyToDelete) return;
    
    try {
      await axios.delete(`/api/affiliates/companies/${companyToDelete.id}`);
      
      toast({
        title: 'Éxito',
        description: `Empresa afiliada ${companyToDelete.name} eliminada correctamente`,
      });
      
      // Actualizar lista
      fetchCompanies();
    } catch (error) {
      console.error('Error al eliminar empresa:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar la empresa afiliada'
      });
    } finally {
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      active: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Convertir keywords de string a array
      const keywordsArray = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
      
      const payload = {
        name: formData.name,
        description: formData.description || null,
        logo_url: formData.logo_url || null,
        affiliate_url: formData.affiliate_url,
        keywords: keywordsArray,
        active: formData.active
      };
      
      if (dialogMode === 'create') {
        await axios.post('/api/affiliates/companies', payload);
        toast({
          title: 'Éxito',
          description: 'Empresa afiliada creada correctamente',
        });
      } else {
        await axios.put(`/api/affiliates/companies/${currentCompanyId}`, payload);
        toast({
          title: 'Éxito',
          description: 'Empresa afiliada actualizada correctamente',
        });
      }
      
      // Cerrar diálogo y actualizar lista
      setOpenDialog(false);
      fetchCompanies();
    } catch (error: any) {
      console.error('Error al guardar empresa:', error);
      
      // Mostrar mensaje de error específico si está disponible
      const errorMessage = error.response?.data?.error || 'No se pudo guardar la empresa afiliada';
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    }
  };
  
  // Abrir el diálogo de importación masiva
  const handleOpenBulkImport = () => {
    setBulkNames('');
    setBulkImportDialogOpen(true);
  };
  
  // Función para importar empresas en masa
  const handleBulkImport = async () => {
    if (bulkLoading) return;
    
    try {
      setBulkLoading(true);
      
      // Procesar los nombres de empresas
      const names = bulkNames
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      if (names.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se encontraron nombres válidos de empresas'
        });
        return;
      }
      
      // Enviar la solicitud al servidor
      const response = await axios.post('/api/affiliates/companies/bulk', {
        names
      });
      
      // Manejar la respuesta
      if (response.data.success) {
        toast({
          title: 'Éxito',
          description: response.data.message,
        });
        
        // Si hay empresas que fueron omitidas por duplicación, mostrar advertencia
        if (response.data.skippedCount > 0) {
          toast({
            title: 'Advertencia',
            description: `${response.data.skippedCount} empresas omitidas por estar duplicadas`,
          });
        }
        
        // Cerrar diálogo y actualizar lista
        setBulkImportDialogOpen(false);
        fetchCompanies();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.data.message || 'Error al crear empresas en masa'
        });
      }
    } catch (error: any) {
      console.error('Error al importar empresas en masa:', error);
      
      // Mostrar mensaje de error específico si está disponible
      const errorMessage = error.response?.data?.error || 'Error al crear empresas en masa';
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setBulkLoading(false);
    }
  };
  
  // Función para manejar la importación desde archivo
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      if (file.name.endsWith('.csv')) {
        // Si es un CSV, procesar como tal
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        if (lines.length === 1 && lines[0].includes(',')) {
          // Si hay una sola línea con comas, asumimos que es un CSV de una línea
          const names = lines[0].split(',').map(name => name.trim()).filter(Boolean);
          setBulkNames(names.join('\n'));
        } else {
          // Múltiples líneas
          setBulkNames(lines.join('\n'));
        }
      } else {
        // Si es un TXT u otro formato de texto, usamos como está
        setBulkNames(content);
      }
      
      toast({
        title: 'Archivo importado',
        description: 'Los nombres se han cargado correctamente',
      });
      
      // Limpiar el input file
      event.target.value = '';
    };
    
    reader.onerror = () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo leer el archivo'
      });
    };
    
    reader.readAsText(file);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configuración de Afiliados</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona las empresas afiliadas y sus enlaces para incluir en videos
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                // Mostrar un indicador de carga
                toast({
                  title: 'Escaneando...',
                  description: 'Buscando menciones de afiliados en todos los videos',
                });
                
                // Llamar al endpoint para escanear videos con un tiempo de espera mayor
                axios.post('/api/affiliates/scan-all-videos', {}, {
                  timeout: 120000 // 2 minutos de timeout para permitir que la operación termine
                })
                  .then(response => {
                    toast({
                      title: 'Escaneo completado',
                      description: response.data.message,
                    });
                  })
                  .catch(error => {
                    console.error('Error al escanear videos:', error);
                    // Mensaje de error más descriptivo basado en el tipo de error
                    let errorMessage = 'No se pudieron escanear los videos';
                    if (error.code === 'ECONNABORTED') {
                      errorMessage = 'La operación tardó demasiado tiempo. Intente nuevamente o con menos videos.';
                    } else if (error.code === 'ERR_NETWORK') {
                      errorMessage = 'Problema de conexión. Verifique su conexión a internet e intente nuevamente.';
                    } else if (error.response?.data?.error) {
                      errorMessage = error.response.data.error;
                    }
                    
                    toast({
                      variant: 'destructive',
                      title: 'Error',
                      description: errorMessage
                    });
                  });
              }} 
              variant="outline" 
              className="bg-blue-50 text-blue-600 hover:bg-blue-100"
            >
              <Search className="mr-2 h-4 w-4" /> Escanear Videos
            </Button>
            <Button 
              onClick={() => {
                if (window.confirm('¿Estás seguro de que deseas eliminar TODAS las empresas afiliadas? Esta acción no se puede deshacer.')) {
                  axios.delete('/api/affiliates/companies')
                    .then(response => {
                      toast({
                        title: 'Éxito',
                        description: `${response.data.deletedCount} empresas afiliadas eliminadas correctamente`,
                      });
                      fetchCompanies();
                    })
                    .catch(error => {
                      console.error('Error al eliminar todas las empresas:', error);
                      toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: error.response?.data?.error || 'No se pudieron eliminar las empresas'
                      });
                    });
                }
              }} 
              variant="outline" 
              className="bg-red-50 text-red-600 hover:bg-red-100"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar Todas
            </Button>
            <Button onClick={handleOpenBulkImport} variant="outline">
              <Upload className="mr-2 h-4 w-4" /> Importar en Masa
            </Button>
            <Button onClick={handleCreateCompany}>
              <Plus className="mr-2 h-4 w-4" /> Añadir Empresa
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No hay empresas afiliadas configuradas</p>
                <Button onClick={handleCreateCompany}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Crear Primera Empresa
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>URL de Afiliado</TableHead>
                    <TableHead>Palabras Clave</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        <a 
                          href={company.affiliate_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {company.affiliate_url}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {company.keywords.length > 0 ? (
                            company.keywords.map((keyword, idx) => (
                              <Badge key={idx} variant="outline">{keyword}</Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">Sin palabras clave</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.active ? (
                          <Badge className="bg-green-50 text-green-700 border-green-300">
                            <div className="flex items-center">
                              <Check className="h-3 w-3 mr-1" /> Activo
                            </div>
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <div className="flex items-center">
                              <X className="h-3 w-3 mr-1" /> Inactivo
                            </div>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCompany(company)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(company)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para crear/editar empresa */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Añadir Empresa Afiliada' : 'Editar Empresa Afiliada'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'create' 
                ? 'Agrega una nueva empresa y su enlace de afiliado' 
                : 'Modifica los detalles de la empresa afiliada'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  className="col-span-3"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="logo_url" className="text-right">
                  URL del Logo
                </Label>
                <Input
                  id="logo_url"
                  name="logo_url"
                  value={formData.logo_url}
                  onChange={handleFormChange}
                  className="col-span-3"
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="affiliate_url" className="text-right">
                  URL de Afiliado
                </Label>
                <Input
                  id="affiliate_url"
                  name="affiliate_url"
                  value={formData.affiliate_url}
                  onChange={handleFormChange}
                  className="col-span-3"
                  required
                  placeholder="https://ejemplo.com/?ref=tu_codigo"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="keywords" className="text-right">
                  Palabras Clave
                </Label>
                <Textarea
                  id="keywords"
                  name="keywords"
                  value={formData.keywords}
                  onChange={handleFormChange}
                  className="col-span-3"
                  rows={3}
                  placeholder="palabra1, palabra2, otra palabra"
                />
                <div className="col-span-4 col-start-2">
                  <p className="text-sm text-muted-foreground">
                    Separa las palabras clave con comas. Estas se usarán para detectar menciones de la empresa en títulos de videos.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="active" className="text-right">
                  Estado
                </Label>
                <div className="flex items-center gap-2 col-span-3">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={handleSwitchChange}
                  />
                  <span>{formData.active ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {dialogMode === 'create' ? 'Crear Empresa' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la empresa afiliada 
              <span className="font-semibold"> {companyToDelete?.name}</span>.
              No podrás recuperarla después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Eliminar Empresa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo para importación masiva */}
      <Dialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Importación Masiva de Empresas</DialogTitle>
            <DialogDescription>
              Agrega varias empresas afiliadas a la vez. Ingresa un nombre por línea o sube un archivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="bulk-names">Nombres de Empresas</Label>
                <div className="flex items-center">
                  <Label 
                    htmlFor="file-upload" 
                    className="cursor-pointer text-sm text-primary hover:underline flex items-center"
                  >
                    <FileText className="h-4 w-4 mr-1" /> Importar desde archivo
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </div>
              </div>
              <Textarea
                id="bulk-names"
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                rows={10}
                placeholder="Amazon&#10;Microsoft&#10;Google&#10;Apple"
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground mt-2">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Se crearán empresas con estos nombres. Los enlaces y palabras clave tendrán que configurarse manualmente después.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkImportDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkImport}
              disabled={bulkLoading || !bulkNames.trim()}
            >
              {bulkLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Importar Empresas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}