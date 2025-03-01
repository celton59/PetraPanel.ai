import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor?: string;
  iconBgColor?: string;
  className?: string;
  onClick?: () => void;
}

// Definimos un array de partículas con sus respectivos desplazamientos y retrasos
const particles = [
  { x: 20, y: -20, delay: 0 },
  { x: -20, y: -20, delay: 0.1 },
  { x: 20, y: 20, delay: 0.2 },
  { x: -20, y: 20, delay: 0.3 },
  { x: 0, y: -30, delay: 0.15 },
  { x: 30, y: 0, delay: 0.25 },
  { x: 0, y: 30, delay: 0.35 },
  { x: -30, y: 0, delay: 0.45 },
];

// Componente de partícula: cada una es un pequeño círculo que sale del centro
const Particle = ({ x, y, delay }: { x: number; y: number; delay: number; }) => (
  <motion.div
    className="absolute w-2 h-2 bg-current rounded-full"
    initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
    animate={{ opacity: 0, scale: 0, x, y }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
  />
);

// Componente que envuelve al ícono y dispara el efecto de partículas al hacer hover
const IconWithParticles: React.FC<{ Icon: LucideIcon; iconColor: string; }> = ({ Icon, iconColor }) => {
  const [burst, setBurst] = useState(false);

  return (
    <motion.div
      className="relative flex items-center justify-center"
      onHoverStart={() => {
        setBurst(true);
        // Reiniciamos el estado después de la duración de la animación (700ms)
        setTimeout(() => setBurst(false), 700);
      }}
    >
      {/* Ícono principal */}
      <Icon className={cn("w-6 h-6", iconColor)} />
      {/* Si burst es true, se muestran las partículas */}
      <AnimatePresence>
        {burst &&
          particles.map((particle, index) => (
            <Particle
              key={index}
              x={particle.x}
              y={particle.y}
              delay={particle.delay}
            />
          ))
        }
      </AnimatePresence>
    </motion.div>
  );
};

const ActionCard = ({ 
  icon: Icon, 
  title, 
  description, 
  iconColor = "text-primary", 
  iconBgColor = "bg-primary/10",
  className,
  onClick 
}: ActionCardProps) => {
  return (
    <Card 
      className={cn(
        "transition-all duration-300 hover:scale-[1.02] cursor-pointer",
        "group hover:shadow-lg dark:hover:shadow-primary/10 relative",
        "border border-muted/60 rounded-xl overflow-hidden backdrop-blur-sm",
        className
      )}
      onClick={onClick}
    >
      {/* Decorative background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 opacity-70 z-0"></div>
      
      {/* Action card content */}
      <div className="p-5 md:p-6 z-10 relative">
        {/* Top corner accent */}
        <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-xl"></div>
        
        <motion.div 
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center mb-5",
            "shadow-sm transition-all duration-200 group-hover:scale-110",
            "border border-primary/10",
            iconBgColor
          )}
          whileHover={{ 
            scale: 1.2,
            rotate: [0, -10, 10, 0],
            transition: { duration: 0.3, repeat: Infinity }
          }}
          animate={{
            y: [0, -4, 0],
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0, -5, 0]
          }}
          transition={{
            duration: 3,
            ease: "easeInOut",
            repeat: Infinity
          }}
        >
          <IconWithParticles Icon={Icon} iconColor={iconColor} />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </motion.div>
        
        {/* Bottom accent */}
        <div className="w-10 h-1 bg-primary/20 rounded-full mt-4 group-hover:w-full transition-all duration-300"></div>
      </div>
    </Card>
  );
};

export default ActionCard;