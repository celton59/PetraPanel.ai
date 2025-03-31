import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SuggestionForm } from '@/components/suggestions/SuggestionForm';
import { UserSuggestionList } from '@/components/suggestions/UserSuggestionList';
import { AdminSuggestionList } from '@/components/suggestions/AdminSuggestionList';
import { useUser } from '@/hooks/use-user';
import { MessageSquareHeart, Lightbulb, Sparkles, BarChart3 } from 'lucide-react';
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 80 }
    }
  };

  return (
    <motion.div 
      className="container mx-auto space-y-6 sm:space-y-8 py-6 px-4 md:px-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Encabezado principal */}
      <motion.div variants={itemVariants} className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquareHeart className="h-7 w-7 text-primary" />
          <span>Sistema de Sugerencias</span>
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Tu opinión es fundamental para la evolución de PetraPanel. Comparte tus ideas y ayúdanos a mejorar.
        </p>
      </motion.div>
      
      {/* Tarjetas de estadísticas (solo para admins) */}
      {isAdmin && !allSuggestions.isLoading && (
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <motion.div 
            variants={itemVariants}
            className="rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{totalSuggestions}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            variants={itemVariants}
            className="rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-amber-500/10">
                <MessageSquareHeart className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-xl font-bold text-amber-500">{pendingSuggestions}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            variants={itemVariants}
            className="rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-emerald-500/10">
                <Sparkles className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Implementadas</p>
                <p className="text-xl font-bold text-emerald-500">{implementedSuggestions}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted">
                <Lightbulb className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Enviadas por ti</p>
                <p className="text-xl font-bold">{userSuggestionsCount}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda - Formulario de envío */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <div className="bg-card rounded-lg shadow-sm p-6 border relative overflow-hidden">
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
                <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
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
        </motion.div>
        
        {/* Columna derecha - Listados de sugerencias */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          {isAdmin ? (
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="admin">
                  Administrar sugerencias
                </TabsTrigger>
                <TabsTrigger value="user">
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
        </motion.div>
      </motion.div>
    </motion.div>
  );
}