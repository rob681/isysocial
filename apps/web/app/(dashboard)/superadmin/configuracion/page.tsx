"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Mail,
  MessageCircle,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Bell,
  FlaskConical,
  Upload,
  X,
} from "lucide-react";

export default function SuperAdminConfiguracionPage() {
  const { toast } = useToast();

  // ─── Query ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = trpc.platform.getGlobalConfig.useQuery();

  // ─── Email State ─────────────────────────────────────────────────────────────
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [resendApiKey, setResendApiKey] = useState("");
  const [emailFromAddress, setEmailFromAddress] = useState("noreply@isysocial.com");
  const [emailFromName, setEmailFromName] = useState("Isysocial");
  const [showResendKey, setShowResendKey] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");

  // ─── WhatsApp State ───────────────────────────────────────────────────────────
  const [waEnabled, setWaEnabled] = useState(false);
  const [waToken, setWaToken] = useState("");
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [showWaToken, setShowWaToken] = useState(false);

  // Populate form when data loads
  useEffect(() => {
    if (data) {
      setEmailEnabled(data.notificationEmailEnabled);
      setResendApiKey(data.resendApiKey);
      setEmailFromAddress(data.emailFromAddress);
      setEmailFromName(data.emailFromName);
      setWaEnabled(data.whatsappNotificationsEnabled);
      setWaToken(data.whatsappToken);
      setWaPhoneNumberId(data.whatsappPhoneNumberId);
    }
  }, [data]);

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();

  const updateConfig = trpc.platform.updateGlobalConfig.useMutation({
    onSuccess: () => {
      utils.platform.getGlobalConfig.invalidate();
      toast({ title: "Configuración guardada", description: "Los cambios se aplicaron correctamente." });
    },
    onError: (err) => {
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    },
  });

  const testEmail = trpc.platform.testEmail.useMutation({
    onSuccess: () => {
      toast({ title: "Email enviado", description: `Email de prueba enviado a ${testEmailTo}` });
    },
    onError: (err) => {
      toast({ title: "Error al enviar", description: err.message, variant: "destructive" });
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────
  function handleSaveEmail() {
    updateConfig.mutate({
      notificationEmailEnabled: emailEnabled,
      resendApiKey: resendApiKey || undefined,
      emailFromAddress,
      emailFromName,
    });
  }

  function handleSaveWhatsApp() {
    updateConfig.mutate({
      whatsappNotificationsEnabled: waEnabled,
      whatsappToken: waToken || undefined,
      whatsappPhoneNumberId: waPhoneNumberId || undefined,
    });
  }

  function handleTestEmail() {
    if (!testEmailTo) {
      toast({ title: "Ingresa un email destino", variant: "destructive" });
      return;
    }
    testEmail.mutate({ toEmail: testEmailTo });
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Configuración Global" />
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const hasNoResendKey = !resendApiKey && !(data?.resendApiKey);

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Configuración Global" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">

        {/* ── Email / Resend Section ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Email — Resend</CardTitle>
            </div>
            <CardDescription>
              Configura el envío de notificaciones por email usando Resend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Warning banner if no key */}
            {hasNoResendKey && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  No hay un API Key de Resend configurado. Las notificaciones por email no se enviarán.
                  Obtén tu clave en{" "}
                  <a
                    href="https://resend.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    resend.com
                  </a>
                  .
                </p>
              </div>
            )}

            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email-enabled" className="text-sm font-medium">
                  Notificaciones por email habilitadas
                </Label>
              </div>
              <button
                id="email-enabled"
                type="button"
                onClick={() => setEmailEnabled(!emailEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  emailEnabled ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-transform ${
                    emailEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Resend API Key */}
            <div className="space-y-1.5">
              <Label htmlFor="resend-key">Resend API Key</Label>
              <div className="relative">
                <Input
                  id="resend-key"
                  type={showResendKey ? "text" : "password"}
                  placeholder="re_xxxxxxxxxxxx"
                  value={resendApiKey}
                  onChange={(e) => setResendApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowResendKey(!showResendKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showResendKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Deja en blanco para mantener la clave actual guardada.
              </p>
            </div>

            {/* From email */}
            <div className="space-y-1.5">
              <Label htmlFor="from-email">Email remitente</Label>
              <Input
                id="from-email"
                type="email"
                placeholder="noreply@isysocial.com"
                value={emailFromAddress}
                onChange={(e) => setEmailFromAddress(e.target.value)}
              />
            </div>

            {/* From name */}
            <div className="space-y-1.5">
              <Label htmlFor="from-name">Nombre remitente</Label>
              <Input
                id="from-name"
                type="text"
                placeholder="Isysocial"
                value={emailFromName}
                onChange={(e) => setEmailFromName(e.target.value)}
              />
            </div>

            {/* Save button */}
            <Button onClick={handleSaveEmail} disabled={updateConfig.isPending} className="w-full sm:w-auto">
              {updateConfig.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar configuración de email
            </Button>

            {/* Divider */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Prueba de envío</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="test@ejemplo.com"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={testEmail.isPending}
                >
                  {testEmail.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                  )}
                  Enviar prueba
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── WhatsApp Section ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle>WhatsApp Business API</CardTitle>
            </div>
            <CardDescription>
              Configura la API de WhatsApp Business para enviar notificaciones a clientes y editores
              via WhatsApp.{" "}
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                Ver documentación de Meta Business
              </a>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="wa-enabled" className="text-sm font-medium">
                  Notificaciones por WhatsApp habilitadas
                </Label>
              </div>
              <button
                id="wa-enabled"
                type="button"
                onClick={() => setWaEnabled(!waEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  waEnabled ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-transform ${
                    waEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* WhatsApp Token */}
            <div className="space-y-1.5">
              <Label htmlFor="wa-token">WhatsApp API Token</Label>
              <div className="relative">
                <Input
                  id="wa-token"
                  type={showWaToken ? "text" : "password"}
                  placeholder="EAAxxxxxxxxxx..."
                  value={waToken}
                  onChange={(e) => setWaToken(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowWaToken(!showWaToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showWaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Deja en blanco para mantener el token actual guardado.
              </p>
            </div>

            {/* Phone Number ID */}
            <div className="space-y-1.5">
              <Label htmlFor="wa-phone">Phone Number ID</Label>
              <Input
                id="wa-phone"
                type="text"
                placeholder="123456789012345"
                value={waPhoneNumberId}
                onChange={(e) => setWaPhoneNumberId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                ID del número de teléfono de WhatsApp Business (desde el panel de Meta Business).
              </p>
            </div>

            {/* Save button */}
            <Button onClick={handleSaveWhatsApp} disabled={updateConfig.isPending} className="w-full sm:w-auto">
              {updateConfig.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar configuración de WhatsApp
            </Button>
          </CardContent>
        </Card>

        {/* ─── STORAGE STATUS ─────── */}
        <StorageStatusSection />

        {/* ─── META GRAPH API TESTS ─────── */}
        <MetaApiTestSection />
      </div>
    </div>
  );
}

/* ─── StorageStatusSection ───────────────────────────────────────── */
function StorageStatusSection() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkStorage = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/files/check-storage");
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ ok: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Estado del almacenamiento
        </CardTitle>
        <CardDescription>
          Verifica si el bucket de archivos es accesible públicamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={checkStorage}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <FlaskConical className="h-4 w-4 mr-2" />
          )}
          Verificar almacenamiento
        </Button>

        {result && (
          <div className={`rounded-lg border p-4 space-y-3 text-sm ${
            result.ok
              ? "border-green-300 bg-green-50 dark:border-green-700/50 dark:bg-green-950/20"
              : "border-red-300 bg-red-50 dark:border-red-700/50 dark:bg-red-950/20"
          }`}>
            <div className="flex items-center gap-2 font-medium">
              {result.ok ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span className={result.ok ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"}>
                {result.ok ? "Almacenamiento OK" : "Problema detectado"}
              </span>
            </div>
            {result.error && (
              <p className="text-red-700 dark:text-red-400 text-xs font-mono">{result.error}</p>
            )}
            {result.recommendation && (
              <p className="text-xs text-muted-foreground">{result.recommendation}</p>
            )}
            {!result.ok && result.publicUrl && (
              <div className="text-xs space-y-1">
                <p className="text-muted-foreground">URL de prueba fallida:</p>
                <code className="block bg-muted px-2 py-1 rounded text-[11px] break-all">{result.publicUrl}</code>
                <p className="font-medium mt-2">Cómo solucionarlo:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Ve a tu proyecto en <strong>supabase.com → Storage</strong></li>
                  <li>Selecciona el bucket <code className="bg-muted px-1 rounded">isysocial-media</code></li>
                  <li>Haz clic en <strong>Edit bucket</strong></li>
                  <li>Activa <strong>"Public bucket"</strong> y guarda</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── MetaApiTestSection ─────────────────────────────────────────── */
function MetaApiTestSection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTests = async () => {
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch("/api/social/meta/test-calls");
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-5 w-5 text-primary" />
          Pruebas obligatorias — Meta Graph API
        </CardTitle>
        <CardDescription>
          Ejecuta las llamadas requeridas por Meta App Review para demostrar el uso de cada permiso.
          Toma una captura o graba la pantalla para incluir en la revisión.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTests} disabled={loading} variant="outline">
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Ejecutando pruebas...</>
          ) : (
            <><FlaskConical className="h-4 w-4 mr-2" />Ejecutar llamadas de prueba</>
          )}
        </Button>

        {results && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-600 font-medium">✓ {results.summary?.passed} exitosas</span>
              <span className="text-red-500 font-medium">✗ {results.summary?.failed} fallidas</span>
              {results.summary?.skipped > 0 && (
                <span className="text-muted-foreground">— {results.summary?.skipped} omitidas</span>
              )}
            </div>

            {/* Accounts info */}
            {results.meta && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 space-y-1">
                <p>Cuenta Facebook: {results.meta.fbAccount?.name ?? "No conectada"} {results.meta.fbAccount?.pageId && `(Page ID: ${results.meta.fbAccount.pageId})`}</p>
                <p>Cuenta Instagram: {results.meta.igAccount?.name ?? "No conectada"} {results.meta.igAccount?.id && `(IG ID: ${results.meta.igAccount.id})`}</p>
                <p className="text-muted-foreground/60">Ejecutado: {results.meta.testedAt}</p>
              </div>
            )}

            {/* Error if no accounts */}
            {results.error && (
              <p className="text-sm text-red-500">{results.error}</p>
            )}

            {/* Results list */}
            {(results.results ?? []).map((r: any, i: number) => (
              <div key={i} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  {r.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : r.status === "error" ? (
                    <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <span className="w-4 h-4 text-muted-foreground text-xs flex-shrink-0">—</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs font-mono">{r.permission}</Badge>
                      {r.httpStatus && (
                        <span className={`text-xs font-medium ${r.httpStatus >= 200 && r.httpStatus < 300 ? "text-green-600" : "text-red-500"}`}>
                          HTTP {r.httpStatus}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{r.method} {r.endpoint}</p>
                  </div>
                </div>
                {r.data && (
                  <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-32">
                    {JSON.stringify(r.data, null, 2)}
                  </pre>
                )}
                {r.error && (
                  <p className="text-xs text-red-500">{r.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
