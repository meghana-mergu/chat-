import { useState, useEffect, useRef, useCallback } from "react";
import { 
  MdOutlineInfo, MdSearch, MdCheckCircleOutline, MdOutlineNotificationsOff,
  MdOutlineTimer, MdOutlineFavoriteBorder, MdOutlineListAlt, MdHighlightOff,
  MdOutlineThumbDownOffAlt, MdBlock, MdOutlineRemoveCircleOutline, MdOutlineDeleteOutline
} from "react-icons/md";
import { socket, connectSocket, disconnectSocket } from "../../services/chatSocket";

/* ─── Avatar Component ────────────────────────────────────────────────────── */
const initials = name => name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "U";

function Avatar({ c, size = 42 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: c.color || "#f43f5e", // Rose primary accent
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 700, color: "#fff",
      letterSpacing: "0.5px", userSelect: "none",
      boxShadow: "0 4px 10px rgba(244,63,94,0.3)"
    }}>{c.avatar || initials(c.name)}</div>
  );
}

function StatusDot({ status }) {
  const map = { online: "#10b981", away: "#fbbf24", offline: "#94a3b8" }; // Emerald, Amber, Slate
  return (
    <div style={{
      width: 10, height: 10, borderRadius: "50%",
      background: map[status] || "#94a3b8",
      border: "2px solid #ffffff",
      position: "absolute", bottom: 1, right: 1,
    }} />
  );
}

function Tick({ status }) {
  if (status === "sent")      return <span style={{ color: "#94a3b8", fontSize: 11 }}>✓</span>;
  if (status === "delivered") return <span style={{ color: "#94a3b8", fontSize: 11 }}>✓✓</span>;
  if (status === "read")      return <span style={{ color: "#0ea5e9", fontSize: 11 }}>✓✓</span>; // Sky blue
  return null;
}

