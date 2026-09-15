import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from 'recharts'
import './PlayerCharts.css'

export default function PlayerCharts({ player, allPlayers }) {
  const own = [
    { stat: 'Puntos', valor: player.goals },
    { stat: 'Asistencias', valor: player.assists },
    { stat: 'Faltas técnicas', valor: player.yellow_cards },
    { stat: 'Expulsiones', valor: player.red_cards },
  ]

  const avg = (field) => {
    if (!allPlayers.length) return 0
    return +(allPlayers.reduce((acc, p) => acc + (p[field] || 0), 0) / allPlayers.length).toFixed(1)
  }

  const comparison = [
    { stat: 'Puntos', Jugador: player.goals, 'Promedio torneo': avg('goals') },
    { stat: 'Asistencias', Jugador: player.assists, 'Promedio torneo': avg('assists') },
    { stat: 'Faltas técnicas', Jugador: player.yellow_cards, 'Promedio torneo': avg('yellow_cards') },
    { stat: 'Expulsiones', Jugador: player.red_cards, 'Promedio torneo': avg('red_cards') },
  ]

  return (
    <div className="player-charts">
      <div className="card chart-card">
        <h3>Sus estadísticas</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={own}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2c3440" />
            <XAxis dataKey="stat" tick={{ fill: '#a8adb3', fontSize: 11 }} />
            <YAxis tick={{ fill: '#a8adb3', fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#0d1219', border: '1px solid #2c3440' }} />
            <Bar dataKey="valor" fill="#ff6b21" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card chart-card">
        <h3>Comparado con el promedio del torneo</h3>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={comparison} outerRadius={90}>
            <PolarGrid stroke="#2c3440" />
            <PolarAngleAxis dataKey="stat" tick={{ fill: '#a8adb3', fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fill: '#5b6470', fontSize: 10 }} />
            <Radar name="Jugador" dataKey="Jugador" stroke="#ff6b21" fill="#ff6b21" fillOpacity={0.45} />
            <Radar name="Promedio torneo" dataKey="Promedio torneo" stroke="#7fa2ff" fill="#7fa2ff" fillOpacity={0.25} />
            <Legend />
            <Tooltip contentStyle={{ background: '#0d1219', border: '1px solid #2c3440' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}