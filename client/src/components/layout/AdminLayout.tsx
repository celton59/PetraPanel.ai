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
    if (path.length < 2) return 'overview';
    return path[1]; // La segunda parte de la ruta después de 'admin'
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