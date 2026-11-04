import './BracketGenerationPreview.css'

export default function BracketGenerationPreview({
  open,
  teamCount,
  slotCount = teamCount,
  title = 'Resumen del bracket',
  detail,
  warning,
  busy = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null

  return (
    <div className="bracket-preview-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel()
    }}>
      <section className="bracket-preview" role="dialog" aria-modal="true" aria-labelledby="bracket-preview-title">
        <p className="bracket-preview__eyebrow">Antes de generar</p>
        <h2 id="bracket-preview-title">{title}</h2>
        <div className="bracket-preview__stats">
          <div><strong>1</strong><span>bracket</span></div>
          <div><strong>{teamCount}</strong><span>equipos</span></div>
          {slotCount !== teamCount && <div><strong>{slotCount}</strong><span>casillas primera ronda</span></div>}
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
