import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import InputField, { IconMail, IconLock, IconUser } from '../builder/InputField'
import CropModal from '../builder/CropModal'
import backImg from '/back.png'
import toast from 'react-hot-toast'
import { useDispatch, useSelector } from "react-redux";
import { registerUser } from "../../redux/authSlice";


const IconCamera = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx={12} cy={13} r={4} />
  </svg>
)

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm]= useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors]         = useState({})
  const [imageFile, setImageFile] = useState(null)
  const [cropSrc, setCropSrc]       = useState(null)
  // const [Loading, setLoading]       = useState(false)
  const fileRef = useRef(null)
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);


  const base64ToFile = (base64, filename = "profile.jpg") => {
  const arr = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}; 

  const ch = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.name)     errs.name     = 'Name is required'
    if (!form.email)    errs.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 6) errs.password = 'Minimum 6 characters'
    if (!form.confirm)  errs.confirm  = 'Please confirm your password'
    else if (form.confirm !== form.password) errs.confirm = 'Passwords do not match'
    return errs
  }

const handleSubmit = async () => {
  const errs = validate();
  if (Object.keys(errs).length) {
    setErrors(errs);
    return;
  }

  const formData = new FormData();

  formData.append("name", form.name);
  formData.append("email", form.email);
  formData.append("password", form.password);

  if (imageFile) {
    formData.append("profileImage", imageFile);
  }
  
  try {
    const res = await dispatch(registerUser(formData));

    toast.success("Registered successfully 🎉");

    
    setTimeout(() => {
      // navigate("/verify");
       localStorage.setItem("email", form.email)
      navigate("/verify", { state: { email: form.email } })
    }, 2000);

  } catch (err) {

    toast.error(err?.message || "Registration failed ❌");
  }
};
  
  return (
    <>
      {cropSrc && (
        <CropModal
          src={cropSrc}
         onApply={(url) => {
            const file = base64ToFile(url); // ✅ FIXED
            setImageFile(file);
            setCropSrc(null);
          }}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <div
        className="relative w-full h-screen overflow-hidden flex items-center justify-center"
        style={{
          backgroundImage: `url(${backImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >

        <div className="absolute inset-0 bg-white/10 pointer-events-none" />


        <div
          className="card-in relative z-10 overflow-hidden"
          style={{
            width: 530,
            borderRadius: 28,
            boxShadow: '0 30px 80px rgba(196,90,90,0.25), 0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <div className="absolute inset-0 bg-white/80 backdrop-blur-2xl" />
          <div
            className="absolute inset-0 border border-rose-200/70 pointer-events-none"
            style={{ borderRadius: 28 }}
          />

          <div className="relative z-10 p-7 flex gap-6 items-start">
            <div className="flex-1 min-w-0">
              <div className="mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-400/50 mb-2.5">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx={12} cy={7} r={4} />
                  </svg>
                </div>
                <h1 className="text-xl font-black text-rose-950 tracking-tight">Create Account</h1>
                <p className="text-xs font-semibold text-rose-400 mt-0.5">Join us today — it's free!</p>
              </div>

              <div className="flex flex-col gap-2.5">
                <InputField
                  type="text" name="name" placeholder="Full name"
                  value={form.name} onChange={ch}
                  icon={<IconUser />} accentColor="rose" error={errors.name}
                />
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
                <InputField
                  type="password" name="confirm" placeholder="Confirm password"
                  value={form.confirm} onChange={ch}
                  icon={<IconLock />} accentColor="rose" error={errors.confirm}
                />

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`mt-1 w-full py-3 rounded-xl text-sm font-extrabold text-white transition-all duration-200 active:scale-95 shadow-lg cursor-pointer
                    ${loading ? 'bg-rose-300 cursor-not-allowed' : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:-translate-y-0.5 shadow-rose-400/40 hover:shadow-rose-400/60'}`}
                >
                  {loading ? 'Creating account…' : 'Create Account →'}
                </button>
              </div>

              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-rose-200/60" />
                <span className="text-[10px] text-rose-300 font-semibold">or</span>
                <div className="flex-1 h-px bg-rose-200/60" />
              </div>

              <p className="text-center text-xs font-semibold text-rose-400">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="font-extrabold text-rose-600 underline underline-offset-2 hover:text-rose-800 transition-colors bg-transparent border-none cursor-pointer text-xs"
                >
                  Login
                </button>
              </p>
            </div>

            {/* ── RIGHT: PHOTO UPLOAD ── */}
            <div className="w-36 flex-shrink-0 flex flex-col items-center gap-3 pt-1">
              <p className="text-[11px] font-extrabold text-rose-500 text-center leading-snug">
                Profile Photo<br />
                <span className="font-semibold text-rose-400">(optional)</span>
              </p>

              <div
                onClick={() => fileRef.current?.click()}
                className="w-28 h-28 rounded-full flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-200 hover:scale-105"
                style={{
                  border:         imageFile ? '3px solid #f43f5e' : '2.5px dashed #fda4af',
                  background:     'rgba(255,255,255,0.60)',
                  backdropFilter: 'blur(6px)',
                }}
              >
                {imageFile
                  ? <img src={URL.createObjectURL(imageFile)} alt="profile" className="w-full h-full object-cover" />
                  : (
                    <div className="flex flex-col items-center gap-1.5 text-rose-300">
                      <IconCamera />
                      <span className="text-[10px] font-bold text-center leading-tight px-2">Tap to add</span>
                    </div>
                  )
                }
              </div>

              {imageFile && (
                <div className="flex items-center gap-1.5 -mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-bold text-rose-500">Added ✓</span>
                </div>
              )}

              <button
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-rose-500 to-pink-500 shadow-lg shadow-rose-400/40 hover:-translate-y-0.5 hover:shadow-rose-400/60 transition-all duration-200 whitespace-nowrap cursor-pointer"
              >{imageFile ? '✏️ Change' : '📷 Upload'}</button>

              {imageFile && (
                <button
                  onClick={() => setImageFile(null)}
                  className="text-[11px] font-bold text-rose-400 underline underline-offset-2 hover:text-rose-600 transition-colors bg-transparent border-none cursor-pointer">Remove</button>
              )}

              <p className="text-[10px] text-rose-300 text-center leading-relaxed">
                Auto cropped<br />to a circle ✨
              </p>

              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files[0] 
                if (!f) return
                  const r = new FileReader()
                  r.onload = ev => setCropSrc(ev.target.result)
                  r.readAsDataURL(f)
                  e.target.value = ''
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
