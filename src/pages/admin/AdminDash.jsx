import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../lib/firebase'
import {
  collection, getDocs, doc, updateDoc, setDoc, addDoc,
  query, orderBy, serverTimestamp, deleteDoc, where
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { Users, BookOpen, LogOut, RefreshCw, CheckCircle, XCircle, Trash2, Upload, Calendar, Plus } from 'lucide-react'

const TABS     = ['Users', 'Subscriptions', 'Daily Tasks', 'Questions', 'Topics', 'Mock Tests', 'Bulk Register']
const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology']

const DEFAULT_TOPICS = [
  { name:'Sets, Relations and Functions',  subject:'Mathematics' },
  { name:'Complex Numbers',                subject:'Mathematics' },
  { name:'Matrices and Determinants',      subject:'Mathematics' },
  { name:'Quadratic Equations',            subject:'Mathematics' },
  { name:'Permutations and Combinations',  subject:'Mathematics' },
  { name:'Binomial Theorem',               subject:'Mathematics' },
  { name:'Straight Lines',                 subject:'Mathematics' },
  { name:'Limits and Continuity',          subject:'Mathematics' },
  { name:'Differentiation',               subject:'Mathematics' },
  { name:'Integration',                    subject:'Mathematics' },
  { name:'Units and Measurements',         subject:'Physics' },
  { name:'Motion in a Straight Line',      subject:'Physics' },
  { name:'Laws of Motion',                 subject:'Physics' },
  { name:'Work, Energy and Power',         subject:'Physics' },
  { name:'Gravitation',                    subject:'Physics' },
  { name:'Thermodynamics',                 subject:'Physics' },
  { name:'Electrostatics',                 subject:'Physics' },
  { name:'Current Electricity',            subject:'Physics' },
  { name:'Magnetism',                      subject:'Physics' },
  { name:'Optics',                         subject:'Physics' },
  { name:'Atomic Structure',               subject:'Chemistry' },
  { name:'Chemical Bonding',               subject:'Chemistry' },
  { name:'States of Matter',               subject:'Chemistry' },
  { name:'Electrochemistry',               subject:'Chemistry' },
  { name:'Organic Chemistry Basics',       subject:'Chemistry' },
  { name:'Hydrocarbons',                   subject:'Chemistry' },
  { name:'Polymers',                       subject:'Chemistry' },
  { name:'Cell Biology',                   subject:'Biology' },
  { name:'Genetics and Heredity',          subject:'Biology' },
  { name:'Plant Physiology',               subject:'Biology' },
  { name:'Human Physiology',               subject:'Biology' },
  { name:'Ecology',                        subject:'Biology' },
  { name:'Biotechnology',                  subject:'Biology' }
]

export default function AdminDash() {
  const navigate = useNavigate()
  const [tab,   setTab]   = useState('Users')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ users: 0, subscribed: 0, questions: 0 })

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const [uSnap, qSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'questions'))
    ])
    const u = uSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    setUsers(u)
    const practiceCount = qSnap.docs.filter(d => d.data().source !== 'mocktest').length
    setStats({ users: u.length, subscribed: u.filter(x => x.isSubscribed).length, questions: practiceCount })
  }

  function handleLogout() {
    sessionStorage.removeItem('adminToken')
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF6B00] rounded-lg flex items-center justify-center font-bold text-sm select-none">EG</div>
          <span className="font-bold">EamcetGenius Admin</span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <LogOut size={15}/> Logout
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label:'Total Students', value: stats.users,      icon: Users,       cls:'text-blue-400'  },
            { label:'Subscribed',     value: stats.subscribed,  icon: CheckCircle, cls:'text-green-400' },
            { label:'Practice Qs',    value: stats.questions,   icon: BookOpen,    cls:'text-[#FF6B00]' }
          ].map(({ label, value, icon:Icon, cls }) => (
            <div key={label} className="card">
              <Icon size={20} className={`${cls} mb-2`}/>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab===t ? 'bg-[#FF6B00] text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab==='Users'         && <UsersTab users={users} onRefresh={loadStats}/>}
        {tab==='Subscriptions' && <SubsTab  users={users} onRefresh={loadStats}/>}
        {tab==='Daily Tasks'   && <DailyTasksTab/>}
        {tab==='Questions'     && <QuestionsTab/>}
        {tab==='Topics'        && <TopicsTab/>}
        {tab==='Mock Tests'    && <MockTestsTab/>}
        {tab==='Bulk Register' && <BulkTab/>}
      </div>
    </div>
  )
}

