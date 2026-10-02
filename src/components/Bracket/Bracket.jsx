import { useEffect, useRef, useState } from 'react'
import TeamBadge from '../TeamBadge/TeamBadge'
import { computeNextSlot, findMatch } from '../../lib/bracket'
import MatchScoreModal from './MatchScoreModal'
import './Bracket.css'

// Sentinel para un casillero "libre" en la primera ronda cuando no hay
// suficientes equipos para llenar una potencia de 2. El rival de un BYE
// avanza automáticamente a la siguiente ronda sin jugar el cruce.
export const BYE = 'BYE'
export function isBye(value) {
  return value === BYE
}

// ----- geometría del cuadro, en porcentaje del marco (0-100) -----
const TOP_RESERVED = 9     // franja superior para las etiquetas de ronda
const USABLE_H = 100 - TOP_RESERVED
const COL_PAD_RATIO = 0.04 // margen interno de cada columna (más aire entre cajas)
const STUB = 3.2           // largo del tramo horizontal corto de cada conector (mucho más separación)
const MIN_COLS_PER_SIDE = 1 // cuántas rondas por lado como mínimo para reservar el ancho
const FINAL_Y_RATIO = 0.16 // la Final va bien arriba, dejando todo el resto del espacio para el campeón

// El ancho reservado para CADA mitad del cuadro depende de cuántas rondas
// tenga esa mitad y de cuánto ancho necesita el nombre más largo del bracket
// para entrar sin recortar. Si los nombres son largos, nos quedamos sin
// ancho y subimos el porcentaje de cada mitad.
function calcSideWidth(roundsPerSide, nameExtraPx = 0) {
  const r = Math.max(MIN_COLS_PER_SIDE, roundsPerSide || 0)
  // Base: 12% por ronda (mucho más generoso) con piso de 36% y techo de
  // 48%. Esto deja mucho más aire entre columnas para que las cajas no se
  // solapen cuando crecen por nombres largos.
  const base = Math.min(48, Math.max(36, 12 * r))
  // Si el nombre más largo necesita más de ~140 px por columna, añadimos
  // 1.2% del frame por cada 20 px extra (antes 0.9%).
  const extra = Math.max(0, nameExtraPx - 140)
  const add = Math.min(15, Math.floor(extra / 20) * 1.2)
  return Math.min(49, base + add)
}

