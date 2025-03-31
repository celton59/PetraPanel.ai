import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState } from "react";
import { UsersTab } from "./tabs/users/UsersTab";
import { RolesTab } from "./tabs/roles/RolesTab";
import { ProjectsTab } from "./tabs/project/ProjectsTab";
import { VideoFlowTab } from "./tabs/workflow/VideoFlowTab";
import { VideoLimitsTab } from "./tabs/limits/VideoLimitsTab";
import { RatesTab } from "../accounting/RatesTab";
import { FinanceConfigTab } from "../accounting/FinanceConfigTab";
import TitulinTab from "./tabs/titulin/TitulinTab";
import { EasterEggsTab } from "./tabs/easter-eggs/EasterEggsTab";
import ConfiguracionAfiliados from "@/pages/administracion/ConfiguracionAfiliados";
import YoutubeAdminPage from "@/pages/admin/youtube";

/**
 * Página de configuración del administrador que contiene diferentes pestañas
 * para gestionar configuraciones del sistema.
 */
export default function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState("usuarios");

  return (
    <AdminLayout>
      <div className="w-full space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">
            Gestiona la configuración global del sistema, usuarios, proyectos y flujos de trabajo.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="w-full justify-start h-12 mb-8 flex-wrap">
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="proyectos">Proyectos</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="workflow">Flujo de trabajo</TabsTrigger>
            <TabsTrigger value="limites">Límites de Videos</TabsTrigger>
            <TabsTrigger value="tarifas">Tarifas</TabsTrigger>
            <TabsTrigger value="finanzas">Configuración Financiera</TabsTrigger>
            <TabsTrigger value="titulin">Titulín</TabsTrigger>
            <TabsTrigger value="afiliados">Afiliados</TabsTrigger>
            <TabsTrigger value="youtube">YouTube</TabsTrigger>
            <TabsTrigger value="easter-eggs">Easter Eggs</TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="space-y-4">
            <UsersTab />
          </TabsContent>

          <TabsContent value="proyectos" className="space-y-4">
            <ProjectsTab />
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <RolesTab />
          </TabsContent>

          <TabsContent value="workflow" className="space-y-4">
            <VideoFlowTab />
          </TabsContent>

          <TabsContent value="limites" className="space-y-4">
            <VideoLimitsTab />
          </TabsContent>

          <TabsContent value="tarifas" className="space-y-4">
            <RatesTab />
          </TabsContent>

          <TabsContent value="finanzas" className="space-y-4">
            <FinanceConfigTab />
          </TabsContent>
          
          <TabsContent value="titulin" className="space-y-4">
            <TitulinTab />
          </TabsContent>
          
          <TabsContent value="easter-eggs" className="space-y-4">
            <EasterEggsTab />
          </TabsContent>
          
          <TabsContent value="afiliados" className="space-y-4">
            <ConfiguracionAfiliados />
          </TabsContent>
          
          <TabsContent value="youtube" className="space-y-4">
            <YoutubeAdminPage />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}