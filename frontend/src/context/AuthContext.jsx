import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api.get('/users/profile')
        .then(r => setUser(r.data.data.user))
        .catch(() => logout())
        .finally(() => setLoading(false))
    } else { setLoading(false) }
  }, [])

  const _save = (t, u) => {
    localStorage.setItem('token', t)
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`
    setToken(t); setUser(u)
  }

  const login    = async (email, senha) => { const {data} = await api.post('/users/login',    { email, senha });          _save(data.data.token, data.data.user); return data.data.user }
  const googleLogin = async (credential) => { const {data} = await api.post('/users/google', { credential }); _save(data.data.token, data.data.user); return data.data.user }
  const register = async (nome, email, senha) => { const {data} = await api.post('/users/register', { nome, email, senha }); _save(data.data.token, data.data.user); return data.data.user }
  const logout   = () => { localStorage.removeItem('token'); delete api.defaults.headers.common['Authorization']; setToken(null); setUser(null) }

  return <AuthContext.Provider value={{ user, token, loading, login, googleLogin, register, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
