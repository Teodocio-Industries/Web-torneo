import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [myPlayers, setMyPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) {
      console.error(error)
      return null
    }
    setProfile(data)
    return data
  }, [])

  const loadMyPlayers = useCallback(async (profileId) => {
    if (!profileId) {
      setMyPlayers([])
      return
    }
    const { data } = await supabase
      .from('players')
      .select('*, teams(id,name,flag_url), tournaments(id,name)')
      .eq('profile_id', profileId)
    setMyPlayers(data || [])
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      if (session) {
        const p = await loadProfile(session.user.id)
        await loadMyPlayers(p?.id)
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        const p = await loadProfile(newSession.user.id)
        await loadMyPlayers(p?.id)
      } else {
        setProfile(null)
        setMyPlayers([])
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = {
    session,
    profile,
    myPlayers,
    loading,
    login,
    logout,
    isAdmin: profile?.role === 'admin',
    isJugador: profile?.role === 'jugador',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
