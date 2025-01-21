import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { RoleSelector } from "../RoleSelector";
import { Shield, Lock } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { Profile, UserRole } from "@/types/user";
import { ProjectSelector } from "@/components/users/project-selector/ProjectSelector";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface SecuritySectionProps {
  formData: {
    role: UserRole;
    password?: string;
  };
  setFormData: (data: Partial<SecuritySectionProps['formData']>) => void;
  isEditing: boolean;
  currentUser: Profile | null;
  selectedProjects: number[];
  setSelectedProjects: (projects: number[]) => void;
  form: UseFormReturn<{
    full_name: string;
    username: string;
    email: string;
    phone?: string;
    bio?: string;
    role: UserRole;
    password?: string;
  }>;
}

export const SecuritySection = ({
  formData,
  setFormData,
  isEditing,
  currentUser,
  selectedProjects,
  setSelectedProjects,
  form,
}: SecuritySectionProps) => {
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
                value={field.value}
                onChange={(value: UserRole) => {
                  field.onChange(value);
                  setFormData({ ...formData, role: value });
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

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