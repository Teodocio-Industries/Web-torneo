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

function ScoreBox({ value, side, onChange, editable, showValue, t1Wins, t2Wins, t1Leading, t2Leading }) {
  if (!editable) {
    return (
      <div className={`bracket-vs__score ${t1Wins && side === 'left' ? 'is-winner' : ''} ${t2Wins && side === 'right' ? 'is-winner' : ''} ${(t1Leading && side === 'left') || (t2Leading && side === 'right') ? 'is-leading' : ''}`}>
        {showValue ? (value ?? '—') : '—'}
      </div>
    )
  }
  return (
    <input
      type="number"
      min="0"
      className={`bracket-vs__score-input ${t1Leading && side === 'left' ? 'is-leading' : ''} ${t2Leading && side === 'right' ? 'is-leading' : ''}`}
      defaultValue={value ?? ''}
      placeholder="0"
      aria-label={`Puntos del equipo ${side === 'left' ? 1 : 2}`}
      onBlur={(e) => {
        const v = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0)
        if (v !== value) onChange(v)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
    />
  )
}

function NameBox({ team, side, t1Wins, t2Wins, t1Leading, t2Leading, isDone, myTeamId }) {
  if (!team) {
    return (
      <div className="bracket-vs__name bracket-vs__name--empty">
        <span className="bracket-vs__placeholder" />
        <span>Por definir</span>
      </div>
    )
  }
  const winsSide = (t1Wins && side === 'left') || (t2Wins && side === 'right')
  const leads = (t1Leading && side === 'left') || (t2Leading && side === 'right')
  const lost = isDone && ((t1Wins && side === 'right') || (t2Wins && side === 'left'))
  const me = team.id === myTeamId
  return (
    <div className={`bracket-vs__name ${winsSide ? 'is-winner' : ''} ${leads ? 'is-leading' : ''} ${lost ? 'is-loser' : ''} ${me ? 'is-me' : ''}`}>
      <span className="bracket-vs__badge"><TeamBadge team={team} size="md" /></span>
      <span className="bracket-vs__team-name" title={team.name}>{team.name}</span>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* VS-style match: [name-box] [score-box]  VS  [score-box] [name-box] */
/* ---------------------------------------------------------------- */
function MatchBox({ match, teams, myTeamId, onScoreChange, onFinalize, onReopen, canEdit }) {
  const t1 = teamById(teams, match.team1_id)
  const t2 = teamById(teams, match.team2_id)
  const bothDefined = t1 && t2
  const isDone = match.status === 'jugado'
  const isLive = match.status === 'en_juego'
  const isPending = !isDone && !isLive

  const s1Raw = match.team1_score
  const s2Raw = match.team2_score
  const s1 = s1Raw !== null && s1Raw !== undefined && s1Raw !== '' ? Number(s1Raw) : null
  const s2 = s2Raw !== null && s2Raw !== undefined && s2Raw !== '' ? Number(s2Raw) : null
  const bothScores = s1 !== null && s2 !== null

  // Visual state of each side
  const winnerId = match.winner_id
  const t1Wins = winnerId && winnerId === t1?.id
  const t2Wins = winnerId && winnerId === t2?.id
  const t1Leading = !winnerId && bothScores && s1 > s2
  const t2Leading = !winnerId && bothScores && s2 > s1

  // Admin can only edit while the match is pending and both teams are defined
  const editable = canEdit && isPending && bothDefined
  const canFinalize = canEdit && isPending && bothDefined && bothScores && s1 !== s2
  const canReopen = canEdit && (isDone || isLive)

  return (
    <div
      className={[
        'bracket-vs',
        isLive && 'is-live',
        isDone && 'is-done',
        isPending && 'is-pending',
        bothDefined && 'has-teams',
      ].filter(Boolean).join(' ')}
      data-match={match.id}
    >
      {/* Top row: name | score  VS  score | name */}
      <div className="bracket-vs__row bracket-vs__row--top">
        <NameBox team={t1} side="left" t1Wins={t1Wins} t2Wins={t2Wins} t1Leading={t1Leading} t2Leading={t2Leading} isDone={isDone} myTeamId={myTeamId} />
        <ScoreBox
          value={s1}
          side="left"
          editable={editable}
          showValue={isLive || isDone}
          t1Wins={t1Wins}
          t2Wins={t2Wins}
          t1Leading={t1Leading}
          t2Leading={t2Leading}
          onChange={(v) => onScoreChange(match.id, 'team1_score', v)}
        />
        <div className="bracket-vs__vs" aria-hidden="true">VS</div>
        <ScoreBox
          value={s2}
          side="right"
          editable={editable}
          showValue={isLive || isDone}
          t1Wins={t1Wins}
          t2Wins={t2Wins}
          t1Leading={t1Leading}
          t2Leading={t2Leading}
          onChange={(v) => onScoreChange(match.id, 'team2_score', v)}
        />
        <NameBox team={t2} side="right" t1Wins={t1Wins} t2Wins={t2Wins} t1Leading={t1Leading} t2Leading={t2Leading} isDone={isDone} myTeamId={myTeamId} />
      </div>

      {/* Round tag + admin actions */}
      <div className="bracket-vs__foot">
        <span className="bracket-vs__round">{match.round_name}</span>
        <span className={`bracket-vs__status status-${match.status || 'pendiente'}`}>{statusLabel(match.status)}</span>
        {canFinalize && (
          <button type="button" className="bracket-vs__finalize" onClick={() => onFinalize(match.id)}>
            Finalizar
          </button>
        )}
        {canReopen && (
          <button type="button" className="bracket-vs__reopen" onClick={() => onReopen(match.id)} title="Reabrir cruce">
            ↺
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Auto-scaling bracket that fits one screen                         */
/* ---------------------------------------------------------------- */
export default function Bracket({ matches, teams, tournamentName, myTeamId, canEdit, onScoreChange, onFinalize, onReopen }) {
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

  // Re-measure after layout changes (resize / match count changes) to redraw connectors.
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
      {/* Header keeps the live-report banner; the bracket itself scales separately */}
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

      <div className="bracket-stage-wrapper">
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
                          canEdit={canEdit}
                          onScoreChange={onScoreChange}
                          onFinalize={onFinalize}
                          onReopen={onReopen}
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
                <svg viewBox="0 0 64 64" width="56" height="56">
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
                  canEdit={canEdit}
                  onScoreChange={onScoreChange}
                  onFinalize={onFinalize}
                  onReopen={onReopen}
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
                          canEdit={canEdit}
                          onScoreChange={onScoreChange}
                          onFinalize={onFinalize}
                          onReopen={onReopen}
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
          Sigue cada cruce, cada resultado y cada campeón de tu torneo.
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
