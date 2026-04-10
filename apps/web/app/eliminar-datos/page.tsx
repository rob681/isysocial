import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eliminación de Datos - Isysocial",
  description: "Solicita la eliminación de tus datos personales en Isysocial.",
};

export default function EliminarDatosPage() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Eliminación de Datos</h1>
        <p className="text-gray-400 mb-10">
          Instrucciones para solicitar la eliminación de tus datos personales de Isysocial
        </p>

        <div className="space-y-10">

          {/* Qué datos podemos eliminar */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              ¿Qué datos podemos eliminar?
            </h2>
            <div className="text-gray-300 leading-relaxed space-y-3">
              <p>
                Al solicitar la eliminación de tus datos, eliminaremos permanentemente:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Tu cuenta de usuario y credenciales de acceso.</li>
                <li>Toda la información de tu agencia, clientes y marcas.</li>
                <li>
                  Los <strong className="text-white">tokens de acceso de Facebook e Instagram</strong>{" "}
                  que permiten a Isysocial publicar en tu nombre. Estos se revocan y eliminan
                  inmediatamente.
                </li>
                <li>Publicaciones programadas, borradores y contenido archivado.</li>
                <li>Archivos multimedia subidos (imágenes, videos, activos de marca).</li>
                <li>Historial de actividad y registros de publicaciones.</li>
                <li>Datos de analytics e insights almacenados localmente.</li>
              </ul>
            </div>
          </section>

          {/* Cómo solicitar la eliminación */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              Cómo solicitar la eliminación de tus datos
            </h2>
            <div className="space-y-6">

              {/* Opción 1 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">
                      Desde la configuración de tu cuenta (recomendado)
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Si tienes acceso a tu cuenta de Isysocial, puedes desconectar tus redes
                      sociales desde la sección <strong className="text-white">Configuración → Redes Sociales</strong>.
                      Esto revoca inmediatamente todos los permisos de acceso a Facebook e Instagram.
                    </p>
                  </div>
                </div>
              </div>

              {/* Opción 2 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">
                      Enviar una solicitud por correo electrónico
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed mb-3">
                      Envíanos un correo a{" "}
                      <a
                        href="mailto:privacidad@isysocial.com"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        privacidad@isysocial.com
                      </a>{" "}
                      con el asunto <strong className="text-white">&quot;Solicitud de eliminación de datos&quot;</strong> e
                      incluye en el cuerpo del mensaje:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-gray-300 text-sm">
                      <li>El correo electrónico asociado a tu cuenta de Isysocial.</li>
                      <li>
                        El nombre de tu agencia (para verificar la propiedad de la cuenta).
                      </li>
                      <li>
                        Opcional: si solo deseas eliminar la conexión de una red social específica
                        (Facebook, Instagram, etc.) en lugar de toda la cuenta.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Opción 3 — Facebook/Instagram directamente */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    f
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">
                      Revocar acceso directamente desde Facebook o Instagram
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed mb-3">
                      Puedes eliminar el acceso de Isysocial a tus cuentas directamente desde Meta:
                    </p>
                    <ol className="list-decimal pl-6 space-y-1 text-gray-300 text-sm">
                      <li>
                        Ve a{" "}
                        <a
                          href="https://www.facebook.com/settings?tab=applications"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          Configuración de Facebook → Aplicaciones y sitios web
                        </a>
                      </li>
                      <li>Busca &quot;Isysocial&quot; en la lista de aplicaciones.</li>
                      <li>
                        Haz clic en <strong className="text-white">&quot;Eliminar&quot;</strong> para
                        revocar todos los permisos y eliminar tus datos de nuestra plataforma.
                      </li>
                    </ol>
                    <p className="text-gray-400 text-sm mt-3">
                      Al revocar el acceso desde Facebook, todos los tokens de acceso almacenados
                      en Isysocial se invalidan automáticamente y son eliminados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Plazos */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Plazos de eliminación</h2>
            <div className="text-gray-300 leading-relaxed space-y-3">
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-white">Tokens de redes sociales:</strong> Se revocan y
                  eliminan inmediatamente al recibir tu solicitud.
                </li>
                <li>
                  <strong className="text-white">Datos de cuenta y contenido:</strong> Se eliminan
                  dentro de los 30 días siguientes a la confirmación de tu solicitud.
                </li>
                <li>
                  <strong className="text-white">Registros de sistema:</strong> Se eliminan en un
                  plazo máximo de 90 días, en concordancia con las políticas de retención de
                  registros de seguridad.
                </li>
              </ul>
              <p className="mt-4 text-gray-400 text-sm">
                Recibirás una confirmación por correo electrónico una vez que tus datos hayan sido
                eliminados completamente.
              </p>
            </div>
          </section>

          {/* Preguntas */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">¿Tienes preguntas?</h2>
            <div className="text-gray-300 leading-relaxed space-y-2">
              <p>
                Si tienes dudas sobre este proceso o necesitas asistencia, contáctanos:
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
                  Política de Privacidad completa:{" "}
                  <a
                    href="/privacidad"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    isysocial.com/privacidad
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
