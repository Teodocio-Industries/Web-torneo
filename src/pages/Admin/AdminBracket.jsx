import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'
import { computeNextSlot, findMatch } from '../../lib/bracket'
import TeamBadge from '../../components/TeamBadge/TeamBadge'
import './AdminBracket.css'

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

function statusLabel(s) {
  if (!s) return 'Pendiente'
  if (s === 'jugado') return 'Final'
  if (s === 'en_juego') return 'En vivo'
  return s
}

function AdminNameBox({ team, side, t1Wins, t2Wins, t1Leading, t2Leading, isDone }) {
  if (!team) {
    return (
      <div className={`admin-vs__name admin-vs__name--empty ${side === 'left' ? 'admin-vs__name--left' : 'admin-vs__name--right'}`}>
        <span className="admin-vs__placeholder" />
        <span>Por definir</span>
      </div>
    )
  }
  const winsSide = (t1Wins && side === 'left') || (t2Wins && side === 'right')
  const leads = (t1Leading && side === 'left') || (t2Leading && side === 'right')
  const lost = isDone && ((t1Wins && side === 'right') || (t2Wins && side === 'left'))
  return (
    <div
      className={`admin-vs__name admin-vs__name--${side} ${winsSide ? 'is-winner' : ''} ${leads ? 'is-leading' : ''} ${lost ? 'is-loser' : ''}`}
    >
      <span className="admin-vs__badge"><TeamBadge team={team} size="md" /></span>
      <span className="admin-vs__team-name" title={team.name}>{team.name}</span>
    </div>
  )
}

