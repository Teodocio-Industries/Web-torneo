import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import AdminTorneos from './AdminTorneos'
import AdminEquipos from './AdminEquipos'
import AdminBracket from './AdminBracket'
import AdminTabla from './AdminTabla'
import AdminJugadores from './AdminJugadores'
import AdminCuentas from './AdminCuentas'
import './Admin.css'

const TABS = [
  { id: 'torneos', label: 'Torneos' },
  { id: 'equipos', label: 'Equipos' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'tabla', label: 'Tabla' },
  { id: 'jugadores', label: 'Jugadores' },
  { id: 'cuentas', label: 'Cuentas de acceso' },
]

export default function Admin() {
  const [tab, setTab] = useState('torneos')
  const [tournaments, setTournaments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [teams, setTeams] = useState([])
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  const loadTournaments = useCallback(async (keepSelection) => {
    const { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false })
    setTournaments(data || [])
    if (!keepSelection && data && data.length && !selectedId) setSelectedId(data[0].id)
    return data || []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadTournamentData = useCallback(async (tid) => {
    if (!tid) return
    const [teamsRes, matchesRes, standingsRes, playersRes] = await Promise.all([
      supabase.from('teams').select('*').eq('tournament_id', tid).order('name'),
      supabase.from('bracket_matches').select('*').eq('tournament_id', tid).order('round_number'),
      supabase.from('standings').select('*, teams(name,flag_url)').eq('tournament_id', tid).order('group_name').order('pts', { ascending: false }),
      supabase.from('players').select('*, teams(name,flag_url)').eq('tournament_id', tid).order('full_name'),
    ])
    setTeams(teamsRes.data || [])
    setMatches(matchesRes.data || [])
    setStandings(standingsRes.data || [])
    setPlayers(playersRes.data || [])
  }, [])

  useEffect(() => {
    loadTournaments().then(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedId) loadTournamentData(selectedId)
  }, [selectedId, loadTournamentData])

  const ctx = {
    tournaments, selectedId, setSelectedId,
    teams, matches, standings, players,
    reloadTournaments: loadTournaments,
    reloadData: () => loadTournamentData(selectedId),
  }

  if (loading) return <div className="loading-screen">Cargando panel…</div>

  return (
    <main className="page admin-page">
      <section className="admin-encabezado">
        <p className="eyebrow">Caribe Sports Events</p>
        <h1>Panel de administrador</h1>
      </section>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'torneos' && <AdminTorneos {...ctx} />}
      {tab === 'equipos' && <AdminEquipos {...ctx} />}
      {tab === 'bracket' && <AdminBracket {...ctx} />}
      {tab === 'tabla' && <AdminTabla {...ctx} />}
      {tab === 'jugadores' && <AdminJugadores {...ctx} />}
      {tab === 'cuentas' && <AdminCuentas />}
    </main>
  )
}
