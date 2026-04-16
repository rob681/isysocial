import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://db.srnkbkqkbcqzzybqpspa.supabase.co";
const serviceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNybmtia3FrYmNxenp5YnFwc3BhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5MDkwNzQ3OSwiZXhwIjoyMDA2NDgzNDc5fQ.h2hAjJqvYzPc1ygIvNT4LImfBTHfL5cI7CKSfEzSCCI";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createUser() {
  try {
    console.log("🔄 Creando usuario social@brandot.mx...\n");

    const { data, error } = await supabase.auth.admin.createUser({
      email: "social@brandot.mx",
      password: "TempPass123!@#",
      email_confirm: true,
      user_metadata: {
        full_name: "Social - Brandot",
      },
    });

    if (error) {
      console.error("❌ Error al crear usuario:", error.message);
      return;
    }

    console.log("✅ Usuario creado exitosamente!");
    console.log("\n📋 Detalles:");
    console.log("   Email:", data.user?.email);
    console.log("   User ID:", data.user?.id);
    console.log("   Email confirmado: Sí");
    console.log("\n🔐 Credenciales temporales:");
    console.log("   Email: social@brandot.mx");
    console.log("   Contraseña temporal: TempPass123!@#");
    console.log(
      "\n💡 El usuario puede cambiar la contraseña después del primer acceso."
    );
  } catch (err) {
    console.error("❌ Error inesperado:", err);
  }
}

createUser();
