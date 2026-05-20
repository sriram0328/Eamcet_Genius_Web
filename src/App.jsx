import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Register   from './pages/Register'
import Login      from './pages/Login'
import Home       from './pages/Home'
import Practice   from './pages/Practice'
import MockTests  from './pages/MockTests'
import Progress   from './pages/Progress'
import Plans      from './pages/Plans'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDash  from './pages/admin/AdminDash'

function Spinner() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin"/>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading, profile } = useAuth()
  if (loading) return <Spinner/>
  if (!user)   return <Navigate to="/login" replace/>
  if (profile && !profile.isSubscribed) return <Navigate to="/plans" replace/>
  return children
}

function AdminRoute({ children }) {
  const adminToken = sessionStorage.getItem('adminToken')
  return adminToken ? children : <Navigate to="/admin/login" replace/>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/register"    element={<Register/>}/>
          <Route path="/login"       element={<Login/>}/>
          <Route path="/plans"       element={<Plans/>}/>
          <Route path="/admin/login" element={<AdminLogin/>}/>
          <Route path="/admin"       element={<AdminRoute><AdminDash/></AdminRoute>}/>
          <Route path="/"            element={<PrivateRoute><Home/></PrivateRoute>}/>
          <Route path="/practice"    element={<PrivateRoute><Practice/></PrivateRoute>}/>
          <Route path="/mock-tests"  element={<PrivateRoute><MockTests/></PrivateRoute>}/>
          <Route path="/progress"    element={<PrivateRoute><Progress/></PrivateRoute>}/>
          <Route path="*"            element={<Navigate to="/" replace/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
