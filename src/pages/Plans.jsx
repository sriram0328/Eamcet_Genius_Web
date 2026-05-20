import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { CheckCircle, Star, Zap, Crown, Phone, Mail } from 'lucide-react'

const FEATURES = [
  'Unlimited practice questions',
  'All subjects & topics',
  'Weekly & Monthly mock tests',
  'Full EAMCET mock with rank prediction',
  'Performance analytics & weak topic detection',
  'Daily streak tracking',
  'Detailed explanations for every question'
]

export default function Plans() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [adminContact, setAdminContact] = useState(null)

  useEffect(() => {
    // Fetch admin contact info from Firestore if available
    getDoc(doc(db,'adminConfig','contact')).then(snap => {
      if (snap.exists()) setAdminContact(snap.data())
    }).catch(() => {})
  }, [])

  const isActive = profile?.isSubscribed
  const endDate  = profile?.subscriptionEnd
    ? new Date(profile.subscriptionEnd).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
    : null

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-10">
      <div className="max-w-md mx-auto">

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#FF6B00] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Crown size={28} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold">EamcetGenius Pro</h1>
          <p className="text-gray-400 text-sm mt-2">
            {isActive ? 'Your subscription is active' : 'Subscribe to access all features'}
          </p>
        </div>

        {isActive ? (
          <>
            <div className="card border-[#FF6B00]/30 bg-[#FF6B00]/5 text-center mb-5">
              <CheckCircle size={32} className="text-[#FF6B00] mx-auto mb-2"/>
              <p className="font-semibold text-lg">Subscription Active!</p>
              <p className="text-sm text-gray-400 mt-1 capitalize">{profile.subscriptionPlan} Plan</p>
              {endDate && (
                <div className="mt-3 bg-[#0f0f0f] rounded-xl px-4 py-2">
                  <p className="text-xs text-gray-500">Valid till</p>
                  <p className="font-bold text-[#FF6B00]">{endDate}</p>
                </div>
              )}
              <button onClick={() => navigate('/')} className="btn-primary mt-4 w-full">Go to Home</button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              <div className="card hover:border-[#FF6B00]/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1"><Zap size={16} className="text-[#FF6B00]"/><span className="font-bold">Monthly Plan</span></div>
                    <p className="text-gray-400 text-sm">30 days full access</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#FF6B00]">₹299</p>
                    <p className="text-xs text-gray-500">/month</p>
                  </div>
                </div>
              </div>

              <div className="card border-[#FF6B00] relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF6B00] text-white text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap">
                  Best Value — Save ₹589
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1"><Star size={16} className="text-[#FF6B00]"/><span className="font-bold">Yearly Plan</span></div>
                    <p className="text-gray-400 text-sm">365 days full access</p>
                    <p className="text-xs text-gray-500 mt-1">Just ₹249/month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#FF6B00]">₹2999</p>
                    <p className="text-xs text-gray-500">/year</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card mb-5">
              <p className="font-semibold mb-3">All plans include:</p>
              <div className="space-y-2">
                {FEATURES.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-400 shrink-0"/>
                    <span className="text-sm text-gray-300">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin contact card */}
            <div className="card bg-[#FF6B00]/5 border-[#FF6B00]/20 mb-4">
              <p className="font-semibold text-sm mb-2">📞 Contact Admin to Subscribe</p>
              <p className="text-xs text-gray-400 mb-3">
                Share your registered email with your teacher/admin and they'll activate your subscription instantly.
              </p>
              {adminContact ? (
                <div className="space-y-2">
                  {adminContact.phone && (
                    <a href={`tel:${adminContact.phone}`}
                      className="flex items-center gap-2 text-sm text-[#FF6B00] hover:underline">
                      <Phone size={13}/> {adminContact.phone}
                    </a>
                  )}
                  {adminContact.email && (
                    <a href={`mailto:${adminContact.email}`}
                      className="flex items-center gap-2 text-sm text-[#FF6B00] hover:underline">
                      <Mail size={13}/> {adminContact.email}
                    </a>
                  )}
                  {adminContact.whatsapp && (
                    <a href={`https://wa.me/${adminContact.whatsapp}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-green-400 hover:underline">
                      💬 WhatsApp: {adminContact.whatsapp}
                    </a>
                  )}
                </div>
              ) : (
                <div className="bg-[#1a1a1a] rounded-xl px-3 py-2">
                  <p className="text-xs text-gray-500">Your registered email:</p>
                  <p className="text-sm font-medium text-white mt-0.5">{profile?.email}</p>
                  <p className="text-xs text-gray-600 mt-1">Share this with your admin</p>
                </div>
              )}
            </div>
          </>
        )}

        <button onClick={() => logout().then(() => navigate('/login'))}
          className="w-full mt-2 text-center text-sm text-gray-600 hover:text-gray-400 transition-colors">
          Logout
        </button>
      </div>
    </div>
  )
}