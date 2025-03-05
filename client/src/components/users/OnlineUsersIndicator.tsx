import { useState } from "react";
import { useOnlineUsers, OnlineUser } from "../../hooks/use-online-users";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { AlertCircle, Users, Wifi, WifiOff } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export function OnlineUsersIndicator() {
  const { onlineUsers, isConnected, error, usingFallback } = useOnlineUsers();
  const [isOpen, setIsOpen] = useState(false);

  // Si no hay conexión o no hay usuarios, mostrar un indicador de desconectado
  if (!isConnected && !onlineUsers.length) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center p-1.5 text-yellow-500 hover:text-yellow-600 cursor-help">
              <WifiOff size={16} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sin conexión a usuarios en línea</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const activeUserCount = onlineUsers.length;
  const MAX_AVATARS = 3; // Máximo número de avatares a mostrar

  // No mostrar nada si no hay usuarios activos
  if (activeUserCount === 0) {
    return null;
  }

  // Formatear tiempo relativo (ej: "hace 2 min")
  function getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);

    if (diffInSeconds < 60) {
      return 'ahora';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `hace ${minutes} min`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `hace ${hours}h`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `hace ${days}d`;
    }
  }

  // Obtener inicial del nombre de usuario
  function getUserInitial(username: string): string {
    return username.charAt(0).toUpperCase();
  }

  function getAvatarColor(userId: number): string {
    // Colores de avatar basados en el ID de usuario
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-rose-500",
      "bg-purple-500",
      "bg-teal-500",
      "bg-orange-500",
      "bg-cyan-500",
    ];
    
    // Usar módulo para seleccionar un color basado en el ID
    return colors[userId % colors.length];
  }

  function renderUserAvatars() {
    // Primeros N avatares + contador si hay más
    return (
      <div className="flex items-center -space-x-2">
        {onlineUsers.slice(0, MAX_AVATARS).map((user) => (
          <Avatar
            key={user.userId}
            className="h-6 w-6 border border-background"
          >
            <AvatarImage src={`/api/users/${user.userId}/avatar`} />
            <AvatarFallback className={getAvatarColor(user.userId)}>
              {getUserInitial(user.username)}
            </AvatarFallback>
          </Avatar>
        ))}
        
        {activeUserCount > MAX_AVATARS && (
          <Avatar className="h-6 w-6 border border-background bg-muted">
            <AvatarFallback>+{activeUserCount - MAX_AVATARS}</AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  }

  function renderUsersList() {
    return (
      <ScrollArea className="h-[300px] w-full">
        <div className="space-y-4 p-4">
          <h4 className="text-sm font-medium leading-none">Usuarios conectados</h4>
          <p className="text-xs text-muted-foreground mb-4">
            {activeUserCount} {activeUserCount === 1 ? "usuario" : "usuarios"} en línea
          </p>
          
          <div className="space-y-3">
            {onlineUsers.map((user) => (
              <div key={user.userId} className="flex items-center gap-3">
                <span className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`/api/users/${user.userId}/avatar`} />
                    <AvatarFallback className={getAvatarColor(user.userId)}>
                      {getUserInitial(user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-1 ring-background" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{user.username}</p>
                  <p className="text-xs text-muted-foreground">
                    Activo {getRelativeTime(user.lastActivity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <HoverCard open={isOpen} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        <div 
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs",
            "transition-colors cursor-pointer hover:bg-muted",
            usingFallback && "border-yellow-200 dark:border-yellow-800"
          )}
        >
          {usingFallback ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <AlertCircle size={14} className="text-yellow-500 mr-1" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Modo alternativo: Actualización periódica</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Wifi size={14} className="text-green-500" />
          )}
          <span className="font-medium">{activeUserCount}</span>
          {renderUserAvatars()}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="start">
        {usingFallback && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-500 p-2 mb-3 text-xs text-yellow-800 dark:text-yellow-300">
            Usando modo alternativo: la información se actualiza periódicamente.
          </div>
        )}
        {renderUsersList()}
      </HoverCardContent>
    </HoverCard>
  );
}