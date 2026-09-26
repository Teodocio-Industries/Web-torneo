import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../components/Toast/Toast'
import { useConfirm } from '../../components/ConfirmDialog/ConfirmDialog'
import { computeQualifiers, buildQualifiedBracketRows, isValidBracketSize, suggestGroupFormat } from '../../lib/bracket'

const TIER_LABEL = {
  group_winner: '1° de grupo',
  runner_up: '2° de grupo',
  best_other: 'Mejor 3° (clasifica)',
  eliminado: 'Eliminado',
}

function tierBadgeClass(tier) {
  if (tier === 'group_winner' || tier === 'runner_up') return 'badge ok'
  if (tier === 'best_other') return 'badge status-avanzo'
  return 'badge san'
}

export default function AdminGrupos({ selectedId, teams, standings, matches, reloadData }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [perGroup, setPerGroup] = useState(2)
  const [bestThirds, setBestThirds] = useState(2)
  const [busy, setBusy] = useState(false)

  const result = useMemo(() => {
    if (!standings.length) return null
    try {
      return computeQualifiers(standings, { perGroup: +perGroup || 2, bestThirds: +bestThirds || 0 })
    } catch {
      return null
    }
  }, [standings, perGroup, bestThirds])

  // Asistente: según cuántos equipos tiene el torneo sugiere el reparto
  // de grupos + cuántos clasifican por grupo + mejores "otros" para llegar
  // a potencia de 2. Solo se calcula si aún no se han escrito standings y
  // los campos están en sus valores por defecto (2 / 2) — así no pisa lo
  // que el admin haya ajustado a mano.
  const suggestion = useMemo(() => {
    if (!selectedId || !teams.length) return null
    if (standings.length) return null
    if (+perGroup !== 2 || +bestThirds !== 2) return null
    return suggestGroupFormat(teams.length)
  }, [selectedId, teams.length, standings.length, perGroup, bestThirds])

  function applySuggestion() {
    if (!suggestion) return
    setPerGroup(suggestion.perGroup)
    setBestThirds(suggestion.bestOthers)
    toast(`Formato aplicado: ${suggestion.totalGroups} grupos de ${suggestion.groupSize}, ${suggestion.perGroup} clasifican por grupo + ${suggestion.bestOthers} mejores terceros`, 'ok')
  }

  if (!selectedId) return <div className="empty">Selecciona un torneo primero.</div>

  function teamName(id) {
    return teams.find((t) => t.id === id)?.name || standings.find((s) => s.team_id === id)?.teams?.name || 'Equipo'
  }

  async function handleGenerate() {
    if (!result) return
    const total = result.qualifiers.length
    if (!isValidBracketSize(total)) {
      toast(`Con esta configuración clasifican ${total} equipos, y debe ser potencia de 2 (2, 4, 8, 16…). Ajusta "mejores terceros" o revisa que todos los grupos tengan filas en la Tabla.`, 'err')
      return
    }
    const ok = await confirm(
      `Se generará el cuadro de eliminación (Cuartos → Semifinal → Final) con los ${total} equipos clasificados, ya ubicados según su cruce, y se reemplazará cualquier bracket existente. Los equipos no clasificados quedarán marcados como eliminados. ¿Continuar?`,
      { title: 'Generar cuadro de eliminación' }
    )
    if (!ok) return
    setBusy(true)
    try {
      await supabase.from('bracket_matches').delete().eq('tournament_id', selectedId)
      const rows = buildQualifiedBracketRows(selectedId, result.qualifiers)
      const { error } = await supabase.from('bracket_matches').insert(rows)
      if (error) throw error

      const qualifiedIds = new Set(result.qualifiers.map((q) => q.team_id))
      const eliminatedIds = result.eliminated.map((e) => e.team_id)
      await Promise.all([
        ...eliminatedIds.map((id) => supabase.from('teams').update({ status: 'eliminado' }).eq('id', id)),
        ...[...qualifiedIds].map((id) => supabase.from('teams').update({ status: null }).eq('id', id)),
      ])

      await reloadData()
      toast('Cuadro de eliminación generado a partir de la fase de grupos', 'ok')
    } catch (e) {
      toast('Error: ' + e.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="card">
        <h3>Clasificación desde la fase de grupos</h3>
        <p className="mini">
          Usa las filas cargadas en la pestaña <strong>Tabla</strong> (agrupadas por "Grupo") para calcular
          automáticamente quién clasifica: los primeros de cada grupo, más los mejores terceros (u otra
          posición) necesarios para completar una potencia de 2. Pensado para, por ejemplo, 12 equipos en
          3 grupos de 4, donde clasifican los dos primeros de cada grupo (6) más los 2 mejores terceros (8
          en total) para jugar Cuartos de final.
        </p>
        <div className="form-grid">
          <div className="field">
            <label>Clasifican por grupo</label>
            <input type="number" min={1} value={perGroup} onChange={(e) => setPerGroup(e.target.value)} />
          </div>
          <div className="field">
            <label>Mejores "otros" que también clasifican</label>
            <input type="number" min={0} value={bestThirds} onChange={(e) => setBestThirds(e.target.value)} />
          </div>
        </div>
        {suggestion && (
          <div className="card" style={{ background: 'var(--panel-2)', marginTop: 12 }}>
            <p className="mini" style={{ margin: 0 }}>
              Tienes <strong>{teams.length}</strong> equipos en este torneo. Una configuración habitual sería{' '}
              <strong>{suggestion.totalGroups} grupos de {suggestion.groupSize}</strong>: clasifican los{' '}
              <strong>{suggestion.perGroup} primeros</strong> de cada grupo ({suggestion.totalGroups * suggestion.perGroup})
              {' '}más los <strong>{suggestion.bestOthers} mejores terceros</strong>, para un total de{' '}
              <strong>{suggestion.totalQualifiers}</strong> clasificados.
            </p>
            <button type="button" className="btn small" onClick={applySuggestion} style={{ marginTop: 8 }}>
              Aplicar formato sugerido
            </button>
          </div>
        )}
        {matches.length > 0 && (
          <p className="mini" style={{ color: 'var(--rojo, #ff4d4d)' }}>
            Ya existe un bracket para este torneo. Generar aquí lo reemplazará por completo.
          </p>
        )}
      </div>

      {!standings.length && (
        <div className="empty">Aún no hay filas en la Tabla de posiciones. Cárgalas primero en Admin → Tabla.</div>
      )}

      {result && Object.entries(result.groups).map(([groupName, rows]) => (
        <div className="card" key={groupName}>
          <h3>{groupName}</h3>
          <table>
            <thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th><th>Estado</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const isBestCandidate = row.position === (+perGroup || 2) + 1
                const inBest = result.qualifiers.some((q) => q.team_id === row.team_id && q.tier === 'best_other')
                const tier = row.position <= (+perGroup || 2) ? (row.position === 1 ? 'group_winner' : 'runner_up') : (inBest ? 'best_other' : 'eliminado')
                return (
                  <tr key={row.id || row.team_id}>
                    <td>{row.position}</td>
                    <td>{row.teams?.name || teamName(row.team_id)}</td>
                    <td>{row.pj}</td><td>{row.pg}</td><td>{row.pe}</td><td>{row.pp}</td>
                    <td>{row.gf}</td><td>{row.gc}</td><td>{row.pts}</td>
                    <td>
                      <span className={tierBadgeClass(tier)}>
                        {isBestCandidate && !inBest ? 'Candidato a mejor 3°' : TIER_LABEL[tier]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      {result && result.qualifiers.length > 0 && (
        <div className="card">
          <h3>Clasificados a la siguiente ronda ({result.qualifiers.length})</h3>
          <p className="mini">Orden de sembrado (define los cruces de la primera ronda del cuadro de eliminación):</p>
          <ol>
            {result.qualifiers.map((q) => (
              <li key={q.team_id}>
                {teamName(q.team_id)} — <span className="mini">{q.group_name} · {TIER_LABEL[q.tier]}</span>
              </li>
            ))}
          </ol>
          <button className="btn" onClick={handleGenerate} disabled={busy}>
            {busy ? 'Generando…' : 'Generar bracket de eliminación con estos clasificados'}
          </button>
        </div>
      )}
    </>
  )
}