import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setActiveUser, setSelectedContact } from '../../redux/chatSlice';
import { io } from 'socket.io-client';
import { useCollection, useLiveQuery } from 'ikago';
import { getConversationId } from '../services/ikagoDb';

const socket = io("https://mes-ioa3.onrender.com/");

export default function HomePage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { activeUser } = useSelector((state) => state.chat);

    // ── IKAGO HOOKS ──
    const contacts = useCollection("contacts");
    const messagesStore = useCollection("messages");
    const allContacts = useLiveQuery("contacts") || [];

    // Refs so socket closures always see latest values
    const contactsRef = useRef(null);
    const messagesStoreRef = useRef(null);
    const selectedChatRef = useRef(null);
    const activeUserRef = useRef(activeUser);
    const pendingMsgsRef = useRef([]); // messages queued for new contacts before userId resolves

    useEffect(() => { contactsRef.current = contacts; }, [contacts]);
    useEffect(() => { messagesStoreRef.current = messagesStore; }, [messagesStore]);
    useEffect(() => { activeUserRef.current = activeUser; }, [activeUser]);

    // ── STATE ──
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedChat, setSelectedChat] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [connected, setConnected] = useState(false);
    const [onlineUserIds, setOnlineUserIds] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [showProfile, setShowProfile] = useState(false);
    const [sendError, setSendError] = useState('');
    const [notifications, setNotifications] = useState([]); // toast notifications
    const [musicState, setMusicState] = useState({ songId: null, isPlaying: false, currentTime: 0 });

    const audioRef = useRef(null);
    const bottomRef = useRef(null);

    // Keep selectedChat ref in sync
    useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

    // ── CONVERSATION ID ──
    const currentConvId = (selectedChat?.userId && activeUser?._id)
        ? getConversationId(activeUser._id, selectedChat.userId)
        : null;

    // ── LOAD MESSAGES FROM INDEXEDDB ──
    useEffect(() => {
        if (!currentConvId || !messagesStore) {
            if (!selectedChat?.isNew) setChatMessages([]);
            return;
        }
        messagesStore
            .where(m => m.conversationId === currentConvId)
            .then(msgs => setChatMessages([...msgs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))))
            .catch(console.error);
    }, [currentConvId, messagesStore]);

    // ── AUTO SCROLL ──
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // ── SOCKET SETUP ──
    useEffect(() => {
        if (!activeUser) { navigate('/'); return; }
        if (socket.connected) socket.emit('user-online', activeUser._id);

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('user-online', activeUser._id);
        });
        socket.on('disconnect', () => setConnected(false));
        socket.on('user-status', (data) => setOnlineUserIds(data.onlineUsers || []));

        socket.on('receive-private-message', async (data) => {
            const cDB = contactsRef.current;
            const mDB = messagesStoreRef.current;
            const me = activeUserRef.current;
            if (!me || !data.fromUserId) return;

            const convId = getConversationId(me._id, data.fromUserId);

            const currentSel = selectedChatRef.current;
            const isActiveChat = currentSel?.userId === data.fromUserId;

            // Auto-save / update sender contact with unread count
            if (cDB) {
                try {
                    const existing = await cDB.where(c => c.userId === data.fromUserId);
                    if (!existing.length) {
                        await cDB.add({
                            userId: data.fromUserId,
                            email: data.fromEmail || data.fromUserId,
                            name: data.fromName || (data.fromEmail ? data.fromEmail.split("@")[0] : null) || data.fromUserId || 'Someone',
                            unread: isActiveChat ? 0 : 1,
                            isRequest: true // first-ever message = chat request
                        });
                    } else if (!isActiveChat) {
                        const c = existing[0];
                        await cDB.update({ ...c, unread: (c.unread || 0) + 1 });
                    }
                } catch (e) { console.error('Contact save error:', e); }
            }

            // Save message to IndexedDB
            if (mDB) {
                try {
                    await mDB.add({
                        conversationId: convId,
                        fromUserId: data.fromUserId,
                        toUserId: me._id,
                        text: data.message,
                        type: data.type || 'text',
                        timestamp: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
                        isMe: false
                    });

                    if (isActiveChat) {
                        // Live update — reload messages for the open chat
                        const msgs = await mDB.where(m => m.conversationId === convId);
                        setChatMessages([...msgs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
                    } else {
                        // Show a toast notification for messages received in background
                        const notifId = Date.now() + Math.random();
                        const senderLabel = data.fromName && data.fromName !== 'User'
                            ? data.fromName
                            : (data.fromEmail || 'Someone');
                        setNotifications(prev => [...prev, {
                            id: notifId,
                            fromUserId: data.fromUserId,
                            senderLabel,
                            message: data.type === 'text' ? data.message : `Sent a ${data.type || 'file'}`,
                            type: data.type || 'text'
                        }]);
                        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== notifId)), 6000);
                    }
                } catch (e) { console.error('Message save error:', e); }
            }
        });

        socket.on('message-sent', async (data) => {
            const cDB = contactsRef.current;
            const mDB = messagesStoreRef.current;
            const selected = selectedChatRef.current;
            const me = activeUserRef.current;
            setSendError('');
            if (!data.toUserId || !me) return;

            // Finalise new contact after first message confirmed
            if (selected?.isNew && cDB) {
                try {
                    const existing = await cDB.where(c => c.userId === data.toUserId);
                    if (!existing.length) {
                        await cDB.add({ userId: data.toUserId, email: selected.email, name: selected.name || selected.email });
                    }
                    if (mDB && pendingMsgsRef.current.length > 0) {
                        const convId = getConversationId(me._id, data.toUserId);
                        for (const pm of pendingMsgsRef.current) {
                            await mDB.add({ conversationId: convId, fromUserId: me._id, toUserId: data.toUserId, text: pm.text, type: pm.type || 'text', timestamp: pm.timestamp, isMe: true });
                        }
                        pendingMsgsRef.current = [];
                    }
                    setSelectedChat(prev => prev?.isNew ? { ...prev, userId: data.toUserId, isNew: false } : prev);
                } catch (e) { console.error('New contact finalise error:', e); }
            }
        });

        socket.on('message-failed', (data) => {
            setSendError(data.reason || 'Failed to send — user may not exist');
            pendingMsgsRef.current = [];
            setTimeout(() => setSendError(''), 5000);
        });

        socket.on('music-state', (s) => setMusicState(s));
        socket.on('play-song', ({ songId, time }) => {
            setMusicState({ songId, isPlaying: true, currentTime: time });
            if (audioRef.current) { audioRef.current.currentTime = time; audioRef.current.play(); }
        });
        socket.on('pause-song', ({ time }) => {
            setMusicState(prev => ({ ...prev, isPlaying: false, currentTime: time }));
            if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = time; }
        });
        socket.on('seek-song', ({ time }) => {
            setMusicState(prev => ({ ...prev, currentTime: time }));
            if (audioRef.current) audioRef.current.currentTime = time;
        });

        return () => {
            ['connect', 'disconnect', 'user-status', 'receive-private-message',
                'message-sent', 'message-failed', 'music-state', 'play-song', 'pause-song', 'seek-song']
                .forEach(ev => socket.off(ev));
        };
    }, [activeUser, navigate]);

    // ── SEARCH ──
    const filteredContacts = allContacts.filter(c => {
        if (c.email === activeUser?.email) return false;
        if (!searchTerm) return true;
        const t = searchTerm.toLowerCase();
        return (c.email || '').toLowerCase().includes(t) || (c.name || '').toLowerCase().includes(t);
    });

    const exactMatch = allContacts.find(c => c.email?.toLowerCase() === searchTerm.toLowerCase());
    const showNewChatOption = searchTerm.includes('@') && !exactMatch && searchTerm.toLowerCase() !== activeUser?.email?.toLowerCase();

    // ── HANDLERS ──
    const handleSelectContact = async (contact) => {
        pendingMsgsRef.current = [];
        setSendError('');
        // Dismiss any toast for this contact
        setNotifications(prev => prev.filter(n => n.fromUserId !== contact.userId));
        // Reset unread count in IndexedDB
        if (contacts && (contact.unread || 0) > 0) {
            try { await contacts.update({ ...contact, unread: 0, isRequest: false }); }
            catch (e) { console.error('Reset unread error:', e); }
        }
        // Push selected contact to Redux then navigate to full chat page
        dispatch(setSelectedContact(contact));
        navigate('/chat');
    };

    const handleStartNewChat = () => {
        pendingMsgsRef.current = [];
        const newContact = { userId: null, email: searchTerm.trim(), name: searchTerm.trim(), isNew: true };
        setSendError('');
        setSearchTerm('');
        dispatch(setSelectedContact(newContact));
        navigate('/chat');
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!messageInput.trim() || !selectedChat) return;

        const newMsg = {
            text: messageInput, type: 'text',
            timestamp: new Date().toISOString(), isMe: true, id: Date.now()
        };
        setChatMessages(prev => [...prev, newMsg]);

        if (currentConvId && messagesStore) {
            try {
                await messagesStore.add({
                    conversationId: currentConvId, fromUserId: activeUser._id,
                    toUserId: selectedChat.userId, text: messageInput,
                    type: 'text', timestamp: newMsg.timestamp, isMe: true
                });
            } catch (e) { console.error(e); }
        } else if (selectedChat.isNew) {
            pendingMsgsRef.current.push(newMsg);
        }

        socket.emit('send-message-by-email', {
            fromUserId: activeUser._id, toEmail: selectedChat.email,
            message: messageInput, type: 'text'
        });
        setMessageInput('');
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedChat) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const type = file.type.startsWith('image/') ? 'image'
                : file.type.startsWith('video/') ? 'video'
                    : file.type.startsWith('audio/') ? 'audio' : 'text';
            const newMsg = { text: ev.target.result, type, timestamp: new Date().toISOString(), isMe: true, id: Date.now() };
            setChatMessages(prev => [...prev, newMsg]);
            if (currentConvId && messagesStore) {
                try { await messagesStore.add({ conversationId: currentConvId, fromUserId: activeUser._id, toUserId: selectedChat.userId, text: ev.target.result, type, timestamp: newMsg.timestamp, isMe: true }); }
                catch (err) { console.error(err); }
            } else if (selectedChat.isNew) { pendingMsgsRef.current.push(newMsg); }
            socket.emit('send-message-by-email', { fromUserId: activeUser._id, toEmail: selectedChat.email, message: ev.target.result, type });
        };
        reader.readAsDataURL(file);
    };

    const handleMusicAction = (action, data = {}) => socket.emit(`${action}-song`, { roomId: 'main', ...data });
    const handleLogout = () => { dispatch(setActiveUser(null)); navigate('/'); };

    const getInitials = (u) => u?.name ? u.name[0].toUpperCase() : u?.email ? u.email[0].toUpperCase() : '?';
    const getDisplayName = (u) => u?.name || u?.email?.split('@')[0] || 'User';
    const getProfilePic = (user) => {
        if (!user) return null;
        
        // Check if profileImage is a file path or URL (saved as file on backend)
        if (user.profileImage) {
            if (typeof user.profileImage === 'string') {
                // It's a file path/URL from backend
                return user.profileImage.startsWith('http') 
                    ? user.profileImage 
                    : `https://mes-ioa3.onrender.com/${user.profileImage}`;
            } else if (user.profileImage?.data?.data) {
                // It's a buffer object (fallback for buffer format)
                let b = ''; 
                const bytes = new Uint8Array(user.profileImage.data.data);
                for (let i = 0; i < bytes.byteLength; i++) b += String.fromCharCode(bytes[i]);
                return `data:${user.profileImage.contentType};base64,${window.btoa(b)}`;
            }
        }
        
        // Fallback to profilePic if profileImage doesn't exist
        if (user.profilePic) {
            return user.profilePic.startsWith('http') 
                ? user.profilePic 
                : `https://mes-ioa3.onrender.com/${user.profilePic}`;
        }
        
        return null;
    };

    return (
        <div className="min-h-screen w-full bg-[#0a0f1e] text-slate-200 flex overflow-hidden font-sans selection:bg-cyan-500/30">

            {/* BG FX */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[140px] animate-pulse-slow" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[140px] animate-pulse-slow" />
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:40px_40px]" />
            </div>

            {/* ── TOAST NOTIFICATIONS ── */}
            <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
                {notifications.map((n) => (
                    <div
                        key={n.id}
                        className="pointer-events-auto flex items-center gap-4 bg-slate-900/95 border border-violet-500/40 rounded-[20px] px-5 py-4 shadow-2xl shadow-violet-900/30 backdrop-blur-xl cursor-pointer animate-slideInRight max-w-[320px]"
                        onClick={() => {
                            const contact = allContacts.find(c => c.userId === n.fromUserId);
                            if (contact) handleSelectContact(contact);
                            setNotifications(prev => prev.filter(notif => notif.id !== n.id));
                        }}
                    >
                        <div className="w-10 h-10 rounded-[14px] bg-gradient-to-tr from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-lg">
                            {(n.senderLabel || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black text-violet-300 uppercase tracking-wider mb-0.5">New Message</p>
                            <p className="text-xs font-bold text-white truncate">{n.senderLabel}</p>
                            <p className="text-[10px] text-slate-400 truncate">{n.message}</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setNotifications(prev => prev.filter(notif => notif.id !== n.id)); }}
                            className="text-slate-600 hover:text-slate-300 transition-colors text-lg leading-none flex-shrink-0"
                        >×</button>
                    </div>
                ))}
            </div>

            {/* ── SIDEBAR ── */}
            <aside className="w-full md:w-[380px] bg-slate-900/40 backdrop-blur-3xl border-r border-white/5 flex flex-col h-screen z-20 relative">

                {/* Sidebar Header */}
                <header className="p-7 flex items-center justify-between">
                    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setShowProfile(true)}>
                        <div className="relative">
                            <div className="w-14 h-14 rounded-[22px] bg-gradient-to-tr from-cyan-400 to-indigo-600 p-[2px] shadow-2xl shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-500">
                                <div className="w-full h-full rounded-[20px] bg-slate-900 flex items-center justify-center font-black overflow-hidden">
                                    {getProfilePic(activeUser)
                                        ? <img src={getProfilePic(activeUser)} alt="Profile" className="w-full h-full object-cover" />
                                        : <span className="text-transparent bg-clip-text bg-gradient-to-tr from-cyan-300 to-indigo-300 text-2xl">{getInitials(activeUser)}</span>
                                    }
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0a0f1e] rounded-full p-1 border-white/5 border overflow-hidden">
                                <div className="w-full h-full bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                            </div>
                        </div>
                        <div className="hidden sm:block">
                            <h2 className="text-white font-bold text-lg tracking-tight leading-none mb-1 group-hover:text-cyan-400 transition-colors">{getDisplayName(activeUser)}</h2>
                            <p className="text-[10px] text-slate-500 font-black tracking-[0.2em] uppercase opacity-70">
                                {connected ? '● Connected' : '○ Connecting…'}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-3 bg-white/5 hover:bg-red-500/20 rounded-2xl border border-white/5 transition-all group active:scale-90" title="Logout">
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-red-400 group-hover:rotate-12 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </header>

                {/* Search */}
                <div className="px-6 pb-2">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-cyan-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-3xl" />
                        <input
                            type="text"
                            placeholder="Search contacts or type an email…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full relative bg-white/5 border border-white/10 rounded-2xl py-4 px-14 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all text-sm placeholder:text-slate-500 placeholder:font-medium text-white shadow-inner"
                        />
                        <svg className="w-5 h-5 absolute left-5 top-[17px] text-slate-500 group-focus-within:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {/* New chat CTA */}
                    {showNewChatOption && (
                        <button
                            onClick={handleStartNewChat}
                            className="mt-3 w-full flex items-center gap-3 px-5 py-3.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-2xl transition-all group"
                        >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">+</div>
                            <div className="text-left">
                                <p className="text-xs font-black text-cyan-300">Start new chat</p>
                                <p className="text-[10px] text-slate-500 truncate max-w-[220px]">{searchTerm}</p>
                            </div>
                        </button>
                    )}
                </div>

                {/* Contact List */}
                <div className="flex-1 overflow-y-auto mt-4 px-4 pb-10 space-y-3 custom-scrollbar">
                    <div className="px-4 flex items-center justify-between mb-4 mt-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">
                            {searchTerm ? 'Search Results' : 'Contacts'}
                        </span>
                        <div className="h-[1px] flex-1 bg-white/5 ml-4" />
                        <span className="ml-4 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/20">{filteredContacts.length}</span>
                    </div>

                    {filteredContacts.length > 0 ? (
                        filteredContacts.map((contact, idx) => (
                            <div
                                key={contact.id || idx}
                                onClick={() => handleSelectContact(contact)}
                                className={`flex items-center gap-4 p-5 rounded-[24px] transition-all duration-500 cursor-pointer group animate-slideIn relative border
                                    ${selectedChat?.email === contact.email
                                        ? 'bg-cyan-500/15 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)] active-chat-indicator'
                                        : contact.isRequest && (contact.unread || 0) > 0
                                            ? 'bg-violet-500/10 border-violet-500/30 hover:border-violet-400/50'
                                            : 'border-transparent hover:bg-white/[0.03] hover:border-white/5'}`}
                                style={{ animationDelay: `${idx * 60}ms` }}
                            >
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-[18px] bg-slate-800 flex items-center justify-center text-xl font-black text-slate-400 group-hover:text-cyan-300 group-hover:scale-[1.03] transition-all duration-500 border border-white/5 overflow-hidden">
                                        {getInitials(contact)}
                                    </div>
                                    {onlineUserIds.includes(contact.userId) && (
                                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-[#0a0f1e] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={`font-extrabold transition-colors truncate text-md leading-tight ${
                                            (contact.unread || 0) > 0 ? 'text-white' : 'text-slate-300 group-hover:text-cyan-400'
                                        }`}>{getDisplayName(contact)}</h3>
                                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                            {onlineUserIds.includes(contact.userId) && (
                                                <span className="text-[9px] font-black text-green-400 uppercase">Online</span>
                                            )}
                                            {(contact.unread || 0) > 0 && (
                                                <span className="min-w-[18px] h-[18px] px-1 bg-cyan-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                                                    {contact.unread > 99 ? '99+' : contact.unread}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {contact.isRequest && (contact.unread || 0) > 0 && (
                                            <span className="text-[9px] font-black bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0">New Request</span>
                                        )}
                                        <p className="text-xs text-slate-500 truncate font-medium">{contact.email}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 px-8 flex flex-col items-center opacity-40 select-none animate-fadeIn">
                            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4 text-slate-600">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <p className="text-xs font-black uppercase tracking-[0.3em] leading-relaxed">
                                {searchTerm ? 'No contacts found' : 'No contacts yet'}<br />
                                <span className="text-[9px] opacity-60">Type an email to start a chat</span>
                            </p>
                        </div>
                    )}
                </div>
            </aside>

            {/* ── MAIN CHAT WINDOW ── */}
            <main className="hidden md:flex flex-1 flex-col bg-slate-950/20 relative overflow-hidden backdrop-blur-md">
                {selectedChat ? (
                    <div className="flex flex-col h-full animate-fadeInFast relative z-10">

                        {/* Chat Header */}
                        <header className="px-10 py-6 backdrop-blur-3xl bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-cyan-400/20 to-indigo-600/20 flex items-center justify-center font-black text-xl text-cyan-400 border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                                        {getInitials(selectedChat)}
                                    </div>
                                    {selectedChat.userId && onlineUserIds.includes(selectedChat.userId) && (
                                        <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="font-black text-white text-xl tracking-tight leading-none">{getDisplayName(selectedChat)}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${selectedChat.isNew ? 'bg-yellow-400' : selectedChat.userId && onlineUserIds.includes(selectedChat.userId) ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}`} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-70 text-slate-400">
                                            {selectedChat.isNew ? 'New — send first message' : selectedChat.userId && onlineUserIds.includes(selectedChat.userId) ? 'Online' : 'Offline — queued delivery'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Music Sync */}
                            <div className="flex items-center gap-4 bg-slate-900/50 border border-white/5 px-6 py-2 rounded-2xl backdrop-blur-md">
                                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mr-2">Music Sync</span>
                                <button
                                    onClick={() => handleMusicAction(musicState.isPlaying ? 'pause' : 'play', { time: audioRef.current?.currentTime || 0 })}
                                    className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-full text-cyan-400 transition-all active:scale-90"
                                >
                                    {musicState.isPlaying
                                        ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                        : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    }
                                </button>
                                <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${(musicState.currentTime / 300) * 100}%` }} />
                                </div>
                            </div>
                        </header>

                        {/* Error Banner */}
                        {sendError && (
                            <div className="mx-10 mt-4 px-6 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-black uppercase tracking-wider animate-fadeInFast">
                                ⚠ {sendError}
                            </div>
                        )}

                        {/* Messages */}
                        <div className="flex-1 px-10 py-6 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
                            {chatMessages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-cyan-600/10 blur-[100px] scale-[2]" />
                                        <div className="relative bg-white/[0.02] border border-white/5 p-12 rounded-[60px] text-center max-w-sm">
                                            <div className="text-5xl mb-4">💬</div>
                                            <h3 className="text-xl font-black text-white mb-2">No messages yet</h3>
                                            <p className="text-sm text-slate-400">
                                                {selectedChat.isNew
                                                    ? `Send a message to start chatting with ${getDisplayName(selectedChat)}`
                                                    : `Start the conversation with ${getDisplayName(selectedChat)}`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                chatMessages.map((msg, idx) => (
                                    <div key={msg.id || idx} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} group/msg`}>
                                        <div className={`max-w-[70%] px-6 py-3 rounded-[24px] ${msg.isMe
                                            ? 'bg-indigo-600 text-white rounded-br-none shadow-xl shadow-indigo-600/20'
                                            : 'bg-slate-800 text-slate-200 rounded-bl-none border border-white/5'}`}>
                                            {msg.type === 'image'
                                                ? <img src={msg.text} className="rounded-lg mb-2 max-w-xs" alt="img" />
                                                : msg.type === 'video'
                                                    ? <video src={msg.text} controls className="rounded-lg mb-2 max-w-xs" />
                                                    : msg.type === 'audio'
                                                        ? <audio src={msg.text} controls className="mb-2 max-w-xs" />
                                                        : <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                                            }
                                            <div className="flex items-center justify-between gap-4 mt-1 opacity-40 group-hover/msg:opacity-100 transition-opacity">
                                                <span className="text-[9px] font-black uppercase tracking-tighter">
                                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                                {msg.isMe && (
                                                    <svg className="w-3 h-3 text-cyan-300" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={bottomRef} className="h-2" />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="px-10 pb-10 pt-4">
                            <div className="bg-slate-900 border border-white/5 rounded-[40px] p-3 flex items-center gap-4 focus-within:border-cyan-500/20 focus-within:shadow-[0_0_40px_rgba(6,182,212,0.1)] transition-all duration-700">
                                <div className="flex pl-3 gap-1">
                                    <label className="p-3 rounded-full text-slate-500 hover:text-cyan-400 hover:bg-white/5 transition-all cursor-pointer">
                                        <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*,audio/*" />
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                    </label>
                                </div>
                                <input
                                    type="text" value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder={`Message ${getDisplayName(selectedChat)}…`}
                                    className="flex-1 bg-transparent py-5 focus:outline-none text-white placeholder:text-slate-600 font-medium text-sm border-x border-white/5 px-6 mx-2"
                                />
                                <button type="submit" disabled={!messageInput.trim()} className="mr-1 h-14 w-14 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-600/20 hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:hover:scale-100">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    /* Empty state */
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-fadeInSlow relative">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.03)_0%,transparent_70%)]" />
                        <div className="relative mb-14">
                            <div className="absolute inset-0 bg-cyan-400/20 rounded-[3rem] blur-3xl animate-pulse scale-[1.3]" />
                            <div className="w-44 h-44 bg-gradient-to-tr from-[#0a0f1e] to-slate-800 rounded-[3rem] flex items-center justify-center shadow-2xl relative z-10 animate-float border border-white/10 text-7xl">
                                💬
                            </div>
                        </div>
                        <h2 className="text-5xl font-black mb-4 bg-gradient-to-b from-white to-slate-600 bg-clip-text text-transparent tracking-tighter leading-tight">
                            Welcome, {getDisplayName(activeUser)}
                        </h2>
                        <p className="text-slate-400 text-lg max-w-lg leading-relaxed mb-12 font-medium opacity-60">
                            Search for a contact by name or paste their email address to start a private, encrypted conversation.
                        </p>
                        <div className="flex items-center gap-4 text-cyan-400 font-black text-xs tracking-[0.3em] uppercase bg-white/[0.03] border border-white/10 px-8 py-4 rounded-3xl">
                            <span className="w-2 h-2 bg-cyan-500 rounded-full animate-ping" />
                            Select or search a contact
                        </div>
                    </div>
                )}
            </main>

            {/* ── PROFILE MODAL ── */}
            {showProfile && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-fadeInFast">
                    <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden animate-slideIn">
                        <button onClick={() => setShowProfile(false)} className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="pt-16 pb-12 px-10 text-center">
                            <div className="w-32 h-32 mx-auto rounded-[32px] bg-gradient-to-tr from-cyan-400 to-indigo-600 p-1 mb-6 shadow-2xl shadow-cyan-500/20">
                                <div className="w-full h-full rounded-[28px] bg-slate-900 flex items-center justify-center overflow-hidden">
                                    {getProfilePic(activeUser)
                                        ? <img src={getProfilePic(activeUser)} alt="User" className="w-full h-full object-cover" />
                                        : <span className="text-4xl font-black text-white">{getInitials(activeUser)}</span>
                                    }
                                </div>
                            </div>
                            <h2 className="text-3xl font-black text-white mb-1 tracking-tight">{getDisplayName(activeUser)}</h2>
                            <div className="space-y-4 text-left mt-8">
                                <div className="p-5 bg-white/5 border border-white/5 rounded-3xl">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Email</p>
                                    <p className="text-md text-white font-medium">{activeUser?.email}</p>
                                </div>
                                <div className="p-5 bg-white/5 border border-white/5 rounded-3xl">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Contacts in DB</p>
                                    <p className="text-md text-white font-medium">{allContacts.length} saved</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-10 pb-10">
                            <button onClick={handleLogout} className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-black text-xs uppercase tracking-[0.2em] rounded-2xl border border-red-500/20 transition-all active:scale-95">
                                Terminate Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideIn { from { opacity: 0; transform: translateX(-30px) scale(0.95); } to { opacity: 1; transform: translateX(0) scale(1); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
                @keyframes pulse-slow { 0%, 100% { transform: scale(1); opacity: 0.1; } 50% { transform: scale(1.1); opacity: 0.2; } }
                @keyframes slideInRight { from { opacity: 0; transform: translateX(60px) scale(0.95); } to { opacity: 1; transform: translateX(0) scale(1); } }
                .animate-slideIn { animation: slideIn 0.8s cubic-bezier(0.16,1,0.3,1) forwards; opacity: 0; }
                .animate-slideInRight { animation: slideInRight 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
                .animate-fadeIn { animation: fadeIn 1s cubic-bezier(0.16,1,0.3,1) forwards; }
                .animate-fadeInFast { animation: fadeIn 0.4s ease-out forwards; }
                .animate-fadeInSlow { animation: fadeIn 1.5s cubic-bezier(0.16,1,0.3,1) forwards; }
                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.1); border-radius: 99px; }
                .active-chat-indicator::before { content: ''; position: absolute; left: 0; top: 25%; height: 50%; width: 4px; background: #22d3ee; border-radius: 0 4px 4px 0; box-shadow: 0 0 10px #22d3ee; }
                .bg-grid-white\\/\\[0\\.02\\] { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.02)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e"); }
            `}</style>
        </div>
    );
}