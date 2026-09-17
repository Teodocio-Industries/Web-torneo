import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import TeamBadge from '../../components/TeamBadge/TeamBadge'
import { decimal, estadisticasJugador, partidosJugadosPorEquipo, porcentaje } from '../../lib/playerStats'
import './JugadorDetalle.css'

export default function JugadorDetalle() {
  const { playerId } = useParams()
  const [jugador, setJugador] = useState(null)
  const [partidosEquipo, setPartidosEquipo] = useState(0)
  const [cargando, setCargando] = useState(true)

  const cargarJugador = useCallback(async () => {
    const { data: jugadorData } = await supabase
      .from('players')
      .select('*, teams(name,flag_url), tournaments(name)')
      .eq('id', playerId)
      .single()

    if (!jugadorData) {
      setJugador(null)
      setPartidosEquipo(0)
      setCargando(false)
      return
    }

    const { data: partidosData } = await supabase
      .from('bracket_matches')
      .select('team1_id, team2_id, status')
      .eq('tournament_id', jugadorData.tournament_id)

    setJugador(jugadorData)
    setPartidosEquipo(partidosJugadosPorEquipo(jugadorData.team_id, partidosData || []))
    setCargando(false)
  }, [playerId])

  useEffect(() => {
    cargarJugador()
    const canalJugador = supabase
      .channel(`detalle-jugador-${playerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `id=eq.${playerId}` },
        cargarJugador,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canalJugador)
    }
  }, [cargarJugador, playerId])

  useEffect(() => {
    if (!jugador?.tournament_id) return
    const canalPartidos = supabase
      .channel(`partidos-equipo-${jugador.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bracket_matches', filter: `tournament_id=eq.${jugador.tournament_id}` },
        cargarJugador,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canalPartidos)
    }
  }, [cargarJugador, jugador?.id, jugador?.tournament_id])

  const stats = useMemo(() => (jugador ? estadisticasJugador(jugador, partidosEquipo) : null), [jugador, partidosEquipo])
  const maxGrafica = Math.max(stats?.puntos || 0, stats?.asistencias || 0, stats?.faltasTecnicas || 0, stats?.expulsiones || 0, 1)

  if (cargando) return <div className="loading-screen">Cargando jugador…</div>
  if (!jugador || !stats) return <main className="page"><div className="empty">No encontramos este jugador.</div></main>

  const barras = [
    ['Puntos', stats.puntos, 'naranja'],
    ['Asistencias', stats.asistencias, 'azul'],
    ['Faltas técnicas', stats.faltasTecnicas, 'amarillo'],
    ['Expulsiones', stats.expulsiones, 'rojo'],
  ]

  return (
    <main className="page ficha-page">
      <Link className="volver" to="/jugadores">← Volver a jugadores</Link>
      <section className="ficha-encabezado card">
        <TeamBadge team={jugador.teams} size="lg" />
        <div>
          <p className="eyebrow">{jugador.tournaments?.name || 'Torneo'}</p>
          <h1>{jugador.full_name}</h1>
          <p className="mini">{jugador.teams?.name || 'Sin equipo'} {jugador.dorsal ? `· #${jugador.dorsal}` : ''} {jugador.position ? `· ${jugador.position}` : ''}</p>
        </div>
      </section>

      <section className="ficha-resumen" aria-label="Resumen de estadísticas">
        <article><span>Puntos</span><strong>{stats.puntos}</strong><small>{decimal(stats.puntosPorPartido)} por partido</small></article>
        <article><span>Asistencias</span><strong>{stats.asistencias}</strong><small>{decimal(stats.asistenciasPorPartido)} por partido</small></article>
        <article><span>Partidos jugados</span><strong>{stats.partidosJugados}</strong><small>{stats.partidosDelEquipo} disputados por su equipo</small></article>
        <article><span>Disponibilidad</span><strong>{porcentaje(stats.disponibilidad)}</strong><small>{stats.partidosSuspendido} suspendido(s)</small></article>
      </section>

      <section className="ficha-cuadricula">
        <article className="card grafica-estadisticas">
          <div className="titulo-seccion"><div><p className="eyebrow">RENDIMIENTO TOTAL</p><h2>Estadísticas del torneo</h2></div><span className="mini">Valores acumulados</span></div>
          <div className="barras-estadisticas" role="img" aria-label="Gráfico de puntos, asistencias, faltas técnicas y expulsiones">
            {barras.map(([nombre, valor, color]) => <div className="barra-estadistica" key={nombre}><div className="barra-estadistica__encabezado"><span>{nombre}</span><b>{valor}</b></div><div className="barra-estadistica__fondo"><span className={`barra-estadistica__valor ${color}`} style={{ width: `${(valor / maxGrafica) * 100}%` }} /></div></div>)}
          </div>
        </article>

        <article className="card participacion">
          <p className="eyebrow">PARTICIPACIÓN</p><h2>Partidos y disponibilidad</h2>
          <div className="anillo" style={{ '--porcentaje': `${stats.disponibilidad}%` }}><strong>{porcentaje(stats.disponibilidad)}</strong><span>disponible</span></div>
          <div className="leyenda-participacion"><span><i className="punto naranja" />Jugados <b>{stats.partidosJugados}</b></span><span><i className="punto rojo" />Suspendidos <b>{stats.partidosSuspendido}</b></span></div>
        </article>
      </section>

      <section className="card tabla-rendimiento">
        <div className="titulo-seccion"><div><p className="eyebrow">DESGLOSE</p><h2>Tabla de rendimiento</h2></div><span className="mini">Los promedios excluyen partidos suspendidos.</span></div>
        <table>
          <thead><tr><th>Métrica</th><th>Total</th><th>Promedio por partido</th><th>Porcentaje</th></tr></thead>
          <tbody>
            <tr><td>Puntos</td><td>{stats.puntos}</td><td>{decimal(stats.puntosPorPartido)}</td><td>—</td></tr>
            <tr><td>Asistencias</td><td>{stats.asistencias}</td><td>{decimal(stats.asistenciasPorPartido)}</td><td>—</td></tr>
            <tr><td>Partidos del equipo</td><td>{stats.partidosDelEquipo}</td><td>—</td><td>100% del registro</td></tr>
            <tr><td>Partidos jugados</td><td>{stats.partidosJugados}</td><td>—</td><td>{porcentaje(stats.disponibilidad)} disponibilidad</td></tr>
            <tr><td>Partidos suspendidos</td><td>{stats.partidosSuspendido}</td><td>No se contabilizan</td><td>{porcentaje(stats.suspension)} del registro</td></tr>
            <tr><td>Faltas técnicas</td><td>{stats.faltasTecnicas}</td><td>{decimal(stats.faltasTecnicas / Math.max(stats.partidosJugados, 1))}</td><td>—</td></tr>
            <tr><td>Expulsiones</td><td>{stats.expulsiones}</td><td>{decimal(stats.expulsiones / Math.max(stats.partidosJugados, 1))}</td><td>—</td></tr>
          </tbody>
        </table>
      </section>
    </main>
  )
}
