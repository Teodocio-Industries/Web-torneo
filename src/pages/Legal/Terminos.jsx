import { Link } from 'react-router-dom'
import LegalLayout, { Neg } from './LegalLayout'
import { RUTAS_LEGALES } from '../../config/negocio'

export default function Terminos() {
  return (
    <LegalLayout
      titulo="Términos y condiciones"
      resumen="Estas son las reglas para usar el sitio y contratar los servicios individuales. Los resultados deportivos o de redes sociales no están garantizados, y tienes derechos como consumidor que esta página respeta."
    >
      <h2>1. Quiénes somos y qué aceptas</h2>
      <p>
        Este sitio es operado por <strong><Neg campo="razonSocial" /></strong> (nombre comercial «Caribe Sports»), NIT/CC <Neg campo="nit" />, con domicilio en{' '}
        <Neg campo="direccion" />. Puedes contactarnos en <Neg campo="email" /> o <Neg campo="telefono" />. Al usar el sitio o contratar un servicio aceptas estos términos, la{' '}
        <Link to={RUTAS_LEGALES.privacidad}>política de privacidad</Link>, la <Link to={RUTAS_LEGALES.cookies}>política de cookies</Link> y la{' '}
        <Link to={RUTAS_LEGALES.reembolsos}>política de reembolsos y retracto</Link>. Si no estás de acuerdo, no uses el sitio.
      </p>

      <h2>2. Qué ofrecemos</h2>
      <ul>
        <li><strong>Plataforma de torneos:</strong> cuadros de cruces, tablas de posiciones, estadísticas y fichas de jugadores, para personas con cuenta.</li>
        <li>
          <strong>Servicios individuales</strong> para jugadores, que se activan al asignarte un «rango»:
          <ul>
            <li><strong>Content Package:</strong> material audiovisual de tu participación (fotografía, videos breves, highlights editados para redes y selección del material registrado).</li>
            <li><strong>Player Spotlight:</strong> publicación destacada de una actuación de la jornada en las redes de Caribe Sports, con diseño personalizado, estadísticas clave y etiquetado del jugador y su club.</li>
            <li><strong>Player Performance:</strong> análisis individual del rendimiento durante el torneo (estadísticas, promedios, evolución, comparativas, gráficos, informe visual y piezas gráficas).</li>
          </ul>
        </li>
      </ul>

      <h2>3. Cuentas de acceso</h2>
      <ul>
        <li>Las cuentas las crea la administración; no hay registro abierto al público.</li>
        <li>Eres responsable de guardar tu contraseña y de lo que se haga con tu cuenta. No la compartas. Avísanos de inmediato si crees que alguien más accedió.</li>
        <li>Si eres menor de 18 años, tu cuenta y tus contrataciones deben ser autorizadas y realizadas por tu padre, madre o representante legal.</li>
        <li>Podemos suspender o cerrar cuentas que incumplan estos términos o pongan en riesgo la seguridad del sitio.</li>
      </ul>

      <h2>4. Cómo se contrata un servicio individual</h2>
      <ol>
        <li>Pulsas «Quiero este servicio» (previa aceptación de estos términos) y se abre WhatsApp para hablar con nosotros.</li>
        <li>Acordamos contigo, por escrito en el chat, el alcance, los entregables, los plazos y el <strong>precio total en pesos colombianos (COP)</strong>, indicando si incluye o no impuestos. El precio puede variar según la cantidad y calidad del material disponible.</li>
        <li>La administración te asigna el rango en tu cuenta, donde verás el precio y los datos de pago.</li>
        <li>Pagas por transferencia (Nequi o Bancolombia) <strong>únicamente a los datos que aparecen dentro de tu cuenta</strong> y envías el comprobante por WhatsApp. Nunca te pediremos claves, códigos de verificación ni datos de tu banco.</li>
        <li>Confirmamos el pago marcándolo como «Pagado» en tu cuenta. Antes de empezar a ejecutar el servicio te pediremos por escrito tu confirmación expresa de inicio (ver la política de reembolsos y retracto).</li>
      </ol>

      <h2>5. Lo que no podemos garantizar</h2>
      <p>
        Nos comprometemos a entregar lo descrito para cada servicio con diligencia profesional. <strong>No garantizamos</strong> un número de vistas, alcance, seguidores, interacciones, contactos de
        clubes, becas, fichajes ni ningún resultado deportivo o comercial: dependen de terceros (como las plataformas de redes sociales) y de factores que no controlamos. La calidad y cantidad del
        contenido depende también del material efectivamente registrado durante los partidos.
      </p>

      <h2>6. Imagen, contenido y autorizaciones</h2>
      <ul>
        <li>
          <strong>Autorización de uso de imagen.</strong> Al contratar Content Package o Player Spotlight, el jugador (o su representante legal, si es menor de 18 años) autoriza a Caribe Sports a
          capturar, editar y publicar su imagen, video, nombre, club y estadísticas en el sitio y en las redes de Caribe Sports, únicamente para prestar el servicio contratado. Esta autorización es gratuita
          respecto de la publicación propia del servicio, no incluye usos publicitarios de terceros y <strong>puede revocarse</strong> escribiéndonos; retiraremos las publicaciones propias en un plazo razonable
          (no controlamos copias hechas por terceros).
        </li>
        <li>
          <strong>Piezas creadas por Caribe Sports.</strong> Las fotografías, videos y diseños que producimos son obras de Caribe Sports. Te otorgamos una licencia no exclusiva para usarlos en tus redes personales y portafolio deportivo, sin fines
          comerciales, salvo pacto distinto por escrito.
        </li>
        <li><strong>Material que nos entregues.</strong> Declaras que tienes derecho a usarlo y a que lo usemos para el servicio, y que las personas que aparezcan en él lo autorizaron.</li>
        <li><strong>Menores de edad.</strong> La autorización y la contratación las firma o confirma el representante legal; el menor será escuchado según su madurez, y en todo caso prevalece su interés superior.</li>
      </ul>

      <h2>7. Propiedad intelectual</h2>
      <p>
        El nombre, logotipo, diseño y código del sitio son de su titular o se usan con licencia. Los nombres y escudos de equipos y torneos pertenecen a sus respectivos titulares y se muestran con fines informativos
        de la competencia. No puedes copiar, redistribuir ni explotar comercialmente contenido del sitio sin autorización escrita.
      </p>

      <h2>8. Uso aceptable</h2>
      <p>Está prohibido: intentar acceder a cuentas o datos que no son tuyos; probar contraseñas o automatizar intentos de acceso; atacar, sobrecargar o sondear el sitio; extraer datos de forma masiva (scraping); subir contenido ilícito o que vulnere derechos de terceros; o hacerte pasar por otra persona. Algunas de estas conductas pueden constituir delitos informáticos (Ley 1273 de 2009) y las denunciaremos.</p>

      <h2>9. Disponibilidad y exactitud de la información</h2>
      <p>
        Procuramos que el sitio funcione de forma continua, pero puede haber interrupciones por mantenimiento o fallas de terceros. Las estadísticas, marcadores y cuadros son informativos; los resultados oficiales
        son los que determine la organización de cada torneo. Si encuentras un error, escríbenos para corregirlo.
      </p>

      <h2>10. Responsabilidad</h2>
      <p>
        Respondemos por el cumplimiento de lo contratado y por los daños que la ley nos atribuya. Estas cláusulas no limitan los derechos que el Estatuto del Consumidor (Ley 1480 de 2011) te reconoce, ni excluyen
        responsabilidades que no puedan excluirse por ley.
      </p>

      <h2>11. Retracto y reembolsos</h2>
      <p>Las compras a distancia tienen derecho de retracto en los términos de la ley. Consulta la <Link to={RUTAS_LEGALES.reembolsos}>política de reembolsos y retracto</Link>.</p>

      <h2>12. Peticiones, quejas y reclamos</h2>
      <p>
        Escríbenos a <Neg campo="email" />. Si no quedas conforme con nuestra respuesta, puedes acudir a la Superintendencia de Industria y Comercio (SIC), autoridad de protección al consumidor y de protección de datos personales.
      </p>

      <h2>13. Cambios</h2>
      <p>Podemos actualizar estos términos. La versión vigente y su fecha aparecen en esta página. Los cambios no afectan los servicios ya pagados, que se rigen por los términos vigentes al momento de contratar.</p>

      <h2>14. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República de Colombia. Los conflictos se resolverán ante las autoridades y jueces colombianos competentes, sin perjuicio de las acciones de protección al consumidor ante la SIC.</p>
    </LegalLayout>
  )
}