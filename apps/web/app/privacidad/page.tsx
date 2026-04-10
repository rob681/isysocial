import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad - Isysocial",
  description: "Política de Privacidad de Isysocial, plataforma de gestión de contenido para agencias de marketing digital.",
};

export default function PoliticaPrivacidadPage() {
  return (
    <div className="min-h-screen bg-[hsl(222,35%,7%)] text-gray-200">
      {/* Header */}
      <header className="border-b border-white/10 bg-[hsl(222,30%,11%)]">
        <div className="mx-auto max-w-4xl px-6 py-6 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">IS</span>
          </div>
          <span className="text-xl font-semibold text-white">Isysocial</span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Política de Privacidad</h1>
        <p className="text-gray-400 mb-10">
          Última actualización: 9 de abril de 2026
        </p>

        <div className="space-y-10">
          {/* Intro */}
          <section>
            <p className="text-gray-300 leading-relaxed">
              Isysocial (&quot;nosotros&quot;, &quot;nuestro&quot; o &quot;nos&quot;) es una plataforma de gestión de
              contenido para redes sociales que ayuda a agencias de marketing digital a crear, programar
              y publicar contenido para sus clientes. Esta Política de Privacidad explica cómo recopilamos,
              usamos, almacenamos y protegemos tu información cuando utilizas nuestra plataforma.
            </p>
          </section>

          {/* Qué datos recopilamos */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Datos que Recopilamos</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>Recopilamos los siguientes tipos de información:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-white">Información de la cuenta:</strong> Nombre, correo
                  electrónico y contraseña cuando creas una cuenta.
                </li>
                <li>
                  <strong className="text-white">Datos de agencia y clientes:</strong> Nombres de
                  empresas, logotipos, activos de marca y contenido que creas dentro de la plataforma.
                </li>
                <li>
                  <strong className="text-white">Datos de redes sociales:</strong> Cuando conectas
                  cuentas de redes sociales (Facebook, Instagram, LinkedIn, TikTok, X), recibimos tokens
                  de acceso OAuth, identificadores de cuenta (como IDs de páginas y IDs de cuentas
                  empresariales), nombres de perfil e imágenes de perfil de esas plataformas.
                </li>
                <li>
                  <strong className="text-white">Datos de uso:</strong> Información sobre cómo
                  interactúas con la plataforma, incluidas las páginas visitadas y las funciones usadas.
                </li>
                <li>
                  <strong className="text-white">Métricas e insights:</strong> Datos de rendimiento de
                  publicaciones y cuentas (alcance, impresiones, seguidores) obtenidos a través de las
                  APIs oficiales de las plataformas de redes sociales.
                </li>
              </ul>
            </div>
          </section>

          {/* Cómo almacenamos los datos */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Cómo Almacenamos tus Datos</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>Tus datos se almacenan de forma segura utilizando prácticas estándar del sector:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Todos los datos se almacenan en bases de datos PostgreSQL cifradas y seguras
                  alojadas en Supabase, con cifrado TLS en tránsito.
                </li>
                <li>
                  Los <strong className="text-white">tokens OAuth</strong> obtenidos de las plataformas
                  de redes sociales se almacenan cifrados y asociados a tu cuenta de agencia. Los tokens
                  nunca se exponen en el código del lado del cliente ni en registros.
                </li>
                <li>
                  Los medios subidos y los activos de marca se almacenan en almacenamiento en la nube
                  seguro con buckets con control de acceso.
                </li>
                <li>
                  Las contraseñas se cifran con bcrypt y nunca se almacenan en texto plano.
                </li>
              </ul>
            </div>
          </section>

          {/* Cómo usamos los datos */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Cómo Usamos tus Datos</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>Usamos tu información para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Proporcionar y mantener la plataforma Isysocial y sus funcionalidades.</li>
                <li>
                  Publicar, programar y gestionar contenido en redes sociales en tu nombre a través
                  de las cuentas de redes sociales conectadas.
                </li>
                <li>
                  Mostrar métricas e insights de rendimiento de tus cuentas e Instagram/Facebook.
                </li>
                <li>
                  Autenticar tu identidad y gestionar el acceso a tu espacio de trabajo de agencia.
                </li>
                <li>
                  Enviar notificaciones sobre aprobaciones de publicaciones, comentarios y cambios
                  de estado.
                </li>
                <li>
                  Mejorar la plataforma basándonos en patrones de uso (datos agregados y no personales).
                </li>
              </ul>
              <p>
                <strong className="text-white">No</strong> vendemos tus datos personales a terceros.
                No usamos tus datos de redes sociales para publicidad ni para crear perfiles con fines
                comerciales ajenos al servicio.
              </p>
            </div>
          </section>

          {/* Uso de datos de Meta */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              4. Uso de Datos de Meta (Facebook e Instagram)
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                Isysocial utiliza las APIs de Meta para proporcionar las siguientes funcionalidades en
                nombre de los usuarios que han otorgado su consentimiento explícito:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-white">Publicación de contenido:</strong> Publicamos posts,
                  imágenes y videos en páginas de Facebook y perfiles de Instagram Business.
                </li>
                <li>
                  <strong className="text-white">Gestión de páginas:</strong> Leemos y gestionamos
                  páginas de Facebook para publicar contenido programado.
                </li>
                <li>
                  <strong className="text-white">Analytics e insights:</strong> Obtenemos métricas de
                  rendimiento (alcance, impresiones, seguidores) de cuentas de Instagram Business y
                  páginas de Facebook para mostrarlas a los administradores de la agencia y sus clientes.
                </li>
              </ul>
              <p>
                Los datos obtenidos de Meta se usan exclusivamente para prestar el servicio descrito
                y no se comparten con terceros, ni se usan con fines publicitarios.
              </p>
            </div>
          </section>

          {/* Compartición de datos */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Compartición de Datos</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>Solo compartimos datos en las siguientes circunstancias limitadas:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-white">Plataformas de redes sociales:</strong> Cuando
                  publicas contenido, enviamos ese contenido a la plataforma correspondiente
                  (Facebook, Instagram, etc.) a través de sus APIs oficiales.
                </li>
                <li>
                  <strong className="text-white">Proveedores de servicios:</strong> Utilizamos
                  servicios de terceros para alojamiento (Vercel, Supabase), correo electrónico
                  (Resend) e IA (Anthropic), que procesan datos únicamente según sea necesario
                  para prestar sus servicios.
                </li>
                <li>
                  <strong className="text-white">Requisitos legales:</strong> Si así lo exige la
                  ley o un proceso legal.
                </li>
              </ul>
            </div>
          </section>

          {/* Retención de datos */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Retención de Datos</h2>
            <p className="text-gray-300 leading-relaxed">
              Conservamos tus datos mientras tu cuenta esté activa. Cuando una cuenta de agencia se
              desactiva, los datos asociados (publicaciones, medios, información de clientes) se
              conservan durante 30 días antes de su eliminación permanente. Los tokens de redes
              sociales se revocan inmediatamente al desconectar una cuenta.
            </p>
          </section>

          {/* Eliminación de datos */}
          <section id="eliminacion-de-datos">
            <h2 className="text-xl font-semibold text-white mb-4">7. Eliminación de Datos</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>Tienes derecho a solicitar la eliminación de tus datos en cualquier momento:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-white">Desconectar cuentas de redes sociales:</strong>{" "}
                  Puedes desconectar cualquier cuenta de red social desde la configuración de la
                  plataforma. Esto revoca y elimina inmediatamente los tokens OAuth almacenados.
                </li>
                <li>
                  <strong className="text-white">Eliminar tu cuenta:</strong> Contáctanos para
                  solicitar la eliminación completa de tu cuenta y todos los datos asociados.
                </li>
                <li>
                  <strong className="text-white">Datos de Facebook/Instagram:</strong> También
                  puedes eliminar el acceso de Isysocial a tus datos a través de la configuración
                  de tu cuenta de Facebook o Instagram en el apartado &quot;Aplicaciones y sitios web&quot;.
                </li>
              </ul>
              <p>
                Para solicitar la eliminación de datos, visita{" "}
                <a
                  href="/eliminar-datos"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  isysocial.com/eliminar-datos
                </a>{" "}
                o escríbenos a{" "}
                <a
                  href="mailto:privacidad@isysocial.com"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  privacidad@isysocial.com
                </a>{" "}
                con el asunto &quot;Solicitud de eliminación de datos&quot;. Procesaremos tu solicitud
                en un plazo de 30 días.
              </p>
            </div>
          </section>

          {/* Tus derechos */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Tus Derechos</h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>Dependiendo de tu ubicación, puedes tener derecho a:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Acceder a los datos personales que tenemos sobre ti.</li>
                <li>Corregir datos inexactos o incompletos.</li>
                <li>Solicitar la eliminación de tus datos (ver sección anterior).</li>
                <li>Oponerte a ciertos procesamientos de tus datos o restringirlos.</li>
                <li>Exportar tus datos en un formato portátil.</li>
              </ul>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Cookies</h2>
            <p className="text-gray-300 leading-relaxed">
              Isysocial utiliza cookies esenciales para gestionar sesiones de usuario autenticadas.
              No utilizamos cookies de seguimiento ni publicidad de terceros. Las cookies de sesión
              se eliminan automáticamente al cerrar sesión.
            </p>
          </section>

          {/* Contacto */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Contacto</h2>
            <div className="text-gray-300 leading-relaxed space-y-2">
              <p>
                Si tienes preguntas sobre esta Política de Privacidad o deseas ejercer tus derechos
                sobre tus datos, contáctanos:
              </p>
              <ul className="list-none space-y-1 mt-3">
                <li>
                  Correo:{" "}
                  <a
                    href="mailto:privacidad@isysocial.com"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    privacidad@isysocial.com
                  </a>
                </li>
                <li>
                  Sitio web:{" "}
                  <a
                    href="https://isysocial.com"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    isysocial.com
                  </a>
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Isysocial. Todos los derechos reservados.
        </div>
      </main>
    </div>
  );
}
