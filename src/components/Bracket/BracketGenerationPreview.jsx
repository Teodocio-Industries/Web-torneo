import './BracketGenerationPreview.css'

export default function BracketGenerationPreview({
  open,
  teamCount,
  slotCount = teamCount,
  bracketDetails,
  title = 'Resumen del bracket',
  detail,
  warning,
  busy = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null
  const details = bracketDetails?.length
    ? bracketDetails
    : [{ name: 'Bracket 1', teamCount, slotCount }]
  const totalTeams = details.reduce((sum, bracket) => sum + bracket.teamCount, 0)
  const totalByes = details.reduce((sum, bracket) => sum + (bracket.slotCount - bracket.teamCount), 0)

  return (
    <div className="bracket-preview-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel()
    }}>
      <section className="bracket-preview" role="dialog" aria-modal="true" aria-labelledby="bracket-preview-title">
        <p className="bracket-preview__eyebrow">Antes de generar</p>
        <h2 id="bracket-preview-title">{title}</h2>
        <div className="bracket-preview__stats">
          <div><strong>{details.length}</strong><span>{details.length === 1 ? 'bracket' : 'brackets'}</span></div>
          <div><strong>{totalTeams}</strong><span>equipos</span></div>
          {totalByes > 0 && <div><strong>{totalByes}</strong><span>BYE en total</span></div>}
        </div>
        <div className="bracket-preview__list">
          {details.map((bracket, index) => {
            const slots = bracket.slotCount ?? bracket.teamCount
            const byes = slots - bracket.teamCount
            return (
              <div className="bracket-preview__row" key={`${bracket.name}-${index}`}>
                <strong>{bracket.name}</strong>
                <span>{bracket.teamCount} equipos · {slots} casillas{byes > 0 ? ` · ${byes} BYE` : ''}</span>
              </div>
            )
          })}
        </div>
        <p className="bracket-preview__detail">{detail || `Se generará un bracket con ${teamCount} equipos.`}</p>
        {warning && <p className="bracket-preview__warning">{warning}</p>}
        <div className="bracket-preview__actions">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>Cancelar</button>
          <button type="button" className="btn" onClick={onConfirm} disabled={busy}>{busy ? 'Generando…' : 'Generar bracket'}</button>
        </div>
      </section>
    </div>
  )
}
