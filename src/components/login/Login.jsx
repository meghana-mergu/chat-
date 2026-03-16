import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Man from '../components/Man'
import Bag from '../components/Bag'
import InputField, { IconMail, IconLock } from '../components/builder/InputField'
import backImg from '/back.png'

export default function Login() {
  const navigate = useNavigate()

  /* Animation phases */
  const [phase, setPhase]     = useState('walking')
  const [lidOpen, setLidOpen] = useState(false)
  const [form, setForm]       = useState({ email: '', password: '' })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const manRef = useRef(null)

  const ch = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  useEffect(() => {
    const t1 = setTimeout(() => {
      if (manRef.current) {
        manRef.current.style.transition = 'transform .5s ease-in-out'
        manRef.current.style.transform  = 'translateY(8px) rotate(-5deg)'
      }
      setPhase('placing')
    }, 2100)
    const t2 = setTimeout(() => {
      setPhase('dropped')
      if (manRef.current) manRef.current.style.transform = 'translateY(0) rotate(0deg)'
    }, 2450)
    const t3 = setTimeout(() => {
      setPhase('idle')
      setLidOpen(true)
      spawnParticles()
    }, 3200)
    const t4 = setTimeout(() => setPhase('open'), 3650)
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [])

  const spawnParticles = () => {
    const scene = document.getElementById('login-scene')
    if (!scene) return
    const palette = ['#f4caca', '#e8a0a0', '#c45a5a', '#fff', '#ffd700', '#ffb4b4']
    for (let i = 0; i < 18; i++) {
      const el  = document.createElement('div')
      const sz  = Math.random() * 8 + 4
      const a   = Math.random() * Math.PI * 2
      const d   = Math.random() * 70 + 30
      const tx  = Math.cos(a) * d
      const ty  = Math.sin(a) * d - 40
      const kn  = `pb${i}_${Date.now()}`
      const sEl = document.createElement('style')
      sEl.textContent = `@keyframes ${kn}{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(${tx}px,${ty}px) scale(0)}}`
      document.head.appendChild(sEl)
      el.style.cssText = `position:absolute;width:${sz}px;height:${sz}px;background:${palette[i % palette.length]};border-radius:${Math.random() > 0.5 ? '50%' : '3px'};left:255px;bottom:60px;pointer-events:none;z-index:20;animation:${kn} .8s ease-out forwards`
      scene.appendChild(el)
      setTimeout(() => { el.remove(); sEl.remove() }, 900)
    }
  }

  const validate = () => {
    const errs = {}
    if (!form.email)    errs.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.password) errs.password = 'Password is required'
    return errs
  }

  const handleSubmit = () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    setTimeout(() => setLoading(false), 1500)
  }

  const isWalking = phase === 'walking'
  const isDropped = phase !== 'walking'
  const isIdle    = phase === 'idle' || phase === 'open'
  const isOpen    = phase === 'open'

  return (
    <div
      className="relative w-full h-screen overflow-hidden flex items-center justify-center"
      style={{
        backgroundImage: `url(${backImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Very light overlay to keep bg vivid but forms readable */}
      <div className="absolute inset-0 bg-white/10 pointer-events-none" />

      {/* ── SCENE: man + bag + login panel ── */}
      <div
        id="login-scene"
        className="relative z-10 flex items-end justify-center"
        style={{ width: 700, height: 520 }}
      >
        {/* Bag shadow */}
        {isDropped && (
          <div
            className="absolute rounded-full blur-sm bg-rose-500/25"
            style={{ bottom: 48, left: 218, width: 68, height: 10 }}
          />
        )}

        {/* ── LOGIN PANEL — rises from bag ── */}
        {isOpen && (
          <div
            className="panel-in absolute z-20 overflow-hidden"
            style={{
              bottom: 90,
              left: 238,
              width: 415,
              borderRadius: 22,
              boxShadow: '0 24px 60px rgba(196,90,90,0.30), 0 6px 20px rgba(0,0,0,0.14)',
            }}
          >
            {/* Frosted glass */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-2xl" />
            <div
              className="absolute inset-0 border border-rose-200/70 pointer-events-none"
              style={{ borderRadius: 22 }}
            />

            <div className="form-rise relative z-10 px-6 pt-5 pb-5">
              {/* Header */}
              <div className="flex flex-col items-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-400/50 mb-2.5">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx={12} cy={7} r={4} />
                  </svg>
                </div>
                <h2 className="text-lg font-black text-rose-950 tracking-tight">Welcome Back 👋</h2>
                <p className="text-xs font-semibold text-rose-400 mt-0.5">Sign in to your account</p>
              </div>

              {/* Fields */}
              <div className="flex flex-col gap-2.5">
                <InputField
                  type="email" name="email" placeholder="Email address"
                  value={form.email} onChange={ch}
                  icon={<IconMail />} accentColor="rose" error={errors.email}
                />
                <InputField
                  type="password" name="password" placeholder="Password"
                  value={form.password} onChange={ch}
                  icon={<IconLock />} accentColor="rose" error={errors.password}
                />
                <div className="text-right -mt-1">
                  <button className="text-[11px] font-bold text-rose-400 hover:text-rose-600 transition-colors bg-transparent border-none cursor-pointer">
                    Forgot password?
                  </button>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`w-full py-2.5 rounded-xl text-sm font-extrabold text-white transition-all duration-200 active:scale-95 shadow-lg cursor-pointer
                    ${loading ? 'bg-rose-300 cursor-not-allowed' : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:-translate-y-0.5 shadow-rose-400/40 hover:shadow-rose-400/60'}`}
                >
                  {loading ? 'Signing in…' : 'Login →'}
                </button>
              </div>

              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-rose-200/60" />
                <span className="text-[10px] text-rose-300 font-semibold">or</span>
                <div className="flex-1 h-px bg-rose-200/60" />
              </div>

              <p className="text-center text-[11px] font-semibold text-rose-400">
                Don't have an account?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="font-extrabold text-rose-600 underline underline-offset-2 hover:text-rose-800 transition-colors bg-transparent border-none cursor-pointer text-[11px]"
                >
                  Register
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── BAG ── */}
        <div
          className={isWalking ? 'bag-walk' : ''}
          style={{
            position:   'absolute',
            bottom:     isDropped ? 44 : 58,
            left:       isDropped ? 215 : undefined,
            zIndex:     10,
            transition: isDropped ? 'left .3s ease, bottom .45s cubic-bezier(.34,1.3,.64,1)' : undefined,
          }}
        >
          <Bag lidOpen={lidOpen} />
        </div>

        {/* ── MAN ── */}
        <div
          ref={manRef}
          className={isWalking ? 'man-walk' : ''}
          style={{
            position:   'absolute',
            bottom:     44,
            left:       isWalking ? undefined : 22,
            zIndex:     10,
            transition: 'transform .5s ease-in-out',
          }}
        >
          <Man walking={isWalking} idle={isIdle} />
        </div>
      </div>
    </div>
  )
}
