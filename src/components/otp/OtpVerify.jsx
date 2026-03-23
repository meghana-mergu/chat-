import { useState, useRef, useEffect } from "react";

const CORRECT_OTP = "123456";

export default function OTPVerify() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState("idle"); 
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [visible, setVisible] = useState(false);
  const inputsRef = useRef([]);

  const filled = otp.filter(Boolean).length;
  const isComplete = filled === 6;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const showToast = (msg, type) => {
    setToast(null);
    setTimeout(() => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
    }, 50);
  };

  const handleChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputsRef.current[index + 1].focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      inputsRef.current[index - 1].focus();
    if (e.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1].focus();
    if (e.key === "ArrowRight" && index < 5) inputsRef.current[index + 1].focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!paste) return;
    const newOtp = [...otp];
    paste.split("").forEach((ch, i) => { if (i < 6) newOtp[i] = ch; });
    setOtp(newOtp);
    const next = newOtp.findIndex((v) => !v);
    (next !== -1 ? inputsRef.current[next] : inputsRef.current[5]).focus();
  };

  const handleSubmit = async () => {
    if (!isComplete || status === "loading") return;
    setStatus("loading");
    await new Promise((r) => setTimeout(r, 1500));
    if (otp.join("") === CORRECT_OTP) {
      setStatus("success");
      showToast("🎉 Verified! Welcome aboard.", "success");
    } else {
      setStatus("error");
      setShake(true);
      showToast("✗ Incorrect code. Please try again.", "error");
      setTimeout(() => {
        setShake(false);
        setStatus("idle");
        setOtp(["", "", "", "", "", ""]);
        inputsRef.current[0]?.focus();
      }, 650);
    }
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    setOtp(["", "", "", "", "", ""]);
    setStatus("idle");
    setResendTimer(30);
    showToast("📩 New code sent to your email!", "info");
    setTimeout(() => inputsRef.current[0]?.focus(), 60);
  };

  const getInputClass = (digit) => {
    const base =
      "w-11 h-13 text-center text-xl font-bold rounded-2xl border-2 outline-none transition-all duration-200 focus:scale-110 focus:-translate-y-1.5 cursor-text";
    if (status === "success")
      return `${base} border-emerald-400 bg-emerald-50 text-emerald-600 shadow-[0_4px_14px_rgba(52,211,153,0.25)]`;
    if (shake && digit)
      return `${base} border-red-400 bg-red-50 text-red-500`;
    if (digit)
      return `${base} border-rose-500 bg-rose-50 text-rose-700 shadow-[0_4px_14px_rgba(244,63,94,0.2)]`;
    return `${base} border-rose-200 bg-white text-slate-700 hover:border-rose-400 focus:border-rose-500 focus:bg-rose-50 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.15)]`;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .font-playfair { font-family: 'Playfair Display', serif; }
        .font-dm       { font-family: 'DM Sans', sans-serif; }
        .font-dmm      { font-family: 'DM Mono', monospace; }

        /* ── Keyframes ── */
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(60px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-40px); }
          to   { opacity: 1; transform: translateY(0);     }
        }
        @keyframes pop-in {
          0%   { opacity: 0; transform: scale(0) rotate(-15deg); }
          65%  { opacity: 1; transform: scale(1.15) rotate(4deg); }
          100% { opacity: 1; transform: scale(1)    rotate(0deg); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes shake-x {
          0%,100% { transform: translateX(0); }
          18%     { transform: translateX(-8px); }
          36%     { transform: translateX(8px); }
          54%     { transform: translateX(-5px); }
          72%     { transform: translateX(5px); }
        }
        @keyframes toast-pop {
          0%   { opacity: 0; transform: translateX(-50%) scale(0.85) translateY(8px); }
          60%  { opacity: 1; transform: translateX(-50%) scale(1.04) translateY(-2px); }
          100% { opacity: 1; transform: translateX(-50%) scale(1)    translateY(0);   }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0;   }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes dot-bounce {
          0%,80%,100% { transform: translateY(0);    opacity: 0.35; }
          40%          { transform: translateY(-5px); opacity: 1;    }
        }
        @keyframes float-blob {
          0%,100% { transform: translate(0,0)   scale(1);    }
          33%     { transform: translate(18px,-12px) scale(1.05); }
          66%     { transform: translate(-10px,8px)  scale(0.96); }
        }
        @keyframes petal-spin {
          from { transform: rotate(0deg)   scale(1);    opacity: 0.18; }
          50%  { transform: rotate(180deg) scale(1.08); opacity: 0.28; }
          to   { transform: rotate(360deg) scale(1);    opacity: 0.18; }
        }
        @keyframes checkmark-draw {
          from { stroke-dashoffset: 50; }
          to   { stroke-dashoffset: 0; }
        }

        .animate-slide-up  { animation: slide-up  0.7s cubic-bezier(0.34,1.45,0.64,1) both; }
        .animate-slide-dn  { animation: slide-down 0.5s cubic-bezier(0.34,1.45,0.64,1) both; }
        .animate-pop-in    { animation: pop-in     0.55s cubic-bezier(0.34,1.56,0.64,1) both; }
        .animate-fade-up   { animation: fade-in-up 0.45s ease both; }
        .animate-shake     { animation: shake-x    0.5s ease; }
        .animate-toast     { animation: toast-pop  0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
        .animate-spin-slow { animation: spin       0.75s linear infinite; }
        .animate-blob      { animation: float-blob 9s ease-in-out infinite; }
        .animate-petal     { animation: petal-spin 12s linear infinite; }

        .delay-0   { animation-delay: 0ms; }
        .delay-100 { animation-delay: 100ms; }
        .delay-150 { animation-delay: 150ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }
        .delay-600 { animation-delay: 600ms; }
        .delay-700 { animation-delay: 700ms; }

        .dot-1 { animation: dot-bounce 1.1s ease-in-out 0s infinite; }
        .dot-2 { animation: dot-bounce 1.1s ease-in-out 0.18s infinite; }
        .dot-3 { animation: dot-bounce 1.1s ease-in-out 0.36s infinite; }

        .pulse-ring {
          position: absolute; inset: -5px;
          border-radius: 22px;
          border: 2.5px solid rgba(244,63,94,0.45);
          animation: pulse-ring 1.4s ease-out infinite;
          pointer-events: none;
        }

        .checkmark-path {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: checkmark-draw 0.45s ease 0.1s forwards;
        }

        /* Rose gradient button */
        .btn-rose {
          background: linear-gradient(135deg, #fb7185 0%, #f43f5e 45%, #e11d48 100%);
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .btn-rose:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 32px rgba(244,63,94,0.4);
          filter: brightness(1.05);
        }
        .btn-rose:active:not(:disabled) { transform: translateY(0); }

        /* Petals bg */
        .rose-bg {
          background-color: #fff1f2;
          background-image:
            radial-gradient(circle at 20% 20%, rgba(251,113,133,0.18) 0%, transparent 40%),
            radial-gradient(circle at 80% 80%, rgba(244,63,94,0.12) 0%, transparent 35%),
            radial-gradient(circle at 60% 10%, rgba(255,228,230,0.6) 0%, transparent 30%);
        }

        /* Input height fix */
        .h-13 { height: 3.25rem; }

        /* Card shine */
        .card-shine {
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.9) 0%,
            rgba(255,241,242,0.95) 50%,
            rgba(255,255,255,0.9) 100%
          );
        }

        /* Floating hearts */
        @keyframes heart-float {
          0%   { transform: translateY(0) scale(1) rotate(0deg); opacity: 0.7; }
          50%  { transform: translateY(-12px) scale(1.1) rotate(8deg); opacity: 1; }
          100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 0.7; }
        }
        .heart-1 { animation: heart-float 3.5s ease-in-out infinite; }
        .heart-2 { animation: heart-float 4.2s ease-in-out 0.8s infinite; }
        .heart-3 { animation: heart-float 3.8s ease-in-out 1.6s infinite; }
      `}</style>

      <div className="font-dm min-h-screen rose-bg flex items-center justify-center p-4 relative overflow-hidden">

        {/* ── Decorative blobs ── */}
        <div className="animate-blob absolute -top-24 -left-24 w-96 h-96 rounded-full bg-rose-200 opacity-40 blur-3xl pointer-events-none" />
        <div className="animate-blob delay-300 absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-pink-200 opacity-35 blur-3xl pointer-events-none" />
        <div className="animate-blob delay-100 absolute top-1/3 right-1/4 w-56 h-56 rounded-full bg-red-100 opacity-50 blur-2xl pointer-events-none" />

        {/* ── Decorative petal rings ── */}
        <div className="animate-petal absolute top-10 right-10 w-40 h-40 rounded-full border-[3px] border-rose-200 border-dashed opacity-40 pointer-events-none" />
        <div className="animate-petal delay-300 absolute bottom-10 left-10 w-28 h-28 rounded-full border-2 border-pink-300 border-dotted opacity-35 pointer-events-none" style={{animationDirection:'reverse'}} />

        {/* ── Floating heart accents ── */}
        <div className="heart-1 absolute top-16 left-16 text-rose-300 text-2xl select-none pointer-events-none">♥</div>
        <div className="heart-2 absolute bottom-20 right-20 text-pink-300 text-xl select-none pointer-events-none">♥</div>
        <div className="heart-3 absolute top-1/2 left-8 text-rose-200 text-3xl select-none pointer-events-none">♥</div>

        {/* ── Main card (slide-up) ── */}
        <div
          className={`relative w-full max-w-sm transition-all duration-700 ${
            visible ? "animate-slide-up" : "opacity-0 translate-y-16"
          }`}
        >
          {/* Glow halo behind card */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-rose-400 to-pink-500 opacity-20 blur-2xl scale-105 pointer-events-none" />

          <div className="relative card-shine rounded-3xl shadow-[0_28px_72px_rgba(244,63,94,0.18),0_6px_20px_rgba(0,0,0,0.07)] border border-rose-100 overflow-hidden">

            {/* Top shimmer bar */}
            <div className="h-1.5 bg-gradient-to-r from-rose-300 via-pink-500 to-rose-400" />

            {/* ── Header band ── */}
            <div className="animate-slide-dn delay-100 bg-gradient-to-br from-rose-500 to-pink-600 px-8 pt-8 pb-6 text-center relative overflow-hidden">
              {/* subtle inner shine */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

              {/* Icon */}
              <div className="animate-pop-in delay-200 relative mx-auto mb-4 w-16 h-16">
                {status === "loading" && <div className="pulse-ring" style={{borderColor:'rgba(255,255,255,0.5)'}} />}
                <div className={`w-full h-full rounded-2xl flex items-center justify-center shadow-xl border-2 border-white/30 transition-all duration-500 ${
                  status === "success"
                    ? "bg-gradient-to-br from-emerald-300 to-teal-400"
                    : "bg-white/20 backdrop-blur-sm"
                }`}>
                  {status === "success" ? (
                    <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline className="checkmark-path" points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="3" />
                      <polyline points="2,4 12,13 22,4" />
                    </svg>
                  )}
                </div>
              </div>

              <div className="animate-fade-up delay-300">
                <h1 className="font-playfair text-2xl font-bold text-white drop-shadow-sm leading-tight">
                  {status === "success" ? "You're Verified!" : "OTP Verification"}
                </h1>
                <p className="font-dmm text-rose-100 text-[12.5px] mt-1.5 leading-relaxed">
                  {status === "success"
                    ? "Your identity has been confirmed ♥"
                    : <>Code sent to <span className="text-white font-semibold">user@email.com</span></>}
                </p>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="px-8 py-7">

              {/* Progress pips */}
              <div className="animate-fade-up delay-400 flex justify-center gap-1.5 mb-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                      i < filled
                        ? status === "success"
                          ? "bg-emerald-400 w-7"
                          : "bg-rose-500 w-7"
                        : "bg-rose-100 w-2.5"
                    }`}
                  />
                ))}
              </div>

              {/* Label */}
              <div className="animate-fade-up delay-400 text-center mb-4">
                <p className="font-dmm text-[11.5px] text-rose-400 uppercase tracking-widest font-medium">
                  Enter 6-digit code
                </p>
              </div>

              {/* OTP inputs */}
              <div
                className={`animate-fade-up delay-500 flex items-center justify-center gap-2 mb-7 ${shake ? "animate-shake" : ""}`}
              >
                {otp.map((digit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      value={digit}
                      ref={(el) => (inputsRef.current[index] = el)}
                      onChange={(e) => handleChange(e.target.value, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onPaste={handlePaste}
                      disabled={status === "loading" || status === "success"}
                      className={`font-dmm h-13 w-11 ${getInputClass(digit)} disabled:cursor-not-allowed disabled:opacity-60`}
                    />
                    {index === 2 && (
                      <span className="text-rose-300 text-sm font-light select-none">—</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Verify button */}
              <div className="animate-fade-up delay-600">
                <button
                  onClick={handleSubmit}
                  disabled={!isComplete || status === "loading" || status === "success"}
                  className={`w-full py-3.5 rounded-2xl text-white text-sm font-bold tracking-wide shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none ${
                    status === "success"
                      ? "bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_8px_24px_rgba(52,211,153,0.35)]"
                      : "btn-rose shadow-[0_8px_28px_rgba(244,63,94,0.35)]"
                  }`}
                >
                  {status === "loading" ? (
                    <span className="flex items-center justify-center gap-2.5">
                      <span
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block animate-spin-slow"
                      />
                      <span>Verifying</span>
                      <span className="flex gap-0.5 items-center">
                        <span className="w-1 h-1 bg-white/80 rounded-full dot-1" />
                        <span className="w-1 h-1 bg-white/80 rounded-full dot-2" />
                        <span className="w-1 h-1 bg-white/80 rounded-full dot-3" />
                      </span>
                    </span>
                  ) : status === "success" ? (
                    "✓  All Done!"
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Verify OTP
                    </span>
                  )}
                </button>
              </div>

              {/* Resend */}
              <div className="animate-fade-up delay-700 text-center mt-5">
                <p className="font-dmm text-[12px] text-slate-400">
                  Didn't receive the code?{" "}
                  <button
                    onClick={handleResend}
                    disabled={resendTimer > 0 || status === "success"}
                    className="text-rose-500 font-semibold hover:text-rose-700 hover:underline underline-offset-2 transition-colors disabled:text-slate-300 disabled:cursor-default"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend"}
                  </button>
                </p>
              </div>

              {/* Demo hint */}
              <div className="animate-fade-up delay-700 mt-5 px-4 py-2.5 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                <p className="font-dmm text-[11px] text-rose-400">
                  Demo OTP →{" "}
                  <span className="font-bold text-rose-600 tracking-[0.2em]">1 2 3 4 5 6</span>
                </p>
              </div>
            </div>
          </div>

          {/* ── Toast (popup) ── */}
          {toast && (
            <div
              className={`animate-toast absolute -bottom-14 left-1/2 px-5 py-2.5 rounded-2xl text-[12.5px] font-semibold font-dmm whitespace-nowrap shadow-xl border backdrop-blur-sm ${
                toast.type === "success"
                  ? "bg-emerald-50/95 text-emerald-700 border-emerald-200"
                  : toast.type === "error"
                  ? "bg-red-50/95 text-red-600 border-red-200"
                  : "bg-rose-50/95 text-rose-700 border-rose-200"
              }`}
            >
              {toast.msg}
            </div>
          )}
        </div>
      </div>
    </>
  );
}