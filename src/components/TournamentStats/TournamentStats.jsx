import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import './TournamentStats.css'

export default function TournamentStats({ players, teams }) {
  if (!players.length) {
    return <div className="empty">Todavía no hay jugadores con estadísticas en este torneo.</div>
  }

  const topScorers = [...players].sort((a, b) => b.goals - a.goals).slice(0, 8).map((p) => ({ name: p.full_name, Puntos: p.goals, Asistencias: p.assists }))

  const byTeam = teams.map((t) => ({
    name: t.name,
    jugadores: players.filter((p) => p.team_id === t.id).length,
    puntos: players.filter((p) => p.team_id === t.id).reduce((acc, p) => acc + p.goals, 0),
  })).filter((t) => t.jugadores > 0)

  const sancionados = players.filter((p) => p.has_sanction).length
  const habilitados = players.length - sancionados
  const pieData = [
    { name: 'Habilitados', value: habilitados },
    { name: 'Sancionados', value: sancionados },
  ]

  return (
    <div className="tournament-stats">
      <div className="card chart-card">
        <h3>Máximos anotadores</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topScorers}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2c3440" />
            <XAxis dataKey="name" tick={{ fill: '#a8adb3', fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fill: '#a8adb3', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#0d1219', border: '1px solid #2c3440' }} />
            <Legend />
            <Bar dataKey="Puntos" fill="#ff6b21" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Asistencias" fill="#37c26d" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="stats-grid-2">
        <div className="card chart-card">
          <h3>Puntos por equipo</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byTeam}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c3440" />
              <XAxis dataKey="name" tick={{ fill: '#a8adb3', fontSize: 11 }} />
              <YAxis tick={{ fill: '#a8adb3', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0d1219', border: '1px solid #2c3440' }} />
              <Bar dataKey="puntos" fill="#7fa2ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3>Jugadores sancionados</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                {pieData.map((entry, i) => <Cell key={entry.name} fill={i === 0 ? '#37c26d' : '#ff4d4d'} />)}
              </Pie>
              <Legend />
              <Tooltip contentStyle={{ background: '#0d1219', border: '1px solid #2c3440' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}