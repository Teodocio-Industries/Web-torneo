function numero(valor) {
  const resultado = Number(valor)
  return Number.isFinite(resultado) ? resultado : 0
}

export function partidosJugadosPorEquipo(teamId, partidos = []) {
  if (!teamId) return 0
  return partidos.filter((partido) => (
    partido.status === 'jugado'
    && (partido.team1_id === teamId || partido.team2_id === teamId)
  )).length
}

export function estadisticasJugador(jugador, partidosEquipo = 0) {
  const partidosDelEquipo = Math.max(0, numero(partidosEquipo))
  const partidosSuspendido = Math.max(0, numero(jugador.games_suspended))
  const partidosRegistrados = Math.max(0, numero(jugador.games_played))
  const partidosJugados = Math.max(0, partidosDelEquipo - partidosSuspendido + partidosRegistrados)
  const puntos = numero(jugador.goals)
  const asistencias = numero(jugador.assists)
  const faltasTecnicas = numero(jugador.yellow_cards)
  const expulsiones = numero(jugador.red_cards)
  const triplesLanzados = Math.max(0, numero(jugador.three_points_attempted))
  const triplesConvertidos = Math.min(triplesLanzados, Math.max(0, numero(jugador.three_points_made)))
  const libresLanzados = Math.max(0, numero(jugador.free_throws_attempted))
  const libresConvertidos = Math.min(libresLanzados, Math.max(0, numero(jugador.free_throws_made)))
  const rebotes = Math.max(0, numero(jugador.rebounds))
  const robos = Math.max(0, numero(jugador.steals))
  const tapones = Math.max(0, numero(jugador.blocks))
  const perdidas = Math.max(0, numero(jugador.turnovers))
  const faltasPersonales = Math.max(0, numero(jugador.personal_fouls))

  return {
    partidosJugados,
    partidosRegistrados,
    partidosSuspendido,
    partidosDelEquipo,
    puntos,
    asistencias,
    faltasTecnicas,
    expulsiones,
    triplesLanzados,
    triplesConvertidos,
    libresLanzados,
    libresConvertidos,
    rebotes,
    robos,
    tapones,
    perdidas,
    faltasPersonales,
    porcentajeTriples: triplesLanzados ? (triplesConvertidos / triplesLanzados) * 100 : 0,
    porcentajeLibres: libresLanzados ? (libresConvertidos / libresLanzados) * 100 : 0,
    disponibilidad: (partidosDelEquipo + partidosRegistrados)
      ? (partidosJugados / (partidosDelEquipo + partidosRegistrados)) * 100
      : 0,
    suspension: partidosDelEquipo ? (partidosSuspendido / partidosDelEquipo) * 100 : 0,
    puntosPorPartido: partidosJugados ? puntos / partidosJugados : 0,
    asistenciasPorPartido: partidosJugados ? asistencias / partidosJugados : 0,
    rebotesPorPartido: partidosJugados ? rebotes / partidosJugados : 0,
    robosPorPartido: partidosJugados ? robos / partidosJugados : 0,
    taponesPorPartido: partidosJugados ? tapones / partidosJugados : 0,
    perdidasPorPartido: partidosJugados ? perdidas / partidosJugados : 0,
    faltasPersonalesPorPartido: partidosJugados ? faltasPersonales / partidosJugados : 0,
    faltasTecnicasPorPartido: partidosJugados ? faltasTecnicas / partidosJugados : 0,
    expulsionesPorPartido: partidosJugados ? expulsiones / partidosJugados : 0,
    triplesLanzadosPorPartido: partidosJugados ? triplesLanzados / partidosJugados : 0,
    triplesConvertidosPorPartido: partidosJugados ? triplesConvertidos / partidosJugados : 0,
    libresLanzadosPorPartido: partidosJugados ? libresLanzados / partidosJugados : 0,
    libresConvertidosPorPartido: partidosJugados ? libresConvertidos / partidosJugados : 0,
  }
}

export function porcentaje(valor) {
  return `${Math.round(valor)}%`
}

export function decimal(valor) {
  return Number(valor).toFixed(1)
}
