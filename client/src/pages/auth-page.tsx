import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/use-user";
import { useForm } from "react-hook-form";
import { CircleUserRound, LogIn, Lock, User, EyeIcon, EyeOffIcon } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

export default function AuthPage() {
  const { login } = useUser();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      username: "hola",
      password: "1234",
    },
  });

  const onSubmit = async (data: { username: string; password: string }) => {
    setIsLoading(true);
    try {
      await login(data);
      setLocation("/");
      toast.success("¡Bienvenido!", { description: "Has iniciado sesión correctamente" });
    } catch (error: any) {
      toast.error("Error", {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-10 bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <div className="w-full max-w-lg space-y-8">
        {/* Header Section */}
        <div className="flex flex-col items-center space-y-6 text-center">
          <div className="relative">
            {/* Halo effect behind logo */}
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse"></div>
            {/* Logo container */}
            <div className="relative bg-gradient-to-br from-primary/10 to-primary/20 p-5 rounded-full backdrop-blur-sm ring-1 ring-primary/20 shadow-lg overflow-hidden hover:shadow-primary/20 transition-all duration-300">
              {/* Video icon with animation effect */}
              <div className="relative">
                <div className="absolute inset-0 bg-primary/10 animate-ping rounded-full opacity-75"></div>
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="w-14 h-14 text-primary"
                >
                  <defs>
                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="currentColor" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  {/* Monitor screen */}
                  <rect x="2" y="4" width="20" height="12" rx="2" stroke="url(#logoGradient)" strokeWidth="2" fill="none" />
                  {/* Play button */}
                  <polygon points="10,8 16,10 10,12" fill="url(#logoGradient)" />
                  {/* Stand */}
                  <path d="M8 16L8 18L16 18L16 16" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round" />
                  <rect x="7" y="18" width="10" height="2" rx="1" fill="url(#logoGradient)" />
                </svg>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              ¡Bienvenido a PetraPanel!
            </h1>
            <p className="text-base md:text-lg text-muted-foreground/80 max-w-sm mx-auto">
              Tu plataforma avanzada para gestionar y optimizar tus videos de YouTube
            </p>
          </div>
        </div>

        {/* Auth Form Card */}
        <Card className="border-border/40 backdrop-blur-sm bg-card/90 shadow-xl">
          <CardContent className="pt-14 px-8 md:px-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2 pt-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <User size={18} className="text-muted-foreground" />
                      Nombre de usuario
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="Ingresa tu nombre de usuario"
                        {...form.register("username", { required: true })}
                        className="h-12 pl-4"
                      />
                    </div>
                    {form.formState.errors.username && (
                      <p className="text-destructive text-xs mt-1">Este campo es obligatorio</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Lock size={18} className="text-muted-foreground" />
                      Contraseña
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Ingresa tu contraseña"
                        {...form.register("password", { required: true })}
                        className="h-12 pr-10"
                      />
                      <button 
                        type="button"
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                      </button>
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-destructive text-xs mt-1">Este campo es obligatorio</p>
                    )}
                    <div className="flex justify-end">
                      <a
                        href="#"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        ¿Olvidaste tu contraseña?
                      </a>
                    </div>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-12 text-base gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Iniciando sesión...
                    </>
                  ) : (
                    <>
                      <LogIn size={18} />
                      Iniciar sesión
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="px-8 md:px-10 py-4 flex justify-center border-t border-border/20">
            <p className="text-sm text-muted-foreground">
              ¿No tienes una cuenta? {" "}
              <a href="#" className="text-primary hover:underline">
                Contacta al administrador
              </a>
            </p>
          </CardFooter>
        </Card>

        {/* Footer Text */}
        <p className="px-4 md:px-8 text-center text-xs md:text-sm text-muted-foreground">
          Al continuar, aceptas nuestros{" "}
          <a
            href="#"
            className="underline underline-offset-4 hover:text-primary transition-colors"
          >
            Términos de servicio
          </a>{" "}
          y{" "}
          <a
            href="#"
            className="underline underline-offset-4 hover:text-primary transition-colors"
          >
            Política de privacidad
          </a>
        </p>
      </div>
    </div>
  );
}