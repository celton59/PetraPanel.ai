import React, { useState } from 'react';
import { Link } from 'wouter';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentIcon, MoneyIcon, TasksIcon, PendingIcon } from "@/components/CustomIcons";
import StatsCard from "@/components/StatsCard";
import { ArrowRight, BarChart, Settings, Users, FileText, BarChart2, Server, User, DatabaseIcon, Bell, Link as LinkIcon, MessageSquareHeart, Youtube, Activity } from "lucide-react";
import ActionCard from '@/components/ActionCard';
import { RolesTab } from './configuration/tabs/roles/RolesTab';
import { UsersTab } from './configuration/tabs/users/UsersTab';
import { ProjectsTab } from './configuration/tabs/project/ProjectsTab';
import { SuggestionsWidget } from '@/components/suggestions/SuggestionsWidget';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [settingsSection, setSettingsSection] = useState('users');

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          
          <div className="flex gap-2">
            <Button 
              variant={activeTab === 'dashboard' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveTab('dashboard')}
            >
              <BarChart className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button 
              variant={activeTab === 'settings' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </Button>
          </div>
        </div>
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Usuarios Activos"
                value="32"
                change="+8% vs mes anterior"
                isPositive={true}
                icon={Users}
              />
              <StatsCard
                title="Proyectos"
                value="15"
                change="+2 nuevos"
                isPositive={true}
                icon={FileText}
              />
              <StatsCard
                title="Videos Procesados"
                value="128"
                change="+15% vs mes anterior"
                isPositive={true}
                icon={TasksIcon}
              />
              <SuggestionsWidget />
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Actividad Reciente</CardTitle>
                  <CardDescription>Últimas actividades del sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-4 border-b pb-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <TasksIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Nuevo video optimizado</p>
                          <p className="text-sm text-muted-foreground">
                            Por <span className="font-medium">Carlos Medina</span> • Hace {i} hora(s)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" size="sm" className="ml-auto" asChild>
                    <Link href="/admin/stats">
                      Ver más actividades
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Resumen Financiero</CardTitle>
                  <CardDescription>Datos financieros del mes actual</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Ingresos</span>
                      <span className="font-medium">$12,580.00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Gastos</span>
                      <span className="font-medium">$5,280.00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pendiente</span>
                      <span className="font-medium">$2,150.00</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Balance</span>
                        <span className="font-bold text-primary">$7,300.00</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" size="sm" className="ml-auto" asChild>
                    <Link href="/admin/accounting">
                      Ver contabilidad
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* Sección: Estadísticas */}
              <div className="xl:col-span-4 mt-2 mb-0">
                <h2 className="text-lg font-semibold mb-2">Estadísticas y Análisis</h2>
              </div>
              <Link href="/admin/stats">
                <ActionCard
                  icon={BarChart2}
                  title="Estadísticas Generales"
                  description="Accede a información detallada sobre el rendimiento del sistema, usuarios y videos."
                  iconColor="text-blue-500"
                  iconBgColor="bg-blue-50 dark:bg-blue-900/20"
                />
              </Link>
              <Link href="/admin/stats/user-activity">
                <ActionCard
                  icon={Activity}
                  title="Actividad de Usuarios"
                  description="Consulta y filtra las acciones realizadas por los usuarios con estadísticas detalladas."
                  iconColor="text-cyan-500"
                  iconBgColor="bg-cyan-50 dark:bg-cyan-900/20"
                />
              </Link>
              <Link href="/admin/accounting">
                <ActionCard
                  icon={MoneyIcon}
                  title="Gestión Contable"
                  description="Administra pagos, tarifas y consulta informes financieros."
                  iconColor="text-green-500"
                  iconBgColor="bg-green-50 dark:bg-green-900/20"
                />
              </Link>
              
              {/* Sección: Gestión y Contenido */}
              <div className="xl:col-span-4 mt-8 mb-0">
                <h2 className="text-lg font-semibold mb-2">Gestión y Contenido</h2>
              </div>
              <Link href="/admin/youtube">
                <ActionCard
                  icon={Youtube}
                  title="Canales YouTube"
                  description="Gestiona los canales de YouTube, autorizaciones y publicación de videos."
                  iconColor="text-red-500"
                  iconBgColor="bg-red-50 dark:bg-red-900/20"
                />
              </Link>
              <Link href="/admin/afiliados">
                <ActionCard
                  icon={LinkIcon}
                  title="Empresas Afiliadas"
                  description="Gestiona las empresas afiliadas y sus enlaces para videos."
                  iconColor="text-indigo-500"
                  iconBgColor="bg-indigo-50 dark:bg-indigo-900/20"
                />
              </Link>
              
              {/* Sección: Sistema */}
              <div className="xl:col-span-4 mt-8 mb-0">
                <h2 className="text-lg font-semibold mb-2">Sistema y Configuración</h2>
              </div>
              <Link href="/admin/notifications">
                <ActionCard
                  icon={Bell}
                  title="Notificaciones"
                  description="Gestiona y envía notificaciones a usuarios y grupos del sistema."
                  iconColor="text-amber-500"
                  iconBgColor="bg-amber-50 dark:bg-amber-900/20"
                />
              </Link>
              <Link href="/sugerencias">
                <ActionCard
                  icon={MessageSquareHeart}
                  title="Sugerencias"
                  description="Revisa y gestiona las sugerencias enviadas por los usuarios."
                  iconColor="text-rose-500"
                  iconBgColor="bg-rose-50 dark:bg-rose-900/20"
                />
              </Link>
              <ActionCard
                icon={Settings}
                title="Configuración"
                description="Personaliza ajustes del sistema, usuarios y permisos."
                iconColor="text-purple-500"
                iconBgColor="bg-purple-50 dark:bg-purple-900/20"
                onClick={() => setActiveTab('settings')}
              />
            </div>
          </>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Sistema</CardTitle>
                <CardDescription>Gestiona usuarios, proyectos y roles del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={settingsSection} onValueChange={setSettingsSection as any} className="w-full">
                  <TabsList className="w-full md:w-auto grid grid-cols-3 md:flex md:flex-row gap-1">
                    <TabsTrigger value="users" className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span className="hidden md:inline">Usuarios</span>
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span className="hidden md:inline">Proyectos</span>
                    </TabsTrigger>
                    <TabsTrigger value="roles" className="flex items-center gap-1">
                      <Server className="h-4 w-4" />
                      <span className="hidden md:inline">Roles</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="users" className="mt-6">
                    <UsersTab />
                  </TabsContent>
                  
                  <TabsContent value="projects" className="mt-6">
                    <ProjectsTab />
                  </TabsContent>
                  
                  <TabsContent value="roles" className="mt-6">
                    <RolesTab />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            <div className="flex justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => setActiveTab('dashboard')}
                className="mr-2"
              >
                Cancelar
              </Button>
              <Button onClick={() => setActiveTab('dashboard')}>
                Volver al Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}