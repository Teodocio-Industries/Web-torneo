import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import TeamBadge from '../TeamBadge/TeamBadge'
import './Bracket.css'

function teamById(teams, id) {
  return teams.find((t) => t.id === id) || null
}

function MatchTeamRow({ team, match, teams, myTeamId }) {
  if (!team) return <div className="match-team match-team--empty">Por definir</div>
  const isWinner = match.winner_id && match.winner_id === team.id
  const isLoser = match.status === 'jugado' && match.winner_id && match.winner_id !== team.id
  const isMe = myTeamId && team.id === myTeamId
  const score = team.id === match.team1_id ? match.team1_score : match.team2_score
  return (
    <div className={['match-team', isWinner && 'is-winner', isLoser && 'is-loser', isMe && 'is-me'].filter(Boolean).join(' ')}>
      <TeamBadge team={team} size="sm" />
      <span className="match-team__name">{team.name}</span>
      {score != null && <span className="match-team__score">{score}</span>}
    </div>
  )
}

function MatchBox({ match, teams, myTeamId, matchRef }) {
  const t1 = teamById(teams, match.team1_id)
  const t2 = teamById(teams, match.team2_id)
  return (
    <div className="match-box" ref={matchRef} data-match={match.id}>
      <MatchTeamRow team={t1} match={match} teams={teams} myTeamId={myTeamId} />
      <MatchTeamRow team={t2} match={match} teams={teams} myTeamId={myTeamId} />
    </div>
  )
}

export default function Bracket({ matches, teams, tournamentName, myTeamId }) {
  const outerRef = useRef(null)
  const svgRef = useRef(null)
  const boxRefs = useRef({})
  const [, forceTick] = useState(0)

  const finalMatch = matches.find((m) => m.side === 'final')
  const sides = ['izquierda', 'derecha']

  function roundsForSide(side) {
    return [...new Set(matches.filter((m) => m.side === side).map((m) => m.round_number))].sort((a, b) => a - b)
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

    function centerOf(el) {
      const r = el.getBoundingClientRect()
      return {
        top: r.top - outerRect.top,
        bottom: r.bottom - outerRect.top,
        left: r.left - outerRect.left,
        right: r.right - outerRect.left,
        midY: (r.top + r.bottom) / 2 - outerRect.top,
      }
    }

    let paths = ''
    sides.forEach((side) => {
      const mirrored = side === 'derecha'
      const rounds = roundsForSide(side)
      rounds.forEach((r, idx) => {
        if (idx === rounds.length - 1) return
        const nextR = rounds[idx + 1]
        const ms = matches.filter((m) => m.side === side && m.round_number === r).sort((a, b) => a.match_index - b.match_index)
        ms.forEach((m) => {
          const el = boxRefs.current[m.id]
          const nextMs = matches.filter((mm) => mm.side === side && mm.round_number === nextR).sort((a, b) => a.match_index - b.match_index)
          const nextMatch = nextMs[Math.floor(m.match_index / 2)]
          if (!el || !nextMatch) return
          const nextEl = boxRefs.current[nextMatch.id]
          if (!nextEl) return
          const a = centerOf(el)
          const b = centerOf(nextEl)
          const x1 = mirrored ? a.left : a.right
          const x2 = mirrored ? b.right : b.left
          const midX = (x1 + x2) / 2
          paths += `<path d="M ${x1} ${a.midY} H ${midX} V ${b.midY} H ${x2}" />`
        })
      })
      const lastR = rounds[rounds.length - 1]
      const lastMs = matches.filter((m) => m.side === side && m.round_number === lastR)
      if (lastMs.length && finalMatch) {
        const el = boxRefs.current[lastMs[0].id]
        const finalEl = boxRefs.current[finalMatch.id]
        if (el && finalEl) {
          const a = centerOf(el)
          const b = centerOf(finalEl)
          const x1 = mirrored ? a.left : a.right
          const x2 = mirrored ? b.right : b.left
          const midX = (x1 + x2) / 2
          paths += `<path d="M ${x1} ${a.midY} H ${midX} V ${b.midY} H ${x2}" />`
        }
      }
    })
    svg.innerHTML = paths
  }

  useLayoutEffect(() => {
    boxRefs.current = {}
    forceTick((t) => t + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches])

  useEffect(() => {
    const raf = requestAnimationFrame(drawConnectors)
    function onResize() { drawConnectors() }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  if (!matches.length) {
    return <div className="empty">Este torneo aún no tiene un cuadro generado.</div>
  }

  return (
    <div className="bracket-hero">
      <div className="bracket-hero__head">
        <p className="eyebrow">Así quedan los cruces</p>
        <h2>{tournamentName}</h2>
      </div>
      <div className="bracket-scroll">
        <div className="bracket-outer" ref={outerRef}>
          {sides.map((side) => (
            <div className={`bracket-side bracket-side--${side}`} key={side}>
              {roundsForSide(side).map((r) => {
                const ms = matches.filter((m) => m.side === side && m.round_number === r).sort((a, b) => a.match_index - b.match_index)
                return (
                  <div className="bracket-round" key={r}>
                    {ms.map((m) => (
                      <MatchBox
                        key={m.id}
                        match={m}
                        teams={teams}
                        myTeamId={myTeamId}
                        matchRef={(el) => { if (el) boxRefs.current[m.id] = el }}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
          <div className="final-block">
            <div className="final-block__trophy">🏆</div>
            <div className="final-block__label">FINAL</div>
            {finalMatch && (
              <MatchBox
                match={finalMatch}
                teams={teams}
                myTeamId={myTeamId}
                matchRef={(el) => { if (el) boxRefs.current[finalMatch.id] = el }}
              />
            )}
          </div>
          <svg className="bracket-connectors" ref={svgRef} />
        </div>
      </div>
    </div>
  )
}
