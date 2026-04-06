import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { verifyOtpAPI } from "../../services/authApi";

const OTP_LEN = 6
const RESEND_SECS = 30

export default function VerifyOTP() {
  const navigate = useNavigate()
  const location = useLocation()

  // ✅ FIXED EMAIL SOURCE
  const email =
    location.state?.email || localStorage.getItem("email")

  const [otp, setOtp] = useState(Array(OTP_LEN).fill(''))
  const [status, setStatus] = useState('idle')
  const [timer, setTimer] = useState(RESEND_SECS)

  const refs = useRef([])

  // ✅ redirect if no email
  useEffect(() => {
    if (!email) {
      toast.error("Email missing. Please register again.")
      navigate('/register')
    }
  }, [email, navigate])

  // focus first input
  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  // timer
  useEffect(() => {
    if (timer <= 0) return
    const t = setTimeout(() => setTimer(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [timer])

  // input change
  const handleChange = (e, i) => {
    const val = e.target.value.replace(/\D/g, '')
    if (!val) return

    const newOtp = [...otp]
    newOtp[i] = val[0]
    setOtp(newOtp)

    if (i < OTP_LEN - 1) {
      refs.current[i + 1]?.focus()
    }
  }

  // const handleKeyDown = (e, i) => {
  //   if (e.key === "Backspace" && !otp[i] && i > 0) {
  //     refs.current[i - 1]?.focus()
  //   }
  // }

  const handleKeyDown = (e, i) => {
  if (e.key === "Backspace") {
    const newOtp = [...otp]

    if (otp[i]) {
      // ✅ If current box has value → clear it
      newOtp[i] = ''
      setOtp(newOtp)
    } else if (i > 0) {
      // ✅ If empty → go back and clear previous
      refs.current[i - 1]?.focus()

      const prevOtp = [...otp]
      prevOtp[i - 1] = ''
      setOtp(prevOtp)
    }
  }

  // optional (better UX)
  if (e.key === "ArrowLeft" && i > 0) {
    refs.current[i - 1]?.focus()
  }

  if (e.key === "ArrowRight" && i < OTP_LEN - 1) {
    refs.current[i + 1]?.focus()
  }
}

  // ✅ VERIFY API (MAIN FIX)
  const handleVerify = async () => {
    const code = otp.join('')

    if (code.length !== OTP_LEN) {
      toast.error("Enter complete OTP")
      return
    }

    try {
      setStatus('loading')

      const res = await verifyOtpAPI({
        email: email,   // ✅ IMPORTANT
        otp: code       // ✅ IMPORTANT
      })

      console.log("OTP verification success:", res)
      console.log("OTP response structure:", JSON.stringify(res, null, 2))

      toast.success(res?.message || "Verified successfully 🎉")

      // Store user data in localStorage for persistence
      if (res?.user) {
        localStorage.setItem("user", JSON.stringify(res.user))
        console.log("Stored user in localStorage:", localStorage.getItem("user"))
      } else {
        console.log("No user data in OTP response, storing full response")
        localStorage.setItem("user", JSON.stringify(res))
      }

      localStorage.removeItem("email")

      setTimeout(() => {
        navigate('/chat')
      }, 1500)

    } catch (err) {
      toast.error(err || "Invalid OTP ❌")
    } finally {
      setStatus('idle')
    }
  }

  const handleResend = () => {
    if (timer > 0) return

    setOtp(Array(OTP_LEN).fill(''))
    setTimer(RESEND_SECS)

    toast.success("OTP resent 📧")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center w-[350px]">

        <h2 className="text-xl font-bold mb-2">Verify OTP</h2>

        <p className="text-sm text-gray-500 mb-6">
          OTP sent to: <b>{email}</b>
        </p>

        <div className="flex justify-center gap-2 mb-6">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => refs.current[i] = el}
              value={digit}
              onChange={(e) => handleChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              maxLength={1}
              className="w-10 h-12 border text-center text-lg rounded"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={status === 'loading'}
          className="w-full bg-pink-500 text-white py-2 rounded"
        >
          {status === 'loading' ? "Verifying..." : "Verify"}
        </button>

        <p className="text-sm mt-4">
          {timer > 0
            ? `Resend in ${timer}s`
            : (
              <span
                onClick={handleResend}
                className="text-pink-500 cursor-pointer"
              >
                Resend OTP
              </span>
            )}
        </p>

      </div>
    </div>
  )
}