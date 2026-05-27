import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CheckCircle } from 'lucide-react'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]       = useState({ username: '', email: '', password: '', yearOfStudy: '1', stream: 'MPC' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await register(form)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim())
    } finally { setLoading(false) }
  }

  if (success) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="card text-center max-w-sm w-full">
        <CheckCircle size={56} className="text-green-400 mx-auto mb-4"/>
        <h2 className="text-xl font-bold text-green-400 mb-2">Registered Successfully!</h2>
        <p className="text-gray-600 text-sm">Redirecting you to login...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#FF6B00] rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto mb-3 select-none">EG</div>
          <h1 className="text-2xl font-bold">EamcetGenius</h1>
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Username</label>
            <input className="input" placeholder="Your name" value={form.username} onChange={set('username')} required/>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required/>
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')} required minLength={6}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Year of Study</label>
              <select className="input" value={form.yearOfStudy} onChange={set('yearOfStudy')}>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
              </select>
            </div>
            <div>
              <label className="label">Stream</label>
              <select className="input" value={form.stream} onChange={set('stream')}>
                <option value="MPC">MPC</option>
                <option value="BIPC">BIPC</option>
              </select>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-xl p-3">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-[#FF6B00] hover:underline">Login</Link>
          </p>
        </form>
      </div>
    </div>
  )
}


