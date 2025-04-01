import { Bell, Home, Menu, Video, Languages, Leaf, Settings, Shield, Users, Info, MessageSquareHeart, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useRef, useEffect } from "react";
import { LogoWithBlink } from "./LogoWithBlink";
import { useNotifications } from "@/hooks/use-notifications";
import { MobileNotificationCenter } from "@/components/notifications/MobileNotificationCenter";
import { OnlineUsersIndicator } from "../users/OnlineUsersIndicator";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { useSwipeable } from "react-swipeable";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGlobalSearch } from "@/hooks/use-global-search";
import { ArrowRightFromLine, ArrowLeftFromLine } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { VersionInfo } from "./VersionInfo";

export function MobileNavBar() {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showSwipeHelp, setShowSwipeHelp] = useState(false);
  const { user } = useUser();
  const { unreadCount } = useNotifications();
  const { onlineUsers } = useOnlineUsers();
  const isMobile = useIsMobile();
  const { openSearch } = useGlobalSearch();

  const isAdmin = user?.role === 'admin';
  
  // Mostrar ayuda de gestos solo en la primera sesión del usuario
  useEffect(() => {
    // Verificar si es la primera vez que el usuario accede
    const hasSeenSwipeHelp = localStorage.getItem('hasSeenSwipeHelp');
    
    if (isMobile && !hasSeenSwipeHelp) {
      // Mostrar la ayuda después de un breve retraso
      setTimeout(() => {
        setShowSwipeHelp(true);
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
          setShowSwipeHelp(false);
          localStorage.setItem('hasSeenSwipeHelp', 'true');
        }, 5000);
      }, 1000);
    }
  }, [isMobile]);

  // Un conjunto reducido de elementos de navegación para la barra inferior
  const navItems = [
    { icon: Home, label: "Inicio", path: "/" },
    { icon: Video, label: "Videos", path: "/videos" },
    { icon: MessageSquareHeart, label: "Sugerencias", path: "/sugerencias" },
    // Botón de notificaciones con contador
    { 
      icon: Bell, 
      label: "Alertas", 
      path: "#notifications", 
      onClick: () => setIsNotificationsOpen(true),
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    // Solo mostrar menú completo para abrir el drawer
    { icon: Menu, label: "Menú", path: "#menu", onClick: () => setIsMenuOpen(true) }
  ];

  // Conjunto completo de elementos para el menú lateral
  const fullMenuItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: Video, label: "Videos", path: "/videos" },
    { icon: Leaf, label: "Titulin", path: "/titulin" },
    { icon: Languages, label: "Traductor", path: "/traductor" },
    { icon: MessageSquareHeart, label: "Sugerencias", path: "/sugerencias" },
    ...(isAdmin ? [
      { icon: Shield, label: "Administración", path: "/admin" }
    ] : []),
    { icon: Settings, label: "Configuración", path: "/profile" }
  ];

  const isActiveRoute = (path: string) => {
    if (path === '/') {
      return location === path;
    }
    if (path.startsWith('#')) return false;
    return location.startsWith(path);
  };

  // Configurar los manejadores de gestos táctiles
  const swipeHandlers = useSwipeable({
    onSwipedRight: () => {
      if (isMobile && !isMenuOpen) {
        setIsMenuOpen(true);
      }
    },
    onSwipedLeft: () => {
      if (isMobile && !isNotificationsOpen) {
        setIsNotificationsOpen(true);
      }
    },
    // Configuración para hacer que los gestos sean más responsivos
    trackMouse: false,
    trackTouch: true,
    delta: 10,       // Cantidad mínima de movimiento para considerar un swipe
    rotationAngle: 0
  });

  return (
    <>
      {/* Áreas para detectar los gestos táctiles en los bordes laterales */}
      {isMobile && (
        <>
          {/* Área para detectar swipe desde el borde izquierdo con indicador mejorado */}
          <div 
            {...swipeHandlers}
            className="md:hidden fixed top-0 bottom-0 left-0 w-12 z-20"
            aria-hidden="true"
          >
            <div className="absolute top-1/2 -mt-24 left-0 h-48 flex items-center">
              <div className="w-2 h-24 bg-gradient-to-b from-transparent via-primary/40 to-transparent rounded-r-full opacity-70 animate-pulse" />
              <div className="ml-1 w-[3px] h-16 bg-gradient-to-b from-transparent via-primary/20 to-transparent rounded-r-full opacity-60 animate-pulse" />
            </div>
          </div>
          
          {/* Área para detectar swipe desde el borde derecho con indicador mejorado */}
          <div 
            {...swipeHandlers}
            className="md:hidden fixed top-0 bottom-0 right-0 w-12 z-20"
            aria-hidden="true"
          >
            <div className="absolute top-1/2 -mt-24 right-0 h-48 flex items-center">
              <div className="ml-auto w-[3px] h-16 bg-gradient-to-b from-transparent via-primary/20 to-transparent rounded-l-full opacity-60 animate-pulse" />
              <div className="mr-auto w-2 h-24 bg-gradient-to-b from-transparent via-primary/40 to-transparent rounded-l-full opacity-70 animate-pulse" />
            </div>
          </div>
        </>
      )}
      
      {/* Barra de navegación fija en la parte inferior para móviles */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 py-1 px-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = !item.path.startsWith('#') && isActiveRoute(item.path);
            
            if (item.path.startsWith('#')) {
              return (
                <Button
                  key={item.label}
                  variant="ghost"
                  size="sm"
                  onClick={item.onClick}
                  className="flex flex-col items-center justify-center px-1 py-2 rounded-lg w-16 relative"
                >
                  <item.icon className={cn(
                    "h-5 w-5 mb-1",
                    item.path === '#notifications' && unreadCount > 0 
                      ? "text-primary animate-pulse" 
                      : "text-muted-foreground"
                  )} />
                  {item.badge && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-5 h-5 text-xs 
                      font-bold text-white bg-red-500 rounded-full px-1 animate-pulse">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </span>
                </Button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.path}
                className={cn(
                  "flex flex-col items-center justify-center px-1 py-2 rounded-lg w-16",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 mb-1",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Menú lateral completo */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent 
          side="left" 
          className="w-[280px] p-0"
          aria-label="Menú de navegación"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center p-4 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <LogoWithBlink iconSize={5} />
                <div className="flex flex-col">
                  <span className="font-bold text-sm bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    PetraPanel
                  </span>
                  <span className="text-[10px] -mt-0.5 text-muted-foreground/80">Video Studio</span>
                </div>
              </div>
            </div>
            
            {/* Botón de búsqueda */}
            <div className="p-3 border-b">
              <Button 
                variant="outline" 
                className="w-full justify-between text-sm gap-2 h-9"
                onClick={() => {
                  openSearch();
                  setIsMenuOpen(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span>Buscar en PetraPanel</span>
                </div>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>
            
            {/* Sección de usuarios en línea */}
            <div className="p-3 border-b">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-sm font-medium">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Usuarios en línea</span>
                  <span className="bg-primary/10 text-primary text-xs font-medium px-1.5 py-0.5 rounded-full ml-1">{onlineUsers.length}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {onlineUsers.length > 0 ? (
                  onlineUsers.slice(0, 5).map((user) => (
                    <div 
                      key={user.userId} 
                      className="flex items-center gap-1 bg-muted/40 rounded-full px-2 py-0.5 text-xs"
                    >
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                      <span className="font-medium">{user.username}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">No hay usuarios en línea</div>
                )}
                {onlineUsers.length > 5 && (
                  <div className="text-xs text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5">
                    +{onlineUsers.length - 5} más
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 p-4">
              <nav className="flex flex-col gap-2">
                {fullMenuItems.map((item) => {
                  const isActive = isActiveRoute(item.path);
                  return (
                    <Link
                      key={item.label}
                      href={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary/10 dark:bg-primary/20 text-primary shadow-sm border-l-4 border-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-l-4 hover:border-primary/40"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 transition-transform",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-sm transition-colors",
                        isActive ? "font-medium text-foreground" : "text-muted-foreground"
                      )}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="p-4 border-t bg-muted/30 text-xs text-center text-muted-foreground">
              <div className="flex items-center justify-center">
                <span>© PetraPanel 2025</span>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Panel de notificaciones optimizado para móvil */}
      <Sheet open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <SheetContent 
          side="right" 
          className="w-[320px] sm:w-[380px] p-0"
          aria-label="Centro de notificaciones"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg" id="notifications-heading">Notificaciones</h3>
              {unreadCount > 0 && (
                <div className="bg-primary/10 text-primary text-sm font-medium px-2 py-1 rounded-md">
                  {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
                </div>
              )}
            </div>
            <div 
              className="flex-1 overflow-hidden" 
              aria-labelledby="notifications-heading"
              role="region"
            >
              <MobileNotificationCenter />
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Ayuda de gestos táctiles para usuarios móviles */}
      <AnimatePresence>
        {showSwipeHelp && isMobile && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-4"
          >
            <div className="bg-background/90 backdrop-blur-md p-5 rounded-xl shadow-xl border border-primary/10 max-w-[330px] text-center">
              <div className="text-primary mb-1 flex justify-center">
                <span className="inline-block w-12 h-1 bg-primary/20 rounded-full" />
              </div>
              <h3 className="text-lg font-medium mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Navegación por gestos</h3>
              
              <div className="flex justify-between items-stretch gap-6 mb-5 mt-4">
                <div className="flex-1 flex flex-col items-center">
                  <motion.div 
                    className="rounded-xl bg-primary/10 p-3 mb-3 border border-primary/10"
                    initial={{ x: -10 }}
                    animate={{ x: 0 }}
                    transition={{ repeat: 2, duration: 0.8, delay: 0.5 }}
                  >
                    <ArrowRightFromLine className="h-6 w-6 text-primary" />
                  </motion.div>
                  <span className="text-sm">Desliza desde <br/><strong className="text-primary">borde izquierdo</strong></span>
                  <span className="text-xs text-muted-foreground mt-1">Abre el menú</span>
                </div>
                <div className="bg-muted/30 w-px h-auto rounded-full mx-2" />
                <div className="flex-1 flex flex-col items-center">
                  <motion.div 
                    className="rounded-xl bg-primary/10 p-3 mb-3 border border-primary/10"
                    initial={{ x: 10 }}
                    animate={{ x: 0 }}
                    transition={{ repeat: 2, duration: 0.8, delay: 1.5 }}
                  >
                    <ArrowLeftFromLine className="h-6 w-6 text-primary" />
                  </motion.div>
                  <span className="text-sm">Desliza desde <br/><strong className="text-primary">borde derecho</strong></span>
                  <span className="text-xs text-muted-foreground mt-1">Abre notificaciones</span>
                </div>
              </div>
              
              <div className="flex justify-center">
                <motion.div 
                  className="px-4 py-1.5 rounded-full text-xs bg-primary/10 text-primary font-medium"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  Este mensaje desaparecerá automáticamente
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}