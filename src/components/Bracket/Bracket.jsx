import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import TeamBadge from '../TeamBadge/TeamBadge'
import { computeNextSlot, findMatch } from '../../lib/bracket'
import './Bracket.css'

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

function TeamBox({ team, match, which, myTeamId, editable, onScoreChange, boxRef }) {
  const status = uiStatus(match)
  const score = which === 'team1' ? match.team1_score : match.team2_score
  const isWinner = status === 'jugado' && match.winner_id === team?.id
  const isLoser = status === 'jugado' && match.winner_id && match.winner_id !== team?.id
  const isMe = myTeamId && team?.id === myTeamId

  if (!team) {
    return <div className="team-box team-box--empty" ref={boxRef}>Por definir</div>
  }

  return (
    <div
      className={['team-box', isWinner && 'is-winner', isLoser && 'is-loser', isMe && 'is-me'].filter(Boolean).join(' ')}
      ref={boxRef}
    >
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

function MatchPair({ match, teams, myTeamId, editable, onScoreChange, onFinalize, onReopen, box1Ref, box2Ref }) {
  const t1 = teamById(teams, match.team1_id)
  const t2 = teamById(teams, match.team2_id)
  const status = uiStatus(match)
  const canFinalize = editable && status !== 'jugado' && t1 && t2 &&
    match.team1_score != null && match.team2_score != null && match.team1_score !== match.team2_score

  return (
    <div className="match-pair" data-match={match.id}>
      <TeamBox team={t1} match={match} which="team1" myTeamId={myTeamId} editable={editable} onScoreChange={onScoreChange} boxRef={box1Ref} />
      <span className="match-pair__vs">VS</span>
      <TeamBox team={t2} match={match} which="team2" myTeamId={myTeamId} editable={editable} onScoreChange={onScoreChange} boxRef={box2Ref} />
      {canFinalize && (
        <button
          className="match-pair__finalize"
          onClick={() => onFinalize(match, match.team1_score > match.team2_score ? match.team1_id : match.team2_id)}
        >
          Finalizar
        </button>
      )}
      {editable && status === 'jugado' && (
        <button className="match-pair__reopen" onClick={() => onReopen(match)}>↺ Reabrir</button>
      )}
    </div>
  )
}

export default function Bracket({
  matches, teams, tournamentName, myTeamId,
  editable = false, onScoreChange, onFinalize, onReopen,
}) {
  const outerRef = useRef(null)
  const svgRef = useRef(null)
  const boxRefs = useRef({}) // matchId -> { team1: el, team2: el }
  const [, forceTick] = useState(0)

  const finalMatch = matches.find((m) => m.side === 'final')
  const liveMatch = matches.find((m) => uiStatus(m) === 'en_juego')
  const sides = ['izquierda', 'derecha']

  function roundsForSide(side) {
    return [...new Set(matches.filter((m) => m.side === side).map((m) => m.round_number))].sort((a, b) => a - b)
  }

  function getBox(matchId, which) {
    return boxRefs.current[matchId]?.[which] || null
  }
  function setBox(matchId, which, el) {
    if (!el) return
    if (!boxRefs.current[matchId]) boxRefs.current[matchId] = {}
    boxRefs.current[matchId][which] = el
  }

  function drawConnectors() {
    const outer = outerRef.current
    const svg = svgRef.current
    if (!outer || !svg) return
    const w = outer.scrollWidth
    const h = outer.scrollHeight
    svg.setAttribute('width', w)
    svg.setAttribute('height', h)
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    const outerRect = outer.getBoundingClientRect()

    function rectOf(el) {
      const r = el.getBoundingClientRect()
      return {
        top: r.top - outerRect.top, bottom: r.bottom - outerRect.top,
        left: r.left - outerRect.left, right: r.right - outerRect.left,
        midY: (r.top + r.bottom) / 2 - outerRect.top,
      }
    }

    let svgContent = ''
    sides.forEach((side) => {
      const mirrored = side === 'derecha'
      const rounds = roundsForSide(side)

      rounds.forEach((r) => {
        const ms = matches.filter((m) => m.side === side && m.round_number === r).sort((a, b) => a.match_index - b.match_index)

        ms.forEach((m) => {
          const t1El = getBox(m.id, 'team1')
          const t2El = getBox(m.id, 'team2')
          if (!t1El || !t2El) return
          const a1 = rectOf(t1El)
          const a2 = rectOf(t2El)
          const midY = (a1.midY + a2.midY) / 2
          const edgeX = mirrored ? a1.left : a1.right
          const stubX = edgeX + (mirrored ? -14 : 14)

          // conector corto que une las dos cajas del mismo cruce
          svgContent += `<path class="bracket-line" d="M ${edgeX} ${a1.midY} H ${stubX} V ${a2.midY} H ${edgeX}" />`

          const next = computeNextSlot(matches, m)
          if (!next) return
          const nextMatch = findMatch(matches, next.round_number, next.side, next.match_index)
          if (!nextMatch) return
          const nextWhich = next.slotField === 'team1_id' ? 'team1' : 'team2'
          const nextEl = getBox(nextMatch.id, nextWhich)
          if (!nextEl) return
          const b = rectOf(nextEl)
          const targetX = mirrored ? b.right : b.left
          const cls = nextMatch === finalMatch ? 'bracket-line bracket-line--final' : 'bracket-line'
          svgContent += `<path class="${cls}" d="M ${stubX} ${midY} H ${targetX}" />`
        })
      })
    })
    svg.innerHTML = svgContent
  }

  useLayoutEffect(() => {
    boxRefs.current = {}
    forceTick((t) => t + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches])

  useEffect(() => {
    let raf1, raf2, timer
    function schedule() {
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          drawConnectors()
          timer = setTimeout(drawConnectors, 100)
        })
      })
    }
    schedule()
    function onResize() { drawConnectors() }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      clearTimeout(timer)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  if (!matches.length) {
    return <div className="empty">Este torneo aún no tiene un cuadro generado.</div>
  }

  return (
    <div className="bracket-hero">
      <div className="bracket-hero__header">
        <p className="bracket-hero__eyebrow">Caribe Sports Events</p>
        <h2 className="bracket-hero__title">Cuadro de <span>Cruces</span></h2>
        <p className="bracket-hero__subtitle">{tournamentName}</p>
      </div>

      <div className="bracket-frame-scroll">
        <div className="bracket-frame">
          <div className="bracket-outer" ref={outerRef}>
            {sides.map((side) => (
              <div className={`bracket-side bracket-side--${side}`} key={side}>
                {roundsForSide(side).map((r) => {
                  const ms = matches.filter((m) => m.side === side && m.round_number === r).sort((a, b) => a.match_index - b.match_index)
                  return (
                    <div className="bracket-round" key={r}>
                      <span className="bracket-round__label">{ms[0]?.round_name}</span>
                      {ms.map((m) => (
                        <MatchPair
                          key={m.id}
                          match={m}
                          teams={teams}
                          myTeamId={myTeamId}
                          editable={editable}
                          onScoreChange={onScoreChange}
                          onFinalize={onFinalize}
                          onReopen={onReopen}
                          box1Ref={(el) => setBox(m.id, 'team1', el)}
                          box2Ref={(el) => setBox(m.id, 'team2', el)}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}

            <div className="bracket-center">
              <span className="bracket-round__label">Final</span>
              <div className="bracket-center__final-wrap">
                {finalMatch && (
                  <MatchPair
                    match={finalMatch}
                    teams={teams}
                    myTeamId={myTeamId}
                    editable={editable}
                    onScoreChange={onScoreChange}
                    onFinalize={onFinalize}
                    onReopen={onReopen}
                    box1Ref={(el) => setBox(finalMatch.id, 'team1', el)}
                    box2Ref={(el) => setBox(finalMatch.id, 'team2', el)}
                  />
                )}
                <div className="bracket-center__champ-float">
                  <div className="bracket-center__champ-label">Campeón del torneo</div>
                  <div className={`bracket-center__champ-box ${finalMatch?.winner_id ? '' : 'bracket-center__champ-box--pending'}`}>
                    {finalMatch?.winner_id ? (
                      <>
                        <span className="bracket-center__trophy">🏆</span>
                        {teamById(teams, finalMatch.winner_id)?.name}
                      </>
                    ) : '¿Quién será?'}
                  </div>
                  <div className="bracket-center__ball"><BallIcon /></div>
                </div>
              </div>
            </div>

            <svg className="bracket-connectors" ref={svgRef} />
          </div>
        </div>
      </div>

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