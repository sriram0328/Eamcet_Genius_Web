import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { db } from '../../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm]     = useState({ user: '', pass: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')

    try {
      // Fetch admin credentials from Firestore adminConfig collection
      const snap = await getDoc(doc(db, 'adminConfig', 'credentials'))

      if (!snap.exists()) {
        setError('Admin config not found. Please set up adminConfig in Firestore.')
        setLoading(false)
        return
      }

      const { username, password } = snap.data()

      if (form.user === username && form.pass === password) {
        // Store session token
        sessionStorage.setItem('adminToken', 'ok')
        navigate('/admin')
      } else {
        setError('Invalid admin credentials')
      }
    } catch (err) {
      setError('Error checking credentials: ' + err.message)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-white border-2 border-[#FF6B00] rounded-2xl flex items-center justify-center font-bold text-[#FF6B00] text-xl mx-auto mb-3">A</div>
          <h1 className="text-xl font-bold">Admin Portal</h1>
          <p className="text-gray-500 text-sm mt-1">EamcetGenius Management</p>
        </div>

        <form onSubmit={handleLogin} className="card space-y-4">
          <div>
            <label className="label">Username</label>
            <input className="input" placeholder="admin"
              value={form.user}
              onChange={e => setForm(f => ({ ...f, user: e.target.value }))}
              required/>
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="••••••"
              value={form.pass}
              onChange={e => setForm(f => ({ ...f, pass: e.target.value }))}
              required/>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 rounded-xl p-3">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Checking...' : 'Login as Admin'}
          </button>
        </form>

        <p className="text-center mt-5 text-xs text-gray-600">
          <Link to="/login" className="text-gray-500 hover:text-gray-300">
            ← Back to student login
          </Link>
        </p>
      </div>
    </div>
  )
}
