import ServiciosCatalogo from '../../components/ServiciosCatalogo/ServiciosCatalogo'
import { useTitulo } from '../../lib/useTitulo'
import './Servicios.css'

export default function Servicios() {
  useTitulo('Servicios individuales')
  return (
    <main className="page servicios-page">
      <section className="servicios-encabezado">
        <p className="eyebrow">Caribe Sports</p>
        <h1>Catálogo de Servicios Individuales</h1>
        <p className="mini">Maximiza tu visibilidad, imagen y rendimiento durante el torneo.</p>
      </section>

      <ServiciosCatalogo />
    </main>
  )
}