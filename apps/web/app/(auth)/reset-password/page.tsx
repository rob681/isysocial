"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { resetPasswordSchema } from "@isysocial/shared";
import type { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

type ResetForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: tokenData, isLoading: tokenLoading, error: tokenError } =
    trpc.auth.validateToken.useQuery(
      { token, type: "PASSWORD_RESET" },
      { enabled: !!token, retry: false }
    );

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setSuccess(true),
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  useEffect(() => {
    setValue("token", token);
  }, [token, setValue]);

  const onSubmit = async (data: ResetForm) => {
    await resetPassword.mutateAsync(data);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <p className="text-destructive">Enlace inválido.</p>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al inicio de sesión
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
        <Card className="max-w-md w-full shadow-soft text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">¡Contraseña actualizada!</h2>
            <p className="text-muted-foreground text-sm">
              Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <Button
              className="gradient-primary text-white"
              onClick={() => router.push("/login")}
            >
              Ir al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img
              src="/logo-full-normal.svg"
              alt="Isysocial"
              className="h-16 w-auto"
            />
          </div>
          <p className="text-muted-foreground text-sm">
            Gestión de contenido para agencias
          </p>
        </div>

        <Card className="shadow-soft border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">
              {tokenLoading ? "Verificando enlace..." : "Restablecer contraseña"}
            </CardTitle>
            <CardDescription>
              {tokenData?.userName
                ? `Hola ${tokenData.userName}, crea tu nueva contraseña`
                : "Crea tu nueva contraseña para acceder a tu cuenta"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tokenError ? (
              <div className="text-center space-y-4 py-4">
                <p className="text-destructive text-sm">
                  Este enlace es inválido o ha expirado.
                </p>
                <p className="text-muted-foreground text-xs">
                  Solicita un nuevo enlace de restablecimiento de contraseña.
                </p>
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver al inicio de sesión
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <input type="hidden" {...register("token")} />

                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      {...register("password")}
                      disabled={isSubmitting || tokenLoading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repite tu nueva contraseña"
                    {...register("confirmPassword")}
                    disabled={isSubmitting || tokenLoading}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {resetPassword.error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                    {resetPassword.error.message}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full gradient-primary text-white"
                  disabled={isSubmitting || tokenLoading}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Establecer nueva contraseña"
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Volver al inicio de sesión
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
