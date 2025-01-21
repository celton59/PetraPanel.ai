import { useState } from "react";
import { Profile, UserRole } from "@/types/user";
import { useUserStore } from "@/stores/userStore";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { PersonalInfoSection } from "./info/PersonalInfoSection";
import { SecuritySection } from "./security/SecuritySection";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const userFormSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido"),
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  bio: z.string().optional(),
  role: z.enum(["admin", "reviewer", "optimizer", "youtuber", "uploader"] as const),
  password: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserSettingsFormProps {
  user: Profile | null;
  onClose: () => void;
}

export function UserSettingsForm({ user, onClose }: UserSettingsFormProps) {
  const { createUser, updateUser } = useUserStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formDataToSubmit, setFormDataToSubmit] = useState<UserFormData | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<number[]>(
    Array.isArray(user?.projectAccess)
      ? user.projectAccess.map((p) => p.projectId)
      : []
  );
  const queryClient = useQueryClient();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      full_name: user?.fullName || "",
      username: user?.username || "",
      email: user?.email || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
      role: (user?.role as UserRole) || "uploader",
      password: "",
    },
  });

  const handleSubmit = async (data: UserFormData) => {
    setFormDataToSubmit(data);
    setShowConfirmDialog(true);
  };

  const confirmAndSubmit = async () => {
    if (!formDataToSubmit) return;

    if (!selectedProjects.length) {
      setError("Debe seleccionar al menos un proyecto");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const userData = {
        fullName: formDataToSubmit.full_name,
        username: formDataToSubmit.username,
        email: formDataToSubmit.email,
        phone: formDataToSubmit.phone || "",
        bio: formDataToSubmit.bio || "",
        role: formDataToSubmit.role,
        projectIds: selectedProjects,
        ...(formDataToSubmit.password && { password: formDataToSubmit.password }),
      };

      let success = false;

      if (user) {
        try {
          success = await updateUser(user.id, userData);
          if (!success) {
            throw new Error("Error al actualizar el usuario");
          }
        } catch (error) {
          console.error("Error updating user:", error);
          throw error;
        }
      } else {
        if (!formDataToSubmit.password) {
          setError("La contraseña es requerida para nuevos usuarios");
          return;
        }

        try {
          await createUser({
            ...userData,
            password: formDataToSubmit.password,
          });
          success = true;
        } catch (error) {
          console.error("Error creating user:", error);
          throw error;
        }
      }

      if (success) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["users"] }),
          queryClient.invalidateQueries({ queryKey: ["projects"] }),
          queryClient.invalidateQueries({ queryKey: ["user-projects"] }),
        ]);

        toast.success(
          user ? "Usuario actualizado correctamente" : "Usuario creado correctamente"
        );

        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (error: any) {
      console.error("Error en el formulario:", error);
      setError(error.message || (user ? "Error al actualizar usuario" : "Error al crear usuario"));
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              <PersonalInfoSection
                form={form}
                formData={{
                  full_name: form.watch("full_name"),
                  username: form.watch("username"),
                  email: form.watch("email"),
                  phone: form.watch("phone") || "",
                  bio: form.watch("bio") || "",
                }}
                setFormData={(data) => {
                  Object.entries(data).forEach(([key, value]) => {
                    form.setValue(key as keyof UserFormData, value as string);
                  });
                  form.trigger();
                }}
                isCheckingUsername={false}
                isCheckingEmail={false}
              />
            </div>

            <div className="space-y-6">
              <SecuritySection
                form={form}
                formData={{
                  role: form.watch("role"),
                  password: form.watch("password") || "",
                }}
                setFormData={(data) => {
                  Object.entries(data).forEach(([key, value]) => {
                    form.setValue(key as keyof UserFormData, value as string);
                  });
                  form.trigger();
                }}
                isEditing={!!user}
                currentUser={user}
                selectedProjects={selectedProjects}
                setSelectedProjects={setSelectedProjects}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !form.formState.isValid}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {user ? "Actualizando..." : "Creando..."}
                </>
              ) : (
                user ? "Actualizar" : "Crear"
              )}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar {user ? 'actualización' : 'creación'}?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas {user ? 'actualizar' : 'crear'} este usuario?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              disabled={isSubmitting} 
              onClick={confirmAndSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}