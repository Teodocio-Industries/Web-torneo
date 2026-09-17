import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import AdminTorneos from './AdminTorneos'
import AdminEquipos from './AdminEquipos'
import AdminBracket from './AdminBracket'
import AdminTabla from './AdminTabla'
import AdminJugadores from './AdminJugadores'
import AdminCuentas from './AdminCuentas'
import './Admin.css'

const TABS = [
  { id: 'torneos', label: 'Torneos', icon: '🏆' },
  { id: 'equipos', label: 'Equipos', icon: '🛡️' },
  { id: 'bracket', label: 'Bracket', icon: '🗂️' },
  { id: 'tabla', label: 'Tabla', icon: '📊' },
  { id: 'jugadores', label: 'Jugadores', icon: '🧑‍🤝‍🧑' },
  { id: 'cuentas', label: 'Cuentas de acceso', icon: '🔑' },
]

export default function Admin() {
  const { profile, logout } = useAuth()
  const [tab, setTab] = useState('torneos')
  const [tournaments, setTournaments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [teams, setTeams] = useState([])
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  // Si el torneo seleccionado fue borrado, cae al primero disponible.
  useEffect(() => {
    if (selectedId && tournaments.length && !tournaments.find((t) => t.id === selectedId)) {
      setSelectedId(tournaments[0]?.id || null)
    }
    if (!tournaments.length) setSelectedId(null)
  }, [tournaments, selectedId])

  const ctx = {
    tournaments, selectedId, setSelectedId,
    teams, matches, standings, players,
    reloadTournaments: loadTournaments,
    reloadData: () => loadTournamentData(selectedId),
  }

  const activeTournament = tournaments.find((t) => t.id === selectedId)

  if (loading) return <div className="loading-screen">Cargando panel…</div>

  function selectTab(id) {
    setTab(id)
    setSidebarOpen(false)
  }

  return (
    <div className={`admin-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <p className="eyebrow">Caribe Sports Events</p>
          <h1>Panel admin</h1>
        </div>

        <nav className="admin-sidebar__nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`admin-sidebar__link ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => selectTab(t.id)}
            >
              <span className="admin-sidebar__icon" aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar__foot">
          <div className="admin-sidebar__user">
            <span className="admin-sidebar__avatar">{(profile?.full_name || 'A')[0].toUpperCase()}</span>
            <div>
              <strong>{profile?.full_name || 'Administrador'}</strong>
              <span className="mini">{profile?.email}</span>
            </div>
          </div>
          <button className="btn ghost small" onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>

      <button className="admin-topbar__burger" onClick={() => setSidebarOpen((v) => !v)} aria-label="Abrir menú">☰</button>
      {sidebarOpen && <div className="admin-sidebar__backdrop" onClick={() => setSidebarOpen(false)} />}

      <main className="admin-content">
        <header className="admin-topbar">
          <div>
            <p className="mini">{TABS.find((t) => t.id === tab)?.label}</p>
            <h2>{activeTournament ? activeTournament.name : 'Sin torneo seleccionado'}</h2>
          </div>
          {tournaments.length > 0 && (
            <select
              className="admin-topbar__select"
              value={selectedId || ''}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </header>

        <div className="admin-content__body">
          {tab === 'torneos' && <AdminTorneos {...ctx} />}
          {tab === 'equipos' && <AdminEquipos {...ctx} />}
          {tab === 'bracket' && <AdminBracket {...ctx} />}
          {tab === 'tabla' && <AdminTabla {...ctx} />}
          {tab === 'jugadores' && <AdminJugadores {...ctx} />}
          {tab === 'cuentas' && <AdminCuentas />}
        </div>
      </main>
    </div>
  )
}