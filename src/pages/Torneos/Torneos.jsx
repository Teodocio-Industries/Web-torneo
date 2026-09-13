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

  function teamName(list, id) {
    return list.find((t) => t.id === id)?.name || 'El equipo'
  }

  // Persists score only — no winner logic until Finalizar is clicked.
  async function handleScoreChange(matchId, field, value) {
    if (!isAdmin) {
      toast('Solo el administrador puede registrar puntajes', 'err')
      return
    }
    const updated = matches.find((m) => m.id === matchId)
    if (!updated) return
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, [field]: value } : m)))
    const { error } = await supabase
      .from('bracket_matches')
      .update({ [field]: value })
      .eq('id', matchId)
    if (error) {
      toast('No se pudo guardar el puntaje: ' + error.message, 'err')
    }
  }

  // Admin clicks "Finalizar" → picks the team with higher score and propagates.
  async function handleFinalize(matchId) {
    if (!isAdmin) {
      toast('Solo el administrador puede finalizar un cruce', 'err')
      return
    }
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

    const winnerId = n1 > n2 ? match.team1_id : match.team2_id
    const loserId = n1 > n2 ? match.team2_id : match.team1_id
    const isFinal = match.round_name === 'Final'

    // Optimistic local update
    const next = isFinal ? null : computeNextSlot(matches, match)
    const nextMatch = next ? findMatch(matches, next.round_number, next.side, next.match_index) : null
    let optimistic = matches.map((m) =>
      m.id === matchId
        ? { ...m, winner_id: winnerId, status: 'jugado', team1_score: n1, team2_score: n2 }
        : m,
    )
    if (next && nextMatch) {
      optimistic = optimistic.map((m) =>
        m.id === nextMatch.id ? { ...m, [next.slotField]: winnerId } : m,
      )
    }
    setMatches(optimistic)

    // Persist current match
    const { error } = await supabase
      .from('bracket_matches')
      .update({ winner_id: winnerId, status: 'jugado', team1_score: n1, team2_score: n2 })
      .eq('id', matchId)
    if (error) {
      toast('No se pudo finalizar el cruce: ' + error.message, 'err')
      return
    }

    // Propagate / crown
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
      toast(`✅ ${teamName(teams, winnerId)} gana ${n1}–${n2} y avanza a ${nextMatch.round_name}`, 'ok')
    }

    // Refetch for consistency
    const { data: matchesRes } = await supabase
      .from('bracket_matches')
      .select('*')
      .eq('tournament_id', selectedId)
      .order('round_number')
    if (matchesRes) setMatches(matchesRes)
  }

  // Reopen a finalized match: clears winner, resets status, rolls back next slot.
  async function handleReopen(matchId) {
    if (!isAdmin) {
      toast('Solo el administrador puede reabrir un cruce', 'err')
      return
    }
    const match = matches.find((m) => m.id === matchId)
    if (!match) return
    const previousWinner = match.winner_id
    await supabase
      .from('bracket_matches')
      .update({ winner_id: null, status: 'pendiente' })
      .eq('id', matchId)
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
    const { data: matchesRes } = await supabase
      .from('bracket_matches')
      .select('*')
      .eq('tournament_id', selectedId)
      .order('round_number')
    if (matchesRes) setMatches(matchesRes)
    toast('Cruce reabierto', 'ok')
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
                canEdit={isAdmin}
                onScoreChange={handleScoreChange}
                onFinalize={handleFinalize}
                onReopen={handleReopen}
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
