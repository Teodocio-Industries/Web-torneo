import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const roles = new Set(['jugador', 'usuario', 'admin'])

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Método no permitido' }, 405)

  try {
    const authorization = request.headers.get('Authorization') || ''
    const token = authorization.replace(/^Bearer\s+/i, '')
    if (!token) return response({ error: 'Sesión no válida' }, 401)

    const url = Deno.env.get('SUPABASE_URL') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const admin = createClient(url, serviceKey)
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData.user) return response({ error: 'Sesión no válida' }, 401)

    const { data: caller } = await admin.from('profiles').select('role').eq('id', userData.user.id).single()
    if (caller?.role !== 'admin') return response({ error: 'Solo un administrador puede gestionar cuentas' }, 403)

    const body = await request.json()
    const action = body?.action
    const userId = String(body?.user_id || '')
    if (!userId) return response({ error: 'Falta la cuenta a gestionar' }, 400)

    if (action === 'delete') {
      if (userId === userData.user.id) return response({ error: 'No puedes eliminar tu propia cuenta' }, 400)
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) throw error
      await admin.from('profiles').delete().eq('id', userId)
      return response({ ok: true })
    }

    if (action !== 'update') return response({ error: 'Acción no válida' }, 400)
    const fullName = String(body?.full_name || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    const role = String(body?.role || '')
    const password = body?.password ? String(body.password) : ''
    const teamId = body?.team_id || null

    if (!fullName || !email || !roles.has(role)) return response({ error: 'Datos de cuenta inválidos' }, 400)
    if (password && password.length < 10) return response({ error: 'La contraseña debe tener al menos 10 caracteres' }, 400)
    if (userId === userData.user.id && role !== 'admin') return response({ error: 'No puedes quitarte tu propio rol de administrador' }, 400)

    if (teamId) {
      const { data: team, error: teamError } = await admin.from('teams').select('tournament_id').eq('id', teamId).single()
      if (teamError || !team) return response({ error: 'El equipo seleccionado no existe' }, 400)
      const { data: tournament } = await admin.from('tournaments').select('is_active').eq('id', team.tournament_id).single()
      if (!tournament?.is_active) return response({ error: 'El equipo debe pertenecer al torneo activo' }, 400)
    }

    const authChanges: Record<string, string> = { email }
    if (password) authChanges.password = password
    const { error: authError } = await admin.auth.admin.updateUserById(userId, authChanges)
    if (authError) throw authError

    const { error: profileError } = await admin.from('profiles').update({ full_name: fullName, email, role, team_id: teamId }).eq('id', userId)
    if (profileError) throw profileError
    return response({ ok: true })
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : 'No se pudo gestionar la cuenta' }, 500)
  }
})
