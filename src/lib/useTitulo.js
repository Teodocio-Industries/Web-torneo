import { useEffect } from 'react'

/** Cambia el título de la pestaña (WCAG 2.4.2: cada página con un título descriptivo). */
export function useTitulo(titulo) {
  useEffect(() => {
    const anterior = document.title
    document.title = titulo ? `${titulo} · Caribe Sports` : 'Caribe Sports'
    return () => { document.title = anterior }
  }, [titulo])
}