function AdminScoreBox({ value, side, fieldKey, scoresEditable, isDone, isLive, t1Wins, t2Wins, t1Leading, t2Leading, onScoreChange, matchId }) {
  if (!scoresEditable) {
    const showValue = isLive || isDone
    const cls = [
      'admin-vs__score',
      side === 'left' ? 'admin-vs__score--left' : 'admin-vs__score--right',
      (t1Wins && side === 'left') || (t2Wins && side === 'right') ? 'is-winner' : '',
      (t1Leading && side === 'left') || (t2Leading && side === 'right') ? 'is-leading' : '',
    ].filter(Boolean).join(' ')
    return <div className={cls}>{showValue ? (value ?? '—') : '—'}</div>
  }
  return (
    <input
      type="number"
      min="0"
      className={`admin-vs__score-input admin-vs__score-input--${side}`}
      defaultValue={value ?? ''}
      placeholder="0"
      aria-label={`Puntos del equipo ${side === 'left' ? 1 : 2}`}
      onBlur={(e) => {
        const v = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0)
        if (v !== value) onScoreChange(matchId, fieldKey, v)
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
    />
  )
}

function AdminMatchCard({ match, teams, sideVariant, onScoreChange, onFinalize, onReopen, busy }) {
  const t1 = teams.find((t) => t.id === match.team1_id) || null
  const t2 = teams.find((t) => t.id === match.team2_id) || null
  const bothDefined = t1 && t2
  const isDone = match.status === 'jugado'
  const isLive = match.status === 'en_juego'
  const isPending = !isDone && !isLive

  const s1Raw = match.team1_score
  const s2Raw = match.team2_score
  const s1 = s1Raw !== null && s1Raw !== undefined && s1Raw !== '' ? Number(s1Raw) : null
  const s2 = s2Raw !== null && s2Raw !== undefined && s2Raw !== '' ? Number(s2Raw) : null
  const bothScores = s1 !== null && s2 !== null
  const winnerId = match.winner_id
  const t1Wins = winnerId && winnerId === t1?.id
  const t2Wins = winnerId && winnerId === t2?.id
  const t1Leading = !winnerId && bothScores && s1 > s2
  const t2Leading = !winnerId && bothScores && s2 > s1

  const canFinalize = !busy && isPending && bothDefined && bothScores && s1 !== s2
  const canReopen = !busy && (isDone || isLive)
  const scoresEditable = !busy && isPending && bothDefined

  return (
    <div
      className={`admin-vs admin-vs--${sideVariant} ${isLive ? 'is-live' : ''} ${isDone ? 'is-done' : ''} ${isPending ? 'is-pending' : ''} ${bothDefined ? 'has-teams' : ''}`}
      data-match={match.id}
    >
      <div className="admin-vs__row">
        <AdminNameBox team={t1} side="left" t1Wins={t1Wins} t2Wins={t2Wins} t1Leading={t1Leading} t2Leading={t2Leading} isDone={isDone} />
        <AdminScoreBox
          value={s1}
          side="left"
          fieldKey="team1_score"
          matchId={match.id}
          scoresEditable={scoresEditable}
          isDone={isDone}
          isLive={isLive}
          t1Wins={t1Wins}
          t2Wins={t2Wins}
          t1Leading={t1Leading}
          t2Leading={t2Leading}
          onScoreChange={onScoreChange}
        />
        <div className="admin-vs__vs" aria-hidden="true">VS</div>
        <AdminScoreBox
          value={s2}
          side="right"
          fieldKey="team2_score"
          matchId={match.id}
          scoresEditable={scoresEditable}
          isDone={isDone}
          isLive={isLive}
          t1Wins={t1Wins}
          t2Wins={t2Wins}
          t1Leading={t1Leading}
          t2Leading={t2Leading}
          onScoreChange={onScoreChange}
        />
        <AdminNameBox team={t2} side="right" t1Wins={t1Wins} t2Wins={t2Wins} t1Leading={t1Leading} t2Leading={t2Leading} isDone={isDone} />
      </div>

      <div className="admin-vs__foot">
        <span className="admin-vs__round">{match.round_name}</span>
        <span className="admin-vs__side">{match.side}</span>
        <span className={`admin-vs__status status-${match.status || 'pendiente'}`}>{statusLabel(match.status)}</span>
        {canFinalize && (
          <button type="button" className="admin-vs__finalize" onClick={() => onFinalize(match.id)}>
            Finalizar
          </button>
        )}
        {canReopen && (
          <button type="button" className="admin-vs__reopen" onClick={() => onReopen(match.id)} title="Reabrir cruce">
            ↺ Reabrir
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminBracket({ matches, teams, reloadData }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  // Persists a single score field — no winner logic until Finalizar.
  async function handleScoreChange(matchId, field, value) {
    const { error } = await supabase
      .from('bracket_matches')
      .update({ [field]: value })
      .eq('id', matchId)
    if (error) {
      toast('No se pudo guardar el puntaje: ' + error.message, 'err')
      return
    }
    await reloadData()
  }

  async function handleFinalize(matchId) {
    if (busy) return
    const match = matches.find((m) => m.id === matchId)
    if (!match) return
    if (!match.team1_id || !match.team2_id) {
      toast('Faltan equipos por definir en este cruce', 'err')
      return
    }
    const s1 = match.team1_score
    const s2 = match.team2_score
    if (s1 === null || s1 === undefined || s1 === '' || s2 === null || s2 === undefined || s2 === '') {
      toast('Ingresa ambos puntajes antes de finalizar', 'err')
      return
    }
    const n1 = Number(s1)
    const n2 = Number(s2)
    if (n1 === n2) {
      toast('Hay un empate: ajusta los puntajes para definir un ganador', 'err')
      return
    }
    setBusy(true)
    try {
      const winnerId = n1 > n2 ? match.team1_id : match.team2_id
      const loserId = n1 > n2 ? match.team2_id : match.team1_id
      const isFinal = match.round_name === 'Final'

      await supabase.from('bracket_matches').update({ winner_id: winnerId, status: 'jugado' }).eq('id', matchId)
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
      toast(isFinal ? `🏆 ${teamName(teams, winnerId)} es el campeón` : `✅ ${teamName(teams, winnerId)} gana ${n1}–${n2} y avanza`, 'ok')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  async function handleReopen(matchId) {
    if (busy) return
    const match = matches.find((m) => m.id === matchId)
    if (!match) return
    setBusy(true)
    try {
      const previousWinner = match.winner_id
      await supabase.from('bracket_matches').update({ winner_id: null, status: 'pendiente' }).eq('id', matchId)
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

  function teamName(list, id) {
    return list.find((t) => t.id === id)?.name || 'El equipo'
  }

  if (!matches.length) return <div className="empty">Genera el bracket primero desde la pestaña Equipos.</div>

  const rounds = [...new Set(matches.map((m) => `${m.round_number}|${m.round_name}`))].sort((a, b) => parseInt(a.split('|')[0]) - parseInt(b.split('|')[0]))

  return (
    <>
      <div className="card">
        <p className="mini">
          Ingresa el marcador de cada cruce y presiona <strong>Finalizar</strong>. El equipo con más puntos
          gana automáticamente y avanza a la siguiente ronda; el perdedor queda eliminado.
        </p>
      </div>

      {rounds.map((r) => {
        const [rn, rname] = r.split('|')
        const ms = matches.filter((m) => String(m.round_number) === rn).sort((a, b) => (a.side > b.side ? 1 : -1) || a.match_index - b.match_index)
        return (
          <div className="card" key={r}>
            <h3>{rname}</h3>
            <div className="admin-vs__grid">
              {ms.map((m) => (
                <AdminMatchCard
                  key={m.id}
                  match={m}
                  teams={teams}
                  sideVariant={m.side}
                  busy={busy}
                  onScoreChange={handleScoreChange}
                  onFinalize={handleFinalize}
                  onReopen={handleReopen}
                />
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
