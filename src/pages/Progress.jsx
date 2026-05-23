import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import Header    from '../components/Header'
import BottomNav from '../components/BottomNav'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import { Flame, Target, TrendingUp, RotateCcw, BookOpen } from 'lucide-react'

export default function Progress() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const [stats,        setStats]       = useState({ total:0, correct:0, accuracy:0 })
  const [subjectStats, setSubjectStats] = useState([])
  const [weakTopics,   setWeak]        = useState([])
  const [streakDays,   setStreak]      = useState([])
  const [loading,      setLoading]     = useState(true)

  useEffect(() => { if (profile) loadAll() }, [profile])

  async function loadAll() {
    try {
      // ── Practice progress ──
      const progSnap = await getDocs(query(collection(db,'progress'), where('userId','==',profile.id)))
      const prog    = progSnap.docs.map(d => d.data())
      const total   = prog.length
      const correct = prog.filter(p => p.correct).length
      setStats({ total, correct, accuracy: total>0 ? Math.round((correct/total)*100) : 0 })

      // Subject-wise
      const bySub = {}
      prog.forEach(p => {
        if (!p.subject) return
        if (!bySub[p.subject]) bySub[p.subject] = { total:0, correct:0 }
        bySub[p.subject].total++
        if (p.correct) bySub[p.subject].correct++
      })
      setSubjectStats(Object.entries(bySub).map(([name,d]) => ({
        fullName: name,
        accuracy: Math.round((d.correct/d.total)*100),
        total: d.total
      })).sort((a,b) => b.accuracy-a.accuracy))

      // Weak topics
      const byTopic = {}
      prog.forEach(p => {
        if (!p.topicId) return
        if (!byTopic[p.topicId]) byTopic[p.topicId] = { name:p.topicName, subject:p.subject, total:0, correct:0 }
        byTopic[p.topicId].total++
        if (p.correct) byTopic[p.topicId].correct++
      })
      setWeak(Object.values(byTopic)
        .map(t => ({...t, accuracy:Math.round((t.correct/t.total)*100)}))
        .filter(t => t.accuracy<50)
        .sort((a,b) => a.accuracy-b.accuracy)
        .slice(0,5))

      // ── Streak calendar from taskCompletions (new system) ──
      const compSnap = await getDocs(query(collection(db,'taskCompletions'), where('userId','==',profile.id)))
      const allComps = compSnap.docs.map(d => d.data())

      // Also load taskPlans to know how many tasks per day
      const planSnap = await getDocs(collection(db,'taskPlans'))
      const allPlans = planSnap.docs.map(d => ({ id:d.id, ...d.data() }))

      // Build doneMap: date → true if all tasks for that day's plan are completed
      const doneMap = {}
      allPlans.forEach(plan => {
        if (!plan.date) return
        // Check if student's stream matches
        if (plan.stream !== 'ALL' && plan.stream !== profile.stream) return
        const planComps = allComps.filter(c => c.planId === plan.id && c.completed)
        const completedTopicIds = new Set(planComps.map(c => c.topicId))
        const allDone = plan.tasks?.length > 0 && plan.tasks.every(t => completedTopicIds.has(t.topicId))
        if (allDone) doneMap[plan.date] = true
      })

      // Build 30-day grid
      const days = Array.from({length:30}, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29-i))
        const key = d.toISOString().split('T')[0]
        return { date:key, day:d.getDate(), completed:!!doneMap[key] }
      })
      setStreak(days)

    } catch(err) {
      console.error('Progress error:', err)
    } finally {
      setLoading(false)
    }
  }

  const chartData = [{ name:'Accuracy', value:stats.accuracy, fill:'#FF6B00' }]

  if (!loading && stats.total===0) return (
    <div className="page">
      <Header/>
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-bold mb-2">No data yet</h2>
        <p className="text-gray-400 text-sm mb-6">Start practicing to see your progress here.</p>
        <button onClick={() => navigate('/practice')} className="btn-primary flex items-center gap-2 mx-auto">
          <BookOpen size={16}/> Start Practicing
        </button>
      </div>
      <BottomNav/>
    </div>
  )

  return (
    <div className="page">
      <Header/>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h2 className="text-xl font-bold">Your Progress</h2>

        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin"/>
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        ) : (
          <>
            {/* Overall accuracy ring */}
            <div className="card flex items-center gap-6">
              <div className="w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={chartData} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={10} background={{ fill:'#2a2a2a' }}/>
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-4xl font-bold text-[#FF6B00]">{stats.accuracy}%</p>
                <p className="text-gray-400 text-sm">Overall Accuracy</p>
                <div className="flex gap-4 mt-3">
                  <div><p className="text-green-400 font-semibold">{stats.correct}</p><p className="text-xs text-gray-500">Correct</p></div>
                  <div><p className="text-red-400 font-semibold">{stats.total-stats.correct}</p><p className="text-xs text-gray-500">Wrong</p></div>
                  <div><p className="font-semibold">{stats.total}</p><p className="text-xs text-gray-500">Total</p></div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {icon:Flame,      val:profile?.streak??0,   label:'Day Streak', cls:'text-[#FF6B00]'},
                {icon:Target,     val:stats.total,          label:'Practiced',  cls:'text-blue-400'},
                {icon:TrendingUp, val:`${stats.accuracy}%`, label:'Accuracy',   cls:'text-green-400'}
              ].map(({icon:Icon,val,label,cls})=>(
                <div key={label} className="card text-center">
                  <Icon size={18} className={`${cls} mx-auto mb-1`}/>
                  <p className={`text-xl font-bold ${cls}`}>{val}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Subject-wise */}
            {subjectStats.length>0&&(
              <section>
                <h3 className="font-semibold mb-3">Subject-wise Accuracy</h3>
                <div className="card space-y-4">
                  {subjectStats.map(s=>(
                    <div key={s.fullName}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium">{s.fullName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{s.total} Qs</span>
                          <span className={`text-sm font-bold ${s.accuracy>=70?'text-green-400':s.accuracy>=50?'text-yellow-400':'text-red-400'}`}>{s.accuracy}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-[#2a2a2a] rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all duration-700 ${s.accuracy>=70?'bg-green-500':s.accuracy>=50?'bg-yellow-500':'bg-red-500'}`} style={{width:`${s.accuracy}%`}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Weak topics */}
            {weakTopics.length>0&&(
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2"><span className="text-red-400">⚠</span> Weak Topics</h3>
                <div className="space-y-2">
                  {weakTopics.map((t,i)=>(
                    <div key={i} className="card flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.subject}</p>
                        <div className="w-24 bg-[#2a2a2a] rounded-full h-1 mt-1.5"><div className="bg-red-500 h-1 rounded-full" style={{width:`${t.accuracy}%`}}/></div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <div className="text-right"><p className="text-red-400 font-bold text-sm">{t.accuracy}%</p><p className="text-xs text-gray-500">{t.correct}/{t.total}</p></div>
                        <button onClick={()=>navigate(`/practice?subject=${encodeURIComponent(t.subject)}`)}
                          className="flex items-center gap-1 text-[#FF6B00] text-xs font-medium bg-[#FF6B00]/10 px-3 py-1.5 rounded-lg hover:bg-[#FF6B00]/20">
                          <RotateCcw size={11}/> Practice
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {weakTopics.length===0&&stats.total>0&&(
              <div className="card text-center border-green-500/20 bg-green-500/5">
                <p className="text-green-400 font-semibold text-lg">🎉 No weak topics!</p>
                <p className="text-gray-400 text-sm mt-1">You're scoring above 50% in everything. Keep it up!</p>
              </div>
            )}

            {/* Calendar */}
            <section>
              <h3 className="font-semibold mb-3">Daily Practice — Last 30 Days</h3>
              <div className="card">
                <div className="grid grid-cols-10 gap-1.5">
                  {streakDays.map((d,i)=>(
                    <div key={i} title={d.date}
                      className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-medium ${d.completed?'bg-[#FF6B00] text-white':'bg-[#2a2a2a] text-gray-600'}`}>
                      {d.day}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#FF6B00]"/><span className="text-xs text-gray-500">Completed</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#2a2a2a]"/><span className="text-xs text-gray-500">Missed</span></div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
      <BottomNav/>
    </div>
  )
}