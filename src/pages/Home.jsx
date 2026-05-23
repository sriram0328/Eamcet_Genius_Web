import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { BookOpen, ClipboardList, TrendingUp, Flame, Star, ChevronRight, CheckCircle, AlertTriangle, Calendar } from 'lucide-react'

// taskCompletions: { userId, planId, topicId, date, completed, completedAt }

export default function Home() {
  const { profile, refreshProfile } = useAuth()
  const navigate  = useNavigate()
  const [plan,        setPlan]        = useState(null)   // today's taskPlan doc
  const [completions, setCompletions] = useState({})     // topicId → true/false
  const [loading,     setLoading]     = useState(true)
  const [subExpiring, setSubExpiring] = useState(false)
  const [daysLeft,    setDaysLeft]    = useState(null)

  const today     = new Date().toISOString().split('T')[0]
  const todayDate = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })

  useEffect(() => {
    if (profile) { loadTodayPlan(); checkSubscriptionExpiry() }
  }, [profile])

  function checkSubscriptionExpiry() {
    if (!profile?.subscriptionEnd) return
    const diff = Math.ceil((new Date(profile.subscriptionEnd) - new Date()) / (1000 * 60 * 60 * 24))
    if (diff <= 5 && diff > 0) { setSubExpiring(true); setDaysLeft(diff) }
  }

  async function loadTodayPlan() {
    setLoading(true)
    try {
      // 1. Fetch all taskPlans, filter by today + stream in JS (no composite index)
      const planSnap = await getDocs(collection(db, 'taskPlans'))
      const allPlans = planSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const todayPlan = allPlans.find(p =>
        p.date === today &&
        (p.stream === profile.stream || p.stream === 'ALL')
      )
      setPlan(todayPlan || null)

      if (todayPlan) {
        // 2. Fetch completions for this plan by this user
        const compSnap = await getDocs(
          query(collection(db, 'taskCompletions'), where('userId', '==', profile.id))
        )
        const allComps = compSnap.docs.map(d => d.data()).filter(c => c.planId === todayPlan.id)
        const compMap  = {}
        allComps.forEach(c => { compMap[c.topicId] = c.completed })
        setCompletions(compMap)
      }
    } catch(err) {
      console.error('loadTodayPlan error:', err)
    }
    setLoading(false)
  }

  // Reload when returning from practice
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('refresh') === '1') {
      window.history.replaceState({}, '', '/')
      loadTodayPlan()
      refreshProfile()
    }
  }, [])

  const tasks         = plan?.tasks || []
  const completedCount = tasks.filter(t => completions[t.topicId]).length
  const allDone        = tasks.length > 0 && completedCount === tasks.length

  return (
    <div className="page">
      <Header/>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Subscription expiry warning */}
        {subExpiring && (
          <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-4 py-3">
            <AlertTriangle size={18} className="text-yellow-400 shrink-0"/>
            <div>
              <p className="text-yellow-400 font-semibold text-sm">Subscription expiring soon!</p>
              <p className="text-gray-400 text-xs mt-0.5">Expires in <span className="text-yellow-400 font-bold">{daysLeft} day{daysLeft > 1 ? 's' : ''}</span>. Contact your admin to renew.</p>
            </div>
          </div>
        )}

        {/* Welcome banner */}
        <div className="relative overflow-hidden card border-[#FF6B00]/20 bg-gradient-to-br from-[#FF6B00]/10 to-transparent">
          <div className="absolute -top-6 -right-6 w-28 h-28 bg-[#FF6B00]/10 rounded-full"/>
          <p className="text-gray-400 text-xs">{todayDate}</p>
          <h2 className="text-2xl font-bold mt-1">Hey, {profile?.username}! 👋</h2>
          <p className="text-gray-400 text-sm mt-1">{profile?.stream} · Year {profile?.yearOfStudy}</p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <Flame size={16} className="text-[#FF6B00]"/>
              <span className="font-bold text-[#FF6B00] text-sm">{profile?.streak ?? 0} day streak</span>
            </div>
            {allDone && (
              <div className="flex items-center gap-1.5">
                <CheckCircle size={16} className="text-green-400"/>
                <span className="font-bold text-green-400 text-sm">All done today! 🎉</span>
              </div>
            )}
          </div>
        </div>

        {/* Today's Tasks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Today's Tasks</h3>
            {plan && <span className="text-xs text-gray-500">{completedCount}/{tasks.length} done</span>}
          </div>

          {/* Progress bar */}
          {plan && tasks.length > 0 && (
            <div className="w-full bg-[#2a2a2a] rounded-full h-1.5 mb-4">
              <div className="bg-[#FF6B00] h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount/tasks.length)*100}%` }}/>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="card h-16 animate-pulse bg-[#2a2a2a]"/>)}</div>
          ) : !plan ? (
            // No plan assigned for today
            <div className="card text-center py-8 border-dashed border-[#2a2a2a]">
              <Calendar size={28} className="text-gray-600 mx-auto mb-2"/>
              <p className="text-gray-400 font-medium">No tasks assigned today</p>
              <p className="text-gray-600 text-xs mt-1">Your teacher will assign topics soon</p>
              <button onClick={() => navigate('/practice')} className="mt-4 text-[#FF6B00] text-sm font-medium hover:underline">
                Practice freely →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task, i) => {
                const done = !!completions[task.topicId]
                return (
                  <button key={i}
                    onClick={() => navigate(`/practice?topicId=${task.topicId}&subject=${encodeURIComponent(task.subject)}&planId=${plan.id}&taskIdx=${i}`)}
                    className={`w-full card flex items-center justify-between hover:border-[#FF6B00]/40 transition-colors text-left ${done ? 'opacity-70' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${done ? 'bg-green-500/20 text-green-400' : 'bg-[#FF6B00]/20 text-[#FF6B00]'}`}>
                        {done ? '✓' : task.subject[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{task.topicName}</p>
                        <p className="text-xs text-gray-500">{task.subject} · {done ? 'Completed ✓' : 'Tap to practice'}</p>
                      </div>
                    </div>
                    {done
                      ? <CheckCircle size={18} className="text-green-400"/>
                      : <ChevronRight size={18} className="text-gray-500"/>
                    }
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Quick nav */}
        <section>
          <h3 className="font-semibold text-lg mb-3">Quick Access</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:'Practice',   icon:BookOpen,      path:'/practice',   cls:'from-blue-500/20',   ic:'text-blue-400',   desc:'All subjects & topics' },
              { label:'Mock Tests', icon:ClipboardList, path:'/mock-tests', cls:'from-purple-500/20', ic:'text-purple-400', desc:'Weekly & monthly tests'  },
              { label:'Progress',   icon:TrendingUp,    path:'/progress',   cls:'from-green-500/20',  ic:'text-green-400',  desc:'Your analytics'          },
              { label:'Our Plans',  icon:Star,          path:'/plans',      cls:'from-[#FF6B00]/20',  ic:'text-[#FF6B00]',  desc:'Subscription info'       }
            ].map(({ label, icon:Icon, path, cls, ic, desc }) => (
              <button key={path} onClick={() => navigate(path)}
                className={`card bg-gradient-to-br ${cls} to-transparent border-transparent hover:border-[#FF6B00]/30 transition-all flex flex-col gap-2 items-start text-left`}>
                <Icon size={22} className={ic}/>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

      </div>
      <BottomNav/>
    </div>
  )
}