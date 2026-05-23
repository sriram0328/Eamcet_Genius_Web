import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'
import {
  collection, query, where, getDocs,
  doc, setDoc, updateDoc, getDoc, addDoc, increment, serverTimestamp
} from 'firebase/firestore'
import Header    from '../components/Header'
import BottomNav from '../components/BottomNav'
import { ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, Home, SkipForward, BarChart2 } from 'lucide-react'

const SUBJECTS     = { MPC:['Mathematics','Physics','Chemistry'], BIPC:['Biology','Physics','Chemistry'] }
const DIFFICULTIES = ['Easy','Medium','Hard']

export default function Practice() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const [params]     = useSearchParams()

  // URL params — two modes:
  // Mode A (from Today's Tasks): ?topicId=xxx&subject=...&planId=yyy&taskIdx=0
  // Mode B (free practice):      ?subject=... (no topicId)
  const urlTopicId = params.get('topicId')  || null
  const urlSubject = params.get('subject')  || null
  const planId     = params.get('planId')   || null
  const taskIdx    = params.get('taskIdx')  || null

  const [view,      setView]     = useState(urlTopicId ? 'quiz_ready' : urlSubject ? 'topics' : 'subjects')
  const [subject,   setSubject]  = useState(urlSubject)
  const [topics,    setTopics]   = useState([])
  const [topicAccuracy, setTopicAccuracy] = useState({})
  const [selTopic,  setSelTopic] = useState(null)
  const [diff,      setDiff]     = useState('Easy')
  const [qCounts,   setQCounts]  = useState({})
  const [questions, setQues]     = useState([])
  const [qIndex,    setQIndex]   = useState(0)
  const [chosen,    setChosen]   = useState(null)
  const [showExp,   setShowExp]  = useState(false)
  const [answers,   setAnswers]  = useState([])
  const [score,     setScore]    = useState(0)
  const [done,           setDone]          = useState(false)
  const [loading,        setLoading]       = useState(false)
  const [passedThreshold, setPassedThreshold] = useState(false) // ≥60% accuracy for daily task

  // If launched with topicId directly (from daily task), load that topic
  useEffect(() => {
    if (urlTopicId) { loadTopicById(urlTopicId) }
    else if (urlSubject) { fetchTopics(urlSubject) }
  }, [])

  async function loadTopicById(topicId) {
    setLoading(true)
    const snap = await getDocs(collection(db, 'topics'))
    const topic = snap.docs.map(d=>({id:d.id,...d.data()})).find(t => t.id === topicId)
    if (topic) {
      setSelTopic(topic)
      setSubject(topic.subject)
      await fetchQuestionCounts(topicId)
      setView('topics') // show difficulty selector
    }
    setLoading(false)
  }

  async function fetchTopics(sub) {
    setLoading(true)
    const [topicsSnap, progressSnap] = await Promise.all([
      getDocs(query(collection(db,'topics'), where('subject','==',sub))),
      getDocs(query(collection(db,'progress'), where('userId','==',profile.id), where('subject','==',sub)))
    ])
    setTopics(topicsSnap.docs.map(d => ({ id:d.id, ...d.data() })))
    const acc = {}
    progressSnap.docs.forEach(d => {
      const p = d.data()
      if (!acc[p.topicId]) acc[p.topicId] = { correct:0, total:0 }
      acc[p.topicId].total++
      if (p.correct) acc[p.topicId].correct++
    })
    setTopicAccuracy(acc)
    setLoading(false)
  }

  async function fetchQuestionCounts(topicId) {
    const counts = {}
    await Promise.all(DIFFICULTIES.map(async d => {
      const snap = await getDocs(query(collection(db,'questions'),
        where('topicId','==',topicId), where('difficulty','==',d), where('source','==','practice')))
      counts[d] = snap.size
    }))
    setQCounts(counts)
  }

  async function startQuiz() {
    setLoading(true)
    const snap = await getDocs(query(collection(db,'questions'),
      where('topicId','==',selTopic.id), where('difficulty','==',diff), where('source','==','practice')))
    const shuffled = snap.docs.map(d=>({id:d.id,...d.data()})).sort(()=>Math.random()-0.5).slice(0,10)
    setQues(shuffled)
    setQIndex(0); setScore(0); setChosen(null); setShowExp(false); setAnswers([]); setDone(false)
    setView('quiz')
    setLoading(false)
  }

  async function saveProgress(q, correct) {
    try {
      await setDoc(doc(db,'progress',`${profile.id}_${q.id}`), {
        userId:profile.id, topicId:q.topicId, questionId:q.id,
        subject, topicName:selTopic.name, correct, attemptedAt:serverTimestamp()
      }, { merge:true })
    } catch(e) { console.error(e) }
  }

  function handleAnswer(opt) {
    if (chosen !== null) return
    setChosen(opt)
    const q = questions[qIndex]
    const correct = opt === q.correctAnswer
    if (correct) setScore(s => s+1)
    saveProgress(q, correct)
    setAnswers(prev => [...prev, { q, chosen:opt, correct, skipped:false }])
  }

  function handleSkip() {
    if (chosen !== null) return
    const q = questions[qIndex]
    setAnswers(prev => [...prev, { q, chosen:null, correct:false, skipped:true }])
    next(true)
  }

  async function next(skipped = false) {
    if (!skipped && chosen === null) return
    if (qIndex + 1 >= questions.length) {

      // ── Calculate final accuracy ──
      const finalAnswers  = skipped
        ? [...answers, { q: questions[qIndex], chosen: null, correct: false, skipped: true }]
        : answers
      const attempted     = finalAnswers.filter(a => !a.skipped).length
      const finalScore    = finalAnswers.filter(a => a.correct).length
      const accuracy      = attempted > 0 ? Math.round((finalScore / attempted) * 100) : 0
      const passed        = accuracy >= 60  // 60% threshold

      setPassedThreshold(passed)

      // ── Only mark complete if accuracy ≥ 60% ──
      if (planId && selTopic) {
        if (passed) {
          try {
            const today  = new Date().toISOString().split('T')[0]
            const compId = `${profile.id}_${planId}_${selTopic.id}`

            // 1. Write completion record
            await setDoc(doc(db, 'taskCompletions', compId), {
              userId:      profile.id,
              planId:      planId,
              topicId:     selTopic.id,
              topicName:   selTopic.name,
              date:        today,
              completed:   true,
              accuracy:    accuracy,
              completedAt: serverTimestamp()
            })
            console.log('Task marked complete with accuracy:', accuracy + '%')

            // 2. Check if ALL tasks in this plan are now complete → increment streak
            const userRef  = doc(db, 'users', profile.id)
            const userSnap = await getDoc(userRef)
            const userData = userSnap.data()

            if (userData?.lastStreakDate !== today) {
              const planSnap = await getDocs(collection(db, 'taskPlans'))
              const plan = planSnap.docs.map(d=>({id:d.id,...d.data()})).find(p=>p.id===planId)

              if (plan) {
                const compSnap = await getDocs(
                  query(collection(db,'taskCompletions'), where('userId','==',profile.id))
                )
                const planComps = compSnap.docs.map(d=>d.data()).filter(c=>c.planId===planId && c.completed)
                const completedTopicIds = new Set(planComps.map(c=>c.topicId))
                completedTopicIds.add(selTopic.id)

                const allDone = plan.tasks.every(t => completedTopicIds.has(t.topicId))
                if (allDone) {
                  await updateDoc(userRef, { streak: increment(1), lastStreakDate: today })
                  console.log('Streak incremented!')
                }
              }
            }
          } catch(err) {
            console.error('Task completion error:', err)
          }
        } else {
          console.log('Accuracy', accuracy + '% — below 60%, task not marked complete')
        }
      }

      setDone(true)
      return
    }
    setQIndex(i => i+1); setChosen(null); setShowExp(false)
  }

  const subjects = SUBJECTS[profile?.stream] ?? []

  // ── SUBJECTS ──
  if (view === 'subjects') return (
    <div className="page">
      <Header/>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-5">Choose Subject</h2>
        <div className="space-y-3">
          {subjects.map(s => (
            <button key={s} onClick={() => { setSubject(s); fetchTopics(s); setView('topics') }}
              className="w-full card flex items-center gap-4 hover:border-[#FF6B00]/50 transition-colors text-left">
              <div className="w-12 h-12 bg-[#FF6B00]/20 rounded-xl flex items-center justify-center font-bold text-[#FF6B00] text-lg">{s[0]}</div>
              <div><p className="font-semibold">{s}</p><p className="text-xs text-gray-500">EAMCET {profile?.stream}</p></div>
              <ChevronRight size={18} className="text-gray-500 ml-auto"/>
            </button>
          ))}
        </div>
      </div>
      <BottomNav/>
    </div>
  )

  // ── TOPICS ──
  if (view === 'topics') return (
    <div className="page">
      <Header/>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => {
          if (urlTopicId) navigate('/?refresh=1')
          else { setView('subjects'); setSubject(null); setSelTopic(null); setQCounts({}) }
        }} className="flex items-center gap-2 text-gray-400 hover:text-white mb-5 text-sm">
          <ChevronLeft size={16}/> {urlTopicId ? 'Home' : 'Back'}
        </button>

        <h2 className="text-xl font-bold mb-1">{subject}</h2>

        {/* If launched from daily task — show only that topic */}
        {urlTopicId && selTopic ? (
          <div className="mb-5">
            <p className="text-gray-500 text-sm mb-3">Today's assigned topic</p>
            <div className="card border-[#FF6B00]/30 bg-[#FF6B00]/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF6B00]/20 rounded-xl flex items-center justify-center text-[#FF6B00] font-bold">{subject[0]}</div>
                <div>
                  <p className="font-semibold">{selTopic.name}</p>
                  <p className="text-xs text-gray-500">{subject}</p>
                </div>
                <CheckCircle size={16} className="text-[#FF6B00] ml-auto"/>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-5">Select a topic</p>
            <div className="space-y-2 mb-5">
              {loading && <p className="text-gray-500 text-sm text-center py-8">Loading...</p>}
              {!loading && topics.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No topics yet.</p>}
              {topics.map(t => {
                const acc = topicAccuracy[t.id]
                const pct = acc ? Math.round((acc.correct/acc.total)*100) : null
                return (
                  <button key={t.id} onClick={() => { setSelTopic(t); fetchQuestionCounts(t.id) }}
                    className={`w-full card text-left hover:border-[#FF6B00]/50 transition-colors ${selTopic?.id===t.id?'border-[#FF6B00]':''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{t.name}</p>
                        {pct !== null
                          ? <p className={`text-xs mt-0.5 ${pct<50?'text-red-400':'text-green-400'}`}>{pct<50?'⚠ Weak — ':''}{pct}% ({acc.correct}/{acc.total})</p>
                          : <p className="text-xs text-gray-500 mt-0.5">Not practiced yet</p>
                        }
                      </div>
                      {selTopic?.id===t.id && <CheckCircle size={16} className="text-[#FF6B00]"/>}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Difficulty selector */}
        {selTopic && (
          <div className="mb-5">
            <p className="text-sm text-gray-400 mb-2">Select Difficulty</p>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => {
                const count  = qCounts[d] ?? '...'
                const active = diff === d
                const color  = d==='Easy'?'border-green-500 bg-green-500/20 text-green-400':d==='Medium'?'border-yellow-500 bg-yellow-500/20 text-yellow-400':'border-red-500 bg-red-500/20 text-red-400'
                return (
                  <button key={d} onClick={() => setDiff(d)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${active?color:'border-[#2a2a2a] text-gray-500 hover:border-gray-500'}`}>
                    <p>{d}</p>
                    <p className="text-xs font-normal opacity-70 mt-0.5">{count} Qs</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => navigate('/?refresh=1')} className="btn-outline flex items-center gap-2"><Home size={15}/> Home</button>
          <button onClick={startQuiz} disabled={!selTopic || loading || qCounts[diff]===0}
            className="btn-primary flex-1 disabled:opacity-50">
            {loading ? 'Loading...' : !selTopic ? 'Select a topic' : qCounts[diff]===0 ? 'No questions' : `Start (${Math.min(10,qCounts[diff]||0)} Qs)`}
          </button>
        </div>
      </div>
      <BottomNav/>
    </div>
  )

  // ── DONE ──
  if (done) {
    const skipped  = answers.filter(a=>a.skipped).length
    const attempted= answers.filter(a=>!a.skipped).length
    const accuracy = attempted>0 ? Math.round((score/attempted)*100) : 0
    const isDailyTask = !!planId
    // For daily tasks: pass = ≥60%, fail = below 60%
    const emoji = isDailyTask
      ? (passedThreshold ? '🎉' : '😓')
      : (accuracy>=80 ? '🎉' : accuracy>=50 ? '📚' : '💪')
    return (
      <div className="page">
        <Header/>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">{emoji}</div>
            <h2 className="text-2xl font-bold mb-1">
              {isDailyTask
                ? (passedThreshold ? 'Task Complete! ✅' : 'Not Quite There!')
                : 'Session Complete!'}
            </h2>
            <p className="text-gray-400 text-sm">{subject} · {selTopic?.name} · {diff}</p>
            {/* Show threshold warning for daily tasks */}
            {isDailyTask && !passedThreshold && (
              <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
                <p className="text-red-400 font-semibold">You scored {accuracy}% — need at least 60% to complete this task</p>
                <p className="text-gray-500 text-xs mt-1">Try again with a different difficulty or retry the same one</p>
              </div>
            )}
            {isDailyTask && passedThreshold && (
              <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm">
                <p className="text-green-400 font-semibold">You scored {accuracy}% — task marked complete! ✓</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              {label:'Score',    val:`${score}/${attempted}`, cls:'text-[#FF6B00]'},
              {label:'Accuracy', val:`${accuracy}%`,          cls:accuracy>=70?'text-green-400':'text-red-400'},
              {label:'Skipped',  val:skipped,                 cls:'text-yellow-400'},
              {label:'Wrong',    val:attempted-score,         cls:'text-red-400'}
            ].map(({label,val,cls})=>(
              <div key={label} className="card text-center p-3">
                <p className={`text-xl font-bold ${cls}`}>{val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <div className="card mb-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><BarChart2 size={16} className="text-[#FF6B00]"/> Question Review</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {answers.map((a,i)=>(
                <div key={i} className={`rounded-xl p-3 border ${a.skipped?'border-yellow-500/20 bg-yellow-500/5':a.correct?'border-green-500/20 bg-green-500/5':'border-red-500/20 bg-red-500/5'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.skipped?'bg-yellow-500/20 text-yellow-400':a.correct?'bg-green-500/20 text-green-400':'bg-red-500/20 text-red-400'}`}>
                      Q{i+1} {a.skipped?'Skipped':a.correct?'✓ Correct':'✗ Wrong'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-1">{a.q.questionText}</p>
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
          </div>
          <div className="flex gap-3">
            {/* Free practice: Change Topic button */}
            {!urlTopicId && (
              <button onClick={()=>{setDone(false);setView('topics');setSelTopic(null);setQCounts({})}}
                className="btn-outline flex-1">Change Topic</button>
            )}
            {/* Daily task FAILED: only Try Again, no going back */}
            {urlTopicId && !passedThreshold && (
              <button onClick={()=>{setDone(false);setPassedThreshold(false);startQuiz()}}
                className="btn-primary w-full">🔁 Try Again (need ≥60%)</button>
            )}
            {/* Daily task PASSED or free practice: Try Again optional */}
            {(!urlTopicId || passedThreshold) && (
              <button onClick={()=>{setDone(false);setPassedThreshold(false);startQuiz()}}
                className="btn-outline flex-1">🔁 Try Again</button>
            )}
          </div>
          {/* Back to Home only if task passed or free practice */}
          {(!urlTopicId || passedThreshold) && (
            <button onClick={()=>navigate('/?refresh=1')}
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-300 transition-colors">
              ← Back to Home
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── QUIZ ──
  const q    = questions[qIndex]
  const opts = q ? [q.optionA,q.optionB,q.optionC,q.optionD] : []

  return (
    <div className="page">
      <Header/>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-2">
          <div><p className="text-xs text-gray-500">{subject} · {selTopic?.name}</p><p className="text-xs text-gray-600">{diff}</p></div>
          <div className="text-right">
            <p className="text-lg font-bold text-[#FF6B00]">Q{qIndex+1} <span className="text-gray-500 text-sm font-normal">/ {questions.length}</span></p>
            <p className="text-xs text-gray-500">Score: {score}</p>
          </div>
        </div>
        <div className="w-full bg-[#2a2a2a] rounded-full h-1.5 mb-6">
          <div className="bg-[#FF6B00] h-1.5 rounded-full transition-all" style={{width:`${(qIndex/questions.length)*100}%`}}/>
        </div>
        {q && (
          <>
            <div className="card mb-4 border-[#2a2a2a]"><p className="font-medium leading-relaxed">{q.questionText}</p></div>
            <div className="space-y-3 mb-5">
              {opts.map((opt,i)=>{
                const label=(['A','B','C','D'])[i], isCorrect=opt===q.correctAnswer, isChosen=opt===chosen
                let cls='border-[#2a2a2a] hover:border-[#FF6B00]/40'
                if(chosen!==null){if(isCorrect)cls='border-green-500 bg-green-500/10';else if(isChosen)cls='border-red-500 bg-red-500/10'}
                return(
                  <button key={i} onClick={()=>handleAnswer(opt)} className={`w-full card flex items-center gap-3 text-left transition-all ${cls}`} disabled={chosen!==null}>
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${chosen!==null&&isCorrect?'bg-green-500 text-white':chosen!==null&&isChosen?'bg-red-500 text-white':'bg-[#2a2a2a]'}`}>{label}</span>
                    <span className="text-sm flex-1">{opt}</span>
                    {chosen!==null&&isCorrect&&<CheckCircle size={16} className="text-green-400 shrink-0"/>}
                    {chosen!==null&&isChosen&&!isCorrect&&<XCircle size={16} className="text-red-400 shrink-0"/>}
                  </button>
                )
              })}
            </div>
            {chosen!==null&&(
              <div className="mb-4">
                <button onClick={()=>setShowExp(!showExp)} className="flex items-center gap-2 text-[#FF6B00] text-sm font-medium">
                  <Eye size={15}/> {showExp?'Hide':'View'} Explanation
                </button>
                {showExp&&<div className="card mt-3 border-[#FF6B00]/20 bg-[#FF6B00]/5"><p className="text-sm text-gray-300">{q.explanation||'No explanation.'}</p></div>}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={()=>navigate('/?refresh=1')} className="btn-outline flex items-center gap-2 px-4"><Home size={15}/></button>
              {chosen===null&&<button onClick={handleSkip} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#2a2a2a] text-gray-400 hover:border-yellow-500/40 hover:text-yellow-400 text-sm transition-colors"><SkipForward size={15}/> Skip</button>}
              {chosen!==null&&<button onClick={()=>next(false)} className="btn-primary flex-1">{qIndex+1>=questions.length?'See Results':'Next'} <ChevronRight size={15}/></button>}
            </div>
          </>
        )}
        {!loading&&questions.length===0&&(
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-400 font-medium">No questions found</p>
            <p className="text-gray-600 text-sm mt-1">Try a different difficulty</p>
            <button onClick={()=>setView('topics')} className="btn-outline mt-4">Go Back</button>
          </div>
        )}
      </div>
    </div>
  )
}