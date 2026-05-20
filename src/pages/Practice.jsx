import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'
import {
  collection, query, where, getDocs,
  doc, setDoc, updateDoc, getDoc, increment, serverTimestamp
} from 'firebase/firestore'
import Header    from '../components/Header'
import BottomNav from '../components/BottomNav'
import { ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, Home, SkipForward, BarChart2 } from 'lucide-react'

const SUBJECTS     = { MPC: ['Mathematics','Physics','Chemistry'], BIPC: ['Biology','Physics','Chemistry'] }
const DIFFICULTIES = ['Easy','Medium','Hard']

export default function Practice() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const [params]     = useSearchParams()

  const [view,      setView]     = useState('subjects')
  const [subject,   setSubject]  = useState(params.get('subject') || null)
  const [taskId,    setTaskId]   = useState(params.get('taskId')  || null)
  const [topics,    setTopics]   = useState([])
  const [topicAccuracy, setTopicAccuracy] = useState({}) // topicId → {correct, total}
  const [selTopic,  setSelTopic] = useState(null)
  const [diff,      setDiff]     = useState('Easy')
  const [qCounts,   setQCounts]  = useState({}) // difficulty → count
  const [questions, setQues]     = useState([])
  const [qIndex,    setQIndex]   = useState(0)
  const [chosen,    setChosen]   = useState(null) // null = not answered, 'skipped' = skipped
  const [showExp,   setShowExp]  = useState(false)
  const [answers,   setAnswers]  = useState([]) // {q, chosen, correct, skipped}
  const [score,     setScore]    = useState(0)
  const [done,      setDone]     = useState(false)
  const [loading,   setLoading]  = useState(false)

  useEffect(() => { if (subject) { fetchTopics(subject); setView('topics') } }, [subject])

  async function fetchTopics(sub) {
    setLoading(true)
    const [topicsSnap, progressSnap] = await Promise.all([
      getDocs(query(collection(db,'topics'), where('subject','==',sub))),
      getDocs(query(collection(db,'progress'), where('userId','==',profile.id), where('subject','==',sub)))
    ])
    setTopics(topicsSnap.docs.map(d => ({ id: d.id, ...d.data() })))

    // Build topic accuracy map
    const acc = {}
    progressSnap.docs.forEach(d => {
      const p = d.data()
      if (!acc[p.topicId]) acc[p.topicId] = { correct: 0, total: 0 }
      acc[p.topicId].total++
      if (p.correct) acc[p.topicId].correct++
    })
    setTopicAccuracy(acc)
    setLoading(false)
  }

  // Count questions per difficulty for selected topic
  async function fetchQuestionCounts(topicId) {
    const counts = {}
    await Promise.all(DIFFICULTIES.map(async d => {
      const snap = await getDocs(query(
        collection(db,'questions'),
        where('topicId','==', topicId),
        where('difficulty','==', d),
        where('source','==','practice')   // ← only practice questions
      ))
      counts[d] = snap.size
    }))
    setQCounts(counts)
  }

  async function startQuiz() {
    setLoading(true)
    const snap = await getDocs(query(
      collection(db,'questions'),
      where('topicId',    '==', selTopic.id),
      where('difficulty', '==', diff),
      where('source',     '==', 'practice')  // ← only practice questions
    ))
    const all      = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    const shuffled = all.sort(() => Math.random() - 0.5).slice(0, 10)
    setQues(shuffled)
    setQIndex(0); setScore(0); setChosen(null); setShowExp(false)
    setAnswers([]); setDone(false)
    setView('quiz')
    setLoading(false)
  }

  async function saveProgress(q, correct) {
    try {
      await setDoc(doc(db,'progress',`${profile.id}_${q.id}`), {
        userId: profile.id, topicId: q.topicId, questionId: q.id,
        subject, topicName: selTopic.name, correct,
        attemptedAt: serverTimestamp()
      }, { merge: true })
    } catch(e) { console.error(e) }
  }

  function handleAnswer(opt) {
    if (chosen !== null) return
    setChosen(opt)
    const q       = questions[qIndex]
    const correct = opt === q.correctAnswer
    if (correct) setScore(s => s + 1)
    saveProgress(q, correct)
    setAnswers(prev => [...prev, { q, chosen: opt, correct, skipped: false }])
  }

  function handleSkip() {
    if (chosen !== null) return
    const q = questions[qIndex]
    setAnswers(prev => [...prev, { q, chosen: null, correct: false, skipped: true }])
    next(true)
  }

  async function next(skipped = false) {
    if (!skipped && chosen === null) return
    if (qIndex + 1 >= questions.length) {
      // ── Update task & streak directly in Firestore ──
      if (taskId) {
        try {
          const today   = new Date().toISOString().split('T')[0]
          const userRef = doc(db, 'users', profile.id)

          // 1. Mark task complete
          await updateDoc(doc(db, 'dailyTasks', taskId), { completed: true })
          console.log('Task marked complete:', taskId)

          // 2. Get user to check lastStreakDate
          const userSnap = await getDoc(userRef)
          const userData = userSnap.data()
          console.log('lastStreakDate:', userData?.lastStreakDate, 'today:', today)

          if (userData?.lastStreakDate !== today) {
            // 3. Fetch ALL user tasks (single where = no composite index)
            const snap = await getDocs(
              query(collection(db, 'dailyTasks'), where('userId', '==', profile.id))
            )
            // 4. Filter today in JS and DEDUPLICATE by subject
            //    (multiple docs per subject exist due to old bug — pick completed one)
            const rawToday = snap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .filter(t => t.date === today)

            const subjectMap = {}
            rawToday.forEach(t => {
              const key = t.subject
              if (!subjectMap[key] || t.completed || t.id === taskId) {
                subjectMap[key] = t
              }
            })
            const todayTasks = Object.values(subjectMap)

            console.log('Today tasks (deduped):', todayTasks.length,
              todayTasks.map(t => t.subject + ':' + (t.completed || t.id === taskId)))

            // 5. All done = increment streak
            const allDone = todayTasks.length > 0 &&
              todayTasks.every(t => t.completed || t.id === taskId)

            if (allDone) {
              await updateDoc(userRef, {
                streak:        increment(1),
                lastStreakDate: today
              })
              console.log('Streak incremented!')
            } else {
              console.log('Not all done yet')
            }
          } else {
            console.log('Streak already updated today')
          }
        } catch(err) {
          console.error('Streak update error:', err)
        }
      }
      setDone(true)
      return
    }
    setQIndex(i => i + 1); setChosen(null); setShowExp(false)
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
            <button key={s} onClick={() => setSubject(s)}
              className="w-full card flex items-center gap-4 hover:border-[#FF6B00]/50 transition-colors text-left">
              <div className="w-12 h-12 bg-[#FF6B00]/20 rounded-xl flex items-center justify-center font-bold text-[#FF6B00] text-lg">{s[0]}</div>
              <div>
                <p className="font-semibold">{s}</p>
                <p className="text-xs text-gray-500">EAMCET {profile?.stream}</p>
              </div>
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
        <button onClick={() => { setView('subjects'); setSubject(null); setSelTopic(null); setQCounts({}) }}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-5 text-sm">
          <ChevronLeft size={16}/> Back
        </button>
        <h2 className="text-xl font-bold mb-1">{subject}</h2>
        <p className="text-gray-500 text-sm mb-5">Select a topic then set difficulty</p>

        {/* Topics list */}
        <div className="space-y-2 mb-5">
          {loading && <p className="text-gray-500 text-sm text-center py-8">Loading topics...</p>}
          {!loading && topics.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No topics added yet.</p>}
          {topics.map(t => {
            const acc    = topicAccuracy[t.id]
            const pct    = acc ? Math.round((acc.correct/acc.total)*100) : null
            const isWeak = pct !== null && pct < 50
            return (
              <button key={t.id}
                onClick={() => { setSelTopic(t); fetchQuestionCounts(t.id) }}
                className={`w-full card text-left hover:border-[#FF6B00]/50 transition-colors ${selTopic?.id===t.id ? 'border-[#FF6B00]' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    {pct !== null && (
                      <p className={`text-xs mt-0.5 ${isWeak ? 'text-red-400' : 'text-green-400'}`}>
                        {isWeak ? '⚠ Weak — ' : '✓ '}{pct}% accuracy ({acc.correct}/{acc.total})
                      </p>
                    )}
                    {pct === null && <p className="text-xs text-gray-500 mt-0.5">Not practiced yet</p>}
                  </div>
                  {selTopic?.id===t.id && <CheckCircle size={16} className="text-[#FF6B00] shrink-0"/>}
                </div>
              </button>
            )
          })}
        </div>

        {/* Difficulty selector — shows question count */}
        {selTopic && (
          <div className="mb-5">
            <p className="text-sm text-gray-400 mb-2">Select Difficulty</p>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => {
                const count  = qCounts[d] ?? '...'
                const active = diff === d
                const color  = d==='Easy' ? 'border-green-500 bg-green-500/20 text-green-400'
                             : d==='Medium' ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                             : 'border-red-500 bg-red-500/20 text-red-400'
                return (
                  <button key={d} onClick={() => setDiff(d)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${active ? color : 'border-[#2a2a2a] text-gray-500 hover:border-gray-500'}`}>
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
          <button onClick={startQuiz} disabled={!selTopic || loading || (qCounts[diff] === 0)}
            className="btn-primary flex-1 disabled:opacity-50">
            {loading ? 'Loading...' : qCounts[diff] === 0 ? 'No questions yet' : `Start Practice (${Math.min(10, qCounts[diff] || 0)} Qs)`}
          </button>
        </div>
      </div>
      <BottomNav/>
    </div>
  )

  // ── DONE / RESULTS ──
  if (done) {
    const skipped   = answers.filter(a => a.skipped).length
    const attempted = answers.filter(a => !a.skipped).length
    const accuracy  = attempted > 0 ? Math.round((score/attempted)*100) : 0
    const emoji     = accuracy >= 80 ? '🎉' : accuracy >= 50 ? '📚' : '💪'

    return (
      <div className="page">
        <Header/>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">{emoji}</div>
            <h2 className="text-2xl font-bold mb-1">Session Complete!</h2>
            <p className="text-gray-400 text-sm">{subject} · {selTopic?.name} · {diff}</p>
          </div>

          {/* Score cards */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { label:'Score',    val:`${score}/${attempted}`, cls:'text-[#FF6B00]' },
              { label:'Accuracy', val:`${accuracy}%`,          cls: accuracy>=70?'text-green-400':'text-red-400' },
              { label:'Skipped',  val: skipped,                cls:'text-yellow-400' },
              { label:'Wrong',    val: attempted - score,      cls:'text-red-400' }
            ].map(({ label, val, cls }) => (
              <div key={label} className="card text-center p-3">
                <p className={`text-xl font-bold ${cls}`}>{val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Question-by-question review */}
          <div className="card mb-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><BarChart2 size={16} className="text-[#FF6B00]"/> Question Review</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {answers.map((a, i) => (
                <div key={i} className={`rounded-xl p-3 border ${a.skipped ? 'border-yellow-500/20 bg-yellow-500/5' : a.correct ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.skipped ? 'bg-yellow-500/20 text-yellow-400' : a.correct ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      Q{i+1} {a.skipped ? 'Skipped' : a.correct ? '✓ Correct' : '✗ Wrong'}
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
            <button onClick={() => { setDone(false); setView('topics'); setSelTopic(null); setQCounts({}) }} className="btn-outline flex-1">Change Topic</button>
            <button onClick={() => { setDone(false); startQuiz() }} className="btn-primary flex-1">Try Again</button>
          </div>
          <button onClick={() => navigate('/?refresh=1')} className="w-full mt-3 text-sm text-gray-500 hover:text-gray-300 transition-colors">← Back to Home</button>
        </div>
      </div>
    )
  }

  // ── QUIZ ──
  const q    = questions[qIndex]
  const opts = q ? [q.optionA, q.optionB, q.optionC, q.optionD] : []

  return (
    <div className="page">
      <Header/>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-gray-500">{subject} · {selTopic?.name}</p>
            <p className="text-xs text-gray-600">{diff}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-[#FF6B00]">Q{qIndex+1} <span className="text-gray-500 text-sm font-normal">/ {questions.length}</span></p>
            <p className="text-xs text-gray-500">Score: {score}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#2a2a2a] rounded-full h-1.5 mb-6">
          <div className="bg-[#FF6B00] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(qIndex/questions.length)*100}%` }}/>
        </div>

        {q && (
          <>
            <div className="card mb-4 border-[#2a2a2a]">
              <p className="font-medium leading-relaxed text-base">{q.questionText}</p>
            </div>

            <div className="space-y-3 mb-5">
              {opts.map((opt, i) => {
                const label     = ['A','B','C','D'][i]
                const isCorrect = opt === q.correctAnswer
                const isChosen  = opt === chosen
                let cls = 'border-[#2a2a2a] hover:border-[#FF6B00]/40'
                if (chosen !== null && chosen !== 'skipped') {
                  if (isCorrect)        cls = 'border-green-500 bg-green-500/10'
                  else if (isChosen)    cls = 'border-red-500 bg-red-500/10'
                }
                return (
                  <button key={i} onClick={() => handleAnswer(opt)}
                    className={`w-full card flex items-center gap-3 text-left transition-all ${cls}`}
                    disabled={chosen !== null}>
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                      chosen !== null && isCorrect ? 'bg-green-500 text-white' :
                      chosen !== null && isChosen  ? 'bg-red-500 text-white'   : 'bg-[#2a2a2a]'
                    }`}>{label}</span>
                    <span className="text-sm flex-1">{opt}</span>
                    {chosen!==null && isCorrect  && <CheckCircle size={16} className="text-green-400 shrink-0"/>}
                    {chosen!==null && isChosen && !isCorrect && <XCircle size={16} className="text-red-400 shrink-0"/>}
                  </button>
                )
              })}
            </div>

            {/* Explanation */}
            {chosen !== null && chosen !== 'skipped' && (
              <div className="mb-4">
                <button onClick={() => setShowExp(!showExp)}
                  className="flex items-center gap-2 text-[#FF6B00] text-sm font-medium">
                  <Eye size={15}/> {showExp ? 'Hide' : 'View'} Explanation
                </button>
                {showExp && (
                  <div className="card mt-3 border-[#FF6B00]/20 bg-[#FF6B00]/5">
                    <p className="text-sm text-gray-300 leading-relaxed">{q.explanation || 'No explanation provided.'}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => navigate('/?refresh=1')} className="btn-outline flex items-center gap-2 px-4"><Home size={15}/></button>

              {/* Skip button — only when not answered */}
              {chosen === null && (
                <button onClick={handleSkip}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#2a2a2a] text-gray-400 hover:border-yellow-500/40 hover:text-yellow-400 text-sm transition-colors">
                  <SkipForward size={15}/> Skip
                </button>
              )}

              {chosen !== null && (
                <button onClick={() => next(false)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {qIndex+1 >= questions.length ? 'See Results' : 'Next'} <ChevronRight size={15}/>
                </button>
              )}
            </div>
          </>
        )}

        {!loading && questions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-400 font-medium">No questions found</p>
            <p className="text-gray-600 text-sm mt-1">Try a different difficulty or topic</p>
            <button onClick={() => setView('topics')} className="btn-outline mt-4">Go Back</button>
          </div>
        )}
      </div>
    </div>
  )
}