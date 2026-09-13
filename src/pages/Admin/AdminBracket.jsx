import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'
import { computeNextSlot, findMatch } from '../../lib/bracket'

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

export default function AdminBracket({ matches, teams, reloadData }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  function teamById(id) { return teams.find((t) => t.id === id) }

  async function setWinner(match, winnerId) {
    if (!winnerId || busy) return
    setBusy(true)
    try {
      const loserId = match.team1_id === winnerId ? match.team2_id : match.team1_id
      await supabase.from('bracket_matches').update({ winner_id: winnerId, status: 'jugado' }).eq('id', match.id)
      const champion = match.round_name === 'Final'
      await supabase.from('teams').update({ status: champion ? 'campeon' : 'avanzo' }).eq('id', winnerId)
      if (loserId) await supabase.from('teams').update({ status: 'eliminado' }).eq('id', loserId)
      if (!champion) {
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
      toast('Resultado actualizado', 'ok')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  async function setScore(match, field, value) {
    await supabase.from('bracket_matches').update({ [field]: value === '' ? null : parseInt(value, 10) }).eq('id', match.id)
    await reloadData()
  }

  if (!matches.length) return <div className="empty">Genera el bracket primero desde la pestaña Equipos.</div>

  const rounds = [...new Set(matches.map((m) => `${m.round_number}|${m.round_name}`))].sort((a, b) => parseInt(a) - parseInt(b))

  return (
    <>
      <div className="card"><p className="mini">Registra el marcador y marca el ganador de cada cruce. El ganador avanza automáticamente a la siguiente ronda y el perdedor queda eliminado.</p></div>
      {rounds.map((r) => {
        const [rn, rname] = r.split('|')
        const ms = matches.filter((m) => String(m.round_number) === rn).sort((a, b) => (a.side > b.side ? 1 : -1) || a.match_index - b.match_index)
        return (
          <div className="card" key={r}>
            <h3>{rname}</h3>
            <table>
              <thead><tr><th>Lado</th><th>Equipo 1</th><th>Marcador</th><th>Equipo 2</th><th>Marcador</th><th>Ganador</th></tr></thead>
              <tbody>
                {ms.map((m) => {
                  const t1 = teamById(m.team1_id)
                  const t2 = teamById(m.team2_id)
                  return (
                    <tr key={m.id}>
                      <td>{m.side}</td>
                      <td>{t1 ? t1.name : 'Por definir'}</td>
                      <td><input className="score-input" type="number" disabled={!t1} defaultValue={m.team1_score ?? ''} onBlur={(e) => setScore(m, 'team1_score', e.target.value)} /></td>
                      <td>{t2 ? t2.name : 'Por definir'}</td>
                      <td><input className="score-input" type="number" disabled={!t2} defaultValue={m.team2_score ?? ''} onBlur={(e) => setScore(m, 'team2_score', e.target.value)} /></td>
                      <td className="row-actions">
                        <button className={`pill-btn ${m.winner_id === m.team1_id ? 'on' : ''}`} disabled={!t1 || busy} onClick={() => setWinner(m, m.team1_id)}>{t1 ? t1.name : '—'}</button>
                        <button className={`pill-btn ${m.winner_id === m.team2_id ? 'on' : ''}`} disabled={!t2 || busy} onClick={() => setWinner(m, m.team2_id)}>{t2 ? t2.name : '—'}</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </>
  )
}
