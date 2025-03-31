import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SuggestionForm } from '@/components/suggestions/SuggestionForm';
import { UserSuggestionList } from '@/components/suggestions/UserSuggestionList';
import { AdminSuggestionList } from '@/components/suggestions/AdminSuggestionList';
import { useUser } from '@/hooks/use-user';
import { MessageSquareHeart, Lightbulb, Sparkles } from 'lucide-react';
import { useSuggestions } from '@/hooks/useSuggestions';

export default function SuggestionsPage() {
  const { user } = useUser();
  const { userSuggestions, allSuggestions } = useSuggestions();
  const isAdmin = user?.role === 'admin';
  
  // Contar sugerencias para mostrar estadísticas
  const userSuggestionsCount = userSuggestions.data?.length || 0;
  const totalSuggestions = isAdmin ? (allSuggestions.data?.length || 0) : 0;
  const pendingSuggestions = isAdmin 
    ? allSuggestions.data?.filter(s => s.status === 'pending').length || 0
    : 0;
  const implementedSuggestions = isAdmin
    ? allSuggestions.data?.filter(s => s.status === 'implemented').length || 0
    : 0;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {/* Encabezado con gradiente y animación subtle */}
      <div className="relative mb-8 overflow-hidden rounded-xl bg-gradient-to-r from-violet-500/10 via-primary/10 to-indigo-400/10 p-8 border border-primary/20">
        <div className="absolute inset-0 bg-grid-primary/5 [mask-image:linear-gradient(0deg,transparent,#000)]"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageSquareHeart className="h-8 w-8 text-primary" />
              <span>Sistema de Sugerencias</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Tu opinión es fundamental para la evolución de PetraPanel. Comparte tus ideas, identifica problemas o solicita nuevas funciones para ayudarnos a mejorar.
            </p>
          </div>
          
          {isAdmin && !allSuggestions.isLoading && (
            <div className="flex flex-wrap md:flex-nowrap gap-4">
              <div className="flex-1 min-w-[120px] rounded-lg border bg-card p-3 shadow-sm">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totalSuggestions}</p>
              </div>
              <div className="flex-1 min-w-[120px] rounded-lg border bg-card p-3 shadow-sm">
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-amber-500">{pendingSuggestions}</p>
              </div>
              <div className="flex-1 min-w-[120px] rounded-lg border bg-card p-3 shadow-sm">
                <p className="text-sm text-muted-foreground">Implementadas</p>
                <p className="text-2xl font-bold text-emerald-500">{implementedSuggestions}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna izquierda - Formulario de envío */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl shadow-sm p-6 border relative overflow-hidden">
            {/* Decoración sutil en el fondo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 z-0"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full -ml-12 -mb-12 z-0"></div>
            
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">
                  Envía tu sugerencia
                </h2>
              </div>
              
              <p className="text-muted-foreground mb-6">
                Tus ideas son valiosas para mejorar PetraPanel. Comparte tus sugerencias y ayúdanos a crear una mejor experiencia para todos.
              </p>
              
              <SuggestionForm />
              
              {userSuggestionsCount > 0 && !userSuggestions.isLoading && (
                <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">¡Gracias por tus aportaciones!</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Has enviado {userSuggestionsCount} {userSuggestionsCount === 1 ? 'sugerencia' : 'sugerencias'} hasta ahora. 
                    Tus ideas ayudan a mejorar la plataforma para todos.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Columna derecha - Listados de sugerencias */}
        <div className="lg:col-span-2">
          {isAdmin ? (
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="admin" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  Administrar sugerencias
                </TabsTrigger>
                <TabsTrigger value="user" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  Mis sugerencias
                </TabsTrigger>
              </TabsList>
              <TabsContent value="admin">
                <AdminSuggestionList />
              </TabsContent>
              <TabsContent value="user">
                <UserSuggestionList />
              </TabsContent>
            </Tabs>
          ) : (
            <UserSuggestionList />
          )}
        </div>
      </div>
    </div>
  );
}