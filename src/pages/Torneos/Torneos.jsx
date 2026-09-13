import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Bracket from '../../components/Bracket/Bracket'
import TeamBadge from '../../components/TeamBadge/TeamBadge'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast/Toast'
import { computeNextSlot, findMatch } from '../../lib/bracket'
import './Torneos.css'

export default function Torneos() {
  const { myPlayers, isAdmin } = useAuth()
  const toast = useToast()
  const [tournaments, setTournaments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [tab, setTab] = useState('bracket')
  const [teams, setTeams] = useState([])
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('todos')

  useEffect(() => {
    async function loadTournaments() {
      const { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false })
      setTournaments(data || [])
      if (data && data.length) setSelectedId(data[0].id)
      setLoading(false)
    }
    loadTournaments()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    async function loadDetail() {
      const [teamsRes, matchesRes, standingsRes] = await Promise.all([
        supabase.from('teams').select('*').eq('tournament_id', selectedId).order('name'),
        supabase.from('bracket_matches').select('*').eq('tournament_id', selectedId).order('round_number'),
        supabase.from('standings').select('*, teams(name,flag_url)').eq('tournament_id', selectedId).order('group_name').order('pts', { ascending: false }),
      ])
      setTeams(teamsRes.data || [])
      setMatches(matchesRes.data || [])
      setStandings(standingsRes.data || [])
    }
    loadDetail()
  }, [selectedId])

  const selected = tournaments.find((t) => t.id === selectedId)
  const myTeamId = myPlayers.find((mp) => mp.tournament_id === selectedId)?.team_id || null
  const groups = [...new Set(standings.map((s) => s.group_name))]

  const matchesFiltered = useMemo(() => {
    if (statusFilter === 'todos') return matches
    return matches.filter((m) => (m.status || 'pendiente') === statusFilter)
  }, [matches, statusFilter])

  const stats = useMemo(() => {
    const total = matches.length
    const played = matches.filter((m) => m.status === 'jugado').length
    const live = matches.filter((m) => m.status === 'en_juego').length
    return { total, played, live, pending: total - played - live }
  }, [matches])

  async function handlePickWinner(matchId, winnerId) {
    if (!isAdmin) {
      toast('Solo el administrador puede registrar ganadores', 'err')
      return
    }
    const match = matches.find((m) => m.id === matchId)
    if (!match || !winnerId) return

    // 1) Persistir ganador y score del cruce actual
    const loserId = match.team1_id === winnerId ? match.team2_id : match.team1_id
    // Si el admin ya había ingresado puntajes reales, respetarlos. Si no, default 1–0.
    const hasScore1 = match.team1_score !== null && match.team1_score !== undefined && match.team1_score !== ''
    const hasScore2 = match.team2_score !== null && match.team2_score !== undefined && match.team2_score !== ''
    let score1 = match.team1_id === winnerId ? 1 : 0
    let score2 = match.team2_id === winnerId ? 1 : 0
    if (hasScore1 && hasScore2) {
      score1 = Number(match.team1_score)
      score2 = Number(match.team2_score)
      // Si los puntajes están empatados o invertidos, ajustar para que el ganador quede con el marcador mayor
      if (score1 === score2) {
        if (match.team1_id === winnerId) score1 = score2 + 1
        else score2 = score1 + 1
      } else {
        // Si los puntajes no coinciden con el ganador elegido, corregirlos
        const winnerIsTeam1 = match.team1_id === winnerId
        const winnerScore = winnerIsTeam1 ? score1 : score2
        const loserScore = winnerIsTeam1 ? score2 : score1
        if (winnerScore <= loserScore) {
          if (winnerIsTeam1) score1 = score2 + 1
          else score2 = score1 + 1
        }
      }
    }
    const isFinal = match.round_name === 'Final'

    // Optimistic local update so the UI feels instant
    const next = isFinal ? null : computeNextSlot(matches, match)
    const nextMatch = next ? findMatch(matches, next.round_number, next.side, next.match_index) : null
    let optimistic = matches.map((m) =>
      m.id === matchId
        ? { ...m, winner_id: winnerId, team1_score: score1, team2_score: score2, status: 'jugado' }
        : m,
    )
    if (next && nextMatch) {
      optimistic = optimistic.map((m) =>
        m.id === nextMatch.id ? { ...m, [next.slotField]: winnerId } : m,
      )
    }
    setMatches(optimistic)

    const { error } = await supabase
      .from('bracket_matches')
      .update({ winner_id: winnerId, team1_score: score1, team2_score: score2, status: 'jugado' })
      .eq('id', matchId)
    if (error) {
      toast('No se pudo guardar el resultado: ' + error.message, 'err')
      return
    }

    // 2) Avanzar el ganador al siguiente slot (o coronarlo si es la Final)
    if (isFinal) {
      await supabase.from('teams').update({ status: 'campeon' }).eq('id', winnerId)
      if (loserId) await supabase.from('teams').update({ status: 'eliminado' }).eq('id', loserId)
      toast(`🏆 ${teamName(teams, winnerId)} es el campeón`, 'ok')
    } else if (next && nextMatch) {
      const { error: advErr } = await supabase
        .from('bracket_matches')
        .update({ [next.slotField]: winnerId })
        .eq('id', nextMatch.id)
      if (advErr) {
        toast('No se pudo avanzar al siguiente cruce: ' + advErr.message, 'err')
        return
      }
      await supabase.from('teams').update({ status: 'avanzo' }).eq('id', winnerId)
      if (loserId) await supabase.from('teams').update({ status: 'eliminado' }).eq('id', loserId)
      toast(`✅ ${teamName(teams, winnerId)} avanza a ${nextMatch.round_name}`, 'ok')
    }

    // 3) Refrescar desde Supabase para asegurar consistencia total
    const [{ data: matchesRes }] = await Promise.all([
      supabase.from('bracket_matches').select('*').eq('tournament_id', selectedId).order('round_number'),
    ])
    if (matchesRes) setMatches(matchesRes)
  }

  function teamName(list, id) {
    return list.find((t) => t.id === id)?.name || 'El equipo'
  }

  // Persists score and, if both scores are valid, auto-decides winner and propagates.
  async function handleScoreChange(matchId, field, value) {
    if (!isAdmin) {
      toast('Solo el administrador puede registrar puntajes', 'err')
      return
    }
    const match = matches.find((m) => m.id === matchId)
    if (!match) return

    const updated = { ...match, [field]: value }
    // Optimistic local update
    let nextState = matches.map((m) => (m.id === matchId ? updated : m))
    setMatches(nextState)

    const { error } = await supabase
      .from('bracket_matches')
      .update({ [field]: value })
      .eq('id', matchId)
    if (error) {
      toast('No se pudo guardar el puntaje: ' + error.message, 'err')
      return
    }

    // If the current winner_id no longer matches the leading score, clear it.
    const s1 = updated.team1_score
    const s2 = updated.team2_score
    const hasBoth = s1 !== null && s1 !== undefined && s1 !== '' && s2 !== null && s2 !== undefined && s2 !== ''
    const numeric1 = hasBoth ? Number(s1) : null
    const numeric2 = hasBoth ? Number(s2) : null

    // Case: invalid (missing) score — clear winner + clear next slot
    if (!hasBoth || numeric1 === numeric2 || !updated.team1_id || !updated.team2_id) {
      if (updated.winner_id) {
        await supabase.from('bracket_matches').update({ winner_id: null, status: 'pendiente' }).eq('id', matchId)
        await supabase.from('teams').update({ status: null }).eq('id', updated.winner_id)
        // Roll back the next slot that this match had filled
        const back = computeNextSlot(matches, updated)
        if (back) {
          const backMatch = findMatch(matches, back.round_number, back.side, back.match_index)
          if (backMatch && backMatch[back.slotField] === updated.winner_id) {
            await supabase.from('bracket_matches').update({ [back.slotField]: null }).eq('id', backMatch.id)
            if (backMatch.winner_id) await supabase.from('bracket_matches').update({ winner_id: null, status: 'pendiente' }).eq('id', backMatch.id)
          }
        }
      }
      // refetch to sync
      const [{ data: m1 }] = await Promise.all([
        supabase.from('bracket_matches').select('*').eq('tournament_id', selectedId).order('round_number'),
      ])
      if (m1) setMatches(m1)
      return
    }

    // Case: both scores valid and one is strictly greater
    const newWinnerId = numeric1 > numeric2 ? updated.team1_id : updated.team2_id
    if (newWinnerId === updated.winner_id) {
      // Winner unchanged, but maybe score changed → toast and done
      toast(`Marcador actualizado: ${numeric1} – ${numeric2}`, 'ok')
      return
    }

    // Winner is changing (or being set for the first time)
    const loserId = numeric1 > numeric2 ? updated.team2_id : updated.team1_id
    const isFinal = updated.round_name === 'Final'

    let optimistic = nextState.map((m) =>
      m.id === matchId
        ? { ...m, winner_id: newWinnerId, status: 'jugado' }
        : m,
    )
    if (!isFinal) {
      const next = computeNextSlot(matches, updated)
      if (next) {
        const nextMatch = findMatch(matches, next.round_number, next.side, next.match_index)
        if (nextMatch) {
          optimistic = optimistic.map((m) =>
            m.id === nextMatch.id ? { ...m, [next.slotField]: newWinnerId } : m,
          )
        }
      }
    }
    setMatches(optimistic)

    // Persist: winner + status
    await supabase.from('bracket_matches').update({ winner_id: newWinnerId, status: 'jugado' }).eq('id', matchId)

    if (isFinal) {
      await supabase.from('teams').update({ status: 'campeon' }).eq('id', newWinnerId)
      if (loserId) await supabase.from('teams').update({ status: 'eliminado' }).eq('id', loserId)
      toast(`🏆 ${teamName(teams, newWinnerId)} es el campeón`, 'ok')
    } else {
      const next = computeNextSlot(matches, updated)
      if (next) {
        const nextMatch = findMatch(matches, next.round_number, next.side, next.match_index)
        if (nextMatch) {
          await supabase.from('bracket_matches').update({ [next.slotField]: newWinnerId }).eq('id', nextMatch.id)
        }
      }
      await supabase.from('teams').update({ status: 'avanzo' }).eq('id', newWinnerId)
      if (loserId) await supabase.from('teams').update({ status: 'eliminado' }).eq('id', loserId)
      toast(`✅ ${teamName(teams, newWinnerId)} gana ${numeric1}–${numeric2} y avanza`, 'ok')
    }

    // Final refetch
    const [{ data: m2 }] = await Promise.all([
      supabase.from('bracket_matches').select('*').eq('tournament_id', selectedId).order('round_number'),
    ])
    if (m2) setMatches(m2)
  }

  if (loading) return <div className="loading-screen">Cargando torneos…</div>

  return (
    <main className="page torneos-page">
      <section className="torneos-encabezado">
        <p className="eyebrow">Caribe Sports Events</p>
        <h1>Torneos</h1>
        <p className="mini">Elige un torneo para ver su cuadro de cruces y tabla de posiciones.</p>
      </section>

      {tournaments.length === 0 ? (
        <div className="empty">Todavía no hay torneos creados.</div>
      ) : (
        <>
          <div className="lista-torneos">
            {tournaments.map((t) => (
              <button
                key={t.id}
                className={`tarjeta-torneo ${t.id === selectedId ? 'is-active' : ''}`}
                onClick={() => setSelectedId(t.id)}
              >
                {t.image_url && <img src={t.image_url} alt="" className="tarjeta-torneo__img" />}
                <span className="tarjeta-torneo__estado">{t.is_active ? 'ACTIVO' : 'INACTIVO'}</span>
                <h3>{t.name}</h3>
                {t.description && <p>{t.description}</p>}
              </button>
            ))}
          </div>

          <div className="torneo-stats">
            <div className="torneo-stats__item">
              <span className="torneo-stats__n">{stats.total}</span>
              <span className="torneo-stats__label">Cruces</span>
            </div>
            <div className="torneo-stats__item">
              <span className="torneo-stats__n torneo-stats__n--live">{stats.live}</span>
              <span className="torneo-stats__label">En vivo</span>
            </div>
            <div className="torneo-stats__item">
              <span className="torneo-stats__n torneo-stats__n--done">{stats.played}</span>
              <span className="torneo-stats__label">Jugados</span>
            </div>
            <div className="torneo-stats__item">
              <span className="torneo-stats__n torneo-stats__n--pending">{stats.pending}</span>
              <span className="torneo-stats__label">Pendientes</span>
            </div>
          </div>

          <div className="torneo-tabs">
            <button className={tab === 'bracket' ? 'is-active' : ''} onClick={() => setTab('bracket')}>Cuadro de cruces</button>
            <button className={tab === 'tabla' ? 'is-active' : ''} onClick={() => setTab('tabla')}>Tabla de posiciones</button>
          </div>

          {tab === 'bracket' && (
            <>
              <div className="bracket-filters">
                {['todos', 'en_juego', 'jugado', 'pendiente'].map((f) => (
                  <button
                    key={f}
                    className={`bracket-filters__btn ${statusFilter === f ? 'is-active' : ''}`}
                    onClick={() => setStatusFilter(f)}
                  >
                    {f === 'todos' ? 'Todos' : f === 'en_juego' ? 'En vivo' : f === 'jugado' ? 'Finalizados' : 'Pendientes'}
                  </button>
                ))}
              </div>
              <Bracket
                matches={matchesFiltered}
                teams={teams}
                tournamentName={selected?.name}
                myTeamId={myTeamId}
                onPickWinner={handlePickWinner}
                onScoreChange={handleScoreChange}
                canEdit={isAdmin}
              />
            </>
          )}

          {tab === 'tabla' && (
            <div className="card">
              {standings.length === 0 ? (
                <div className="empty">Este torneo aún no tiene tabla de posiciones.</div>
              ) : (
                groups.map((g) => (
                  <div key={g}>
                    <h3 className="grupo-titulo">{g}</h3>
                    <table>
                      <thead>
                        <tr><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr>
                      </thead>
                      <tbody>
                        {standings.filter((s) => s.group_name === g).sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc)).map((s) => (
                          <tr key={s.id}>
                            <td className="team-cell"><TeamBadge team={s.teams} size="sm" />{s.teams?.name}</td>
                            <td>{s.pj}</td><td>{s.pg}</td><td>{s.pe}</td><td>{s.pp}</td>
                            <td>{s.gf}</td><td>{s.gc}</td><td>{s.gf - s.gc}</td>
                            <td className="pts">{s.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}
