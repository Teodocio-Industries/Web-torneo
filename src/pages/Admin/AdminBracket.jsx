import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'
import { computeNextSlot, findMatch, aggregateScore, isMultiLeg } from '../../lib/bracket'
import Bracket from '../../components/Bracket/Bracket'

const LEG_LABELS = { 1: 'Partido único', 2: ['Ida', 'Vuelta'], 3: ['Ida', 'Vuelta', 'Desempate'] }

async function resetForward(matches, match) {
  const hadWinner = match.winner_id
  await supabase.from('bracket_matches').update({ winner_id: null, team1_score: null, team2_score: null, leg_scores: [], status: 'pendiente' }).eq('id', match.id)
  if (hadWinner && match.round_name !== 'Final') {
    const next = computeNextSlot(matches, match)
    if (!next) return
    const nextMatch = findMatch(matches, next.round_number, next.side, next.match_index)
    if (nextMatch && nextMatch[next.slotField] === hadWinner) {
      if (nextMatch.winner_id) await resetForward(matches, nextMatch)
      await supabase.from('bracket_matches').update({ [next.slotField]: null }).eq('id', nextMatch.id)
    }
  }
}

export default function AdminBracket({ matches, teams, tournaments, selectedId, reloadData }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  // "Fijar equipos": una vez ubicados con arrastrar y soltar, este botón bloquea
  // el cuadro para que nadie los mueva sin querer. Se puede volver a editar
  // pulsando el mismo botón otra vez.
  const [locked, setLocked] = useState(false)

  async function handleScoreChange(match, field, value) {
    const v = value === '' ? null : Math.max(0, parseInt(value, 10) || 0)
    const { error } = await supabase.from('bracket_matches').update({ [field]: v }).eq('id', match.id)
    if (error) {
      toast('No se pudo guardar el puntaje: ' + error.message, 'err')
      return
    }
    await reloadData()
  }

  async function handleDropTeam(match, which, teamId) {
    const field = which === 'team1' ? 'team1_id' : 'team2_id'
    const otherField = which === 'team1' ? 'team2_id' : 'team1_id'
    if (match[otherField] === teamId) {
      toast('Ese equipo ya está en el otro casillero de este cruce', 'err')
      return
    }
    const { error } = await supabase.from('bracket_matches').update({ [field]: teamId }).eq('id', match.id)
    if (error) {
      toast('Error al ubicar el equipo: ' + error.message, 'err')
      return
    }
    await reloadData()
  }

  // Aplica una cantidad de partidos (1, 2 o 3) a TODOS los cruces de una
  // ronda a la vez (ej. toda la Semifinal a 2 vueltas). No pisa marcadores
  // ya cargados si la cantidad de vueltas no cambia.
  async function handleSetLegsForRound(roundName, legs) {
    const roundMatches = matches.filter((m) => m.round_name === roundName)
    if (!roundMatches.length) return
    try {
      await Promise.all(roundMatches.map((m) => {
        const trimmedLegs = Array.isArray(m.leg_scores) ? m.leg_scores.slice(0, legs) : []
        return supabase.from('bracket_matches').update({ legs, leg_scores: trimmedLegs }).eq('id', m.id)
      }))
      await reloadData()
      toast(`${roundName}: ${legs === 1 ? 'partido único' : `series a ${legs} vueltas`}`, 'ok')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    }
  }

  // Guarda el marcador de UN partido de la serie (ida, vuelta o desempate)
  // y recalcula el global, que queda en team1_score/team2_score para que el
  // cuadro visual (y el botón Finalizar) lo usen exactamente igual que un
  // partido único.
  async function handleLegScoreChange(match, legIndex, field, value) {
    const v = value === '' ? null : Math.max(0, parseInt(value, 10) || 0)
    const legs = Array.isArray(match.leg_scores) ? [...match.leg_scores] : []
    while (legs.length <= legIndex) legs.push({ team1: null, team2: null })
    legs[legIndex] = { ...legs[legIndex], [field]: v }
    const agg = aggregateScore({ ...match, leg_scores: legs })
    const { error } = await supabase.from('bracket_matches')
      .update({ leg_scores: legs, team1_score: agg.team1, team2_score: agg.team2 })
      .eq('id', match.id)
    if (error) {
      toast('No se pudo guardar el puntaje: ' + error.message, 'err')
      return
    }
    await reloadData()
  }

  async function handleRemoveSlot(match, which) {
    if (match.status !== 'pendiente') return
    const field = which === 'team1' ? 'team1_id' : 'team2_id'
    await supabase.from('bracket_matches').update({ [field]: null }).eq('id', match.id)
    await reloadData()
  }

  function teamName(list, id) {
    return list.find((t) => t.id === id)?.name || 'El equipo'
  }

  async function handleFinalize(match, winnerId) {
    if (busy) return
    const s1 = match.team1_score
    const s2 = match.team2_score
    if (s1 === null || s1 === undefined || s2 === null || s2 === undefined) {
      toast('Ingresa ambos puntajes antes de finalizar', 'err')
      return
    }
    setBusy(true)
    try {
      const loserId = winnerId === match.team1_id ? match.team2_id : match.team1_id
      const isFinal = match.round_name === 'Final'

      await supabase.from('bracket_matches').update({ winner_id: winnerId, status: 'jugado' }).eq('id', match.id)
      await supabase.from('teams').update({ status: isFinal ? 'campeon' : 'avanzo' }).eq('id', winnerId)
      if (loserId) await supabase.from('teams').update({ status: 'eliminado' }).eq('id', loserId)

      if (!isFinal) {
        const next = computeNextSlot(matches, match)
        if (next) {
          const nextMatch = findMatch(matches, next.round_number, next.side, next.match_index)
          if (nextMatch) {
            if (nextMatch.winner_id) await resetForward(matches, nextMatch)
            await supabase.from('bracket_matches').update({ [next.slotField]: winnerId }).eq('id', nextMatch.id)
          }
        }
      }
      await reloadData()
      toast(isFinal ? `🏆 ${teamName(teams, winnerId)} es el campeón` : `✅ ${teamName(teams, winnerId)} gana y avanza`, 'ok')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  async function handleReopen(match) {
    if (busy) return
    setBusy(true)
    try {
      const previousWinner = match.winner_id
      await supabase.from('bracket_matches').update({ winner_id: null, status: 'pendiente' }).eq('id', match.id)
      if (previousWinner) {
        await supabase.from('teams').update({ status: null }).eq('id', previousWinner)
        const back = computeNextSlot(matches, match)
        if (back) {
          const backMatch = findMatch(matches, back.round_number, back.side, back.match_index)
          if (backMatch && backMatch[back.slotField] === previousWinner) {
            await supabase.from('bracket_matches').update({ [back.slotField]: null }).eq('id', backMatch.id)
            if (backMatch.winner_id) {
              await supabase.from('bracket_matches').update({ winner_id: null, status: 'pendiente' }).eq('id', backMatch.id)
            }
          }
        }
      }
      await reloadData()
      toast('Cruce reabierto', 'ok')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  if (!matches.length) return <div className="empty">Genera el bracket primero desde la pestaña Equipos.</div>

  const placedIds = new Set()
  matches.forEach((m) => {
    if (m.team1_id) placedIds.add(m.team1_id)
    if (m.team2_id) placedIds.add(m.team2_id)
  })
  const poolTeams = teams.filter((t) => !placedIds.has(t.id))
  const tournamentName = tournaments?.find((t) => t.id === selectedId)?.name

  // Rondas presentes (Final, Semifinal, Cuartos…), de la última a la primera,
  // para elegir cuántas vueltas juega cada una.
  const roundNames = [...new Set(matches.map((m) => m.round_name))]
    .sort((a, b) => (matches.find((m) => m.round_name === b)?.round_number || 0) - (matches.find((m) => m.round_name === a)?.round_number || 0))

  const multiLegMatches = matches.filter((m) => isMultiLeg(m) && m.team1_id && m.team2_id)

  return (
    <>
      <div className="card">
        <h3>Formato de cada ronda</h3>
        <p className="mini">
          Por defecto cada cruce es a partido único. Cualquier ronda del cuadro (Cuartos, Semifinal o Final)
          puede jugarse a <strong>ida y vuelta</strong> (2 partidos) o <strong>ida, vuelta y desempate</strong>
          (3 partidos); el marcador global se calcula sumando esos partidos y define el ganador, igual que en
          un cruce normal.
        </p>
        {roundNames.map((rn) => {
          const roundMatches = matches.filter((m) => m.round_name === rn)
          const legsInRound = new Set(roundMatches.map((m) => m.legs || 1))
          const current = legsInRound.size === 1 ? [...legsInRound][0] : null
          return (
            <div key={rn} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              <strong style={{ minWidth: 110 }}>{rn}</strong>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`pill-btn ${current === n ? 'on' : ''}`}
                  onClick={() => handleSetLegsForRound(rn, n)}
                >
                  {n === 1 ? 'Partido único' : n === 2 ? 'Ida y vuelta' : 'Ida, vuelta y desempate'}
                </button>
              ))}
              {current === null && <span className="mini">(mezclado entre cruces de esta ronda)</span>}
            </div>
          )
        })}
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <p className="mini" style={{ margin: 0 }}>
          {locked
            ? 'Los equipos están fijos en el cuadro. Pulsa "Editar equipos" si necesitas moverlos.'
            : 'El cuadro se ve igual al que verán los espectadores en Torneos. Arrastra cada equipo guardado hacia un casillero vacío de la primera ronda. Cuando termines, pulsa "Fijar equipos".'}
        </p>
        <button type="button" className="btn" onClick={() => setLocked((l) => !l)}>
          {locked ? '✏️ Editar equipos' : '🔒 Fijar equipos'}
        </button>
      </div>

      <Bracket
        matches={matches}
        teams={teams}
        tournamentName={tournamentName}
        editable
        dragEnabled={!locked}
        poolTeams={poolTeams}
        onScoreChange={handleScoreChange}
        onDropTeam={handleDropTeam}
        onRemoveSlot={handleRemoveSlot}
        onFinalize={handleFinalize}
        onReopen={handleReopen}
      />

      {multiLegMatches.length > 0 && (
        <div className="card">
          <h3>Marcadores de series a varias vueltas</h3>
          <p className="mini">Carga aquí el resultado de cada partido de la serie; el global se actualiza solo.</p>
          {multiLegMatches.map((m) => {
            const legs = m.legs || 1
            const labels = LEG_LABELS[legs] || []
            const agg = aggregateScore(m)
            const t1 = teamName(teams, m.team1_id)
            const t2 = teamName(teams, m.team2_id)
            const tied = m.status !== 'jugado' && agg.team1 != null && agg.team2 != null && agg.team1 === agg.team2
            return (
              <div key={m.id} className="card" style={{ background: 'var(--panel-2)' }}>
                <div className="card-title-row">
                  <strong>{m.round_name}: {t1} vs {t2}</strong>
                  {m.status === 'jugado' && <span className="badge ok">Definido</span>}
                </div>
                <div className="form-grid">
                  {Array.from({ length: legs }).map((_, i) => {
                    const leg = (Array.isArray(m.leg_scores) && m.leg_scores[i]) || {}
                    return (
                      <div key={i} className="field">
                        <label>{labels[i] || `Partido ${i + 1}`}</label>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="number" placeholder={t1} style={{ width: 70 }}
                            defaultValue={leg.team1 ?? ''}
                            disabled={m.status === 'jugado'}
                            onBlur={(e) => handleLegScoreChange(m, i, 'team1', e.target.value)}
                          />
                          <span className="mini">–</span>
                          <input
                            type="number" placeholder={t2} style={{ width: 70 }}
                            defaultValue={leg.team2 ?? ''}
                            disabled={m.status === 'jugado'}
                            onBlur={(e) => handleLegScoreChange(m, i, 'team2', e.target.value)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="mini">Global: <strong>{t1} {agg.team1 ?? '—'} – {agg.team2 ?? '—'} {t2}</strong></p>
                {m.status !== 'jugado' && (
                  <div className="row-actions">
                    {!tied && agg.team1 != null && agg.team2 != null && (
                      <button className="btn small" disabled={busy} onClick={() => handleFinalize(m, agg.team1 > agg.team2 ? m.team1_id : m.team2_id)}>
                        Finalizar con el global
                      </button>
                    )}
                    {tied && (
                      <>
                        <span className="mini">Empate global — declara ganador manualmente (o agrega un desempate):</span>
                        <button className="pill-btn" disabled={busy} onClick={() => handleFinalize(m, m.team1_id)}>{t1} gana</button>
                        <button className="pill-btn" disabled={busy} onClick={() => handleFinalize(m, m.team2_id)}>{t2} gana</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}