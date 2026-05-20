import { useNavigate, useLocation } from 'react-router-dom'
import { Home, BookOpen, ClipboardList, TrendingUp } from 'lucide-react'

const nav = [
  { label: 'Home',     icon: Home,         path: '/'           },
  { label: 'Practice', icon: BookOpen,      path: '/practice'   },
  { label: 'Tests',    icon: ClipboardList, path: '/mock-tests' },
  { label: 'Progress', icon: TrendingUp,    path: '/progress'   }
]

export default function BottomNav() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f0f] border-t border-[#2a2a2a] safe-area-pb">
      <div className="max-w-2xl mx-auto flex">
        {nav.map(({ label, icon: Icon, path }) => {
          const active = pathname === path
          return (
            <button key={path} onClick={() => navigate(path)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${active ? 'text-[#FF6B00]' : 'text-gray-600 hover:text-gray-300'}`}>
              <Icon size={20}/>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
