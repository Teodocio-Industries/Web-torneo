import { Link } from 'react-router-dom'
import LegalLayout, { Neg } from './LegalLayout'
import { RUTAS_LEGALES } from '../../config/negocio'

export default function Reembolsos() {
  return (
    <LegalLayout
      titulo="Política de reembolsos, cancelaciones y derecho de retracto"
      resumen="Tienes 5 días hábiles para retractarte de una compra a distancia, siempre que el servicio no haya empezado con tu acuerdo. Si no cumplimos o el servicio no corresponde a lo ofrecido, corregimos o te devolvemos el dinero."
    >
      <h2>1. A qué se aplica</h2>
      <p>
        A los servicios individuales que se contratan a distancia a través de este sitio y de WhatsApp (Content Package, Player Spotlight y Player Performance). Al ser ventas a distancia, aplica el
        derecho de retracto del artículo 47 de la Ley 1480 de 2011 (Estatuto del Consumidor).
      </p>

      <h2>2. Derecho de retracto</h2>
      <ul>
        <li><strong>Plazo:</strong> hasta 5 días hábiles contados desde la celebración del contrato (cuando aceptas la propuesta y el precio).</li>
        <li><strong>Cómo ejercerlo:</strong> escríbenos a <Neg campo="email" /> o por WhatsApp indicando tu nombre, el servicio y la fecha de contratación. No tienes que justificar tus razones.</li>
        <li><strong>Devolución del dinero:</strong> reintegramos todo lo que pagaste, por el mismo medio o el que acordemos, en un plazo máximo de 30 días calendario desde que ejerces el derecho. No te pediremos aceptar un servicio distinto ni condicionaremos la devolución.</li>
      </ul>

      <h3>Cuándo NO aplica el retracto</h3>
      <p>La ley exceptúa, entre otros casos:</p>
      <ul>
        <li>Los servicios cuya prestación <strong>ya comenzó con tu acuerdo</strong>. Por eso, antes de empezar a trabajar en tu servicio dentro de esos 5 días, te pediremos por escrito que confirmes que quieres que lo iniciemos de inmediato y que entiendes que, desde ese momento, ya no podrás retractarte. Si no lo confirmas, no empezamos hasta que venza el plazo.</li>
        <li>Los bienes confeccionados según tus especificaciones o claramente personalizados.</li>
      </ul>

      <h2>3. Reembolso por incumplimiento o por servicio que no corresponde a lo ofrecido</h2>
      <p>Si no entregamos el servicio en el plazo acordado, o lo entregado no corresponde a lo ofrecido o a lo pactado por escrito:</p>
      <ol>
        <li>Escríbenos dentro de los 10 días hábiles siguientes a la entrega (o a la fecha en que debió entregarse) explicando el problema.</li>
        <li>Primero lo corregimos o completamos en un plazo razonable que acordaremos contigo.</li>
        <li>Si no es posible corregirlo, o el problema persiste, te devolvemos el dinero pagado por la parte no entregada o no conforme, hasta el 100 % si el servicio quedó sin prestarse.</li>
      </ol>
      <p>Esto es adicional a la garantía legal que el Estatuto del Consumidor te reconoce.</p>

      <h2>4. Cancelaciones</h2>
      <ul>
        <li><strong>Por ti, antes de que iniciemos el servicio:</strong> te devolvemos el 100 % del pago.</li>
        <li><strong>Por ti, después de iniciado con tu confirmación:</strong> devolvemos el pago descontando el valor proporcional del trabajo ya realizado, que te informaremos y sustentaremos por escrito.</li>
        <li><strong>Por nosotros</strong> (por ejemplo, el torneo se cancela, no se obtiene material suficiente o no podemos prestar el servicio): te devolvemos el 100 % de lo pagado por la parte no prestada.</li>
      </ul>

      <h2>5. Cómo hacemos el reembolso</h2>
      <p>
        Por transferencia a la cuenta desde la que pagaste (o a otra que nos indiques, a nombre del pagador), dentro del plazo máximo de 30 días calendario desde la aceptación de tu solicitud o el ejercicio del retracto.
        Te confirmamos por escrito cuando se haga.
      </p>

      <h2>6. Reversión del pago</h2>
      <p>
        Si pagaste con un instrumento de pago electrónico (tarjeta, PSE u otro) y hubo una operación fraudulenta o no solicitada, o no recibiste el servicio o llegó defectuoso, puedes pedir la reversión del pago
        dentro de los 5 días hábiles siguientes a que tuviste noticia del hecho, presentando queja ante nosotros y notificando a la entidad emisora de tu instrumento de pago (art. 51 de la Ley 1480 de 2011).
      </p>

      <h2>7. Contacto y autoridad</h2>
      <p>
        Peticiones, quejas y reclamos: <Neg campo="email" /> · <Neg campo="telefono" />. Si no estás conforme con nuestra respuesta, puedes acudir a la Superintendencia de Industria y Comercio (SIC).
        Más información en nuestros <Link to={RUTAS_LEGALES.terminos}>términos y condiciones</Link>.
      </p>
    </LegalLayout>
  )
}