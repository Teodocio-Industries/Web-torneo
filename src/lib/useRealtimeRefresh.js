import { useEffect } from 'react'
import { supabase } from './supabaseClient'

// Se suscribe a cambios (insert/update/delete) en una o varias tablas y
// ejecuta `onChange` cada vez que algo cambia, para mantener la pantalla
// actualizada en tiempo real sin que el usuario tenga que recargar.
export function useRealtimeRefresh(tables, onChange, deps = []) {
  useEffect(() => {
    if (!tables || !tables.length) return undefined
    const channel = supabase.channel(`rt-${tables.join('-')}-${Math.random().toString(36).slice(2)}`)
    tables.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        onChange()
      })
    })
    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}