function teamById(teams, id) {
  if (!id || id === 'BYE') return null
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

// Mide el ancho en píxeles que ocuparía un texto con la fuente del team-box.
// Usamos un canvas 2D fuera de pantalla para no tocar el DOM.
let measureCanvas = null
function measureTextWidth(text, fontSize = 13, fontWeight = 600) {
  if (typeof document === 'undefined') return text.length * 8 // fallback SSR
  if (!measureCanvas) measureCanvas = document.createElement('canvas')
  const ctx = measureCanvas.getContext('2d')
  if (!ctx) return text.length * 8
  ctx.font = `${fontWeight} ${fontSize}px Inter, Arial, sans-serif`
  return ctx.measureText(text).width
}

// Ancho en px que necesita una caja para mostrar el nombre del equipo + el
// resto del contenido (badge, padding, score). Se usa para reservar la
// columna con espacio de sobra.
function requiredBoxWidthForName(name) {
  if (!name) return 140
  const textW = measureTextWidth(name, 13, 600)
  // badge ~30 + gap 8 + texto + score-input 38 + paddings 24 + buffer 32
  return textW + 30 + 8 + 38 + 24 + 32
}

// Calcula, para cada partido, su columna (left/width en %) y el centro
// vertical de su "slot" (en % de la altura total del marco).
function computeLayout(matches, teams = []) {
  const layout = {} // matchId -> { left, width, edgeX, centerY, side }
  const sides = ['izquierda', 'derecha']

  // Calculamos el ancho de cada mitad en función de sus rondas reales,
  // para que las cajas no se aplasten cuando hay muchas rondas.
  const roundsPerSide = {
    izquierda: [...new Set(matches.filter((m) => m.side === 'izquierda').map((m) => m.round_number))].length,
    derecha: [...new Set(matches.filter((m) => m.side === 'derecha').map((m) => m.round_number))].length,
  }

  // Detectamos el nombre más largo de TODOS los cruces (incluyendo el pool)
  // para reservar el ancho de columna necesario.
  const allNames = []
  matches.forEach((m) => {
    const n1 = teamById(teams, m.team1_id)?.name
    const n2 = teamById(teams, m.team2_id)?.name
    if (n1) allNames.push(n1)
    if (n2) allNames.push(n2)
  })
  teams.forEach((t) => { if (t.name) allNames.push(t.name) })
  let longest = ''
  allNames.forEach((n) => { if (n.length > longest.length) longest = n })

  const sideWidth = {
    izquierda: calcSideWidth(roundsPerSide.izquierda, longest.length > 12 ? requiredBoxWidthForName(longest) : 0),
    derecha: calcSideWidth(roundsPerSide.derecha, longest.length > 12 ? requiredBoxWidthForName(longest) : 0),
  }

  sides.forEach((side) => {
    const roundNums = [...new Set(matches.filter((m) => m.side === side).map((m) => m.round_number))].sort((a, b) => a - b)
    const R = roundNums.length
    const SIDE_W = sideWidth[side]
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
    const colLeft = sideWidth.izquierda
    const colRight = 100 - sideWidth.derecha
    const pad = (colRight - colLeft) * 0.14
    layout[finalMatch.id] = {
      left: colLeft + pad, width: (colRight - colLeft) - pad * 2,
      edgeX: null, centerY: TOP_RESERVED + FINAL_Y_RATIO * USABLE_H, side: 'final', colLeft, colRight,
    }
  }

  // Si el nombre más largo es considerable (>12 chars), devolvemos el
  // ancho mínimo en px que necesita el frame para que entre sin recortar.
  layout.__minFramePx = longest.length > 12 ? requiredBoxWidthForName(longest) + 16 : 0

  return layout
}

function TeamBox({
  team, match, which, myTeamId, editable, onScoreChange, onOpenScoreModal, style,
  dragEnabled, isDropSlot, onDropTeam, onRemoveSlot,
  isByeSlot,
}) {
  const status = uiStatus(match)
  const score = which === 'team1' ? match.team1_score : match.team2_score
  const isWinner = status === 'jugado' && match.winner_id === team?.id
  const isLoser = status === 'jugado' && match.winner_id && match.winner_id !== team?.id
  const isMe = myTeamId && team?.id === myTeamId

  // BYE: hueco "fantasma" porque no llegan equipos para llenar potencia de 2.
  // Aparece en la primera ronda y el rival avanza automáticamente.
  // Si el admin arrastra un equipo encima, ese equipo ocupa el casillero
  // del BYE (y el otro casillero del cruce queda libre para otro equipo).
  if (isByeSlot) {
    if (dragEnabled && isDropSlot && onDropTeam) {
      return (
        <div
          className="team-box team-box--bye team-box--dropzone"
          style={style}
          title="Suelta aquí un equipo para ocupar este casillero (y el BYE se va)"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const teamId = e.dataTransfer.getData('text/team-id')
            if (teamId) onDropTeam(match, which, teamId)
          }}
        >
          <span className="team-box__bye-tag">BYE</span>
          <span className="team-box__bye-hint">suelta un equipo aquí</span>
        </div>
      )
    }
    return (
      <div className="team-box team-box--bye" style={style} title="BYE: el rival avanza automáticamente">
        <span className="team-box__bye-tag">BYE</span>
        <span className="team-box__bye-hint">avanza sin jugar</span>
      </div>
    )
  }

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
  const clickable = editable && onOpenScoreModal && match.team1_id && match.team2_id &&
    match.team1_id !== 'BYE' && match.team2_id !== 'BYE'
  // Tooltip con el nombre completo (visible al pasar el cursor cuando el
  // nombre quedó recortado en la caja).
  const fullName = team?.name || (which === 'team1' ? 'Equipo 1' : 'Equipo 2')

  return (
    <div
      className={['team-box', isWinner && 'is-winner', isLoser && 'is-loser', isMe && 'is-me', clickable && 'team-box--clickable'].filter(Boolean).join(' ')}
      style={style}
      onClick={clickable ? () => onOpenScoreModal(match) : undefined}
      title={clickable ? `${fullName} — click para abrir el marcador del cruce` : fullName}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenScoreModal(match) } } : undefined}
    >
      {canClear && (
        <button
          type="button"
          className="team-box__clear"
          title="Quitar del cruce"
          onClick={(e) => { e.stopPropagation(); onRemoveSlot(match, which) }}
        >✕</button>
      )}
      <span className="team-box__badge"><TeamBadge team={team} size="sm" /></span>
      <span className="team-box__name" title={fullName}>{team.name}</span>
      {editable && status !== 'jugado' && (match.legs || 1) <= 1 ? (
        <input
          className="team-box__score-input"
          type="number"
          defaultValue={score ?? ''}
          onClick={(e) => e.stopPropagation()}
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
  onSaveScore, onFinalizeFromModal,
  fullscreen = false,
}) {
  const frameRef = useRef(null)
  const [frameH, setFrameH] = useState(560)
  // Modal de marcador: se abre al hacer click en un cruce del bracket.
  const [scoreMatchId, setScoreMatchId] = useState(null)

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

  const layout = computeLayout(matches, teams)
  const finalMatch = matches.find((m) => m.side === 'final')
  const liveMatch = matches.find((m) => uiStatus(m) === 'en_juego')
  const minFramePx = layout.__minFramePx || 820

  // separación vertical entre las dos cajas de un mismo cruce, expresada
  // como % de la altura del marco (así conectores y cajas usan el mismo valor)
  const GAP_PX = 24
  const gapPct = (GAP_PX / frameH) * 100

  function boxTop(matchId, which) {
    const pos = layout[matchId]
    return which === 'team1' ? pos.centerY - gapPct : pos.centerY + gapPct
  }

  // Cuando un cruce tiene BYE en uno de los casilleros y el otro equipo
  // ya está definido, queremos que la caja del equipo real aparezca centrada
  // en el slot (no arriba o abajo) para que visualmente ocupe el lugar del
  // cruce entero.
  function isByeHidden(m, which) {
    if (m.round_number !== 1) return false
    if (m.status !== 'jugado') return false
    if (which === 'team1' && m.team1_id === BYE) return true
    if (which === 'team2' && m.team2_id === BYE) return true
    return false
  }
  function effectiveBoxTop(m, which) {
    const otherWhich = which === 'team1' ? 'team2' : 'team1'
    if (isByeHidden(m, which) && !isByeHidden(m, otherWhich)) {
      // El otro casillero también es BYE: no renderizamos nada (caso raro
      // de cruce BYE vs BYE; lo dejamos en su posición normal).
      if (isByeHidden(m, otherWhich)) return boxTop(m.id, which)
      return layout[m.id].centerY // centra la única caja visible
    }
    return boxTop(m.id, which)
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

  function openScoreModal(match) {
    setScoreMatchId(match.id)
  }
  function closeScoreModal() {
    setScoreMatchId(null)
  }
  const scoreMatch = scoreMatchId ? matches.find((m) => m.id === scoreMatchId) : null

  return (
    <div className={`bracket-hero ${dragEnabled ? 'bracket-hero--place-mode' : ''} ${fullscreen ? 'bracket-hero--fullscreen' : ''}`}>
      <div className="bracket-hero__header">
        <p className="bracket-hero__eyebrow">Caribe Sports Events</p>
        <h2 className="bracket-hero__title">Cuadro de <span>Cruces</span></h2>
        <p className="bracket-hero__subtitle">{tournamentName}</p>
      </div>

      <div className="bracket-frame-scroll">
        <div className="bracket-frame" ref={frameRef} style={{ minWidth: `${minFramePx}px` }}>
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
            <span key={key} className="bracket-round-label" style={labelStyle(layout[m.id])}>
              {m.round_name}{(m.legs || 1) > 1 ? ` · ${m.legs} vueltas` : ''}
            </span>
          ))}
          {finalMatch && (
            <div className="bracket-final-badge" style={{ left: '50%', top: `${boxTop(finalMatch.id, 'team1')}%` }}>
              <span className="bracket-final-badge__star">★</span> GRAN FINAL{(finalMatch.legs || 1) > 1 ? ` (${finalMatch.legs} vueltas)` : ''} <span className="bracket-final-badge__star">★</span>
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
            const t1IsBye = m.round_number === 1 && m.team1_id === BYE
            const t2IsBye = m.round_number === 1 && m.team2_id === BYE
            // Si el cruce ya está finalizado por BYE (winner_id marcado y
            // status='jugado'), no mostramos la caja BYE rival: solo queda
            // el equipo ganador como evidencia del cruce. Pero en modo
            // edición seguimos permitiendo soltar otro equipo encima para
            // reorganizar.
            const hideT1Bye = t1IsBye && status === 'jugado'
            const hideT2Bye = t2IsBye && status === 'jugado'

            return (
              <div key={m.id}>
                {!hideT1Bye && (
                  <TeamBox
                    team={t1} match={m} which="team1" myTeamId={myTeamId} editable={editable} onScoreChange={onScoreChange}
                    onOpenScoreModal={openScoreModal}
                    style={{ left: `${pos.left}%`, minWidth: `${pos.width}%`, top: `${effectiveBoxTop(m, 'team1')}%` }}
                    dragEnabled={dragEnabled} isDropSlot={isDropSlot} onDropTeam={onDropTeam} onRemoveSlot={onRemoveSlot}
                    isByeSlot={t1IsBye}
                  />
                )}
                {!hideT2Bye && (
                  <TeamBox
                    team={t2} match={m} which="team2" myTeamId={myTeamId} editable={editable} onScoreChange={onScoreChange}
                    onOpenScoreModal={openScoreModal}
                    style={{ left: `${pos.left}%`, minWidth: `${pos.width}%`, top: `${effectiveBoxTop(m, 'team2')}%` }}
                    dragEnabled={dragEnabled} isDropSlot={isDropSlot} onDropTeam={onDropTeam} onRemoveSlot={onRemoveSlot}
                    isByeSlot={t2IsBye}
                  />
                )}
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
          <h3>Equipos del torneo ({poolTeams.length} por ubicar)</h3>
          <p className="mini">Arrastra cada equipo hacia un casillero vacío (o hacia un BYE) de la primera ronda para ubicarlo en el cuadro. Si hay cruces con BYE, al colocar el equipo rival ese equipo avanza automáticamente.</p>
          <div className="bracket-pool__list">
            {poolTeams.map((t) => (
              <div
                key={t.id}
                className="bracket-pool__chip"
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/team-id', t.id)}
                title={t.name}
              >
                <TeamBadge team={t} size="sm" />
                <span className="bracket-pool__chip-name">{t.name}</span>
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

      {scoreMatch && (
        <MatchScoreModal
          match={scoreMatch}
          team1={teamById(teams, scoreMatch.team1_id)}
          team2={teamById(teams, scoreMatch.team2_id)}
          onSave={(s1, s2) => onSaveScore?.(scoreMatch, s1, s2)}
          onFinalize={(winnerId) => {
            onFinalizeFromModal?.(scoreMatch, winnerId)
            closeScoreModal()
          }}
          onClose={closeScoreModal}
        />
      )}
    </div>
  )
}