// ════════════ USERS TAB ════════════
function UsersTab({ users, onRefresh }) {
  const [search, setSearch] = useState('')
  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input className="input flex-1" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}/>
        <button onClick={onRefresh} className="btn-outline flex items-center gap-2 text-sm"><RefreshCw size={14}/> Refresh</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-gray-400 text-xs">
              {['Name','Email','Stream','Year','Streak','Status'].map(h => (
                <th key={h} className="text-left py-3 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-[#2a2a2a]/50 hover:bg-[#2a2a2a]/20">
                <td className="py-3 pr-4 font-medium">{u.username}</td>
                <td className="py-3 pr-4 text-gray-400 text-xs">{u.email}</td>
                <td className="py-3 pr-4"><span className="badge bg-[#FF6B00]/10 text-[#FF6B00]">{u.stream}</span></td>
                <td className="py-3 pr-4 text-gray-400">Yr {u.yearOfStudy}</td>
                <td className="py-3 pr-4 text-[#FF6B00] font-medium">🔥{u.streak ?? 0}</td>
                <td className="py-3">
                  <span className={`badge ${u.isSubscribed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {u.isSubscribed ? 'Pro' : 'Free'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-500 py-8">No users found</p>}
      </div>
    </div>
  )
}

// ════════════ SUBSCRIPTIONS TAB ════════════
function SubsTab({ users, onRefresh }) {
  const [sel,    setSel]    = useState(null)
  const [form,   setForm]   = useState({ plan:'monthly', start:'', end:'', isSubscribed: true })
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState('')

  function calculateEndDate(startDate, plan) {
    if (!startDate) return ''
    const start = new Date(startDate)
    start.setDate(start.getDate() + (plan === 'yearly' ? 365 : 30))
    return start.toISOString().split('T')[0]
  }

  function selectUser(u) {
    const today = new Date().toISOString().split('T')[0]
    const plan  = u.subscriptionPlan || 'monthly'
    const start = u.subscriptionStart || today
    const end   = u.subscriptionEnd   || calculateEndDate(start, plan)
    setSel(u); setForm({ plan, start, end, isSubscribed: u.isSubscribed ?? false }); setMsg('')
  }

  function handlePlanChange(newPlan) { setForm(f => ({ ...f, plan: newPlan, end: calculateEndDate(f.start, newPlan) })) }
  function handleStartChange(newStart) { setForm(f => ({ ...f, start: newStart, end: calculateEndDate(newStart, f.plan) })) }

  async function save() {
    if (!sel) return
    setSaving(true)
    await updateDoc(doc(db, 'users', sel.id), {
      isSubscribed: form.isSubscribed, subscriptionPlan: form.plan,
      subscriptionStart: form.start||null, subscriptionEnd: form.end||null
    })
    setMsg('✅ Saved!'); setSaving(false); onRefresh()
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="text-sm text-gray-400 mb-3">Select a student:</p>
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {users.map(u => (
            <button key={u.id} onClick={() => selectUser(u)}
              className={`w-full card flex items-center justify-between text-left transition-colors ${sel?.id===u.id ? 'border-[#FF6B00]' : 'hover:border-[#FF6B00]/30'}`}>
              <div><p className="font-medium text-sm">{u.username}</p><p className="text-xs text-gray-500">{u.email}</p></div>
              <span className={`badge text-xs ${u.isSubscribed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{u.isSubscribed ? 'Pro' : 'Free'}</span>
            </button>
          ))}
        </div>
      </div>
      {sel && (
        <div className="card">
          <h3 className="font-semibold mb-1">Edit: {sel.username}</h3>
          <p className="text-xs text-gray-500 mb-4">{sel.email}</p>
          <div className="space-y-4">
            <div>
              <label className="label">Plan</label>
              <div className="flex gap-2">
                {[['monthly','Monthly — ₹299 (30 days)'],['yearly','Yearly — ₹2999 (365 days)']].map(([val,label]) => (
                  <button key={val} type="button" onClick={() => handlePlanChange(val)}
                    className={`flex-1 py-3 px-3 rounded-xl text-sm font-semibold border-2 transition-all text-left ${form.plan===val ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]' : 'border-[#2a2a2a] text-gray-400'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Start Date</label><input type="date" className="input" value={form.start} onChange={e => handleStartChange(e.target.value)}/></div>
              <div><label className="label">End Date</label><input type="date" className="input" value={form.end} readOnly/></div>
            </div>
            {form.start && form.end && (
              <div className="flex items-center gap-2 bg-[#FF6B00]/5 border border-[#FF6B00]/20 rounded-xl px-4 py-3">
                <span className="text-[#FF6B00] text-lg">📅</span>
                <div>
                  <p className="text-sm font-medium text-[#FF6B00]">{form.plan === 'yearly' ? '365 days' : '30 days'} subscription</p>
                  <p className="text-xs text-gray-400">
                    {new Date(form.start).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    {' → '}
                    {new Date(form.end).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isSub" checked={form.isSubscribed} onChange={e => setForm(f=>({...f,isSubscribed:e.target.checked}))} className="w-4 h-4 accent-[#FF6B00]"/>
              <label htmlFor="isSub" className="text-sm cursor-pointer">Active Subscription</label>
            </div>
            {msg && <p className="text-green-400 text-sm">{msg}</p>}
            <button onClick={save} disabled={saving} className="btn-primary w-full">{saving ? 'Saving...' : 'Update Subscription'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════ DAILY TASKS TAB (NEW) ════════════
function DailyTasksTab() {
  const [topics,        setTopics]        = useState([])
  const [plans,         setPlans]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [msg,           setMsg]           = useState('')
  const [view,          setView]          = useState('list')
  const [editPlan,      setEditPlan]      = useState(null)

  // Form state
  const [selDate,   setSelDate]   = useState(new Date().toISOString().split('T')[0])
  const [selStream, setSelStream] = useState('MPC')
  const [tasks,     setTasks]     = useState([]) // [{subject, topicId, topicName}]

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [topSnap, planSnap] = await Promise.all([
      getDocs(collection(db, 'topics')),
      getDocs(collection(db, 'taskPlans'))
    ])
    const loadedTopics = topSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    setTopics(loadedTopics)
    setPlans(planSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.date.localeCompare(a.date)))
    setLoading(false)
    return loadedTopics  // return so startCreate can use immediately
  }

  async function startCreate() {
    setMsg('')
    setTopicsLoading(true)
    const topSnap = await getDocs(collection(db, 'topics'))
    setTopics(topSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setTopicsLoading(false)
    setSelDate(new Date().toISOString().split('T')[0])
    setSelStream('MPC')
    setTasks([])
    setEditPlan(null)
    setView('create')
  }

  async function startEdit(plan) {
    setMsg('')
    setTopicsLoading(true)
    const topSnap = await getDocs(collection(db, 'topics'))
    setTopics(topSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setTopicsLoading(false)
    setSelDate(plan.date)
    setSelStream(plan.stream)
    setTasks(plan.tasks || [])
    setEditPlan(plan)
    setView('create')
  }

  function addTask() {
    const defaultSub = subjectsForStream[tasks.length % subjectsForStream.length] || subjectsForStream[0]
    setTasks(t => [...t, { subject: defaultSub, topicId: '', topicName: '' }])
  }

  function removeTask(i) {
    setTasks(t => t.filter((_, idx) => idx !== i))
  }

  function updateTask(i, field, value) {
    setTasks(prev => prev.map((t, idx) => {
      if (idx !== i) return t
      if (field === 'topicId') {
        const topic = topics.find(tp => tp.id === value)
        return { ...t, topicId: value, topicName: topic?.name || '', subject: topic?.subject || t.subject }
      }
      return { ...t, [field]: value }
    }))
  }

  async function savePlan() {
    if (!selDate) { setMsg('❌ Please select a date'); return }
    if (tasks.length === 0) { setMsg('❌ Add at least one task'); return }
    if (tasks.some(t => !t.topicId)) { setMsg('❌ All tasks must have a topic selected'); return }

    setSaving(true); setMsg('')
    try {
      const data = {
        date: selDate,
        stream: selStream,
        tasks: tasks,
        updatedAt: serverTimestamp()
      }
      if (editPlan) {
        await updateDoc(doc(db, 'taskPlans', editPlan.id), data)
        setMsg('✅ Plan updated!')
      } else {
        await addDoc(collection(db, 'taskPlans'), { ...data, createdAt: serverTimestamp() })
        setMsg('✅ Plan created!')
      }
      await loadAll()
      setTimeout(() => { setView('list'); setMsg('') }, 1500)
    } catch(err) { setMsg('❌ ' + err.message) }
    setSaving(false)
  }

  async function deletePlan(id) {
    if (!confirm('Delete this task plan?')) return
    await deleteDoc(doc(db, 'taskPlans', id))
    loadAll()
  }

  const streamTopics = topics.filter(t =>
    selStream === 'ALL' ? true :
    selStream === 'MPC' ? ['Mathematics','Physics','Chemistry'].includes(t.subject) :
    ['Biology','Physics','Chemistry'].includes(t.subject)
  )

  const subjectsForStream = selStream === 'MPC'
    ? ['Mathematics','Physics','Chemistry']
    : selStream === 'BIPC' ? ['Biology','Physics','Chemistry']
    : ['Mathematics','Physics','Chemistry','Biology']

  if (view === 'create') return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('list')} className="text-gray-400 hover:text-white text-sm">← Back</button>
        <h3 className="font-semibold text-lg">{editPlan ? 'Edit Task Plan' : 'Create Task Plan'}</h3>
      </div>

      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date <span className="text-red-400">*</span></label>
            <input type="date" className="input" value={selDate} onChange={e => setSelDate(e.target.value)}/>
          </div>
          <div>
            <label className="label">Stream <span className="text-red-400">*</span></label>
            <div className="flex gap-2 mt-1">
              {['MPC','BIPC','ALL'].map(s => (
                <button key={s} type="button" onClick={() => { setSelStream(s); setTasks([]) }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${selStream===s ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]' : 'border-[#2a2a2a] text-gray-500'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="label mb-0">Tasks (Topics to practice)</label>
            <button onClick={addTask} className="flex items-center gap-1.5 text-[#FF6B00] text-sm font-medium bg-[#FF6B00]/10 px-3 py-1.5 rounded-lg hover:bg-[#FF6B00]/20 transition-colors">
              <Plus size={14}/> Add Topic
            </button>
          </div>

          {tasks.length === 0 && (
            <div className="border-2 border-dashed border-[#2a2a2a] rounded-xl p-6 text-center">
              <Calendar size={24} className="text-gray-600 mx-auto mb-2"/>
              <p className="text-gray-500 text-sm">No tasks yet. Click "Add Topic" to assign topics for this day.</p>
            </div>
          )}

          <div className="space-y-3">
            {tasks.map((task, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
                <div className="w-7 h-7 bg-[#FF6B00]/20 rounded-lg flex items-center justify-center text-[#FF6B00] font-bold text-xs shrink-0">{i+1}</div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {/* Step 1: pick subject */}
                  <select className="input py-2 text-sm"
                    value={task.subject || ''}
                    onChange={e => setTasks(prev => prev.map((t,idx) =>
                      idx===i ? { ...t, subject: e.target.value, topicId:'', topicName:'' } : t
                    ))}>
                    <option value="">Subject...</option>
                    {subjectsForStream.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {/* Step 2: pick topic filtered by subject */}
                  <select className="input py-2 text-sm"
                    value={task.topicId}
                    onChange={e => updateTask(i, 'topicId', e.target.value)}
                    disabled={!task.subject}>
                    <option value="">{topicsLoading ? 'Loading topics...' : 'Select topic...'}</option>
                    {!topicsLoading && topics
                      .filter(t => t.subject === task.subject)
                      .sort((a,b) => a.name.localeCompare(b.name))
                      .map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                    }
                  </select>
                  {task.topicName && (
                    <p className="text-xs text-gray-500 col-span-2 pl-1">
                      ✓ {task.subject} — {task.topicName}
                    </p>
                  )}
                </div>
                <button onClick={() => removeTask(i)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 size={15}/>
                </button>
              </div>
            ))}
          </div>
        </div>

        {msg && <p className={`text-sm p-3 rounded-xl ${msg.startsWith('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{msg}</p>}

        <div className="flex gap-3">
          <button onClick={() => setView('list')} className="btn-outline flex-1">Cancel</button>
          <button onClick={savePlan} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving...' : editPlan ? '💾 Update Plan' : '✅ Create Plan'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Daily Task Plans</h3>
          <p className="text-xs text-gray-500 mt-0.5">Define which topics students practice each day</p>
        </div>
        <button onClick={startCreate} className="btn-primary flex items-center gap-2">
          <Plus size={15}/> Create Plan
        </button>
      </div>

      {loading && <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin"/></div>}

      {!loading && plans.length === 0 && (
        <div className="card text-center py-12">
          <Calendar size={40} className="text-gray-600 mx-auto mb-3"/>
          <p className="font-medium text-gray-400">No task plans yet</p>
          <p className="text-xs text-gray-600 mt-1 mb-4">Create a plan to assign specific topics for students to practice each day</p>
          <button onClick={startCreate} className="btn-primary mx-auto flex items-center gap-2"><Plus size={14}/> Create First Plan</button>
        </div>
      )}

      <div className="space-y-3">
        {plans.map(plan => {
          const isToday = plan.date === new Date().toISOString().split('T')[0]
          const isPast  = plan.date < new Date().toISOString().split('T')[0]
          return (
            <div key={plan.id} className={`card border ${isToday ? 'border-[#FF6B00]/40 bg-[#FF6B00]/5' : 'border-[#2a2a2a]'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-semibold">
                      {new Date(plan.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
                    </span>
                    {isToday && <span className="badge bg-[#FF6B00]/20 text-[#FF6B00] text-xs">Today</span>}
                    {isPast && !isToday && <span className="badge bg-gray-500/10 text-gray-500 text-xs">Past</span>}
                    <span className={`badge text-xs ${plan.stream==='MPC'?'bg-blue-500/10 text-blue-400':plan.stream==='BIPC'?'bg-green-500/10 text-green-400':'bg-purple-500/10 text-purple-400'}`}>
                      {plan.stream}
                    </span>
                    <span className="text-xs text-gray-500">{plan.tasks?.length || 0} topics</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(plan.tasks || []).map((t, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-[#2a2a2a] rounded-lg px-2.5 py-1.5">
                        <span className="text-[#FF6B00] text-xs font-medium">{t.subject?.slice(0,4)}</span>
                        <span className="text-gray-300 text-xs">{t.topicName}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(plan)} className="text-xs text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors">✏️ Edit</button>
                  <button onClick={() => deletePlan(plan.id)} className="text-gray-600 hover:text-red-400 p-1.5 transition-colors"><Trash2 size={14}/></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ════════════ QUESTIONS TAB ════════════
function QuestionsTab() {
  const [topics,      setTopics]      = useState([])
  const [questions,   setQuestions]   = useState([])
  const [filterSub,   setFilterSub]   = useState('All')
  const [filterTop,   setFilterTop]   = useState('All')
  const [saving,      setSaving]      = useState(false)
  const [msg,         setMsg]         = useState('')
  const [editId,      setEditId]      = useState(null)
  const [showForm,    setShowForm]    = useState(false)
  const [mode,        setMode]        = useState('single')
  const [bulkRows,    setBulkRows]    = useState([])
  const [bulkFile,    setBulkFile]    = useState(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResults, setBulkResults] = useState([])
  const [form, setForm] = useState({ topicId:'', subject:'', topicName:'', questionText:'', optionA:'', optionB:'', optionC:'', optionD:'', correctAnswer:'', explanation:'', difficulty:'Easy' })

  useEffect(() => { loadTopics(); loadQuestions() }, [])

  async function loadTopics() {
    const snap = await getDocs(collection(db,'topics'))
    setTopics(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.subject.localeCompare(b.subject)))
  }
  async function loadQuestions() {
    const snap = await getDocs(collection(db,'questions'))
    setQuestions(snap.docs.map(d=>({id:d.id,...d.data()})).filter(q=>q.source!=='mocktest'))
  }
  async function handleExcelUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setBulkFile(file.name); setBulkResults([])
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs')
    const wb = XLSX.read(await file.arrayBuffer())
    setBulkRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval:'' }))
  }
  async function uploadBulkQuestions() {
    if (!bulkRows.length) return
    setBulkLoading(true); setBulkResults([])
    const res = []
    for (const row of bulkRows) {
      const topicName=String(row['topic_name']||'').trim(), subject=String(row['subject']||'').trim()
      const t = topics.find(t=>t.name.toLowerCase()===topicName.toLowerCase()&&t.subject.toLowerCase()===subject.toLowerCase())
      if (!t) { res.push({q:topicName,status:'error',msg:`Topic not found`}); continue }
      const optA=String(row['option_a']||'').trim(),optB=String(row['option_b']||'').trim(),optC=String(row['option_c']||'').trim(),optD=String(row['option_d']||'').trim()
      const correctAnswer=String(row['correct_answer']||'').trim()
      if (![optA,optB,optC,optD].includes(correctAnswer)){res.push({q:String(row['question_text']).slice(0,50),status:'error',msg:'correct_answer must match an option'});continue}
      try {
        await addDoc(collection(db,'questions'),{topicId:t.id,subject:t.subject,topicName:t.name,source:'practice',questionText:String(row['question_text']||'').trim(),optionA:optA,optionB:optB,optionC:optC,optionD:optD,correctAnswer,explanation:String(row['explanation']||'').trim(),difficulty:String(row['difficulty']||'Easy').trim(),createdAt:serverTimestamp()})
        res.push({q:String(row['question_text']).slice(0,50),status:'success'})
      } catch(err){res.push({q:String(row['question_text']).slice(0,50),status:'error',msg:err.message})}
    }
    const ok=res.filter(r=>r.status==='success').length
    setBulkResults(res);setMsg(`✅ ${ok}/${bulkRows.length} uploaded!`);setBulkRows([]);setBulkFile(null);loadQuestions();setBulkLoading(false)
    setTimeout(()=>setMsg(''),5000)
  }
  function resetForm(){setForm({topicId:'',subject:'',topicName:'',questionText:'',optionA:'',optionB:'',optionC:'',optionD:'',correctAnswer:'',explanation:'',difficulty:'Easy'});setEditId(null);setShowForm(false)}
  function handleTopicChange(topicId){const t=topics.find(t=>t.id===topicId);setForm(f=>({...f,topicId,subject:t?.subject||'',topicName:t?.name||''}))}
  async function saveQuestion(e){
    e.preventDefault()
    if(!form.topicId){setMsg('❌ Select a topic');return}
    if(!form.correctAnswer){setMsg('❌ Mark the correct answer');return}
    setSaving(true);setMsg('')
    try{
      const data={topicId:form.topicId,subject:form.subject,topicName:form.topicName,source:'practice',questionText:form.questionText,optionA:form.optionA,optionB:form.optionB,optionC:form.optionC,optionD:form.optionD,correctAnswer:form.correctAnswer,explanation:form.explanation,difficulty:form.difficulty,updatedAt:serverTimestamp()}
      if(editId){await updateDoc(doc(db,'questions',editId),data);setMsg('✅ Updated!')}
      else{await addDoc(collection(db,'questions'),{...data,createdAt:serverTimestamp()});setMsg('✅ Added!')}
      loadQuestions();resetForm()
    }catch(err){setMsg('❌ '+err.message)}
    setSaving(false);setTimeout(()=>setMsg(''),3000)
  }
  function editQuestion(q){setForm({topicId:q.topicId,subject:q.subject,topicName:q.topicName,questionText:q.questionText,optionA:q.optionA,optionB:q.optionB,optionC:q.optionC,optionD:q.optionD,correctAnswer:q.correctAnswer,explanation:q.explanation||'',difficulty:q.difficulty});setEditId(q.id);setShowForm(true);setMode('single');window.scrollTo({top:0,behavior:'smooth'})}
  async function deleteQuestion(id){if(!confirm('Delete?'))return;await deleteDoc(doc(db,'questions',id));loadQuestions()}

  const subjects=['All',...new Set(topics.map(t=>t.subject))]
  const topicNames=['All',...topics.filter(t=>filterSub==='All'||t.subject===filterSub).map(t=>t.name)]
  const filtered=questions.filter(q=>(filterSub==='All'||q.subject===filterSub)&&(filterTop==='All'||q.topicName===filterTop))
  const diffColor={Easy:'text-green-400 bg-green-500/10',Medium:'text-yellow-400 bg-yellow-500/10',Hard:'text-red-400 bg-red-500/10'}

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex gap-2">
        {[['single','✏️ Add Single'],['bulk','📊 Bulk Upload']].map(([key,label])=>(
          <button key={key} onClick={()=>{setMode(key);setShowForm(key==='single');setMsg('');setBulkResults([])}}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${mode===key?'bg-[#FF6B00] text-white':'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] hover:text-white'}`}>{label}</button>
        ))}
      </div>
      {mode==='bulk'&&(
        <div className="space-y-4">
          <div className="card border-green-500/20 bg-green-500/5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-xl shrink-0">📤</div>
              <div className="flex-1">
                <p className="font-semibold text-green-400 mb-1">Upload Excel File</p>
                <p className="text-gray-400 text-sm mb-3">Columns: topic_name, subject, difficulty, question_text, option_a–d, correct_answer, explanation</p>
                <label className="inline-flex items-center gap-2 bg-[#FF6B00] hover:bg-[#cc5500] text-white font-medium px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors">
                  📤 Choose Excel File<input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden"/>
                </label>
                {bulkFile&&<div className="mt-3 flex items-center gap-2"><span className="text-green-400 text-sm">✅ {bulkFile}</span><span className="text-gray-500 text-xs">({bulkRows.length} rows)</span></div>}
              </div>
            </div>
          </div>
          {bulkRows.length>0&&(
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold">Preview — {bulkRows.length} questions</p>
                <button onClick={uploadBulkQuestions} disabled={bulkLoading} className="btn-primary text-sm px-5 py-2">{bulkLoading?'⏳ Uploading...':`🚀 Upload All`}</button>
              </div>
            </div>
          )}
          {bulkResults.length>0&&(<div className="card max-h-48 overflow-y-auto"><p className="font-semibold mb-2">{bulkResults.filter(r=>r.status==='success').length}/{bulkResults.length} successful</p><div className="space-y-1">{bulkResults.map((r,i)=>(<div key={i} className="flex items-start gap-2 text-sm"><span>{r.status==='success'?'✅':'❌'}</span><span className="text-gray-300">{r.q}</span>{r.msg&&<p className="text-red-400 text-xs">{r.msg}</p>}</div>))}</div></div>)}
          {msg&&<p className={`text-sm p-3 rounded-xl ${msg.startsWith('✅')?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}`}>{msg}</p>}
        </div>
      )}
      {mode==='single'&&(
        <>
          {showForm?(
            <form onSubmit={saveQuestion} className="card space-y-4 border-[#FF6B00]/30">
              <div className="flex items-center justify-between"><h3 className="font-bold">{editId?'✏️ Edit':'➕ Add'} Question</h3><button type="button" onClick={resetForm} className="text-gray-400 text-sm">✕</button></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Topic *</label><select className="input" value={form.topicId} onChange={e=>handleTopicChange(e.target.value)} required><option value="">-- Select --</option>{SUBJECTS.map(sub=>(<optgroup key={sub} label={`── ${sub} ──`}>{topics.filter(t=>t.subject===sub).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>))}</select></div>
                <div><label className="label">Difficulty *</label><div className="flex gap-2 mt-1">{['Easy','Medium','Hard'].map(d=>(<button key={d} type="button" onClick={()=>setForm(f=>({...f,difficulty:d}))} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${form.difficulty===d?d==='Easy'?'border-green-500 bg-green-500/20 text-green-400':d==='Medium'?'border-yellow-500 bg-yellow-500/20 text-yellow-400':'border-red-500 bg-red-500/20 text-red-400':'border-[#2a2a2a] text-gray-500'}`}>{d}</button>))}</div></div>
              </div>
              <div><label className="label">Question *</label><textarea className="input h-20 resize-none text-sm" value={form.questionText} onChange={e=>setForm(f=>({...f,questionText:e.target.value}))} required/></div>
              <div className="space-y-2">{[['A','optionA'],['B','optionB'],['C','optionC'],['D','optionD']].map(([label,key])=>{const isCorrect=form.correctAnswer!==''&&form.correctAnswer===form[key];return(<div key={key} className={`flex items-center gap-3 p-2.5 rounded-xl border-2 ${isCorrect?'border-green-500 bg-green-500/10':'border-[#2a2a2a] bg-[#111]'}`}><button type="button" onClick={()=>{if(form[key].trim())setForm(f=>({...f,correctAnswer:f[key]}))}} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 ${isCorrect?'border-green-500 bg-green-500 text-white':'border-[#444] text-gray-400'}`}>{isCorrect?'✓':label}</button><input className="flex-1 bg-transparent outline-none text-sm" placeholder={`Option ${label}`} value={form[key]} onChange={e=>{const val=e.target.value;setForm(f=>{const u={...f,[key]:val};if(f.correctAnswer===f[key])u.correctAnswer=val;return u})}} required/></div>)})}</div>
              <div><label className="label">Explanation (optional)</label><textarea className="input h-16 resize-none text-sm" value={form.explanation} onChange={e=>setForm(f=>({...f,explanation:e.target.value}))}/></div>
              {msg&&<p className={`text-sm p-3 rounded-xl ${msg.startsWith('✅')?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}`}>{msg}</p>}
              <div className="flex gap-3"><button type="button" onClick={resetForm} className="btn-outline flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Saving...':editId?'💾 Update':'➕ Add'}</button></div>
            </form>
          ):(
            <button onClick={()=>setShowForm(true)} className="btn-primary">➕ Add New Question</button>
          )}
        </>
      )}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-bold">Practice Questions ({filtered.length})</h3>
          <div className="flex gap-2 flex-wrap">
            <select className="input py-1.5 text-sm w-auto" value={filterSub} onChange={e=>{setFilterSub(e.target.value);setFilterTop('All')}}>{subjects.map(s=><option key={s}>{s}</option>)}</select>
            <select className="input py-1.5 text-sm w-auto" value={filterTop} onChange={e=>setFilterTop(e.target.value)}>{topicNames.map(t=><option key={t}>{t}</option>)}</select>
            <button onClick={loadQuestions} className="btn-outline py-1.5 text-sm px-3"><RefreshCw size={13}/></button>
          </div>
        </div>
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {filtered.length===0&&<p className="text-center text-gray-500 py-8">No questions yet.</p>}
          {filtered.map((q,i)=>(
            <div key={q.id} className="border border-[#2a2a2a] rounded-xl p-3 hover:border-[#FF6B00]/30">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs text-gray-500">Q{i+1}</span>
                    <span className="badge bg-[#FF6B00]/10 text-[#FF6B00] text-xs">{q.subject}</span>
                    <span className="badge bg-[#2a2a2a] text-gray-400 text-xs">{q.topicName}</span>
                    <span className={`badge text-xs ${diffColor[q.difficulty]}`}>{q.difficulty}</span>
                  </div>
                  <p className="text-sm font-medium mb-2">{q.questionText}</p>
                  <div className="grid grid-cols-2 gap-1">{[['A',q.optionA],['B',q.optionB],['C',q.optionC],['D',q.optionD]].map(([l,o])=>(<div key={l} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${o===q.correctAnswer?'bg-green-500/15 text-green-400':'text-gray-400'}`}><span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${o===q.correctAnswer?'bg-green-500 text-white':'bg-[#2a2a2a]'}`}>{l}</span><span className="truncate">{o}</span></div>))}</div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={()=>editQuestion(q)} className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">✏️</button>
                  <button onClick={()=>deleteQuestion(q.id)} className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ════════════ TOPICS TAB ════════════
function TopicsTab() {
  const [topics,setTopics]=useState([]);const [form,setForm]=useState({name:'',subject:'Mathematics'});const [msg,setMsg]=useState('');const [seeding,setSeeding]=useState(false)
  useEffect(()=>{loadTopics()},[])
  async function loadTopics(){const snap=await getDocs(collection(db,'topics'));setTopics(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.subject.localeCompare(b.subject)))}
  async function add(e){e.preventDefault();await addDoc(collection(db,'topics'),{...form,createdAt:serverTimestamp()});setMsg('✅ Added!');loadTopics();setForm(f=>({...f,name:''}));setTimeout(()=>setMsg(''),2000)}
  async function seedDefaultTopics(){setSeeding(true);const existing=topics.map(t=>`${t.subject}:${t.name}`.toLowerCase());let added=0;for(const t of DEFAULT_TOPICS){if(!existing.includes(`${t.subject}:${t.name}`.toLowerCase())){await addDoc(collection(db,'topics'),{...t,createdAt:serverTimestamp()});added++}};setMsg(`✅ ${added} seeded!`);loadTopics();setSeeding(false);setTimeout(()=>setMsg(''),3000)}
  async function deleteTopic(id){if(!confirm('Delete this topic?'))return;await deleteDoc(doc(db,'topics',id));loadTopics()}
  return(
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-4">
        <form onSubmit={add} className="card space-y-4">
          <h3 className="font-semibold">Add Topic</h3>
          <div><label className="label">Subject</label><select className="input" value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label className="label">Topic Name</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required placeholder="e.g. Integration"/></div>
          {msg&&<p className="text-green-400 text-sm">{msg}</p>}
          <button type="submit" className="btn-primary w-full">Add Topic</button>
        </form>
        <button onClick={seedDefaultTopics} disabled={seeding} className="btn-outline w-full">{seeding?'Seeding...':'🌱 Seed All Default Topics (33)'}</button>
      </div>
      <div className="card overflow-y-auto max-h-[500px]">
        <h3 className="font-semibold mb-3">All Topics ({topics.length})</h3>
        <div className="space-y-1.5">{topics.map(t=>(<div key={t.id} className="flex items-center justify-between py-2 border-b border-[#2a2a2a]/50"><div><span className="text-sm">{t.name}</span><span className="badge bg-[#FF6B00]/10 text-[#FF6B00] text-xs ml-2">{t.subject}</span></div><button onClick={()=>deleteTopic(t.id)} className="text-gray-600 hover:text-red-400 ml-2"><Trash2 size={13}/></button></div>))}{topics.length===0&&<p className="text-gray-500 text-sm text-center py-6">No topics yet.</p>}</div>
      </div>
    </div>
  )
}

// ════════════ MOCK TESTS TAB ════════════
function MockTestsTab() {
  const [step,setStep]=useState('list');const [tests,setTests]=useState([]);const [selTest,setSelTest]=useState(null);const [topics,setTopics]=useState([]);const [saving,setSaving]=useState(false);const [msg,setMsg]=useState('');const [editId,setEditId]=useState(null);const [addMode,setAddMode]=useState('single');const [showQForm,setShowQForm]=useState(false);const [testQuestions,setTestQuestions]=useState([]);const [bulkRows,setBulkRows]=useState([]);const [bulkFile,setBulkFile]=useState(null);const [bulkLoading,setBulkLoading]=useState(false);const [bulkResults,setBulkResults]=useState([])
  const [qForm,setQForm]=useState({topicId:'',subject:'',topicName:'',questionText:'',optionA:'',optionB:'',optionC:'',optionD:'',correctAnswer:'',explanation:'',difficulty:'Medium'})
  const [form,setForm]=useState({title:'',type:'weekly',durationMins:60,totalQuestions:30})
  const diffColor={Easy:'text-green-400 bg-green-500/10',Medium:'text-yellow-400 bg-yellow-500/10',Hard:'text-red-400 bg-red-500/10'}
  useEffect(()=>{loadTests();loadTopics()},[])
  async function loadTests(){const snap=await getDocs(query(collection(db,'mockTests'),orderBy('createdAt','desc')));setTests(snap.docs.map(d=>({id:d.id,...d.data()})))}
  async function loadTopics(){const snap=await getDocs(collection(db,'topics'));setTopics(snap.docs.map(d=>({id:d.id,...d.data()})))}
  async function loadTestQuestions(testId){const snap=await getDocs(collection(db,'mockTestQuestions'));const qIds=snap.docs.map(d=>d.data()).filter(d=>d.mockTestId===testId).map(d=>d.questionId);if(!qIds.length){setTestQuestions([]);return};const qSnap=await getDocs(collection(db,'questions'));setTestQuestions(qSnap.docs.map(d=>({id:d.id,...d.data()})).filter(q=>qIds.includes(q.id)))}
  function handleTopicChange(topicId){const t=topics.find(t=>t.id===topicId);setQForm(f=>({...f,topicId,subject:t?.subject||'',topicName:t?.name||''}))}
  async function createTest(e){e.preventDefault();const ref=await addDoc(collection(db,'mockTests'),{...form,createdAt:serverTimestamp()});setSelTest({id:ref.id,...form});loadTests();setTestQuestions([]);setStep('addQ');setMsg('')}
  async function saveTestQuestion(e){
    e.preventDefault();if(!qForm.correctAnswer){setMsg('❌ Select correct answer');return};setSaving(true);setMsg('')
    try{const data={topicId:qForm.topicId,subject:qForm.subject,topicName:qForm.topicName,source:'mocktest',questionText:qForm.questionText,optionA:qForm.optionA,optionB:qForm.optionB,optionC:qForm.optionC,optionD:qForm.optionD,correctAnswer:qForm.correctAnswer,explanation:qForm.explanation,difficulty:qForm.difficulty,updatedAt:serverTimestamp()}
    if(editId){await updateDoc(doc(db,'questions',editId),data);setMsg('✅ Updated!')}else{const qRef=await addDoc(collection(db,'questions'),{...data,createdAt:serverTimestamp()});await addDoc(collection(db,'mockTestQuestions'),{mockTestId:selTest.id,questionId:qRef.id,createdAt:serverTimestamp()});await updateDoc(doc(db,'mockTests',selTest.id),{totalQuestions:testQuestions.length+1});setMsg('✅ Added!')}
    setEditId(null);setShowQForm(false);setQForm({topicId:'',subject:'',topicName:'',questionText:'',optionA:'',optionB:'',optionC:'',optionD:'',correctAnswer:'',explanation:'',difficulty:'Medium'});loadTestQuestions(selTest.id);loadTests()
    }catch(err){setMsg('❌ '+err.message)};setSaving(false);setTimeout(()=>setMsg(''),3000)
  }
  async function handleExcelUpload(e){const file=e.target.files[0];if(!file)return;setBulkFile(file.name);setBulkResults([]);const XLSX=await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');const wb=XLSX.read(await file.arrayBuffer());setBulkRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''}))}
  async function uploadBulkToTest(){if(!bulkRows.length)return;setBulkLoading(true);setBulkResults([]);const res=[]
    for(const row of bulkRows){const topicName=String(row['topic_name']||'').trim(),subject=String(row['subject']||'').trim();const t=topics.find(t=>t.name.toLowerCase()===topicName.toLowerCase()&&t.subject.toLowerCase()===subject.toLowerCase());if(!t){res.push({q:topicName,status:'error',msg:`Topic not found`});continue};const optA=String(row['option_a']||'').trim(),optB=String(row['option_b']||'').trim(),optC=String(row['option_c']||'').trim(),optD=String(row['option_d']||'').trim(),correctAnswer=String(row['correct_answer']||'').trim();if(![optA,optB,optC,optD].includes(correctAnswer)){res.push({q:String(row['question_text']).slice(0,50),status:'error',msg:'correct_answer must match'});continue}
    try{const qRef=await addDoc(collection(db,'questions'),{topicId:t.id,subject:t.subject,topicName:t.name,source:'mocktest',questionText:String(row['question_text']||'').trim(),optionA:optA,optionB:optB,optionC:optC,optionD:optD,correctAnswer,explanation:String(row['explanation']||'').trim(),difficulty:String(row['difficulty']||'Medium').trim(),createdAt:serverTimestamp()});await addDoc(collection(db,'mockTestQuestions'),{mockTestId:selTest.id,questionId:qRef.id,createdAt:serverTimestamp()});res.push({q:String(row['question_text']).slice(0,50),status:'success'})}catch(err){res.push({q:String(row['question_text']).slice(0,50),status:'error',msg:err.message})}}
    const ok=res.filter(r=>r.status==='success').length;await updateDoc(doc(db,'mockTests',selTest.id),{totalQuestions:testQuestions.length+ok});setBulkResults(res);setMsg(`✅ ${ok}/${bulkRows.length} added!`);setBulkRows([]);setBulkFile(null);loadTestQuestions(selTest.id);loadTests();setBulkLoading(false);setTimeout(()=>setMsg(''),5000)
  }
  function editTestQ(q){setQForm({topicId:q.topicId,subject:q.subject,topicName:q.topicName,questionText:q.questionText,optionA:q.optionA,optionB:q.optionB,optionC:q.optionC,optionD:q.optionD,correctAnswer:q.correctAnswer,explanation:q.explanation||'',difficulty:q.difficulty});setEditId(q.id);setShowQForm(true);setAddMode('single')}
  async function deleteTestQ(qId){if(!confirm('Remove?'))return;await deleteDoc(doc(db,'questions',qId));loadTestQuestions(selTest.id)}

  if(step==='list')return(<div className="space-y-4"><button onClick={()=>{setStep('create');setMsg('');setForm({title:'',type:'weekly',durationMins:60,totalQuestions:30})}} className="btn-primary">+ Create Mock Test</button><div className="space-y-3">{tests.length===0&&<p className="text-gray-500 text-sm text-center py-8">No mock tests yet.</p>}{tests.map(t=>(<div key={t.id} className="card flex items-center justify-between"><div><p className="font-semibold">{t.title}</p><div className="flex gap-2 mt-1"><span className="badge bg-[#FF6B00]/10 text-[#FF6B00] text-xs">{t.type}</span><span className="text-xs text-gray-500">{t.durationMins}min · {t.totalQuestions} Qs</span></div></div><div className="flex gap-2"><button onClick={()=>{setSelTest(t);setStep('addQ');setShowQForm(false);setAddMode('single');setMsg('');setBulkRows([]);setBulkResults([]);loadTestQuestions(t.id)}} className="btn-outline text-xs px-3 py-2">✏️ Manage</button><button onClick={async()=>{if(confirm('Delete?')){await deleteDoc(doc(db,'mockTests',t.id));loadTests()}}} className="text-gray-600 hover:text-red-400 p-2"><Trash2 size={14}/></button></div></div>))}</div></div>)
  if(step==='create')return(<form onSubmit={createTest} className="card max-w-lg space-y-4"><div className="flex items-center gap-3"><button type="button" onClick={()=>setStep('list')} className="text-gray-400 text-sm">← Back</button><h3 className="font-semibold">Create Mock Test</h3></div><div><label className="label">Title</label><input className="input" placeholder="e.g. Weekly Mock Test — May Week 1" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required/></div><div className="grid grid-cols-2 gap-3"><div><label className="label">Type</label><select className="input" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{['topic','subject','weekly','monthly','full'].map(t=><option key={t}>{t}</option>)}</select></div><div><label className="label">Duration (min)</label><input type="number" className="input" value={form.durationMins} onChange={e=>setForm(f=>({...f,durationMins:+e.target.value}))}/></div></div>{msg&&<p className="text-red-400 text-sm">{msg}</p>}<button type="submit" className="btn-primary w-full">Create & Add Questions →</button></form>)

  return(<div className="space-y-5 max-w-4xl">
    <div className="flex items-center gap-3"><button onClick={()=>{setStep('list');setShowQForm(false);setMsg('');setBulkRows([]);setBulkResults([])}} className="text-gray-400 text-sm">← Back</button><div><h3 className="font-semibold">{selTest?.title}</h3><p className="text-xs text-gray-500">{selTest?.type} · {selTest?.durationMins}min · {testQuestions.length} Qs</p></div></div>
    <div className="flex gap-2">{[['single','✏️ Single'],['excel','📊 Bulk Excel']].map(([key,label])=>(<button key={key} onClick={()=>{setAddMode(key);setShowQForm(key==='single');setMsg('');setBulkResults([])}} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${addMode===key?'bg-[#FF6B00] text-white':'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a]'}`}>{label}</button>))}</div>
    {addMode==='excel'&&(<div className="space-y-3"><div className="card border-green-500/20 bg-green-500/5 flex items-start gap-4"><div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-xl shrink-0">📤</div><div className="flex-1"><p className="font-semibold text-green-400 mb-1">Upload Excel for "{selTest?.title}"</p><label className="inline-flex items-center gap-2 bg-[#FF6B00] text-white px-4 py-2 rounded-lg text-sm cursor-pointer">📤 Choose File<input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden"/></label>{bulkFile&&<div className="mt-2 flex items-center gap-2"><span className="text-green-400 text-sm">✅ {bulkFile}</span><span className="text-gray-500 text-xs">({bulkRows.length} rows)</span></div>}</div></div>{bulkRows.length>0&&<div className="card flex items-center justify-between"><p className="font-semibold">{bulkRows.length} questions ready</p><button onClick={uploadBulkToTest} disabled={bulkLoading} className="btn-primary text-sm px-5 py-2">{bulkLoading?'⏳...':'🚀 Add All'}</button></div>}{bulkResults.length>0&&<div className="card max-h-48 overflow-y-auto"><p className="font-semibold mb-2">{bulkResults.filter(r=>r.status==='success').length}/{bulkResults.length} successful</p><div className="space-y-1">{bulkResults.map((r,i)=>(<div key={i} className="flex gap-2 text-sm"><span>{r.status==='success'?'✅':'❌'}</span><span className="text-gray-300">{r.q}</span></div>))}</div></div>}{msg&&<p className={`text-sm p-3 rounded-xl ${msg.startsWith('✅')?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}`}>{msg}</p>}</div>)}
    {addMode==='single'&&(<>{showQForm?(<form onSubmit={saveTestQuestion} className="card space-y-4 border-[#FF6B00]/30"><div className="flex items-center justify-between"><h3 className="font-semibold">{editId?'✏️ Edit':'➕ New'} Question</h3><button type="button" onClick={()=>{setShowQForm(false);setEditId(null)}} className="text-gray-400 text-sm">✕</button></div><div className="grid grid-cols-2 gap-4"><div><label className="label">Topic *</label><select className="input" value={qForm.topicId} onChange={e=>handleTopicChange(e.target.value)} required><option value="">-- Select --</option>{SUBJECTS.map(sub=>(<optgroup key={sub} label={`── ${sub} ──`}>{topics.filter(t=>t.subject===sub).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>))}</select></div><div><label className="label">Difficulty</label><div className="flex gap-2 mt-1">{['Easy','Medium','Hard'].map(d=>(<button key={d} type="button" onClick={()=>setQForm(f=>({...f,difficulty:d}))} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 ${qForm.difficulty===d?d==='Easy'?'border-green-500 bg-green-500/20 text-green-400':d==='Medium'?'border-yellow-500 bg-yellow-500/20 text-yellow-400':'border-red-500 bg-red-500/20 text-red-400':'border-[#2a2a2a] text-gray-500'}`}>{d}</button>))}</div></div></div><div><label className="label">Question *</label><textarea className="input h-20 resize-none text-sm" value={qForm.questionText} onChange={e=>setQForm(f=>({...f,questionText:e.target.value}))} required/></div><div className="space-y-2">{[['A','optionA'],['B','optionB'],['C','optionC'],['D','optionD']].map(([label,key])=>{const isCorrect=qForm.correctAnswer!==''&&qForm.correctAnswer===qForm[key];return(<div key={key} className={`flex items-center gap-3 p-2.5 rounded-xl border-2 ${isCorrect?'border-green-500 bg-green-500/10':'border-[#2a2a2a] bg-[#111]'}`}><button type="button" onClick={()=>{if(qForm[key].trim())setQForm(f=>({...f,correctAnswer:f[key]}))}} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 ${isCorrect?'border-green-500 bg-green-500 text-white':'border-[#444] text-gray-400'}`}>{isCorrect?'✓':label}</button><input className="flex-1 bg-transparent outline-none text-sm" placeholder={`Option ${label}`} value={qForm[key]} onChange={e=>{const val=e.target.value;setQForm(f=>{const u={...f,[key]:val};if(f.correctAnswer===f[key])u.correctAnswer=val;return u})}} required/></div>)})}</div><div><label className="label">Explanation (optional)</label><textarea className="input h-16 resize-none text-sm" value={qForm.explanation} onChange={e=>setQForm(f=>({...f,explanation:e.target.value}))}/></div>{msg&&<p className={`text-sm p-3 rounded-xl ${msg.startsWith('✅')?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}`}>{msg}</p>}<div className="flex gap-3"><button type="button" onClick={()=>{setShowQForm(false);setEditId(null)}} className="btn-outline flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Saving...':editId?'💾 Update':'➕ Add'}</button></div></form>):(<button onClick={()=>{setShowQForm(true);setEditId(null);setQForm({topicId:'',subject:'',topicName:'',questionText:'',optionA:'',optionB:'',optionC:'',optionD:'',correctAnswer:'',explanation:'',difficulty:'Medium'})}} className="btn-primary">➕ Add Question</button>)}{msg&&!showQForm&&<p className={`text-sm p-3 rounded-xl ${msg.startsWith('✅')?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}`}>{msg}</p>}</>)}
    <div className="card"><h3 className="font-semibold mb-3">Questions ({testQuestions.length})</h3><div className="space-y-3 max-h-[400px] overflow-y-auto">{testQuestions.length===0&&<p className="text-gray-500 text-sm text-center py-6">No questions yet.</p>}{testQuestions.map((q,i)=>(<div key={q.id} className="border border-[#2a2a2a] rounded-xl p-3"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-xs text-gray-500">Q{i+1}</span><span className="badge bg-[#FF6B00]/10 text-[#FF6B00] text-xs">{q.subject}</span><span className="badge bg-[#2a2a2a] text-gray-400 text-xs">{q.topicName}</span><span className={`badge text-xs ${diffColor[q.difficulty]}`}>{q.difficulty}</span></div><p className="text-sm font-medium">{q.questionText}</p></div><div className="flex flex-col gap-1.5 shrink-0"><button onClick={()=>editTestQ(q)} className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">✏️</button><button onClick={()=>deleteTestQ(q.id)} className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">🗑️</button></div></div></div>))}</div></div>
  </div>)
}

// ════════════ BULK REGISTER TAB ════════════
function BulkTab() {
  const [csv,setCsv]=useState('');const [results,setResults]=useState([]);const [loading,setLoading]=useState(false);const auth=getAuth()
  async function bulkRegister(e){e.preventDefault();setLoading(true);setResults([]);const lines=csv.trim().split('\n').slice(1);const res=[];for(const line of lines){if(!line.trim())continue;const[username,email,password,year,stream]=line.split(',').map(s=>s.trim());try{const{user}=await createUserWithEmailAndPassword(auth,email,password);await setDoc(doc(db,'users',user.uid),{username,email,yearOfStudy:year,stream,streak:0,isSubscribed:false,isAdmin:false,createdAt:serverTimestamp()});res.push({email,status:'success'})}catch(err){res.push({email,status:'error',msg:err.message.replace('Firebase: ','').replace(/\(auth\/.*\)/,'').trim()})};};setResults(res);setLoading(false)}
  return(<div className="max-w-2xl space-y-4"><div className="card bg-[#FF6B00]/5 border-[#FF6B00]/20 text-sm space-y-1"><p className="font-medium text-[#FF6B00]">CSV Format:</p><code className="text-gray-400 block">username,email,password,year,stream</code><code className="text-gray-400 block">Ravi Kumar,ravi@email.com,pass123,1,MPC</code></div><form onSubmit={bulkRegister} className="card space-y-4"><h3 className="font-semibold">Bulk Register Students</h3><textarea className="input h-48 resize-none font-mono text-sm" placeholder={"username,email,password,year,stream\nStudent1,s1@email.com,pass123,1,MPC"} value={csv} onChange={e=>setCsv(e.target.value)} required/><button type="submit" disabled={loading} className="btn-primary flex items-center gap-2"><Upload size={15}/>{loading?'Registering...':'Register All Students'}</button></form>{results.length>0&&(<div className="card space-y-2"><p className="font-semibold mb-2">{results.filter(r=>r.status==='success').length}/{results.length} successful</p>{results.map((r,i)=>(<div key={i} className="flex items-start gap-2 text-sm">{r.status==='success'?<CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0"/>:<XCircle size={14} className="text-red-400 mt-0.5 shrink-0"/>}<div><span>{r.email}</span>{r.msg&&<p className="text-xs text-red-400 mt-0.5">{r.msg}</p>}</div></div>))}</div>)}</div>)
}