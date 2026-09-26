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

// ============================================================
// Fase de grupos: clasificación y clasificados a la siguiente ronda
// ============================================================
// Reglas de desempate: puntos, luego diferencia de gol (gf-gc), luego gf,
// como es habitual. `standings` son filas de la tabla `standings`
// (con al menos team_id, group_name, pts, gf, gc), cargadas a mano por el
// admin en Admin → Tabla.

function compareStandingRows(a, b) {
  if (b.pts !== a.pts) return b.pts - a.pts
  const diffA = (a.gf ?? 0) - (a.gc ?? 0)
  const diffB = (b.gf ?? 0) - (b.gc ?? 0)
  if (diffB !== diffA) return diffB - diffA
  if ((b.gf ?? 0) !== (a.gf ?? 0)) return (b.gf ?? 0) - (a.gf ?? 0)
  return 0
}

// Agrupa y ordena la tabla de posiciones por grupo. Devuelve
// { [group_name]: filaOrdenadaConPosición[] }
export function rankGroupStandings(standings) {
  const byGroup = {}
  standings.forEach((row) => {
    const g = row.group_name || 'General'
    if (!byGroup[g]) byGroup[g] = []
    byGroup[g].push(row)
  })
  Object.keys(byGroup).forEach((g) => {
    byGroup[g] = [...byGroup[g]].sort(compareStandingRows).map((row, i) => ({ ...row, position: i + 1 }))
  })
  return byGroup
}

// Calcula quién clasifica: los primeros `perGroup` de cada grupo, más los
// `bestThirds` mejores equipos ubicados en la posición `perGroup + 1` de
// cada grupo (los "mejores terceros" cuando perGroup=2), comparados entre sí
// con el mismo criterio de desempate.
// Devuelve { qualifiers, eliminated, groups } donde cada qualifier trae
// { team_id, group_name, position, tier } y tier es 'group_winner' | 'runner_up' | 'best_other' | `pos_${n}`.
export function computeQualifiers(standings, { perGroup = 2, bestThirds = 2 } = {}) {
  const groups = rankGroupStandings(standings)
  const groupNames = Object.keys(groups)
  const directQualifiers = []
  const candidatesForBest = []
  const eliminated = []

  groupNames.forEach((g) => {
    groups[g].forEach((row) => {
      const tag = { team_id: row.team_id, group_name: g, position: row.position, standing: row }
      if (row.position <= perGroup) {
        directQualifiers.push({ ...tag, tier: row.position === 1 ? 'group_winner' : 'runner_up' })
      } else if (row.position === perGroup + 1) {
        candidatesForBest.push(tag)
      } else {
        eliminated.push({ ...tag, tier: 'eliminado' })
      }
    })
  })

  const rankedBest = [...candidatesForBest].sort((a, b) => compareStandingRows(a.standing, b.standing))
  const bestQualified = rankedBest.slice(0, bestThirds).map((t) => ({ ...t, tier: 'best_other' }))
  const restNotQualified = rankedBest.slice(bestThirds).map((t) => ({ ...t, tier: 'eliminado' }))

  // Orden final de clasificados: primeros de grupo (por fuerza), luego
  // segundos (por fuerza), luego los mejores "otros" — este orden es la
  // base del seeding de la siguiente ronda.
  const winners = directQualifiers.filter((t) => t.tier === 'group_winner').sort((a, b) => compareStandingRows(a.standing, b.standing))
  const runnersUp = directQualifiers.filter((t) => t.tier === 'runner_up').sort((a, b) => compareStandingRows(a.standing, b.standing))

  return {
    qualifiers: [...winners, ...runnersUp, ...bestQualified],
    eliminated: [...eliminated, ...restNotQualified],
    groups,
  }
}

// ============================================================
// Seeding: cruza a los clasificados evitando (cuando se puede) que dos
// equipos del mismo grupo se enfrenten en la primera ronda de eliminación.
// ============================================================

// Orden de seeding estándar de torneos (1 vs N, 4 vs N-3, ...), de forma que
// el seed 1 y el seed 2 solo puedan encontrarse en la final.
export function seedOrder(n) {
  if (n <= 1) return [1]
  const prev = seedOrder(n / 2)
  const result = []
  prev.forEach((s) => {
    result.push(s)
    result.push(n + 1 - s)
  })
  return result
}

// Intenta destrabar cruces entre equipos del mismo grupo intercambiando el
// segundo integrante de dos parejas distintas, sin tocar el primero (que es
// el sembrado "ancla" de cada cruce).
function avoidGroupClashes(pairs) {
  const result = pairs.map((p) => ({ ...p }))
  for (let i = 0; i < result.length; i++) {
    if (result[i].a.group_name !== result[i].b.group_name) continue
    for (let j = 0; j < result.length; j++) {
      if (j === i) continue
      const candidate = result[j].b
      if (candidate.group_name !== result[i].a.group_name && result[i].b.group_name !== result[j].a.group_name) {
        const tmp = result[i].b
        result[i].b = candidate
        result[j].b = tmp
        break
      }
    }
  }
  return result
}

