"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Camera,
  Save,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Shield,
  Calendar,
  Building2,
  CheckCircle2,
  X,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  ADMIN: "Administrador",
  EDITOR: "Editor",
  CLIENTE: "Cliente",
  SOPORTE: "Soporte",
  FACTURACION: "Facturación",
};

export default function PerfilPage() {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile data
  const { data: profile, isLoading, refetch } = trpc.profile.get.useQuery();

  // Form state
  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Mutations
  const updateProfile = trpc.profile.update.useMutation();
  const changePassword = trpc.profile.changePassword.useMutation();

  const displayName = name ?? profile?.name ?? "";
  const displayPhone = phone ?? profile?.phone ?? "";

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({
        name: displayName.trim(),
        phone: displayPhone.trim() || null,
      });
      toast({ title: "Perfil actualizado", description: "Tus datos se guardaron correctamente." });
      refetch();
      // Update session to reflect new name
      await updateSession({ name: displayName.trim() });
      setName(null);
      setPhone(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "La imagen no puede pesar más de 2MB", variant: "destructive" });
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Error", description: "Solo se permiten imágenes JPG, PNG o WebP", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "avatars");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Error al subir la imagen");

      const { url } = await res.json();
      await updateProfile.mutateAsync({ avatarUrl: url });
      toast({ title: "Avatar actualizado" });
      refetch();
      await updateSession({});
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "No se pudo subir la imagen", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateProfile.mutateAsync({ avatarUrl: null });
      toast({ title: "Avatar eliminado" });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast({ title: "Error", description: "Ingresa tu contraseña actual", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "La nueva contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword.mutateAsync({
        currentPassword,
        newPassword,
      });
      toast({ title: "Contraseña actualizada", description: "Tu contraseña se cambió correctamente." });
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  const hasProfileChanges =
    (name !== null && name !== profile?.name) ||
    (phone !== null && phone !== (profile?.phone ?? ""));

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Mi perfil" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-3xl">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Mi perfil" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto w-full">
        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative group">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/10"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-white text-2xl font-bold ring-4 ring-primary/10">
                    {profile?.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              <div className="text-center sm:text-left flex-1">
                <h2 className="text-xl font-bold">{profile?.name}</h2>
                <p className="text-muted-foreground">{profile?.email}</p>
                <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    <Shield className="h-3 w-3" />
                    {ROLE_LABELS[profile?.role ?? ""] ?? profile?.role}
                  </span>
                  {profile?.agency && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground font-medium">
                      <Building2 className="h-3 w-3" />
                      {profile.agency.name}
                    </span>
                  )}
                </div>
                {profile?.avatarUrl && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="text-xs text-muted-foreground hover:text-destructive mt-2 underline"
                  >
                    Eliminar foto
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Información personal
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nombre</Label>
                <Input
                  id="profile-name"
                  value={displayName}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email" className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </Label>
                <Input
                  id="profile-email"
                  value={profile?.email ?? ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-[11px] text-muted-foreground">El email no se puede cambiar</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-phone" className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  Teléfono
                </Label>
                <Input
                  id="profile-phone"
                  value={displayPhone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 55 1234 5678"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Miembro desde
                </Label>
                <Input
                  value={
                    profile?.createdAt
                      ? format(new Date(profile.createdAt), "d 'de' MMMM, yyyy", { locale: es })
                      : ""
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {hasProfileChanges && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="gradient-primary text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar cambios
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Seguridad
            </h3>
          </CardHeader>
          <CardContent>
            {!showPasswordForm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Contraseña</p>
                  <p className="text-xs text-muted-foreground">Cambia tu contraseña de acceso</p>
                </div>
                <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
                  <Lock className="mr-2 h-4 w-4" />
                  Cambiar contraseña
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contraseña actual</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPw ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nueva contraseña</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
                    )}
                    {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Las contraseñas coinciden
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    disabled={changingPassword}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                    className="gradient-primary text-white"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cambiando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Cambiar contraseña
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tour guiado */}
        <TourResetButton />
      </main>
    </div>
  );
}

/* ─── Tour Reset Button ─────────────────────────────────────────── */
function TourResetButton() {
  const { toast } = useToast();
  const resetMutation = trpc.profile.resetOnboarding.useMutation({
    onSuccess: () => {
      toast({
        title: "Tour reiniciado",
        description: "El tour guiado se mostrara al recargar la pagina.",
      });
      setTimeout(() => window.location.reload(), 1200);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo reiniciar el tour.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <RotateCcw className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Tour guiado</p>
            <p className="text-xs text-muted-foreground">
              Vuelve a ver el recorrido por la plataforma
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
        >
          {resetMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reiniciar
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
