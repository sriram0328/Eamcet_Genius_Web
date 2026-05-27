import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'
import { collection, getDocs, doc, addDoc, serverTimestamp, query, where } from 'firebase/firestore'
import Header    from '../components/Header'
import BottomNav from '../components/BottomNav'
import { Clock, ChevronRight, Trophy, Target, BookOpen, Calendar, SkipForward, CheckCircle, XCircle, BarChart2 } from 'lucide-react'

const TEST_TYPES = [
  { key:'topic',   label:'Topic-wise',   icon:BookOpen,  color:'text-blue-400',   bg:'bg-blue-500/10'   },
  { key:'subject', label:'Subject-wise', icon:Target,    color:'text-purple-400', bg:'bg-purple-500/10' },
  { key:'weekly',  label:'Weekly',       icon:Calendar,  color:'text-green-400',  bg:'bg-green-500/10'  },
  { key:'monthly', label:'Monthly',      icon:Trophy,    color:'text-yellow-400', bg:'bg-yellow-500/10' },
  { key:'full',    label:'Full EAMCET',  icon:Trophy,    color:'text-[#FF6B00]',  bg:'bg-[#FF6B00]/10'  }
]

export default function MockTests() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const timerRef    = useRef(null)

  const [tests,    setTests]    = useState([])
  const [filter,   setFilter]   = useState('all')
  const [active,   setActive]   = useState(null)
  const [questions,setQues]     = useState([])
  const [qIndex,   setQIndex]   = useState(0)
  const [chosen,   setChosen]   = useState(null)
  const [answers,  setAnswers]  = useState([])
  const [timer,    setTimer]    = useState(0)
  const [done,     setDone]     = useState(false)
  const [rank,     setRank]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [showReview, setShowReview] = useState(false)

  useEffect(() => { fetchTests() }, [])
  useEffect(() => () => clearInterval(timerRef.current), [])

  async function fetchTests() {
    const snap = await getDocs(collection(db,'mockTests'))
    setTests(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    setLoading(false)
  }

  async function startTest(test) {
    setLoading(true)
    const q    = query(collection(db,'mockTestQuestions'), where('mockTestId','==',test.id))
    const snap = await getDocs(q)
    const qIds = snap.docs.map(d => d.data().questionId)
    let allQs  = []
    for (let i = 0; i < qIds.length; i += 10) {
      const batch  = qIds.slice(i, i+10)
      const qSnap  = await getDocs(query(collection(db,'questions'), where('__name__','in',batch)))
      allQs.push(...qSnap.docs.map(d => ({ id:d.id, ...d.data() })))
    }
    // Shuffle
    allQs = allQs.sort(() => Math.random() - 0.5)
    setQues(allQs)
    setActive(test)
    setQIndex(0); setChosen(null); setAnswers([]); setDone(false); setRank(null); setShowReview(false)
    const secs = (test.durationMins ?? 60) * 60
    setTimer(secs)
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0 }
        return t - 1
      })
    }, 1000)
    setLoading(false)
  }

 
function handleAnswer(opt) {
  setChosen(opt)
}

function handleSkip() {
  const q = questions[qIndex]

  const updatedAnswers = [...answers]

  updatedAnswers[qIndex] = {
    q,
    chosen: null,
    correct: false,
    skipped: true
  }

  setAnswers(updatedAnswers)

  if (qIndex + 1 >= questions.length) {
    clearInterval(timerRef.current)
    finishTest(updatedAnswers)
    return
  }

  const nextIndex = qIndex + 1
  setQIndex(nextIndex)

  const nextAnswer = updatedAnswers[nextIndex]

  if (nextAnswer) {
    setChosen(nextAnswer.chosen)
  } else {
    setChosen(null)
  }
}

function prevQ() {
  if (qIndex === 0) return

  const prevIndex = qIndex - 1
  const prevAnswer = answers[prevIndex]

  setQIndex(prevIndex)

  if (prevAnswer) {
    setChosen(prevAnswer.chosen)
  } else {
    setChosen(null)
  }
}

