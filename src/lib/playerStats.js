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
  const partidosJugados = Math.max(0, partidosDelEquipo - partidosSuspendido)
  const puntos = numero(jugador.goals)
  const asistencias = numero(jugador.assists)
  const faltasTecnicas = numero(jugador.yellow_cards)
  const expulsiones = numero(jugador.red_cards)

  return {
    partidosJugados,
    partidosSuspendido,
    partidosDelEquipo,
    puntos,
    asistencias,
    faltasTecnicas,
    expulsiones,
    disponibilidad: partidosDelEquipo ? (partidosJugados / partidosDelEquipo) * 100 : 0,
    suspension: partidosDelEquipo ? (partidosSuspendido / partidosDelEquipo) * 100 : 0,
    puntosPorPartido: partidosJugados ? puntos / partidosJugados : 0,
    asistenciasPorPartido: partidosJugados ? asistencias / partidosJugados : 0,
  }
}

export function porcentaje(valor) {
  return `${Math.round(valor)}%`
}

export function decimal(valor) {
  return Number(valor).toFixed(1)
}