function Spinner() {
  return <div style={{ width: 14, height: 14, border: "2px solid rgba(244,63,94,0.2)", borderTopColor: "#f43f5e", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />;
}

/* ─── Add Contact Modal ───────────────────────────────────────────────────── */
function AddContactModal({ existingIds, onAdd, onClose }) {
  const [gmail, setGmail]     = useState("");
  const [phase, setPhase]     = useState("input"); // input | searching | found | notfound | already
  const [found, setFound]     = useState(null);
  const inputRef              = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  useEffect(() => {
    const onResult = ({ success, user }) => {
      if (!success) { setPhase("notfound"); return; }
      if (existingIds.includes(user.id)) { setFound(user); setPhase("already"); return; }
      setFound(user); setPhase("found");
    };
    socket.on("gmail_lookup_result", onResult);
    return () => socket.off("gmail_lookup_result", onResult);
  }, [existingIds]);

  const search = () => {
    const g = gmail.trim();
    if (!g || !g.includes("@")) return;
    setPhase("searching"); setFound(null);
    socket.emit("lookup_gmail", { gmail: g });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(255,241,242,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(5px)", animation: "fadeIn .15s ease" }}>
      <div style={{ background: "#ffffff", borderRadius: 18, width: 430, maxWidth: "93vw", boxShadow: "0 28px 72px rgba(244,63,94,0.15)", animation: "slideUp .22s ease", overflow: "hidden", border: "1px solid #ffe4e6" }}>

        {/* Header */}
        <div style={{ background: "#fff1f2", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #ffe4e6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(244,63,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👤</div>
            <div>
              <div style={{ color: "#881337", fontWeight: 700, fontSize: 15 }}>Add New Contact</div>
              <div style={{ color: "#fda4af", fontSize: 12 }}>Search by Gmail address</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fb7185", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "4px 8px" }}>✕</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Gmail Input */}
          <label style={{ color: "#f43f5e", fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>Gmail Address</label>
          <div style={{
            display: "flex", gap: 8, background: "#fffbfa", borderRadius: 10,
            border: "1.5px solid",
            borderColor: phase === "notfound" ? "#f43f5e" : phase === "found" ? "#10b981" : "#ffe4e6",
            padding: "10px 14px", transition: "border-color 0.2s", marginBottom: 12,
          }}>
            <span style={{ fontSize: 15 }}>✉️</span>
            <input ref={inputRef} value={gmail}
              onChange={e => { setGmail(e.target.value); if (phase !== "input") { setPhase("input"); setFound(null); } }}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="example@gmail.com"
              style={{ flex: 1, background: "none", border: "none", color: "#4c0519", fontSize: 14, outline: "none" }} />
            {gmail && <button onClick={() => { setGmail(""); setPhase("input"); setFound(null); }} style={{ background: "none", border: "none", color: "#fb7185", cursor: "pointer", fontSize: 15 }}>✕</button>}
          </div>

          <button onClick={search} disabled={phase === "searching" || !gmail.trim()}
            style={{
              width: "100%", padding: "12px", borderRadius: 10, border: "none",
              background: phase === "searching" || !gmail.trim() ? "#ffe4e6" : "#f43f5e",
              color: phase === "searching" || !gmail.trim() ? "#fb7185" : "#ffffff",
              fontSize: 14, fontWeight: 700, cursor: phase === "searching" ? "wait" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.18s",
              boxShadow: phase === "searching" || !gmail.trim() ? "none" : "0 4px 14px rgba(244,63,94,0.3)",
            }}>
            {phase === "searching" ? <><Spinner /> Searching...</> : "🔍  Search User"}
          </button>

          {/* Result States */}
          {phase === "notfound" && (
            <div style={{ marginTop: 14, background: "#fff1f2", border: "1px solid #ffe4e6", borderRadius: 10, padding: 14, display: "flex", gap: 10 }}>
              <span style={{ fontSize: 22 }}>❌</span>
              <div>
                <div style={{ color: "#e11d48", fontWeight: 700, fontSize: 14 }}>No account found</div>
                <div style={{ color: "#fb7185", fontSize: 13, marginTop: 3 }}>
                  <strong style={{ color: "#881337" }}>{gmail}</strong> is not registered.
                </div>
              </div>
            </div>
          )}

          {phase === "already" && found && (
            <div style={{ marginTop: 14, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 10, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
              <Avatar c={found} size={42} />
              <div>
                <div style={{ color: "#047857", fontWeight: 700, fontSize: 14 }}>Already in contacts</div>
                <div style={{ color: "#065f46", fontSize: 13, marginTop: 2 }}>{found.name}</div>
              </div>
            </div>
          )}

          {phase === "found" && found && (
            <div style={{ marginTop: 14, background: "#ffffff", borderRadius: 12, border: "1px solid #ffe4e6", overflow: "hidden", animation: "slideUp .2s ease", boxShadow: "0 4px 20px rgba(244,63,94,0.1)" }}>
              <div style={{ background: `linear-gradient(120deg, ${found.color || "#f43f5e"}1A 0%, transparent 70%)`, padding: "18px 18px 14px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ position: "relative" }}>
                  <Avatar c={found} size={56} />
                  <StatusDot status={found.status} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#4c0519", fontWeight: 700, fontSize: 16 }}>{found.name}</div>
                  <div style={{ color: "#fb7185", fontSize: 12, marginTop: 2 }}>{found.gmail}</div>
                  <div style={{ color: "#881337", fontSize: 12, marginTop: 5, opacity: 0.8 }}>{found.bio || "Available"}</div>
                </div>
                <div style={{ background: found.status === "online" ? "#ecfdf5" : "#f1f5f9", borderRadius: 20, padding: "4px 10px", color: found.status === "online" ? "#10b981" : "#64748b", fontSize: 11, fontWeight: 700 }}>
                  ● {found.status || "offline"}
                </div>
              </div>
              <div style={{ borderTop: "1px solid #ffe4e6", padding: "12px 16px", display: "flex", gap: 10 }}>
                <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #ffe4e6", background: "#fff1f2", color: "#fb7185", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => onAdd(found)} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#f43f5e", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  ✓ Add Contact
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main App ────────────────────────────────────────────────────────────── */
export default function ChatDashboard() {
  const [contacts, setContacts]   = useState([]); 
  const [messages, setMessages]   = useState({}); 
  const [active, setActive]       = useState(null);
  const [input, setInput]         = useState("");
  const [search, setSearch]       = useState("");
  const [typing, setTyping]       = useState({});
  const [showAdd, setShowAdd]     = useState(false);
  const [sidebar, setSidebar]     = useState(true);
  const [infoOpen, setInfoOpen]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [toast, setToast]         = useState(null);
  
  const endRef    = useRef(null);
  const typingRef = useRef(null);
  const currentUser = { id: "me", name: "Me", avatar: "M", color: "#f43f5e" }; // Replace with real logged in user from Redux

  useEffect(() => {
    connectSocket(currentUser.id);

    const onMsg = msg => {
      setMessages(p => ({ ...p, [msg.roomId]: [...(p[msg.roomId] || []), msg] }));
    };
    const onTyping = ({ userId, roomId }) => setTyping(p => ({ ...p, [userId]: true }));
    const onStopTyping = ({ userId }) => setTyping(p => { const n = { ...p }; delete n[userId]; return n; });
    
    socket.on("receive_message", onMsg);
    socket.on("user_typing", onTyping);
    socket.on("user_stop_typing", onStopTyping);

    return () => { 
      socket.off("receive_message", onMsg); 
      socket.off("user_typing", onTyping); 
      socket.off("user_stop_typing", onStopTyping); 
      disconnectSocket();
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setMenuOpen(false);
    if (menuOpen) document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [menuOpen]);

  const contact  = contacts.find(c => c.id === active) || null;
  const msgs     = active ? (messages[active] || []) : [];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  const send = useCallback(() => {
    if (!input.trim() || !active) return;
    const msg = { id: Date.now(), roomId: active, senderId: currentUser.id, receiverId: active, text: input.trim(), timestamp: new Date().toISOString(), status: "sent" };
    setMessages(p => ({ ...p, [active]: [...(p[active] || []), msg] }));
    socket.emit("send_message", msg);
    setInput("");
  }, [input, active]);

  const handleKey   = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const handleInput = e => {
    setInput(e.target.value);
    if (!active) return;
    socket.emit("typing", { roomId: active, receiverId: active });
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => socket.emit("stop_typing", { roomId: active }), 1500);
  };

  const addContact = user => {
    setContacts(p => [...p, { id: user.id, name: user.name, gmail: user.gmail, avatar: user.avatar, color: user.color, status: user.status, lastSeen: user.status === "online" ? "online" : "last seen recently", bio: user.bio || "" }]);
    if (!messages[user.id]) {
      setMessages(p => ({ ...p, [user.id]: [] }));
    }
    setActive(user.id);
    setShowAdd(false);
    setInfoOpen(false);
    setToast(`${user.name} added! 👋`);
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.gmail || "").toLowerCase().includes(search.toLowerCase()));
  const lastMsg  = id => { const m = messages[id] || []; return m[m.length - 1] || null; };
  const unread   = id => (messages[id] || []).filter(m => m.senderId !== currentUser.id && m.status !== "read").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-thumb{background:#fb7185;border-radius:6px}
        ::-webkit-scrollbar-track{background:transparent}
        input,textarea,button{font-family:'DM Sans',sans-serif}
        input:focus,textarea:focus{outline:none}
        
        @keyframes fadeIn  {from{opacity:0}to{opacity:1}}
        @keyframes slideUp {from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bubbleIn{from{opacity:0;transform:scale(.96) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes spin    {to{transform:rotate(360deg)}}
        @keyframes toastIn {from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes byounce {0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        
        /* Rose Theme specifics */
        .cr:hover{background:#fff1f2!important}.cr.on{background:#ffe4e6!important}
        .sb:hover{transform:scale(1.07);background:#e11d48!important}
        .ib:hover{background:rgba(244,63,94,.1)!important;border-radius:50%}
        .addb:hover{background:#e11d48!important;transform:translateY(-1px);box-shadow:0 8px 20px rgba(244,63,94,.35)!important}
        .td{animation:byounce 1.2s infinite}.td:nth-child(2){animation-delay:.2s}.td:nth-child(3){animation-delay:.4s}

        /* ── Rose Background Animations from OTPVerify ── */
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
        @keyframes menuPop {
          from { opacity: 0; transform: scale(0.95); transform-origin: top right; }
          to   { opacity: 1; transform: scale(1); transform-origin: top right; }
        }
        @keyframes heart-float {
          0%   { transform: translateY(0) scale(1) rotate(0deg); opacity: 0.7; }
          50%  { transform: translateY(-12px) scale(1.1) rotate(8deg); opacity: 1; }
          100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 0.7; }
        }
        .animate-blob      { animation: float-blob 9s ease-in-out infinite; }
        .animate-petal     { animation: petal-spin 12s linear infinite; }
        .heart-1 { animation: heart-float 3.5s ease-in-out infinite; }
        .heart-2 { animation: heart-float 4.2s ease-in-out 0.8s infinite; }
        .heart-3 { animation: heart-float 3.8s ease-in-out 1.6s infinite; }
        
        .rose-dashboard-bg {
          background-color: #fff1f2;
          background-image:
            radial-gradient(circle at 20% 20%, rgba(251,113,133,0.18) 0%, transparent 40%),
            radial-gradient(circle at 80% 80%, rgba(244,63,94,0.12) 0%, transparent 35%),
            radial-gradient(circle at 60% 10%, rgba(255,228,230,0.6) 0%, transparent 30%);
        }
      `}</style>

      {/* Main Container replacing body */}
      <div style={{ display: "flex", height: "100vh", width: "100%", fontFamily: "'DM Sans', sans-serif" }} className="rose-dashboard-bg relative overflow-hidden">
        
        {/* ── Decorative blobs & petals from OTP Verify ── */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="animate-blob absolute -top-24 -left-24 w-96 h-96 rounded-full bg-rose-200 opacity-40 blur-3xl pointer-events-none" />
          <div className="animate-blob delay-300 absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-pink-200 opacity-35 blur-3xl pointer-events-none" style={{animationDelay:"300ms"}} />
          <div className="animate-blob delay-100 absolute top-1/3 right-1/4 w-56 h-56 rounded-full bg-red-100 opacity-50 blur-2xl pointer-events-none" style={{animationDelay:"100ms"}} />

          <div className="animate-petal absolute top-10 right-10 w-40 h-40 rounded-full border-[3px] border-rose-200 border-dashed opacity-40 pointer-events-none" />
          <div className="animate-petal delay-300 absolute bottom-10 left-10 w-28 h-28 rounded-full border-2 border-pink-300 border-dotted opacity-35 pointer-events-none" style={{animationDirection:'reverse', animationDelay:"300ms"}} />

          {/* Floating hearts (exactly like OtpVerify) */}
          <div className="heart-1 absolute top-20 left-20 text-rose-300 text-4xl select-none pointer-events-none" style={{filter:"drop-shadow(0 2px 4px rgba(244,63,94,0.3))"}}>♥</div>
          <div className="heart-2 absolute bottom-24 right-20 text-pink-300 text-3xl select-none pointer-events-none" style={{filter:"drop-shadow(0 2px 4px rgba(244,63,94,0.3))"}}>♥</div>
          <div className="heart-3 absolute top-1/3 left-12 text-rose-200 text-5xl select-none pointer-events-none" style={{filter:"drop-shadow(0 2px 4px rgba(244,63,94,0.3))"}}>♥</div>
          <div className="heart-1 absolute top-12 right-1/3 text-rose-200 text-2xl select-none pointer-events-none" style={{animationDelay:"1s"}}>♥</div>
          <div className="heart-2 absolute bottom-12 left-1/3 text-pink-300 text-2xl select-none pointer-events-none" style={{animationDelay:"2s"}}>♥</div>
        </div>

        {/* ── Dashboard Glass Layout ── */}
        <div style={{ 
          display: "flex", flex: 1, margin: "24px", background: "rgba(255, 255, 255, 0.65)", 
          backdropFilter: "blur(20px)", borderRadius: "28px", 
          boxShadow: "0 28px 72px rgba(244,63,94,0.18), 0 6px 20px rgba(0,0,0,0.07)",
          border: "1px solid rgba(255, 255, 255, 0.6)", overflow: "hidden", zIndex: 10
        }}>
          {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
          <div style={{ width: sidebar ? 360 : 0, minWidth: sidebar ? 360 : 0, background: "rgba(255,255,255,0.7)", display: "flex", flexDirection: "column", borderRight: "1px solid #ffe4e6", transition: "width .25s,min-width .25s", overflow: "hidden" }}>

            {/* Top bar */}
            <div style={{ background: "rgba(255, 241, 242, 0.8)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #ffe4e6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar c={currentUser} size={42} />
                <div>
                  <div style={{ color: "#4c0519", fontWeight: 800, fontSize: 16 }}>Chats</div>
                  <div style={{ color: "#f43f5e", fontSize: 12, fontWeight: 600 }}>● Online</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {["💬","⋮"].map((ic,i) => <button key={i} className="ib" style={{ background: "none", border: "none", cursor: "pointer", color: "#fb7185", fontSize: 18, padding: "8px 10px", transition: "all .2s" }}>{ic}</button>)}
              </div>
            </div>

            {/* Search */}
            <div style={{ padding: "12px 16px" }}>
              <div style={{ background: "#ffffff", borderRadius: 12, display: "flex", alignItems: "center", padding: "10px 14px", gap: 10, border: "1px solid #ffe4e6", boxShadow: "0 2px 10px rgba(244,63,94,0.05)" }}>
                <span style={{ color: "#fb7185", fontSize: 16 }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." style={{ background: "none", border: "none", color: "#4c0519", fontSize: 14, flex: 1, outline: "none" }} />
              </div>
            </div>

            {/* Add Contact CTA */}
            <div style={{ padding: "0 16px 8px" }}>
              <button className="addb" onClick={() => setShowAdd(true)} style={{ width: "100%", background: "#f43f5e", border: "none", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "all .2s", boxShadow: "0 4px 14px rgba(244,63,94,0.3)" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "white" }}>＋</div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: "#ffffff", fontWeight: 700, fontSize: 15 }}>Find New Contacts</div>
                  <div style={{ color: "rgba(255,255,255,.8)", fontSize: 12 }}>Connect via Gmail</div>
                </div>
              </button>
            </div>

            {/* Contact List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {contacts.length === 0 && <div style={{ padding: "40px 20px", textAlign: "center", color: "#fb7185", fontSize: 14, fontWeight: 600 }}>Tap above to add your first contact!</div>}
              {filtered.length === 0 && contacts.length > 0 && <div style={{ padding: "20px", textAlign: "center", color: "#fb7185", fontSize: 13 }}>No contacts match your search</div>}
              {filtered.map(c => {
                const lm = lastMsg(c.id);
                const ur = unread(c.id);
                const on = active === c.id;
                return (
                  <div key={c.id} className={`cr${on ? " on" : ""}`} onClick={() => { setActive(c.id); setInfoOpen(false); }}
                    style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", borderBottom: "1px solid rgba(255,228,230,0.5)", background: on ? "#fff1f2" : "transparent", transition: "all .2s" }}>
                    <div style={{ position: "relative" }}><Avatar c={c} size={50} /><StatusDot status={c.status} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ color: "#4c0519", fontWeight: 700, fontSize: 15 }}>{c.name}</span>
                        {lm && <span style={{ color: ur > 0 ? "#f43f5e" : "#fb7185", fontSize: 11, fontWeight: ur > 0 ? 700 : 500 }}>
                          {new Date().toDateString() === new Date(lm.timestamp).toDateString() ? new Date(lm.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Yesterday'}
                        </span>}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <span style={{ color: active === c.id ? "#e11d48" : "#881337", opacity: 0.8, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 190 }}>
                          {lm ? <>{lm.senderId === currentUser.id && <Tick status={lm.status} />} {lm.text}</> : <em style={{opacity:0.6}}>Available to chat</em>}
                        </span>
                        {ur > 0 && <span style={{ background: "#f43f5e", color: "white", borderRadius: 999, minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, padding: "0 6px", boxShadow: "0 2px 8px rgba(244,63,94,0.4)" }}>{ur}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── CHAT AREA ────────────────────────────────────────────────── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, background: "rgba(255, 255, 255, 0.4)" }}>

            {!active ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#fb7185" }}>
                <div style={{ background: "rgba(244,63,94,0.1)", borderRadius: "50%", padding: "20px", marginBottom: "20px" }}>
                  <div style={{ fontSize: 64, animation: "float-blob 6s ease-in-out infinite" }}>💬</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#4c0519", marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>Your Messages</div>
                <div style={{ fontSize: 15, color: "#881337", opacity: 0.8 }}>Select a contact or add a new one to start chatting, ♥</div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div style={{ background: "rgba(255, 241, 242, 0.8)", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #ffe4e6", backdropFilter: "blur(4px)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <button className="ib" onClick={() => setSidebar(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fb7185", fontSize: 20, padding: "8px", transition: "all .2s" }}>☰</button>
                    <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setInfoOpen(v => !v)}>
                      <Avatar c={contact} size={44} />
                      <StatusDot status={contact.status} />
                    </div>
                    <div style={{ cursor: "pointer" }} onClick={() => setInfoOpen(v => !v)}>
                      <div style={{ color: "#4c0519", fontWeight: 800, fontSize: 16 }}>{contact.name}</div>
                      <div style={{ color: Object.keys(typing).length > 0 ? "#f43f5e" : "#fb7185", fontSize: 12, fontWeight: Object.keys(typing).length > 0 ? 700 : 500 }}>
                        {Object.keys(typing).length > 0 ? "Typing..." : contact.lastSeen}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, position: "relative" }}>
                    {["📞","🎥","🔍"].map((ic,i) => <button key={i} className="ib" style={{ background: "none", border: "none", cursor: "pointer", color: "#fb7185", fontSize: 18, padding: "8px 10px", transition: "all .2s" }}>{ic}</button>)}
                    
                    {/* The 3 Dots Menu Button */}
                    <button className="ib" onClick={(e) => { e.stopPropagation(); setMenuOpen(v=>!v); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#fb7185", fontSize: 18, padding: "8px 10px", transition: "all .2s" }}>⋮</button>
                    
                    {/* Dropdown Menu */}
                    {menuOpen && (
                      <div style={{ position: "absolute", top: "100%", right: 5, background: "#ffffff", borderRadius: 12, padding: "8px 0", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", minWidth: 220, zIndex: 100, border: "1px solid #ffe4e6", animation: "menuPop .15s ease-out" }}>
                        {[
                          { l: "Contact info", i: <MdOutlineInfo size={19} />, action: () => setInfoOpen(true) },
                          { l: "Search", i: <MdSearch size={19} /> },
                          { l: "Select messages", i: <MdCheckCircleOutline size={19} /> },
                          { l: "Mute notifications", i: <MdOutlineNotificationsOff size={19} /> },
                          { l: "Disappearing messages", i: <MdOutlineTimer size={19} /> },
                          { l: "Add to favourites", i: <MdOutlineFavoriteBorder size={19} /> },
                          { l: "Add to list", i: <MdOutlineListAlt size={19} /> },
                          { l: "Close chat", i: <MdHighlightOff size={19} /> },
                          { div: true },
                          { l: "Report", i: <MdOutlineThumbDownOffAlt size={19} /> },
                          { l: "Block", i: <MdBlock size={19} /> },
                          { l: "Clear chat", i: <MdOutlineRemoveCircleOutline size={19} /> },
                          { l: "Delete chat", i: <MdOutlineDeleteOutline size={19} /> },
                        ].map((item, idx) => item.div ? (
                          <div key={idx} style={{ height: 1, background: "#f1f5f9", margin: "6px 0" }} />
                        ) : (
                          <button key={idx} onClick={() => { setMenuOpen(false); if(item.action) item.action(); }} style={{ width: "100%", textAlign: "left", padding: "10px 18px", background: "none", border: "none", cursor: "pointer", color: "#334155", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 14, transition: "background .15s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                            <span style={{ color: "#64748b" }}>{item.i}</span>
                            {item.l}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 8%", background: "transparent" }}>
                  {msgs.length === 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", paddingTop: "40px", color: "#fb7185" }}>
                      <div style={{ fontSize: 52, marginBottom: 12, animation: "bounce 2s infinite" }}>👋</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#881337" }}>Say hello to {contact.name}!</div>
                      <div style={{ fontSize: 14, marginTop: 5, color: "#fb7185" }}>Messages are end-to-end encrypted</div>
                    </div>
                  )}
                  {msgs.map((msg, i) => {
                    const isMe = msg.senderId === currentUser.id;
                    const showDate = i === 0 || new Date(msg.timestamp).toDateString() !== new Date(msgs[i-1]?.timestamp).toDateString();
                     //! FIXING THE MAP
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
                            <span style={{ background: "#fff1f2", color: "#e11d48", fontWeight: 600, fontSize: 11, padding: "6px 14px", borderRadius: 12, border: "1px solid #ffe4e6", boxShadow: "0 2px 8px rgba(244,63,94,0.05)" }}>
                              {new Date(msg.timestamp).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}
                            </span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 8, animation: "bubbleIn .2s cubic-bezier(0.34,1.56,0.64,1)" }}>
                          <div style={{ maxWidth: "65%", padding: "10px 14px 6px", background: isMe ? "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)" : "#ffffff", color: isMe ? "white" : "#4c0519", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px", boxShadow: isMe ? "0 4px 14px rgba(244,63,94,0.3)" : "0 4px 14px rgba(0,0,0,0.05)", border: isMe ? "none" : "1px solid #ffe4e6" }}>
                            <div style={{ fontSize: 14.5, lineHeight: 1.5, wordBreak: "break-word", fontWeight: 500 }}>{msg.text}</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 4 }}>
                              <span style={{ color: isMe ? "rgba(255,255,255,0.8)" : "#fb7185", fontSize: 10, fontWeight: 600 }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && <Tick status={msg.status} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(typing).length > 0 && (
                    <div style={{ display: "flex", marginBottom: 8 }}>
                      <div style={{ background: "#ffffff", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", display: "flex", gap: 6, alignItems: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.05)", border: "1px solid #ffe4e6" }}>
                        {[0,1,2].map(i => <div key={i} className="td" style={{ width: 8, height: 8, borderRadius: "50%", background: "#fb7185" }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>

                {/* Input bar */}
                <div style={{ background: "rgba(255, 241, 242, 0.8)", padding: "12px 20px", display: "flex", alignItems: "flex-end", gap: 12, borderTop: "1px solid #ffe4e6", backdropFilter: "blur(4px)" }}>
                  <button className="ib" style={{ background: "none", border: "none", cursor: "pointer", color: "#fb7185", fontSize: 24, padding: "8px", transition: "all .2s" }}>😊</button>
                  <button className="ib" style={{ background: "none", border: "none", cursor: "pointer", color: "#fb7185", fontSize: 22, padding: "8px", transition: "all .2s" }}>📎</button>
                  
                  <div style={{ flex: 1, background: "#ffffff", borderRadius: 16, padding: "10px 16px", display: "flex", alignItems: "center", border: "1px solid #ffe4e6", boxShadow: "inset 0 2px 4px rgba(244,63,94,0.03)" }}>
                    <textarea value={input} onChange={handleInput} onKeyDown={handleKey} placeholder={`Message ${contact.name}...`} rows={1}
                      style={{ background: "none", border: "none", color: "#4c0519", fontSize: 14, flex: 1, resize: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto", outline: "none", fontWeight: 500 }} />
                  </div>
                  
                  <button className="sb" onClick={send} style={{ background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)", border: "none", borderRadius: "50%", width: 48, height: 48, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "white", transition: "all .2s", flexShrink: 0, boxShadow: "0 8px 18px rgba(244,63,94,0.35)" }}>
                    {input.trim() ? "➤" : "🎤"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── INFO PANEL ───────────────────────────────────────────────── */}
          {infoOpen && active && (
            <div style={{ width: 320, background: "rgba(255,255,255,0.7)", borderLeft: "1px solid #ffe4e6", display: "flex", flexDirection: "column", overflowY: "auto", animation: "slideUp .25s cubic-bezier(0.34,1.56,0.64,1)" }}>
              <div style={{ background: "rgba(255, 241, 242, 0.8)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid #ffe4e6" }}>
                <button onClick={() => setInfoOpen(false)} style={{ background: "none", border: "none", color: "#fb7185", fontSize: 20, cursor: "pointer", transition: "all .2s" }}>✕</button>
                <span style={{ color: "#881337", fontWeight: 800, fontSize: 16 }}>Contact Info</span>
              </div>
              
              <div style={{ padding: "30px 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "1px solid #ffe4e6" }}>
                <Avatar c={contact} size={84} />
                <div style={{ color: "#4c0519", fontWeight: 800, fontSize: 20, mt: 16, marginTop: "16px" }}>{contact.name}</div>
                <div style={{ color: "#f43f5e", fontSize: 13, fontWeight: 600, marginTop: 4 }}>{contact.gmail}</div>
                <div style={{ color: "#881337", fontSize: 13, marginTop: 8, opacity: 0.8, fontStyle: "italic", textAlign: "center" }}>{contact.bio || "Busy building dreams 💖"}</div>
              </div>

              <div style={{ padding: "20px" }}>
                {[{ l: "Status", v: contact.lastSeen }, { l: "Email Address", v: contact.gmail }, { l: "Messages Exchanged", v: `${msgs.length} total` }].map(({ l, v }) => (
                  <div key={l} style={{ background: "#ffffff", borderRadius: 12, padding: "14px 16px", marginBottom: "12px", border: "1px solid #ffe4e6", boxShadow: "0 2px 10px rgba(244,63,94,0.03)" }}>
                    <div style={{ color: "#fb7185", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{l}</div>
                    <div style={{ color: "#4c0519", fontSize: 14, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ padding: "8px 20px 24px", marginTop: "auto" }}>
                <button style={{ width: "100%", background: "#fff1f2", border: "2px solid #fecdd3", borderRadius: 12, padding: "14px", color: "#e11d48", cursor: "pointer", fontSize: 14, fontWeight: 700, transition: "all .2s", boxShadow: "0 4px 12px rgba(225,29,72,0.1)" }}>
                  🚫 Block {contact.name.split(' ')[0]}
                </button>
              </div>
            </div>
          )}

          {/* ── ADD MODAL ────────────────────────────────────────────────── */}
          {showAdd && <AddContactModal existingIds={contacts.map(c => c.id)} onAdd={addContact} onClose={() => setShowAdd(false)} />}

          {/* ── TOAST ────────────────────────────────────────────────────── */}
          {toast && (
            <div style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", fontWeight: 700, fontSize: 14, padding: "14px 28px", borderRadius: 999, boxShadow: "0 12px 32px rgba(16,185,129,0.4)", animation: "toastIn .3s cubic-bezier(0.34,1.56,0.64,1)", zIndex: 200, whiteSpace: "nowrap", border: "1px solid #34d399" }}>
              {toast}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