function nextQ() {
  const q = questions[qIndex]

  const updatedAnswers = [...answers]

  updatedAnswers[qIndex] = {
    q,
    chosen,
    correct: chosen === q.correctAnswer,
    skipped: false
  }

  setAnswers(updatedAnswers)

  if (qIndex + 1 >= questions.length) {
    clearInterval(timerRef.current)
    finishTest(updatedAnswers)
    return
  }

  const nextIndex = qIndex + 1

  setQIndex(nextIndex)

  const nextAnswer = updatedAnswers[nextIndex]

  if (nextAnswer) {
    setChosen(nextAnswer.chosen)
  } else {
    setChosen(null)
  }
}
  async function finishTest(ans) {
    setDone(true)
    const correct = ans.filter(a => a.correct).length
    await addDoc(collection(db,'mockTestResults'), {
      userId: profile.id, mockTestId: active.id, testTitle: active.title,
      score: correct, total: questions.length, completedAt: serverTimestamp()
    })
    if (active.type === 'full') {
      setRank(Math.round(150000 - ((correct/questions.length) * 140000)))
    }
  }

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const timerUrgent = timer < 300 && timer > 0

  const filtered = filter==='all' ? tests : tests.filter(t=>t.type===filter)

  // ── RESULTS SCREEN ──
  if (done && active) {
    const correct  = answers.filter(a=>a.correct).length
    const skipped  = answers.filter(a=>a.skipped).length
    const wrong    = answers.filter(a=>!a.correct&&!a.skipped).length
    const accuracy = answers.filter(a=>!a.skipped).length > 0
      ? Math.round((correct/(answers.length-skipped))*100) : 0

    return (
      <div className="page">
        <Header/>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">{accuracy>=70?'🏆':accuracy>=50?'📚':'💪'}</div>
            <h2 className="text-2xl font-bold mb-1">{active.title}</h2>
            <p className="text-gray-600 text-sm">Test completed!</p>
          </div>

          {/* Score grid */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label:'Correct',  val:correct,   cls:'text-green-400'  },
              { label:'Wrong',    val:wrong,     cls:'text-red-400'    },
              { label:'Skipped',  val:skipped,   cls:'text-yellow-400' },
              { label:'Accuracy', val:`${accuracy}%`, cls:accuracy>=70?'text-green-400':accuracy>=50?'text-yellow-400':'text-red-400' }
            ].map(({label,val,cls})=>(
              <div key={label} className="card text-center p-3">
                <p className={`text-xl font-bold ${cls}`}>{val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Rank prediction for full mock */}
          {rank && (
            <div className="card border-[#FF6B00]/20 bg-[#FF6B00]/5 mb-5 text-center">
              <Trophy size={24} className="text-[#FF6B00] mx-auto mb-2"/>
              <p className="text-sm text-gray-600">Predicted EAMCET Rank</p>
              <p className="text-3xl font-bold text-[#FF6B00]">~{rank.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Based on previous year patterns</p>
            </div>
          )}

          {/* Review toggle */}
          <button onClick={() => setShowReview(!showReview)}
            className="w-full card flex items-center justify-between hover:border-[#FF6B00]/30 transition-colors mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-[#FF6B00]"/>
              <span className="font-semibold text-sm">Review All Questions</span>
            </div>
            <span className="text-xs text-gray-500">{showReview ? 'Hide ▲' : 'Show ▼'}</span>
          </button>

          {showReview && (
            <div className="space-y-3 mb-5 max-h-96 overflow-y-auto pr-1">
              {answers.map((a,i) => (
                <div key={i} className={`rounded-xl p-4 border ${a.skipped?'border-yellow-500/20 bg-yellow-500/5':a.correct?'border-green-500/20 bg-green-500/5':'border-red-500/20 bg-red-500/5'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.skipped?'bg-yellow-500/20 text-yellow-400':a.correct?'bg-green-500/20 text-green-400':'bg-red-500/20 text-red-400'}`}>
                      Q{i+1} {a.skipped?'Skipped':a.correct?'✓ Correct':'✗ Wrong'}
                    </span>
                    <span className="badge bg-[#FF6B00]/10 text-[#FF6B00] text-xs">{a.q.subject}</span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{a.q.questionText}</p>
                  {!a.skipped && (
                    <div className="text-xs space-y-0.5">
                      {!a.correct && <p className="text-red-400">Your answer: {a.chosen}</p>}
                      <p className="text-green-400">Correct: {a.q.correctAnswer}</p>
                      {a.q.explanation && <p className="text-gray-500 mt-1 italic">💡 {a.q.explanation}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setActive(null); setDone(false) }} className="btn-outline flex-1">Back to Tests</button>
            <button onClick={() => navigate('/')} className="btn-primary flex-1">Home</button>
          </div>
        </div>
        <BottomNav/>
      </div>
    )
  }

  // ── ACTIVE TEST ──
  if (active && questions.length > 0) {
    const q    = questions[qIndex]
    const opts = [q.optionA, q.optionB, q.optionC, q.optionD]
    const answeredCount = answers.filter(a => a).length

    return (
      <div className="page">
        {/* Sticky test header */}
        <div className="sticky top-0 bg-[#f8fafc]/95 backdrop-blur border-b border-[#e5e7eb] px-4 py-3 z-50">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate max-w-[180px]">{active.title}</p>
              <p className="text-xs text-gray-500">{qIndex+1}/{questions.length} · {answeredCount} answered</p>
            </div>
            {/* Timer — always visible */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold text-sm ${timerUrgent ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-[#FF6B00]/10 text-[#FF6B00]'}`}>
              <Clock size={14}/> {fmt(timer)}
            </div>
          </div>
          {/* Progress bar */}
          <div className="max-w-2xl mx-auto mt-2">
            <div className="w-full bg-[#f1f5f9] rounded-full h-1">
              <div className="bg-[#FF6B00] h-1 rounded-full transition-all"
                style={{ width:`${((qIndex)/questions.length)*100}%` }}/>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-5">
          {/* Q number + subject tag */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-bold text-[#FF6B00]">Q{qIndex+1}</span>
            <span className="badge bg-[#FF6B00]/10 text-[#FF6B00] text-xs">{q.subject}</span>
            <span className="badge bg-[#f1f5f9] text-gray-600 text-xs">{q.topicName}</span>
          </div>

          <div className="card mb-4">
            <p className="font-medium leading-relaxed">{q.questionText}</p>
          </div>

          <div className="space-y-3 mb-5">
  {opts.map((opt,i) => (
    <button
      key={i}
      onClick={() => handleAnswer(opt)}
      className={`w-full card flex items-center gap-3 text-left transition-all duration-200 ${
        chosen === opt
          ? 'border-[#FF6B00] bg-[#FF6B00]/10 scale-[1.01]'
          : 'hover:border-[#FF6B00]/30'
      }`}
    >
      <span
        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
          chosen === opt
            ? 'bg-[#FF6B00] text-white'
            : 'bg-[#f1f5f9]'
        }`}
      >
        {['A','B','C','D'][i]}
      </span>

      <span className="text-sm flex-1">
        {opt}
      </span>

      {chosen === opt && (
        <CheckCircle
          size={18}
          className="text-[#FF6B00] shrink-0"
        />
      )}
    </button>
  ))}
</div>

          <div className="flex gap-3">

  <button
    onClick={prevQ}
    disabled={qIndex===0}
    className="px-4 py-3 rounded-xl border border-[#e5e7eb] text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
  >
    Previous
  </button>

  {chosen === null && (
    <button
      onClick={handleSkip}
      className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#e5e7eb] text-gray-600 hover:border-yellow-500/40 hover:text-yellow-400 text-sm transition-colors"
    >
      <SkipForward size={15}/>
      Skip
    </button>
  )}

  <button
    onClick={nextQ}
    disabled={!chosen}
    className="btn-primary flex-1"
  >
    {qIndex + 1 >= questions.length
      ? 'Finish Test'
      : 'Next Question'}
  </button>

</div>
        </div>
      </div>
    )
  }

  // ── LISTING ──
  return (
    <div className="page">
      <Header/>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-5">Mock Tests</h2>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          <button onClick={()=>setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${filter==='all'?'bg-[#FF6B00] text-white':'bg-white text-gray-600 border border-[#e5e7eb]'}`}>
            All Tests
          </button>
          {TEST_TYPES.map(({key,label,icon:Icon,color,bg})=>(
            <button key={key} onClick={()=>setFilter(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${filter===key?'bg-[#FF6B00] text-white':`${bg} ${color} border border-transparent`}`}>
              <Icon size={12}/> {label}
            </button>
          ))}
        </div>

        {loading
          ? <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="card h-16 animate-pulse bg-[#f1f5f9]"/>)}</div>
          : (
            <div className="space-y-3">
              {filtered.length===0 && (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-gray-600 font-medium">No tests available yet</p>
                  <p className="text-gray-600 text-sm mt-1">Admin will add tests soon</p>
                </div>
              )}
              {filtered.map(t => {
                const typeInfo = TEST_TYPES.find(x=>x.key===t.type)
                const Icon     = typeInfo?.icon || BookOpen
                return (
                  <button key={t.id} onClick={() => startTest(t)}
                    className="w-full card flex items-center justify-between hover:border-[#FF6B00]/50 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeInfo?.bg||'bg-[#f1f5f9]'}`}>
                        <Icon size={18} className={typeInfo?.color||'text-gray-600'}/>
                      </div>
                      <div>
                        <p className="font-semibold">{t.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`badge text-xs ${typeInfo?.bg} ${typeInfo?.color}`}>{t.type}</span>
                          <span className="flex items-center gap-1 text-xs text-gray-500"><Clock size={10}/> {t.durationMins} min</span>
                          <span className="text-xs text-gray-500">{t.totalQuestions} Qs</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-500 shrink-0"/>
                  </button>
                )
              })}
            </div>
          )
        }
      </div>
      <BottomNav/>
    </div>
  )
}

