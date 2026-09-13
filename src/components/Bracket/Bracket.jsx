import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import TeamBadge from '../TeamBadge/TeamBadge'
import './Bracket.css'

function teamById(teams, id) {
  return teams.find((t) => t.id === id) || null
}

function statusLabel(status) {
  if (!status) return 'Por jugar'
  if (status === 'jugado') return 'Final'
  if (status === 'en_juego') return 'En vivo'
  return status
}

function MatchTeamRow({ team, match, teams, onPickWinner, onScoreChange, canEdit, isMyTeam }) {
  const isWinner = match.winner_id && match.winner_id === team?.id
  const isLoser = match.status === 'jugado' && match.winner_id && team && match.winner_id !== team.id
  const isLive = match.status === 'en_juego'
  const t1 = teamById(teams, match.team1_id)
  const t2 = teamById(teams, match.team2_id)
  const bothDefined = t1 && t2

  const scoreField = team && team.id === match.team1_id ? 'team1_score' : 'team2_score'
  const rawScore = team ? match[scoreField] : null
  const hasScore = rawScore !== null && rawScore !== undefined && rawScore !== '' && !Number.isNaN(Number(rawScore))

  // Leading team in live matches (only when both have scores and no winner yet)
  const otherField = scoreField === 'team1_score' ? 'team2_score' : 'team1_score'
  const myNum = hasScore ? Number(rawScore) : null
  const otherNum = match[otherField] !== null && match[otherField] !== undefined && match[otherField] !== ''
    ? Number(match[otherField])
    : null
  const isLeading =
    !match.winner_id &&
    match.status !== 'jugado' &&
    myNum !== null &&
    otherNum !== null &&
    myNum > otherNum

  if (!team) {
    return (
      <div className="match-team match-team--empty">
        <span className="match-team__placeholder-dot" aria-hidden="true" />
        <span className="match-team__empty">Por definir</span>
      </div>
    )
  }

  return (
    <div
      className={['match-team', isWinner && 'is-winner', isLoser && 'is-loser', isMyTeam && 'is-me', isLive && 'is-live', isLeading && 'is-leading']
        .filter(Boolean)
        .join(' ')}
    >
      <TeamBadge team={team} size="sm" />
      <span className="match-team__name" title={team.name}>{team.name}</span>
      {canEdit && bothDefined ? (
        <input
          type="number"
          min="0"
          className="match-team__score-input"
          defaultValue={hasScore ? rawScore : ''}
          aria-label={`Puntos de ${team.name}`}
          onBlur={(e) => {
            const v = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0)
            if (v !== rawScore) onScoreChange(match.id, scoreField, v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
        />
      ) : (
        <span className="match-team__score">{hasScore ? rawScore : '—'}</span>
      )}
      {canEdit && bothDefined && (
        <button
          type="button"
          className={`match-team__pick ${isWinner ? 'is-on' : ''}`}
          title="Marcar como ganador"
          onClick={() => onPickWinner(match.id, team.id)}
        >
          ✓
        </button>
      )}
    </div>
  )
}

function MatchBox({ match, teams, myTeamId, onPickWinner, onScoreChange, canEdit, highlight }) {
  const t1 = teamById(teams, match.team1_id)
  const t2 = teamById(teams, match.team2_id)
  return (
    <div
      className={['match-box', highlight && 'is-highlight', match.status === 'en_juego' && 'is-live', match.status === 'jugado' && 'is-done']
        .filter(Boolean)
        .join(' ')}
      data-match={match.id}
    >
      <div className="match-box__head">
        <span className="match-box__round">{match.round_name}</span>
        <span className={`match-box__status status-${match.status || 'pendiente'}`}>{statusLabel(match.status)}</span>
      </div>
      <div className="match-box__divider" aria-hidden="true" />
      <MatchTeamRow
        team={t1}
        match={match}
        teams={teams}
        onPickWinner={onPickWinner}
        onScoreChange={onScoreChange}
        canEdit={canEdit}
        isMyTeam={t1?.id === myTeamId}
      />
      <MatchTeamRow
        team={t2}
        match={match}
        teams={teams}
        onPickWinner={onPickWinner}
        onScoreChange={onScoreChange}
        canEdit={canEdit}
        isMyTeam={t2?.id === myTeamId}
      />
    </div>
  )
}

export default function Bracket({ matches, teams, tournamentName, myTeamId, onPickWinner, onScoreChange, canEdit }) {
  const outerRef = useRef(null)
  const svgRef = useRef(null)
  const boxRefs = useRef({})
  const [, forceTick] = useState(0)

  const finalMatch = matches.find((m) => m.side === 'final')
  const sides = ['izquierda', 'derecha']

  const liveMatch = useMemo(
    () => matches.find((m) => m.status === 'en_juego') || null,
    [matches],
  )

  const roundsForSide = (side) =>
    [...new Set(matches.filter((m) => m.side === side).map((m) => m.round_number))].sort((a, b) => a - b)

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
          paths += `<path class="bracket-line" d="M ${x1} ${a.midY} H ${midX} V ${b.midY} H ${x2 - 2}" />`
          paths += `<circle class="bracket-line-dot" cx="${x1}" cy="${a.midY}" r="2.5" />`
          paths += `<circle class="bracket-line-dot" cx="${midX}" cy="${b.midY}" r="2.5" />`
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
          paths += `<path class="bracket-line bracket-line--final" d="M ${x1} ${a.midY} H ${midX} V ${b.midY} H ${x2 - 2}" />`
          paths += `<circle class="bracket-line-dot" cx="${x1}" cy="${a.midY}" r="2.5" />`
          paths += `<circle class="bracket-line-dot" cx="${midX}" cy="${b.midY}" r="2.5" />`
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
    function onResize() {
      drawConnectors()
    }
    window.addEventListener('resize', onResize)
    const ro = outerRef.current ? new ResizeObserver(drawConnectors) : null
    if (ro && outerRef.current) ro.observe(outerRef.current)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      if (ro) ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  if (!matches.length) {
    return <div className="empty">Este torneo aún no tiene un cuadro generado.</div>
  }

  const liveT1 = liveMatch ? teamById(teams, liveMatch.team1_id) : null
  const liveT2 = liveMatch ? teamById(teams, liveMatch.team2_id) : null

  return (
    <div className="bracket-hero">
      <div className="bracket-live-report">
        <div className="bracket-live-report__title">
          <span className="bracket-live-report__dot" />
          LIVE REPORT
        </div>
        <div className="bracket-live-report__sub">{tournamentName || 'Cuadro de cruces'}</div>
        {liveMatch && liveT1 && liveT2 ? (
          <div className="bracket-live-report__score">
            <div className="bracket-live-report__team">
              <TeamBadge team={liveT1} size="sm" />
              <span className="bracket-live-report__name">{liveT1.name}</span>
            </div>
            <div className="bracket-live-report__numbers">
              <span className="bracket-live-report__n">{liveMatch.team1_score ?? 0}</span>
              <span className="bracket-live-report__sep">·</span>
              <span className="bracket-live-report__n">{liveMatch.team2_score ?? 0}</span>
            </div>
            <div className="bracket-live-report__team">
              <TeamBadge team={liveT2} size="sm" />
              <span className="bracket-live-report__name">{liveT2.name}</span>
            </div>
          </div>
        ) : (
          <div className="bracket-live-report__score bracket-live-report__score--idle">
            <span className="bracket-live-report__team bracket-live-report__team--idle">
              <span className="bracket-live-report__name">—</span>
            </span>
            <div className="bracket-live-report__numbers">
              <span className="bracket-live-report__n">—</span>
              <span className="bracket-live-report__sep">·</span>
              <span className="bracket-live-report__n">—</span>
            </div>
            <span className="bracket-live-report__team bracket-live-report__team--idle">
              <span className="bracket-live-report__name">—</span>
            </span>
          </div>
        )}
      </div>

      <div className="bracket-scroll">
        <div className="bracket-outer" ref={outerRef}>
          <div className="bracket-side bracket-side--izquierda">
            {roundsForSide('izquierda').map((r) => {
              const ms = matches
                .filter((m) => m.side === 'izquierda' && m.round_number === r)
                .sort((a, b) => a.match_index - b.match_index)
              return (
                <div className="bracket-round" key={`izq-${r}`}>
                  <span className="bracket-round__label">{ms[0]?.round_name}</span>
                  {ms.map((m, i) => (
                    <div className="bracket-round__slot" key={m.id}>
                      <MatchBox
                        match={m}
                        teams={teams}
                        myTeamId={myTeamId}
                        onPickWinner={onPickWinner}
                        onScoreChange={onScoreChange}
                        canEdit={canEdit}
                        highlight={liveMatch?.id === m.id}
                        matchRef={(el) => {
                          if (el) boxRefs.current[m.id] = el
                        }}
                      />
                      {i < ms.length - 1 && <span className="bracket-round__sep" aria-hidden="true" />}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          <div className="bracket-center">
            <div className="bracket-center__ball" aria-hidden="true">
              <svg viewBox="0 0 64 64" width="64" height="64">
                <circle cx="32" cy="32" r="30" fill="#ff6b21" />
                <path d="M32 2 C 18 14 18 50 32 62" stroke="#0c1018" strokeWidth="2.5" fill="none" />
                <path d="M32 2 C 46 14 46 50 32 62" stroke="#0c1018" strokeWidth="2.5" fill="none" />
                <path d="M2 32 H 62" stroke="#0c1018" strokeWidth="2.5" fill="none" />
                <path d="M10 14 C 22 22 42 22 54 14" stroke="#0c1018" strokeWidth="2.5" fill="none" />
                <path d="M10 50 C 22 42 42 42 54 50" stroke="#0c1018" strokeWidth="2.5" fill="none" />
              </svg>
            </div>
            <span className="bracket-center__label">{finalMatch ? 'FINAL' : 'CUADRO'}</span>
            {finalMatch && (
              <MatchBox
                match={finalMatch}
                teams={teams}
                myTeamId={myTeamId}
                onPickWinner={onPickWinner}
                onScoreChange={onScoreChange}
                canEdit={canEdit}
                highlight={liveMatch?.id === finalMatch.id}
                matchRef={(el) => {
                  if (el) boxRefs.current[finalMatch.id] = el
                }}
              />
            )}
            <div className="bracket-center__trophy" aria-hidden="true">🏆</div>
          </div>

          <div className="bracket-side bracket-side--derecha">
            {roundsForSide('derecha').map((r) => {
              const ms = matches
                .filter((m) => m.side === 'derecha' && m.round_number === r)
                .sort((a, b) => a.match_index - b.match_index)
              return (
                <div className="bracket-round" key={`der-${r}`}>
                  <span className="bracket-round__label">{ms[0]?.round_name}</span>
                  {ms.map((m, i) => (
                    <div className="bracket-round__slot" key={m.id}>
                      <MatchBox
                        match={m}
                        teams={teams}
                        myTeamId={myTeamId}
                        onPickWinner={onPickWinner}
                        onScoreChange={onScoreChange}
                        canEdit={canEdit}
                        highlight={liveMatch?.id === m.id}
                        matchRef={(el) => {
                          if (el) boxRefs.current[m.id] = el
                        }}
                      />
                      {i < ms.length - 1 && <span className="bracket-round__sep" aria-hidden="true" />}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          <svg className="bracket-connectors" ref={svgRef} />
        </div>
      </div>

      <div className="bracket-footer">
        <p className="eyebrow bracket-footer__title">YOUR TOURNAMENT LEAGUE</p>
        <p className="bracket-footer__text">
          Sigue cada cruce, cada resultado y cada campeón de tu torneo. Marca a tu equipo favorito y
          entérate primero de quién avanza en el cuadro de eliminación directa.
        </p>
        <div className="bracket-footer__sponsors">
          <span className="sponsor-dot" />
          <span className="sponsor-dot" />
          <span className="sponsor-dot" />
          <span className="sponsor-dot" />
          <span className="sponsor-dot" />
        </div>
      </div>
    </div>
  )
}
