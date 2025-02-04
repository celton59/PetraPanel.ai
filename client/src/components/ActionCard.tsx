import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor?: string;
  iconBgColor?: string;
  className?: string;
  onClick?: () => void;
}

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
        "transition-all duration-200 hover:scale-[1.02] cursor-pointer",
        "group hover:shadow-lg dark:hover:shadow-primary/5",
        className
      )}
      onClick={onClick}
    >
      <div className="p-4 md:p-6">
        <motion.div 
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
            "transition-all duration-200 group-hover:scale-110",
            iconBgColor
          )}
          animate={{
            y: [0, -8, -4, -8, 0],
            x: [0, -2, 2, -2, 0],
            rotate: [0, -5, 5, -5, 0],
            scale: [1, 1.15, 1.05, 1.15, 1],
            filter: [
              "brightness(1) drop-shadow(0 0 0 #ff6b6b)",
              "brightness(1.4) drop-shadow(0 4px 8px #ff6b6b)",
              "brightness(1.2) drop-shadow(0 2px 4px #ff6b6b)",
              "brightness(1.4) drop-shadow(0 4px 8px #ff6b6b)",
              "brightness(1) drop-shadow(0 0 0 #ff6b6b)"
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.25, 0.5, 0.75, 1]
          }}
          style={{
            position: 'relative'
          }}
          whileHover={{
            scale: 1.3,
            rotate: [0, -20, 20, 0],
            transition: { duration: 0.3 }
          }}
        >
          <Icon className={cn("w-6 h-6", iconColor)} />
        </motion.div>
        <h3 className="font-semibold text-lg mb-1.5 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </Card>
  );
};

export default ActionCard;
