import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/login/Login'
import Register from './components/register/Register'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Login></Login>} />
        <Route path="/register" element={<Register></Register>} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
