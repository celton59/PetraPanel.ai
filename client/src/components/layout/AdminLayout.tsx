import React, { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

const adminSections = [
  { id: 'overview', label: 'Visión General', path: '/admin' },
  { id: 'stats', label: 'Estadísticas', path: '/admin/stats' },
  { id: 'accounting', label: 'Contabilidad', path: '/admin/accounting' },
  { id: 'youtube', label: 'YouTube', path: '/admin/youtube' },
  { id: 'afiliados', label: 'Afiliados', path: '/admin/afiliados' },
  { id: 'notifications', label: 'Notificaciones', path: '/admin/notifications' },
  { id: 'configuration', label: 'Configuración', path: '/admin/configuration' },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  
  const getCurrentSection = () => {
    // Extraer la sección actual de la URL
    const path = location.split('/').filter(Boolean);
    console.log('AdminLayout - Current location:', location);
    console.log('AdminLayout - Path parts:', path);
    
    if (path.length < 2) return 'overview';
    
    // La segunda parte de la ruta después de 'admin'
    const section = path[1];
    console.log('AdminLayout - Current section:', section);
    
    // Mapa de secciones principales y sus subsecciones
    const sectionMap: Record<string, string[]> = {
      'stats': ['user-activity', 'dashboard', 'videos'],
      'youtube': ['channels', 'videos', 'analytics', 'settings'],
      'afiliados': ['empresas', 'estadisticas', 'configuracion'],
      'accounting': ['rates', 'payments', 'history', 'reports'],
      'notifications': ['settings', 'templates'],
      'configuration': ['users', 'roles', 'permissions']
    };
    
    // Para URLs como /admin/stats/user-activity donde path[1] es 'stats'
    if (sectionMap[section]) {
      console.log('AdminLayout - Matched main section directly:', section);
      return section;
    }
    
    // Para URLs como /admin/user-activity donde path[1] podría ser una subsección
    // Buscar en qué sección principal está esta subsección
    for (const [mainSection, subsections] of Object.entries(sectionMap)) {
      if (subsections.includes(section)) {
        console.log('AdminLayout - Matched from subsection:', section, 'to main section:', mainSection);
        return mainSection;
      }
    }
    
    // Para rutas más profundas como /admin/stats/user-activity
    // donde necesitamos revisar la tercera parte de la URL
    if (path.length >= 3) {
      const subpath = path[2];
      console.log('AdminLayout - Checking subpath:', subpath);
      for (const [mainSection, subsections] of Object.entries(sectionMap)) {
        if (subsections.includes(subpath)) {
          console.log('AdminLayout - Matched from deep subpath:', subpath, 'to main section:', mainSection);
          return mainSection;
        }
      }
    }
    
    // Si no encontramos coincidencia, devolver la sección tal cual
    console.log('AdminLayout - No match found, using section as-is:', section);
    return section;
  };

  return (
    <div className="w-full space-y-6">
      <div className="border-b">
        <Tabs value={getCurrentSection()} className="w-full">
          <TabsList className="w-full justify-start h-12 bg-transparent p-0">
            {adminSections.map((section) => (
              <Link key={section.id} href={section.path}>
                <TabsTrigger
                  value={section.id}
                  className={cn(
                    "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4",
                    "data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                  )}
                >
                  {section.label}
                </TabsTrigger>
              </Link>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="container mx-auto px-4 py-2">
        {children}
      </div>
    </div>
  );
}