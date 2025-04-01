import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsOverview } from './StatsOverview';
import { PerformanceStats } from '@/components/dashboard/PerformanceStats';
import { VideoStats } from '@/components/dashboard/VideoStats';
import { UsersList } from '@/components/dashboard/UsersList';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, BarChart, FileDown, Users } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { MoneyIcon, TasksIcon, PendingIcon } from "@/components/CustomIcons";

export default function AdminStatsPage() {
  const [timeRange, setTimeRange] = useState("month");
  const [exportFormat, setExportFormat] = useState("pdf");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl font-bold">Estadísticas del Sistema</h1>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mes</SelectItem>
                <SelectItem value="quarter">Último trimestre</SelectItem>
                <SelectItem value="year">Último año</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" className="gap-1">
                <FileDown className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </div>

        {/* Tarjetas de estadísticas resumidas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Usuarios Activos"
            value="32"
            change="+8% vs mes anterior"
            isPositive={true}
            icon={Users}
          />
          <StatsCard
            title="Videos Procesados"
            value="128"
            change="+15% vs mes anterior"
            isPositive={true}
            icon={TasksIcon}
          />
          <StatsCard
            title="Ingresos Totales"
            value="$15,280.00"
            change="+12% vs mes anterior"
            isPositive={true}
            icon={MoneyIcon}
          />
          <StatsCard
            title="Tareas Pendientes"
            value="24"
            change="-5% vs mes anterior"
            isPositive={true}
            icon={PendingIcon}
          />
        </div>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full max-w-md grid grid-cols-5">
            <TabsTrigger value="overview">General</TabsTrigger>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="activity" asChild>
              <a href="/admin/stats/user-activity" className="flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Actividad
              </a>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="py-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle>Métricas Generales</CardTitle>
                    <CardDescription>Estadísticas clave del sistema</CardDescription>
                  </div>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <StatsOverview mode="detailed" showDetailedCharts showTables showExportOptions />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="performance" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas de Rendimiento</CardTitle>
                <CardDescription>Análisis detallado del rendimiento del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <PerformanceStats />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="videos" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas de Videos</CardTitle>
                <CardDescription>Análisis de contenido y procesamiento de videos</CardDescription>
              </CardHeader>
              <CardContent>
                <VideoStats />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="users" className="py-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Usuarios Activos</CardTitle>
                  <CardDescription>Lista de usuarios más activos en el sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <UsersList />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Actividad Reciente</CardTitle>
                  <CardDescription>Últimas acciones realizadas en el sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentActivity />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}