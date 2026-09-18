import { useEffect, useRef, useState } from 'react'
import TeamBadge from '../TeamBadge/TeamBadge'
import { computeNextSlot, findMatch } from '../../lib/bracket'
import './Bracket.css'

// ----- geometría del cuadro, en porcentaje del marco (0-100) -----
const SIDE_W = 42          // ancho reservado para cada lado
const TOP_RESERVED = 9     // franja superior para las etiquetas de ronda
const USABLE_H = 100 - TOP_RESERVED
const COL_PAD_RATIO = 0.07 // margen interno de cada columna
const STUB = 1.6           // largo del tramo horizontal corto de cada conector
const FINAL_Y_RATIO = 0.16 // la Final va bien arriba, dejando todo el resto del espacio para el campeón

function teamById(teams, id) {
  return teams.find((t) => t.id === id) || null
}

function uiStatus(match) {
  if (match.status === 'jugado') return 'jugado'
  if (match.team1_id && match.team2_id && (match.team1_score != null || match.team2_score != null)) return 'en_juego'
  return 'pendiente'
}

function BallIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" fill="#ff6b21" />
      <path d="M2 32h60M32 2v60M10 10c10 10 10 34 0 44M54 10c-10 10-10 34 0 44" stroke="#0f1830" strokeWidth="2.5" fill="none" />
    </svg>
  )
}

// Calcula, para cada partido, su columna (left/width en %) y el centro
// vertical de su "slot" (en % de la altura total del marco).
function computeLayout(matches) {
  const layout = {} // matchId -> { left, width, edgeX, centerY, side }
  const sides = ['izquierda', 'derecha']

  sides.forEach((side) => {
    const roundNums = [...new Set(matches.filter((m) => m.side === side).map((m) => m.round_number))].sort((a, b) => a - b)
    const R = roundNums.length
    roundNums.forEach((rn, i) => {
      const roundMatches = matches.filter((m) => m.side === side && m.round_number === rn).sort((a, b) => a.match_index - b.match_index)
      const N = roundMatches.length

      let colLeft, colRight
      if (side === 'izquierda') {
        colLeft = (i / R) * SIDE_W
        colRight = ((i + 1) / R) * SIDE_W
      } else {
        colRight = 100 - (i / R) * SIDE_W
        colLeft = 100 - ((i + 1) / R) * SIDE_W
      }
      const colWidth = colRight - colLeft
      const pad = colWidth * COL_PAD_RATIO
      const left = colLeft + pad
      const width = colWidth - pad * 2
      const edgeX = side === 'izquierda' ? colRight - pad : colLeft + pad

      roundMatches.forEach((m, idx) => {
        const centerY = TOP_RESERVED + ((idx + 0.5) / N) * USABLE_H
        layout[m.id] = { left, width, edgeX, centerY, side, colLeft, colRight, roundIndex: i, roundCount: R }
      })
    })
  })

  const finalMatch = matches.find((m) => m.side === 'final')
  if (finalMatch) {
    const colLeft = SIDE_W
    const colRight = 100 - SIDE_W
    const pad = (colRight - colLeft) * 0.14
    layout[finalMatch.id] = {
      left: colLeft + pad, width: (colRight - colLeft) - pad * 2,
      edgeX: null, centerY: TOP_RESERVED + FINAL_Y_RATIO * USABLE_H, side: 'final', colLeft, colRight,
    }
  }

  return layout
}

function TeamBox({
  team, match, which, myTeamId, editable, onScoreChange, style,
  dragEnabled, isDropSlot, onDropTeam, onRemoveSlot,
}) {
  const status = uiStatus(match)
  const score = which === 'team1' ? match.team1_score : match.team2_score
  const isWinner = status === 'jugado' && match.winner_id === team?.id
  const isLoser = status === 'jugado' && match.winner_id && match.winner_id !== team?.id
  const isMe = myTeamId && team?.id === myTeamId

  if (!team) {
    if (dragEnabled && isDropSlot) {
      return (
        <div
          className="team-box team-box--empty team-box--dropzone"
          style={style}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const teamId = e.dataTransfer.getData('text/team-id')
            if (teamId) onDropTeam(match, which, teamId)
          }}
        >
          Suelta aquí un equipo
        </div>
      )
    }
    return <div className="team-box team-box--empty" style={style}>Por definir</div>
  }

  const canClear = dragEnabled && isDropSlot && status === 'pendiente'

  return (
    <div className={['team-box', isWinner && 'is-winner', isLoser && 'is-loser', isMe && 'is-me'].filter(Boolean).join(' ')} style={style}>
      {canClear && (
        <button
          type="button"
          className="team-box__clear"
          title="Quitar del cruce"
          onClick={() => onRemoveSlot(match, which)}
        >✕</button>
      )}
      <span className="team-box__badge"><TeamBadge team={team} size="sm" /></span>
      <span className="team-box__name">{team.name}</span>
      {editable && status !== 'jugado' ? (
        <input
          className="team-box__score-input"
          type="number"
          defaultValue={score ?? ''}
          onBlur={(e) => onScoreChange(match, which === 'team1' ? 'team1_score' : 'team2_score', e.target.value)}
        />
      ) : (
        score != null && <span className="team-box__score">{score}</span>
      )}
    </div>
  )
}

