import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Flame, LogOut, ChevronDown } from 'lucide-react'

export default function Header() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-50 bg-[#f8fafc]/95 backdrop-blur border-b border-[#e5e7eb]">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-[#FF6B00] rounded-lg flex items-center justify-center font-bold text-sm text-white select-none">EG</div>
          <span className="font-bold text-[#FF6B00] hidden sm:block">EamcetGenius</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-[#e5e7eb] rounded-full px-3 py-1.5">
            <Flame size={14} className="text-[#FF6B00]"/>
            <span className="text-sm font-bold text-[#FF6B00]">{profile?.streak ?? 0}</span>
            <span className="text-xs text-gray-500 hidden sm:block">streak</span>
          </div>

          <div className="relative">
            <button onClick={() => setOpen(!open)}
              className="flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-full px-3 py-1.5 hover:border-[#FF6B00]/50 transition-colors">
              <div className="w-6 h-6 bg-[#FF6B00] rounded-full flex items-center justify-center text-xs font-bold text-white select-none">
                {profile?.username?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="text-sm font-medium hidden sm:block max-w-[80px] truncate">{profile?.username}</span>
              <ChevronDown size={13} className="text-gray-600"/>
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
                <div className="absolute right-0 top-12 w-52 card shadow-2xl z-50">
                  <p className="font-semibold truncate">{profile?.username}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{profile?.email}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="badge bg-[#FF6B00]/10 text-[#FF6B00]">{profile?.stream}</span>
                    <span className="badge bg-[#f1f5f9] text-gray-600">Year {profile?.yearOfStudy}</span>
                  </div>
                  <hr className="border-[#e5e7eb] my-3"/>
                  <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 w-full transition-colors">
                    <LogOut size={14}/> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}


