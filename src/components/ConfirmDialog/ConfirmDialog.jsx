import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import './ConfirmDialog.css'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolver.current = resolve
      setDialog({
        message,
        title: options.title || 'Confirmar acción',
        confirmLabel: options.confirmLabel || 'Sí, continuar',
        cancelLabel: options.cancelLabel || 'Cancelar',
        danger: options.danger !== false,
      })
    })
  }, [])

  const cancelarRef = useRef(null)
  const previoFoco = useRef(null)

  useEffect(() => {
    if (!dialog) return undefined
    previoFoco.current = document.activeElement
    cancelarRef.current?.focus() // el botón seguro (Cancelar) recibe el foco primero
    const alTeclear = (e) => { if (e.key === 'Escape') close(false) }
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      previoFoco.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog])

  function close(result) {
    setDialog(null)
    if (resolver.current) {
      resolver.current(result)
      resolver.current = null
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="confirm-overlay" onMouseDown={() => close(false)}>
          <div className="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="confirm-titulo" aria-describedby="confirm-mensaje" onMouseDown={(e) => e.stopPropagation()}>
            <h3 id="confirm-titulo">{dialog.title}</h3>
            <p id="confirm-mensaje">{dialog.message}</p>
            <div className="confirm-box__actions">
              <button ref={cancelarRef} className="btn ghost" onClick={() => close(false)}>{dialog.cancelLabel}</button>
              <button className={`btn ${dialog.danger ? 'danger' : ''}`} onClick={() => close(true)}>{dialog.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>')
  return ctx
}