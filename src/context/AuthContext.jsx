import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    return unsub
  }, [])

  async function fetchProfile(uid) {
    try {
      const snap = await getDoc(doc(db, 'users', uid))
      if (snap.exists()) setProfile({ id: snap.id, ...snap.data() })
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function register({ username, email, password, yearOfStudy, stream }) {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)
    const profileData = {
      username,
      email,
      yearOfStudy,
      stream,
      streak: 0,
      isSubscribed: false,
      isAdmin: false,
      subscriptionPlan: null,
      subscriptionStart: null,
      subscriptionEnd: null,
      createdAt: serverTimestamp()
    }
    await setDoc(doc(db, 'users', firebaseUser.uid), profileData)
    setProfile({ id: firebaseUser.uid, ...profileData })
    return firebaseUser
  }

  async function login({ email, password }) {
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password)
    await fetchProfile(firebaseUser.uid)
    return firebaseUser
  }

  async function logout() {
    await signOut(auth)
    setProfile(null)
    setUser(null)
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.uid)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, register, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
