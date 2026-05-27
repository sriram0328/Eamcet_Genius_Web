import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await login(form)
      navigate('/')
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim())
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#FF6B00] rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto mb-3 select-none">EG</div>
          <h1 className="text-2xl font-bold">Welcome back!</h1>
          <p className="text-gray-500 text-sm mt-1">Login to continue your prep</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required/>
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="••••••" value={form.password} onChange={set('password')} required/>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-xl p-3">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <p className="text-center text-sm text-gray-500">
            New here?{' '}
            <Link to="/register" className="text-[#FF6B00] hover:underline">Create account</Link>
          </p>
        </form>

        <p className="text-center mt-5 text-xs text-gray-600">
          Admin?{' '}
          <Link to="/admin/login" className="text-gray-600 underline">Admin login</Link>
        </p>
      </div>
    </div>
  )
}


