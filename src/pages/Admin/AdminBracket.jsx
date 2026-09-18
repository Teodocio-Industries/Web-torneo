import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'
import { computeNextSlot, findMatch } from '../../lib/bracket'
import Bracket from '../../components/Bracket/Bracket'

async function resetForward(matches, match) {
  const hadWinner = match.winner_id
  await supabase.from('bracket_matches').update({ winner_id: null, team1_score: null, team2_score: null, status: 'pendiente' }).eq('id', match.id)
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

  return (
    <>
      <div className="card">
        <p className="mini">
          El cuadro se ve igual al que verán los espectadores en Torneos. Arrastra cada equipo guardado
          hacia un casillero vacío de la primera ronda, luego ingresa el marcador y presiona <strong>Finalizar</strong>.
          El ganador avanza automáticamente y el perdedor queda eliminado.
        </p>
      </div>

      <Bracket
        matches={matches}
        teams={teams}
        tournamentName={tournamentName}
        editable
        dragEnabled
        poolTeams={poolTeams}
        onScoreChange={handleScoreChange}
        onDropTeam={handleDropTeam}
        onRemoveSlot={handleRemoveSlot}
        onFinalize={handleFinalize}
        onReopen={handleReopen}
      />
    </>
  )
}