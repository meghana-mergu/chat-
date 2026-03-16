import { useState } from 'react'

/* ── Icons ── */
export const IconMail = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x={2} y={4} width={20} height={16} rx={2} />
    <path d="M2 7l10 7 10-7" />
  </svg>
)
export const IconLock = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x={3} y={11} width={18} height={11} rx={2} />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
export const IconUser = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx={12} cy={7} r={4} />
  </svg>
)
const IconEye = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx={12} cy={12} r={3} />
  </svg>
)
const IconEyeOff = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1={1} y1={1} x2={23} y2={23} />
  </svg>
)


export default function InputField({
  type = 'text',
  name,
  placeholder,
  value,
  onChange,
  icon,
  accentColor = 'rose',
  error,
}) {
  const [showPw, setShowPw] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPw ? 'text' : 'password') : type

  const colors = {
    rose:   { icon: 'text-rose-400',   border: 'border-rose-200/70',   focus: 'focus:border-rose-400   focus:ring-rose-300/20',   placeholder: 'placeholder-rose-200'   },
    violet: { icon: 'text-violet-400', border: 'border-violet-200/70', focus: 'focus:border-violet-400 focus:ring-violet-300/20', placeholder: 'placeholder-violet-300' },
  }
  const c = colors[accentColor] ?? colors.rose

  return (
    <div className="flex flex-col gap-1">
      <div className="relative flex items-center">
        {icon && (
          <span className={`absolute left-3 ${c.icon} pointer-events-none z-10 flex`}>
            {icon}
          </span>
        )}
        <input
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`
            w-full py-2.5 rounded-xl border-2 bg-white/70 backdrop-blur-sm
            text-xs text-gray-700 focus:outline-none focus:bg-white/90
            focus:ring-2 transition-all duration-200
            ${icon ? 'pl-9' : 'pl-3'}
            ${isPassword ? 'pr-9' : 'pr-3'}
            ${c.border} ${c.focus} ${c.placeholder}
            ${error ? 'border-red-400' : ''}
          `}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw(x => !x)}
            className={`absolute right-3 ${c.icon} hover:opacity-70 transition-opacity flex bg-transparent border-none cursor-pointer`}
          >
            {showPw ? <IconEyeOff /> : <IconEye />}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-red-500 font-semibold pl-1">{error}</p>}
    </div>
  )
}
