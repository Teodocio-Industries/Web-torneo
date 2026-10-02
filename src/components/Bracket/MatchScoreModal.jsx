import { useEffect, useState } from 'react'
import './MatchScoreModal.css'

// Modal de marcador: se abre al hacer click en un cruce del bracket (en modo
// edición). Muestra los dos equipos del cruce, el marcador global, y tres
// botones a cada lado (+1, +2, +3) que suman al global del equipo.
// Al pulsar "Cerrar" se guarda y se notifica al bracket.
// Props:
//   - match: el bracket_match con team1_id/team2_id/team1_score/team2_score
//   - team1, team2: objetos { id, name, ... } o null
//   - onSave(globalTeam1, globalTeam2): callback para persistir
//   - onClose(): callback para cerrar el modal
//   - onFinalize(winnerId): callback para declarar ganador
export default function MatchScoreModal({ match, team1, team2, onSave, onClose, onFinalize }) {
  const [s1, setS1] = useState(match?.team1_score ?? 0)
  const [s2, setS2] = useState(match?.team2_score ?? 0)

  useEffect(() => {
    setS1(match?.team1_score ?? 0)
    setS2(match?.team2_score ?? 0)
  }, [match?.id])

  function add(side, n) {
    if (side === 'team1') setS1((v) => (Number(v) || 0) + n)
    else setS2((v) => (Number(v) || 0) + n)
  }
  function reset() {
    setS1(0)
    setS2(0)
  }

  function handleClose() {
    onSave?.(s1, s2)
    onClose?.()
  }

  const isDecided = match?.status === 'jugado'
  const tied = !isDecided && s1 === s2 && s1 > 0
  const winnerId = s1 > s2 ? match?.team1_id : s2 > s1 ? match?.team2_id : null

  return (
    <div className="match-modal__backdrop" onClick={onClose}>
      <div className="match-modal" role="dialog" aria-modal="true" aria-label="Marcador del partido" onClick={(e) => e.stopPropagation()}>
        <button className="match-modal__close" type="button" aria-label="Cerrar" onClick={onClose}>✕</button>
        <div className="match-modal__eyebrow">{match?.round_name}</div>
        <div className="match-modal__title">
          {team1?.name || 'Equipo 1'}{' '}<span>vs</span>{' '}{team2?.name || 'Equipo 2'}
        </div>

        <div className="match-modal__scoreboard">
          <div className="match-modal__side">
            <div className="match-modal__team">{team1?.name || 'Equipo 1'}</div>
            <div className="match-modal__points">{s1}</div>
            <div className="match-modal__buttons">
              <button type="button" className="match-modal__btn" onClick={() => add('team1', 1)} disabled={isDecided}>+1</button>
              <button type="button" className="match-modal__btn" onClick={() => add('team1', 2)} disabled={isDecided}>+2</button>
              <button type="button" className="match-modal__btn" onClick={() => add('team1', 3)} disabled={isDecided}>+3</button>
            </div>
          </div>

          <div className="match-modal__divider">
            <div className="match-modal__divider-line" />
            <div className="match-modal__divider-label">VS</div>
            <div className="match-modal__divider-line" />
          </div>

          <div className="match-modal__side">
            <div className="match-modal__team">{team2?.name || 'Equipo 2'}</div>
            <div className="match-modal__points">{s2}</div>
            <div className="match-modal__buttons">
              <button type="button" className="match-modal__btn" onClick={() => add('team2', 1)} disabled={isDecided}>+1</button>
              <button type="button" className="match-modal__btn" onClick={() => add('team2', 2)} disabled={isDecided}>+2</button>
              <button type="button" className="match-modal__btn" onClick={() => add('team2', 3)} disabled={isDecided}>+3</button>
            </div>
          </div>
        </div>

        {tied && (
          <p className="match-modal__hint">Empate. Declara un ganador manualmente o agrega más puntos.</p>
        )}

        <div className="match-modal__actions">
          <button type="button" className="btn ghost" onClick={reset} disabled={isDecided || (s1 === 0 && s2 === 0)}>
            Reiniciar
          </button>
          <button type="button" className="btn ghost" onClick={handleClose}>
            Guardar marcador
          </button>
          {!isDecided && winnerId && (
            <button type="button" className="btn" onClick={() => onFinalize?.(winnerId)}>
              Finalizar cruce
            </button>
          )}
          {isDecided && (
            <span className="match-modal__decided">Cruce finalizado</span>
          )}
        </div>
      </div>
    </div>
  )
}