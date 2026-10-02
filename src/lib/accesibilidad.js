/**
 * Asocia automáticamente cada <label> de un `.field` con su control (input/select/textarea).
 *
 * El proyecto tiene decenas de formularios con el patrón
 *   <div class="field"><label>Nombre</label><input …/></div>
 * sin `for`/`id`, por lo que los lectores de pantalla no anuncian la etiqueta y
 * hacer clic en ella no enfoca el campo (WCAG 1.3.1 / 3.3.2). Este observador
 * lo corrige para los formularios actuales y los que se agreguen después.
 */
export function iniciarEtiquetadoAutomatico(raiz = document.body) {
  let contador = 0
  let temporizador = null

  const procesar = () => {
    raiz.querySelectorAll('.field').forEach((campo) => {
      const etiqueta = campo.querySelector(':scope > label')
      const control = campo.querySelector(':scope > input, :scope > select, :scope > textarea')
      if (!etiqueta || !control) return
      if (!control.id) control.id = `campo-auto-${++contador}`
      if (etiqueta.getAttribute('for') !== control.id) etiqueta.setAttribute('for', control.id)
    })
  }

  procesar()
  const observador = new MutationObserver(() => {
    clearTimeout(temporizador)
    temporizador = setTimeout(procesar, 40)
  })
  observador.observe(raiz, { childList: true, subtree: true })
  return () => {
    clearTimeout(temporizador)
    observador.disconnect()
  }
}