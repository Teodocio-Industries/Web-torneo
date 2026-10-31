import { Link } from 'react-router-dom'
import LegalLayout, { Neg } from './LegalLayout'
import { RUTAS_LEGALES } from '../../config/negocio'

export default function Privacidad() {
  return (
    <LegalLayout
      titulo="Política de privacidad y tratamiento de datos personales"
      resumen="Usamos tus datos solo para operar los torneos y prestar los servicios que solicitas. No vendemos tus datos, no usamos publicidad ni analítica de terceros, y puedes ejercer tus derechos escribiéndonos."
    >
      <h2>1. Responsable del tratamiento</h2>
      <p>
        <strong><Neg campo="razonSocial" /></strong> (nombre comercial «Caribe Sports»), identificado con NIT/CC <Neg campo="nit" />,
        con domicilio en <Neg campo="direccion" />, correo <Neg campo="email" /> y teléfono <Neg campo="telefono" />, es el responsable del
        tratamiento de los datos personales recolectados a través de este sitio. Atiende las solicitudes sobre datos personales:{' '}
        <Neg campo="responsableDatos" />.
      </p>

      <h2>2. Marco legal</h2>
      <p>
        Esta política se rige por el artículo 15 de la Constitución Política de Colombia, la Ley Estatutaria 1581 de 2012, el Decreto 1377 de 2013
        (compilado en el Decreto Único 1074 de 2015) y las instrucciones de la Superintendencia de Industria y Comercio (SIC).
      </p>

      <h2>3. Qué datos tratamos</h2>
      <div className="legal__tabla-scroll">
        <table>
          <thead><tr><th>Categoría</th><th>Datos</th><th>De dónde salen</th></tr></thead>
          <tbody>
            <tr><td>Cuenta de acceso</td><td>Nombre completo, correo electrónico, rol (administrador, jugador o usuario) y contraseña (guardada cifrada por el proveedor de autenticación; no podemos verla).</td><td>La administración crea tu cuenta con tu autorización.</td></tr>
            <tr><td>Datos deportivos</td><td>Nombre del jugador, equipo, dorsal, posición, estadísticas de juego, partidos y, si aplica, sanciones o faltas disciplinarias del torneo.</td><td>Los registra la organización del torneo.</td></tr>
            <tr><td>Imágenes</td><td>Logos de equipos y, en los servicios de contenido, fotografías y videos del jugador.</td><td>La organización o el propio jugador / su representante legal.</td></tr>
            <tr><td>Servicios individuales</td><td>Servicio (rango) asignado, precio acordado y estado del pago.</td><td>Tú y la administración, al contratar.</td></tr>
            <tr><td>Datos técnicos</td><td>Dirección IP y registros de acceso que generan nuestros proveedores de alojamiento; sesión iniciada; contador local de intentos fallidos de acceso.</td><td>Tu navegador.</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        No recolectamos datos sensibles (salud, origen étnico, orientación política, biométricos, etc.) ni números de tarjetas. Los pagos se hacen por
        transferencia a las cuentas que se muestran dentro de tu cuenta; el comprobante que envías por WhatsApp lo trata WhatsApp según sus propias políticas.
      </p>

      <h2>4. Para qué los usamos (finalidades)</h2>
      <ul>
        <li>Crear y administrar tu cuenta y permitirte iniciar sesión.</li>
        <li>Organizar torneos y mostrar cuadros, tablas, estadísticas y fichas de jugadores a las personas con sesión iniciada.</li>
        <li>Prestar, cobrar y dar soporte a los servicios individuales que solicites (Content Package, Player Spotlight, Player Performance).</li>
        <li>Publicar fotos, videos o estadísticas de un jugador en las redes de Caribe Sports, <strong>solo</strong> si el jugador (o su representante legal, si es menor) lo autorizó expresamente.</li>
        <li>Responder tus consultas, peticiones, quejas y reclamos.</li>
        <li>Mantener la seguridad del sitio y prevenir fraudes o accesos no autorizados.</li>
        <li>Cumplir obligaciones legales, contables y tributarias.</li>
      </ul>
      <p>No vendemos ni alquilamos tus datos, y no los usamos para publicidad de terceros ni para perfilamiento comercial.</p>

      <h2>5. Autorización</h2>
      <p>
        Tratamos tus datos con tu autorización previa, expresa e informada, que obtenemos cuando se crea tu cuenta, cuando aceptas esta política en los formularios
        del sitio o cuando nos la das por escrito (por ejemplo, por WhatsApp o correo). Conservamos prueba de esa autorización. Puedes revocarla en cualquier
        momento, salvo cuando exista un deber legal o contractual de conservar los datos.
      </p>

      <h2>6. Niños, niñas y adolescentes</h2>
      <p>
        Muchos torneos incluyen jugadores menores de 18 años. Los datos de menores solo se tratan cuando responden al interés superior del menor y se respetan sus derechos
        fundamentales, con la autorización previa, expresa e informada de su representante legal y habiendo escuchado la opinión del menor según su madurez
        (Ley 1581 de 2012, art. 7, y Decreto 1377 de 2013, art. 12, hoy art. 2.2.2.25.2.9 del Decreto 1074 de 2015). Por eso:
      </p>
      <ul>
        <li>La cuenta, la ficha deportiva y cualquier servicio de imagen o promoción de un menor deben ser autorizados por su padre, madre o representante legal.</li>
        <li>El representante legal puede pedir en cualquier momento que se corrijan, oculten o eliminen los datos o las publicaciones del menor.</li>
        <li>Las fichas de jugadores solo las ven personas con sesión iniciada; no son públicas en buscadores.</li>
      </ul>

      <h2>7. Tus derechos como titular</h2>
      <p>Según el artículo 8 de la Ley 1581 de 2012, puedes:</p>
      <ul>
        <li>Conocer, actualizar y rectificar tus datos.</li>
        <li>Solicitar prueba de la autorización que nos diste.</li>
        <li>Ser informado sobre el uso que damos a tus datos.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley.</li>
        <li>Revocar la autorización y/o solicitar la supresión de tus datos cuando no se respeten los principios y garantías legales.</li>
        <li>Acceder de forma gratuita a tus datos personales.</li>
      </ul>

      <h2>8. Cómo ejercer tus derechos</h2>
      <p>
        Escríbenos a <Neg campo="email" /> indicando tu nombre completo, un medio de contacto, qué quieres (consulta, rectificación, supresión, revocatoria) y,
        si actúas como representante de un menor, tu vínculo con él. Los plazos legales son:
      </p>
      <ul>
        <li><strong>Consultas:</strong> respuesta en máximo 10 días hábiles; si no es posible, te avisamos el motivo y la nueva fecha, que no superará 5 días hábiles adicionales.</li>
        <li><strong>Reclamos</strong> (corrección, actualización, supresión o presunto incumplimiento): respuesta en máximo 15 días hábiles, prorrogables por 8 días hábiles más con aviso previo. Si tu reclamo está incompleto, te pediremos completarlo dentro de los 5 días siguientes.</li>
      </ul>
      <p>Si no quedas conforme, puedes acudir a la SIC, después de haber agotado este trámite con nosotros.</p>

      <h2>9. Con quién compartimos datos (encargados y terceros)</h2>
      <p>Para operar el sitio usamos proveedores que tratan datos por cuenta nuestra. Algunos tienen servidores fuera de Colombia.</p>
      <div className="legal__tabla-scroll">
        <table>
          <thead><tr><th>Proveedor</th><th>Para qué</th><th>Datos</th></tr></thead>
          <tbody>
            <tr><td>Supabase, Inc.</td><td>Base de datos, autenticación, almacenamiento de imágenes y tiempo real.</td><td>Cuenta, datos deportivos, servicios, imágenes.</td></tr>
            <tr><td>GitHub, Inc. (Microsoft)</td><td>Alojamiento del sitio web (GitHub Pages).</td><td>Dirección IP y datos técnicos de la visita.</td></tr>
            <tr><td>WhatsApp (Meta Platforms)</td><td>Solo si tú haces clic en un botón para escribirnos; se abre WhatsApp con un mensaje que incluye tu nombre y el servicio de interés.</td><td>Nombre, mensaje, comprobante que envíes.</td></tr>
            <tr><td>Cloudflare, Inc. (Turnstile)</td><td>Verificación anti-bots en el inicio de sesión, únicamente cuando está activada.</td><td>Datos técnicos del navegador necesarios para la verificación.</td></tr>
          </tbody>
        </table>
      </div>
      <p>También podremos entregar datos a autoridades cuando una norma o una orden judicial o administrativa lo exija.</p>

      <h2>10. Seguridad</h2>
      <p>
        Aplicamos medidas razonables: conexión cifrada (HTTPS), contraseñas almacenadas cifradas, acceso por roles (solo la administración puede modificar información), límites y
        verificaciones contra intentos repetidos de acceso y revisión de los permisos de la base de datos. Ningún sistema es infalible; si detectamos un incidente que afecte tus datos,
        actuaremos conforme a la ley y te informaremos cuando corresponda.
      </p>

      <h2>11. Cuánto tiempo conservamos los datos</h2>
      <p>
        Mientras tu cuenta esté activa y el tiempo adicional necesario para cumplir obligaciones legales, contables o tributarias y para atender reclamaciones. Cumplido ese plazo, los
        suprimimos o anonimizamos. Las estadísticas deportivas anonimizadas pueden conservarse con fines históricos del torneo.
      </p>

      <h2>12. Cookies y almacenamiento local</h2>
      <p>
        Solo usamos almacenamiento técnico necesario para mantener tu sesión y proteger el acceso. Detalles en la <Link to={RUTAS_LEGALES.cookies}>política de cookies</Link>.
      </p>

      <h2>13. Cambios a esta política</h2>
      <p>
        Si la modificamos de forma sustancial, lo anunciaremos en el sitio y, cuando sea necesario, pediremos de nuevo tu autorización. La versión vigente siempre aparece en esta página.
      </p>
    </LegalLayout>
  )
}