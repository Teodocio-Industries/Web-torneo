// Helpers puros para generar y hacer avanzar un cuadro de eliminación directa.
// No dependen de React ni de Supabase: reciben/devuelven datos planos.

export function roundNameForTotal(total) {
  const names = { 2: 'Final', 4: 'Semifinal', 8: 'Cuartos', 16: 'Octavos', 32: 'Dieciseisavos', 64: 'Treintaidosavos' }
  return names[total] || `Ronda de ${total}`
}

// Construye las filas de bracket_matches para N equipos (N debe ser potencia de 2).
// Reparte los equipos en dos mitades (izquierda/derecha) que confluyen en la Final.
export function buildBracketRows(tournamentId, teamIds) {
  // Importante: la ronda 1 se genera SIEMPRE vacía (team1_id/team2_id en null),
  // aunque ya sepamos qué equipos participan. Así el admin los ubica a mano
  // arrastrándolos desde la lista de equipos, nunca quedan puestos solos.
  const rows = []
  const n = teamIds.length
  if (n === 2) {
    rows.push({ tournament_id: tournamentId, round_number: 1, round_name: 'Final', side: 'final', match_index: 0, team1_id: null, team2_id: null })
    return rows
  }
  const half = n / 2
  let matchesPerSide = half / 2
  let totalTeams = n
  let round = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rname = roundNameForTotal(totalTeams)
    for (let i = 0; i < matchesPerSide; i++) {
      rows.push({
        tournament_id: tournamentId, round_number: round, round_name: rname, side: 'izquierda', match_index: i,
        team1_id: null, team2_id: null,
      })
    }
    for (let i = 0; i < matchesPerSide; i++) {
      rows.push({
        tournament_id: tournamentId, round_number: round, round_name: rname, side: 'derecha', match_index: i,
        team1_id: null, team2_id: null,
      })
    }
    if (matchesPerSide === 1) {
      rows.push({ tournament_id: tournamentId, round_number: round + 1, round_name: 'Final', side: 'final', match_index: 0, team1_id: null, team2_id: null })
      break
    }
    matchesPerSide /= 2
    totalTeams /= 2
    round += 1
  }
  return rows
}

export function isValidBracketSize(n) {
  return n >= 2 && (n & (n - 1)) === 0
}

function isLastRoundOfSide(matches, match) {
  const sameRoundSide = matches.filter((m) => m.round_number === match.round_number && m.side === match.side)
  return sameRoundSide.length === 1
}

// Calcula a qué partido/casilla de la siguiente ronda avanza el ganador de `match`.
export function computeNextSlot(matches, match) {
  if (match.round_name === 'Final') return null
  if (match.side !== 'final' && isLastRoundOfSide(matches, match)) {
    return { round_number: match.round_number + 1, side: 'final', match_index: 0, slotField: match.side === 'izquierda' ? 'team1_id' : 'team2_id' }
  }
  return {
    round_number: match.round_number + 1,
    side: match.side,
    match_index: Math.floor(match.match_index / 2),
    slotField: match.match_index % 2 === 0 ? 'team1_id' : 'team2_id',
  }
}

export function findMatch(matches, round_number, side, match_index) {
  return matches.find((m) => m.round_number === round_number && m.side === side && m.match_index === match_index)
}