// Arma directamente las filas de bracket_matches (ronda 1 ya con equipos
// ubicados) a partir de la lista de clasificados que devuelve
// computeQualifiers. `qualifiers.length` debe ser potencia de 2 (8, 4, 2…).
export function buildQualifiedBracketRows(tournamentId, qualifiers) {
  const n = qualifiers.length
  if (!isValidBracketSize(n)) {
    throw new Error(`La cantidad de clasificados (${n}) debe ser potencia de 2 (2, 4, 8, 16…)`)
  }
  const rows = buildBracketRows(tournamentId, qualifiers.map((q) => q.team_id))
  if (n === 2) {
    rows[0].team1_id = qualifiers[0].team_id
    rows[0].team2_id = qualifiers[1].team_id
    return rows
  }

  const order = seedOrder(n)
  let pairs = []
  for (let i = 0; i < n / 2; i++) {
    pairs.push({ a: qualifiers[order[2 * i] - 1], b: qualifiers[order[2 * i + 1] - 1] })
  }
  pairs = avoidGroupClashes(pairs)

  const round1 = rows.filter((r) => r.round_number === 1)
  round1.forEach((row, i) => {
    row.team1_id = pairs[i].a.team_id
    row.team2_id = pairs[i].b.team_id
  })
  return rows
}

// ============================================================
// Series a varias vueltas (ida y vuelta / ida-vuelta-desempate)
// ============================================================

// Suma los marcadores de cada partido de la serie. Si legs<=1, devuelve
// simplemente team1_score/team2_score tal cual (comportamiento de siempre).
export function aggregateScore(match) {
  const legs = match.legs || 1
  if (legs <= 1) return { team1: match.team1_score ?? null, team2: match.team2_score ?? null }
  const scores = Array.isArray(match.leg_scores) ? match.leg_scores : []
  let team1 = null
  let team2 = null
  scores.forEach((leg) => {
    if (leg.team1 != null) team1 = (team1 ?? 0) + Number(leg.team1)
    if (leg.team2 != null) team2 = (team2 ?? 0) + Number(leg.team2)
  })
  return { team1, team2 }
}

export function isMultiLeg(match) {
  return (match.legs || 1) > 1
}

// ============================================================
// Asistente de formato de grupos
// ============================================================
// Dada la cantidad total de equipos del torneo, propone un reparto "natural"
// en grupos + cuántos clasifican por grupo y cuántos "mejores otros" para
// llegar a un cuadro de eliminación que sea potencia de 2.
// Prioriza grupos de 4 (formato de FIFA / Champions), luego de 3, luego de 5.

export function suggestGroupFormat(totalTeams) {
  if (!totalTeams || totalTeams < 2) return null

  // Candidatos: distribución preferida + clasificados por grupo + extras.
  // Cada candidato es: { groupSize, perGroup, bestOthers, totalGroups, totalQualifiers }
  const candidates = []

  for (const groupSize of [4, 3, 5, 6]) {
    if (totalTeams % groupSize !== 0) continue
    const totalGroups = totalTeams / groupSize
    if (totalGroups < 2) continue

    // Para cada posible cantidad de clasificados por grupo (1, 2, 3…)
    for (let perGroup = 1; perGroup <= Math.min(groupSize - 1, 4); perGroup++) {
      const direct = totalGroups * perGroup
      const need = direct < 2 ? 2 : nearestPowerOfTwoAtLeast(direct) - direct
      // need = 0 si direct ya es potencia de 2; si no, cuántos "mejores otros"
      // hay que sumar para llegar a la siguiente potencia de 2.
      // También se acepta no llegar a potencia de 2 (need puede ser > grupos
      // disponibles) — eso lo filtramos más abajo.
      const candidates_best = need >= 0 && need <= totalGroups ? need : null
      const totalQualifiers = direct + (candidates_best ?? 0)

      candidates.push({
        groupSize,
        perGroup,
        bestOthers: candidates_best,
        totalGroups,
        totalQualifiers,
        // Qué tan "natural" es: preferimos grupo 4 + perGroup 2 + few extras.
        score: scoreCandidate(groupSize, perGroup, totalGroups, candidates_best ?? Infinity),
      })
    }
  }

  if (!candidates.length) return null

  // Nos quedamos con los que dan potencia de 2 y tengan el mejor puntaje.
  const valid = candidates.filter((c) => c.bestOthers !== null && isValidBracketSize(c.totalQualifiers))
  const pool = valid.length ? valid : candidates
  pool.sort((a, b) => a.score - b.score)
  return pool[0]
}

function nearestPowerOfTwoAtLeast(n) {
  if (n <= 1) return 2
  let p = 1
  while (p < n) p *= 2
  return p
}

// Mientras más bajo mejor. Prioriza: grupo de 4, perGroup=2, pocos extras, pocos grupos.
function scoreCandidate(groupSize, perGroup, totalGroups, bestOthers) {
  const groupPenalty = groupSize === 4 ? 0 : groupSize === 3 ? 10 : groupSize === 5 ? 20 : 30
  const perGroupPenalty = perGroup === 2 ? 0 : perGroup === 1 ? 5 : perGroup === 3 ? 5 : 10
  const extrasPenalty = bestOthers === 0 ? 0 : bestOthers === 1 ? 3 : bestOthers === 2 ? 5 : bestOthers * 4
  const groupsPenalty = totalGroups > 8 ? 8 : totalGroups > 6 ? 4 : 0
  return groupPenalty + perGroupPenalty + extrasPenalty + groupsPenalty
}