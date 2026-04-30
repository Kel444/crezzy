'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user) await supabase.from('profiles').upsert({ id: data.user.id, email, full_name: fullName })
    router.push('/dashboard'); router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #FF6B9D, #FF2D78)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 4px 20px rgba(255,45,120,0.25)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1D1D1F', margin: 0 }}>Crezzy</h1>
          <p style={{ color: '#6E6E73', fontSize: 14, marginTop: 4 }}>Finance créateur</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#1D1D1F', margin: '0 0 4px' }}>Créer un compte</h2>
          <p style={{ color: '#6E6E73', fontSize: 14, marginBottom: 24 }}>Prends le contrôle de tes finances ✨</p>

          {error && <div style={{ background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.15)', color: '#FF3B30', fontSize: 13, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>{error}</div>}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1D1D1F', marginBottom: 6 }}>Nom complet</label>
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="input-field" placeholder="Kel" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1D1D1F', marginBottom: 6 }}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="toi@email.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1D1D1F', marginBottom: 6 }}>Mot de passe</label>
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="input-field" placeholder="8 caractères minimum" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '13px 22px', borderRadius: 12, fontSize: 15 }}>
              {loading ? <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : 'Créer mon compte'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#6E6E73', marginTop: 20 }}>
            Déjà un compte ?{' '}
            <Link href="/login" style={{ color: '#FF2D78', fontWeight: 500, textDecoration: 'none' }}>Se connecter</Link>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
