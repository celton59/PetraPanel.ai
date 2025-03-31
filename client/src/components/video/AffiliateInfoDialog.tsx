import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Info, ExternalLink } from "lucide-react";

interface AffiliateInfoDialogProps {
  trigger?: React.ReactNode;
  variant?: "icon" | "button";
}

export function AffiliateInfoDialog({ trigger, variant = "button" }: AffiliateInfoDialogProps) {
  const defaultTrigger = variant === "icon" ? (
    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-blue-500">
      <Info className="h-4 w-4" />
      <span className="sr-only">Instrucciones para enlaces</span>
    </Button>
  ) : (
    <Button variant="outline" size="sm" className="gap-2">
      <Info className="h-4 w-4" />
      <span>Instrucciones para enlaces</span>
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Instrucciones para enlaces en videos</DialogTitle>
          <DialogDescription>
            Consejos para mejorar la experiencia de tus espectadores
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 text-sm">
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Recordatorio importante
            </h3>
            <p>
              Si tu video contiene enlaces de afiliación, tienes que decir en el vídeo que en la descripción y en el comentario destacado tienen un enlace, para registrarse, comprar o lo que sea.
            </p>
          </div>
          
          <h3 className="font-semibold">¿Qué son los enlaces de afiliación?</h3>
          <p>
            Los enlaces de afiliación son URLs especiales que contienen un código de seguimiento único. 
            Cuando los espectadores hacen clic en estos enlaces y realizan una compra, tú o el canal reciben una comisión.
          </p>
          
          <h3 className="font-semibold">¿Por qué es importante mencionarlo?</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Mayor transparencia con tu audiencia</li>
            <li>Construye una relación de confianza con tus seguidores</li>
            <li>Mejora la experiencia del usuario</li>
          </ul>
          
          <h3 className="font-semibold">¿Dónde y cómo mencionar los enlaces?</h3>
          <div className="space-y-2">
            <p><strong>En el video (verbalmente):</strong></p>
            <p>
              Ejemplo: <em>"En la descripción y comentario destacado tienen un enlace para registrarse o comprar los productos que uso en este video."</em>
            </p>
          </div>
          
          <h3 className="font-semibold">Beneficios de hacerlo correctamente</h3>
          <p>
            Mencionar claramente los enlaces de afiliación tiene varias ventajas:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Mayor engagement con tu audiencia</li>
            <li>Aumento en el uso de tus enlaces de afiliación</li>
            <li>Mejor reputación como creador de contenido</li>
            <li>Relaciones más estables con marcas y programas de afiliados</li>
          </ul>
        </div>
        <DialogFooter>
          <Button type="submit">Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}