export default function Bracket({
  matches, teams, tournamentName, myTeamId,
  editable = false, onScoreChange, onFinalize, onReopen,
  dragEnabled = false, poolTeams = [], onDropTeam, onRemoveSlot,
}) {
  const frameRef = useRef(null)
  const [frameH, setFrameH] = useState(560)

  useEffect(() => {
    const el = frameRef.current
    if (!el) return undefined
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height
      if (h) setFrameH(h)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (!matches.length) {
    return <div className="empty">Este torneo aún no tiene un cuadro generado.</div>
  }

  const layout = computeLayout(matches)
  const finalMatch = matches.find((m) => m.side === 'final')
  const liveMatch = matches.find((m) => uiStatus(m) === 'en_juego')

  // separación vertical entre las dos cajas de un mismo cruce, expresada
  // como % de la altura del marco (así conectores y cajas usan el mismo valor)
  const GAP_PX = 24
  const gapPct = (GAP_PX / frameH) * 100

  function boxTop(matchId, which) {
    const pos = layout[matchId]
    return which === 'team1' ? pos.centerY - gapPct : pos.centerY + gapPct
  }

  // ---------- conectores (líneas), calculados con la misma geometría ----------
  const lines = []
  ;['izquierda', 'derecha'].forEach((side) => {
    const mirrored = side === 'derecha'
    const sideMatches = matches.filter((m) => m.side === side)
    sideMatches.forEach((m) => {
      const pos = layout[m.id]
      const y1 = boxTop(m.id, 'team1')
      const y2 = boxTop(m.id, 'team2')
      const stubX = pos.edgeX + (mirrored ? -STUB : STUB)

      // conector corto que une las dos cajas del mismo cruce
      lines.push({ d: `M ${pos.edgeX} ${y1} H ${stubX} V ${y2} H ${pos.edgeX}`, final: false })

      const next = computeNextSlot(matches, m)
      if (!next) return
      const nextMatch = findMatch(matches, next.round_number, next.side, next.match_index)
      if (!nextMatch) return
      const nextPos = layout[nextMatch.id]
      const nextWhich = next.slotField === 'team1_id' ? 'team1' : 'team2'
      const targetY = boxTop(nextMatch.id, nextWhich)
      const targetX = mirrored ? nextPos.left + nextPos.width : nextPos.left
      const midY = (y1 + y2) / 2
      const midX = (stubX + targetX) / 2
      lines.push({ d: `M ${stubX} ${midY} H ${midX} V ${targetY} H ${targetX}`, final: nextMatch === finalMatch })
    })
  })

  function labelStyle(pos) {
    return { left: `${(pos.colLeft + pos.colRight) / 2}%` }
  }

  return (
    <div className="bracket-hero">
      <div className="bracket-hero__header">
        <p className="bracket-hero__eyebrow">Caribe Sports Events</p>
        <h2 className="bracket-hero__title">Cuadro de <span>Cruces</span></h2>
        <p className="bracket-hero__subtitle">{tournamentName}</p>
      </div>

      <div className="bracket-frame-scroll">
        <div className="bracket-frame" ref={frameRef}>
          <svg className="bracket-connectors" viewBox="0 0 100 100" preserveAspectRatio="none">
            {lines.map((l, i) => (
              <path key={i} className={`bracket-line ${l.final ? 'bracket-line--final' : ''}`} d={l.d} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>

          {finalMatch && (
            <div className="bracket-final-glow" style={{ top: `${layout[finalMatch.id].centerY}%` }} />
          )}

          {/* etiquetas de ronda (una por cada columna) */}
          {Object.entries(
            matches.filter((m) => m.side !== 'final').reduce((acc, m) => {
              const key = `${m.side}-${m.round_number}`
              if (!acc[key]) acc[key] = m
              return acc
            }, {})
          ).map(([key, m]) => (
            <span key={key} className="bracket-round-label" style={labelStyle(layout[m.id])}>{m.round_name}</span>
          ))}
          {finalMatch && (
            <div className="bracket-final-badge" style={{ left: '50%', top: `${boxTop(finalMatch.id, 'team1')}%` }}>
              <span className="bracket-final-badge__star">★</span> GRAN FINAL <span className="bracket-final-badge__star">★</span>
            </div>
          )}

          {/* cajas de cada equipo, para todos los cruces (incluida la Final) */}
          {matches.map((m) => {
            const t1 = teamById(teams, m.team1_id)
            const t2 = teamById(teams, m.team2_id)
            const pos = layout[m.id]
            const status = uiStatus(m)
            const canFinalize = editable && status !== 'jugado' && t1 && t2 &&
              m.team1_score != null && m.team2_score != null && m.team1_score !== m.team2_score
            const isDropSlot = dragEnabled && m.round_number === 1

            return (
              <div key={m.id}>
                <TeamBox
                  team={t1} match={m} which="team1" myTeamId={myTeamId} editable={editable} onScoreChange={onScoreChange}
                  style={{ left: `${pos.left}%`, width: `${pos.width}%`, top: `${boxTop(m.id, 'team1')}%` }}
                  dragEnabled={dragEnabled} isDropSlot={isDropSlot} onDropTeam={onDropTeam} onRemoveSlot={onRemoveSlot}
                />
                <TeamBox
                  team={t2} match={m} which="team2" myTeamId={myTeamId} editable={editable} onScoreChange={onScoreChange}
                  style={{ left: `${pos.left}%`, width: `${pos.width}%`, top: `${boxTop(m.id, 'team2')}%` }}
                  dragEnabled={dragEnabled} isDropSlot={isDropSlot} onDropTeam={onDropTeam} onRemoveSlot={onRemoveSlot}
                />
                <span className="match-vs" style={{ left: `${pos.left + pos.width / 2}%`, top: `${pos.centerY}%` }}>VS</span>
                {editable && (canFinalize || status === 'jugado') && (
                  <div
                    className="match-controls"
                    style={{ left: `${pos.left}%`, width: `${pos.width}%`, top: `${boxTop(m.id, 'team2') + gapPct * 1.6}%`, justifyContent: 'flex-end' }}
                  >
                    {canFinalize && (
                      <button
                        className="match-controls__finalize"
                        onClick={() => onFinalize(m, m.team1_score > m.team2_score ? m.team1_id : m.team2_id)}
                      >
                        Finalizar
                      </button>
                    )}
                    {status === 'jugado' && (
                      <button className="match-controls__reopen" onClick={() => onReopen(m)}>↺ Reabrir</button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* insignia de campeón + balón, debajo de la Final, siempre centrada */}
          {finalMatch && (
            <>
              <div
                className="bracket-final-connector"
                style={{
                  top: `${boxTop(finalMatch.id, 'team2') + gapPct * 0.9}%`,
                  height: `${gapPct * 1.5}%`,
                }}
              />
              <div
                className="bracket-center-champ"
                style={{ top: `${boxTop(finalMatch.id, 'team2') + gapPct * 2.4}%` }}
              >
                <div className="bracket-center-champ__label">Campeón del torneo</div>
                <div className={`bracket-center-champ__box ${finalMatch.winner_id ? 'is-decided' : 'bracket-center-champ__box--pending'}`}>
                  {finalMatch.winner_id ? (
                    <>
                      <span>🏆</span>
                      {teamById(teams, finalMatch.winner_id)?.name}
                    </>
                  ) : '¿Quién será?'}
                </div>
                <div className="bracket-center-champ__ball"><BallIcon /></div>
              </div>
            </>
          )}
        </div>
      </div>

      {dragEnabled && (
        <div className="bracket-pool">
          <h3>Equipos guardados del torneo</h3>
          <p className="mini">Arrastra cada equipo hacia un casillero vacío de la primera ronda para ubicarlo en el cuadro.</p>
          <div className="bracket-pool__list">
            {poolTeams.map((t) => (
              <div
                key={t.id}
                className="bracket-pool__chip"
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/team-id', t.id)}
              >
                <TeamBadge team={t} size="sm" />
                {t.name}
              </div>
            ))}
            {poolTeams.length === 0 && <p className="mini">Todos los equipos ya están ubicados en el cuadro.</p>}
          </div>
        </div>
      )}

      <div className="bracket-live-strip-wrap">
        <div className="bracket-live-strip">
          <span className="bracket-live-strip__dot" />
          {liveMatch
            ? `En vivo: ${teamById(teams, liveMatch.team1_id)?.name} ${liveMatch.team1_score ?? 0} - ${liveMatch.team2_score ?? 0} ${teamById(teams, liveMatch.team2_id)?.name}`
            : 'Actualizado en tiempo real para todos los espectadores'}
        </div>
      </div>
    </div>
  )
}