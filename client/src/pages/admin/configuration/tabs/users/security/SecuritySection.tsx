import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { RoleSelector } from "./RoleSelector";
import { Shield, Lock } from "lucide-react";
import { UseFormReturn } from "react-hook-form"
import { ProjectSelector } from "./ProjectSelector";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { User } from "@db/schema";
import { UserFormData } from "../UserSettingsForm";

interface SecuritySectionProps {
  isEditing: boolean;
  selectedProjects: number[];
  setSelectedProjects: (projects: number[]) => void;
  form: UseFormReturn<any>;
  formData: UserFormData;
  setFormData: (data: Partial<UserFormData>) => void;
}

export function SecuritySection ({
  isEditing,
  selectedProjects,
  setSelectedProjects,
  form,
  formData,
  setFormData,
}: SecuritySectionProps) {
  // Monitorear el rol seleccionado para mostrar opciones adicionales
  const selectedRole = form.watch("role");
  const isYoutuber = selectedRole === "youtuber";

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary/70" />
          <h3 className="text-lg font-medium">Seguridad y Permisos</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Configura la seguridad y los permisos del usuario.
        </p>
      </div>

      <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center space-x-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span>{isEditing ? "Nueva contraseña" : "Contraseña"}</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  {...field}
                  value={field.value || ''}
                  placeholder={isEditing ? "Nueva contraseña (dejar vacío para mantener)" : "Contraseña segura"}
                />
              </FormControl>
              <FormDescription className="text-xs">
                {isEditing ? "Como administrador, puedes cambiar la contraseña del usuario" : "Establece una contraseña segura"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

      <FormField
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span>Rol del usuario</span>
            </FormLabel>
            <FormControl>
              <RoleSelector 
                value={field.value ?? "youtuber"}
                onChange={(value: User['role']) => {
                  field.onChange(value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Mostrar los campos de límites de videos solo para youtubers */}
      {isYoutuber && (
        <>
          <FormField
            control={form.control}
            name="maxAssignedVideos"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>Límite de videos asignados</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    value={field.value || 50}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Número máximo de videos que este youtuber puede tener asignados simultáneamente. El valor predeterminado es 50.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxMonthlyVideos"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>Límite mensual de videos</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    value={field.value || 50}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Número máximo de videos que este youtuber puede completar durante un mes. El valor predeterminado es 50.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}

      <div className="space-y-3">
        <FormLabel className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span>Acceso a proyectos</span>
        </FormLabel>
        <ProjectSelector
          selectedProjects={selectedProjects}
          setSelectedProjects={(projects) => {
            console.log("Proyectos seleccionados:", projects);
            setSelectedProjects(projects);
          }}
        />
        <p className="text-sm text-muted-foreground">
          Selecciona los proyectos a los que el usuario tendrá acceso
        </p>
      </div>
    </Card>
  );
};