import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  MdOutlineInfo, MdSearch, MdCheckCircleOutline, MdOutlineNotificationsOff,
  MdOutlineTimer, MdOutlineFavoriteBorder, MdOutlineListAlt, MdHighlightOff,
  MdOutlineThumbDownOffAlt, MdBlock, MdOutlineRemoveCircleOutline, MdOutlineDeleteOutline, MdLogout
} from "react-icons/md";
import { socket, connectSocket, disconnectSocket } from "../../services/chatSocket";
import { saveContactToDB, saveMessageToDB, saveMessagesToDB, getContactsFromDB, getAllMessagesFromDB } from "../../services/db";
import { logout } from "../../redux/authSlice";

/* ─── Avatar Component ────────────────────────────────────────────────────── */
const initials = name => name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "U";

const extractName = value => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.includes("@")) return trimmed.split("@")[0].trim();
  return trimmed;
};

const isValidName = name => {
  const cleaned = extractName(name);
  if (!cleaned) return false;
  const invalid = ["user", "unknown", "anonymous", "no name", "n/a", "null", "undefined"];
  if (invalid.includes(cleaned.toLowerCase())) return false;
  return !cleaned.includes("...");
};

const getPreferredName = (...names) => {
  const valid = names.map(extractName).find(isValidName);
  if (valid) return valid;
  const fallback = names.map(extractName).find(Boolean);
  return fallback || "Someone";
};

const displayName = (contact = {}) => getPreferredName(contact.name, contact.gmail, contact.email, contact.username, contact.userName, contact.userId, contact.id);

const isImageUrl = (avatar) => typeof avatar === "string" && (
  avatar.startsWith("http") ||
  avatar.startsWith("data:") ||
  avatar.startsWith("/") ||
  avatar.includes("base64") ||
  /\.(jpeg|jpg|png|gif|webp|svg|bmp|avif|apng)(\?.*)?$/i.test(avatar)
);

function Avatar({ c, size = 42 }) {
  const avatar = c?.avatar;
  const isImageAvatar = typeof avatar === "string" && (
    avatar.startsWith("http") ||
    avatar.startsWith("data:") ||
    avatar.startsWith("/") ||
    avatar.includes("base64") ||
    /\.(jpeg|jpg|png|gif|webp|svg|bmp|avif|apng)(\?.*)?$/i.test(avatar)
  );

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: isImageAvatar ? "#f43f5e" : c.color || "#f43f5e",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 700, color: "#fff",
      letterSpacing: "0.5px", userSelect: "none",
      overflow: "hidden",
      boxShadow: "0 4px 10px rgba(244,63,94,0.3)"
    }}>
      {isImageAvatar ? (
        <img
          src={avatar}
          alt={c?.name || "Avatar"}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
        />
      ) : (
        avatar || initials(c?.name)
      )}
    </div>
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
  if (status === "sent") return <span style={{ color: "#94a3b8", fontSize: 11 }}>✓</span>;
  if (status === "delivered") return <span style={{ color: "#94a3b8", fontSize: 11 }}>✓✓</span>;
  if (status === "read") return <span style={{ color: "#0ea5e9", fontSize: 11 }}>✓✓</span>; // Sky blue
  return null;
}

function Spinner() {
  return <div style={{ width: 14, height: 14, border: "2px solid rgba(244,63,94,0.2)", borderTopColor: "#f43f5e", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />;
}

/* ─── Add Contact Modal ───────────────────────────────────────────────────── */

export default function ChatDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [active, setActive] = useState(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [typing, setTyping] = useState({});
  const [sidebar, setSidebar] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [music, setMusic] = useState({ songId: null, isPlaying: false, currentTime: 0 });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState({});

  const endRef = useRef(null);
  const typingRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);

  const getProfilePic = (user) => {
    if (!user) return null
    
    // Check if profileImage is a file path or URL (saved as file on backend)
    if (user.profileImage) {
      if (typeof user.profileImage === 'string') {
        // It's a file path/URL from backend
        return user.profileImage.startsWith('http')
          ? user.profileImage
          : `https://mes-ioa3.onrender.com/${user.profileImage}`
      } else if (user.profileImage?.data?.data) {
        // It's a buffer object (fallback for buffer format)
        let b = ''
        const bytes = new Uint8Array(user.profileImage.data.data)
        for (let i = 0; i < bytes.length; i += 1) {
          b += String.fromCharCode(bytes[i])
        }
        return `data:${user.profileImage.contentType};base64,${window.btoa(b)}`
      }
    }
    
    // Fallback to profilePic if profileImage doesn't exist
    if (user.profilePic) {
      return user.profilePic.startsWith('http')
        ? user.profilePic
        : `https://mes-ioa3.onrender.com/${user.profilePic}`
    }
    
    return null
  }

  // Get real user from localStorage
  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const authUser = savedUser.user || savedUser
  const currentUser = {
    id: authUser?.id || authUser?._id || "me",
    name: authUser?.name || "Me",
    avatar: getProfilePic(authUser) || "M",
    color: "#f43f5e",
    email: authUser?.email
  };

  const normalizeContact = (contact) => {
    const lastSeenDate = contact.lastSeen || contact.updatedAt || contact.lastSeenAt || new Date().toISOString();
    let displayLastSeen = "last seen recently";
    
    if (contact.status === "online") {
      displayLastSeen = "online";
    } else if (lastSeenDate) {
      const date = new Date(lastSeenDate);
      if (!Number.isNaN(date.getTime())) {
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / 60000);
        if (diffMinutes < 1) displayLastSeen = "just now";
        else if (diffMinutes < 60) displayLastSeen = `${diffMinutes}m ago`;
        else if (diffMinutes < 1440) displayLastSeen = `${Math.floor(diffMinutes / 60)}h ago`;
        else {
          const diffDays = Math.floor(diffMinutes / 1440);
          displayLastSeen = diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
        }
      } else {
        displayLastSeen = "last seen recently";
      }
    }
    
    return {
      id: contact.id || contact._id || contact.userId || contact.receiverId || contact.contactId || contact.fromUserId || contact.toUserId || "",
      name: getPreferredName(contact.name, contact.label, contact.fullName, contact.fromName, contact.toName, contact.userName, contact.username, contact.email, contact.gmail),
      gmail: contact.email || contact.gmail || contact.contactEmail || contact.fromEmail || contact.toEmail || contact.senderEmail || "",
      avatar: contact.avatar || contact.profilePic || null,
      color: contact.color || "#f43f5e",
      status: contact.status || "offline",
      lastSeen: displayLastSeen,
      bio: contact.bio || contact.description || "Available to chat",
      lastMessage: contact.lastMessage || contact.message || contact.latestMessage || "",
      updatedAt: contact.updatedAt || contact.timestamp || contact.lastTime || "",
    };
  };

  const normalizeMessage = (message) => ({
    id:
      message.id ||
      message._id ||
      message.clientId ||
      `${message.senderId || message.fromUserId || "unknown"}-${Date.now()}`,
    senderId: message.senderId || message.fromUserId || message.from || "",
    senderEmail: message.senderEmail || message.fromEmail || message.email || "",
    receiverId: message.receiverId || message.toUserId || message.to || "",
    receiverEmail: message.receiverEmail || message.toEmail || "",
    text: message.message || message.text || "",
    type: message.type || "text",
    timestamp:
      message.createdAt ||
      message.sentAt ||
      message.timestamp ||
      new Date().toISOString(),
    status:
      message.status ||
      (message.senderId === currentUser.id || message.fromUserId === currentUser.id
        ? "delivered"
        : "received"),
  });

  const dedupeContacts = (list) => {
    const map = new Map();
    list.forEach(contact => {
      const key = (contact.gmail || contact.email || contact.id || "").toLowerCase();
      if (!map.has(key)) map.set(key, contact);
    });
    return Array.from(map.values());
  };

  const dedupeMessages = (messagesList) => {
    const seen = new Set();
    return messagesList.filter(msg => {
      // Create a unique key based on senderId, timestamp, and text
      const key = `${msg.senderId || msg.fromUserId}-${msg.timestamp}-${msg.text || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // 2. Load data from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const contactsData = await getContactsFromDB();
        setContacts(dedupeContacts(contactsData.map(normalizeContact)));
        
        const messagesData = await getAllMessagesFromDB();
        const grouped = {};
        messagesData.forEach(msg => {
          const otherId = msg.contactId || (msg.senderId === currentUser.id ? msg.receiverId : msg.senderId);
          if (!otherId) return;
          if (!grouped[otherId]) grouped[otherId] = [];
          grouped[otherId].push(msg);
        });
        // Deduplicate messages in each conversation
        Object.keys(grouped).forEach(key => {
          grouped[key] = dedupeMessages(grouped[key]);
          grouped[key].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
        });
        setMessages(grouped);
      } catch (err) {
        console.error("Failed to load DB data:", err);
      }
    };
    if (currentUser.id) {
      loadData();
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (!currentUser.id) return;

    // Connect and get the socket instance
    const s = connectSocket(currentUser.id);
    console.log("[Socket] Connecting with userId:", currentUser.id);

    // 1. Tell backend we are online (triggers pending message delivery)
    s.emit("user-online", currentUser.id);

    const onMsg = async (msg) => {
      console.log("[Socket] receive-private-message:", msg);
      const roomId = msg.fromUserId || msg.senderId || msg.from || msg.userId || msg.sender?.id || msg.fromEmail || msg.email || msg.senderEmail;
      if (!roomId) return;

      const incomingContact = {
        id: roomId,
        name: getPreferredName(
          msg.fromName,
          msg.name,
          msg.senderName,
          msg.fromUserName,
          msg.userName,
          msg.username,
          msg.fullName,
          msg.fromEmail,
          msg.email,
          msg.senderEmail,
          msg.fromEmail?.split("@")[0],
        ),
        gmail: msg.fromEmail || msg.email || msg.senderEmail || undefined,
        updatedAt: msg.createdAt || msg.sentAt || msg.timestamp || new Date().toISOString(),
        status: "online"
      };
      
      const mergeContact = (existing) => ({
        ...existing,
        ...incomingContact,
        name: getPreferredName(incomingContact.name, existing.name, existing.fullName, msg.fromEmail, msg.email, msg.senderEmail),
      });

      setContacts(prev => {
        // First, check if there's an existing contact with the email as ID (temporary contact)
        const emailContact = prev.find(c => c.gmail === msg.fromEmail && c.id === msg.fromEmail);
        
        if (emailContact) {
          // Update the existing email-based contact with the real user ID
          const updatedContacts = prev.map(c => 
            c.id === msg.fromEmail 
              ? { ...mergeContact(c), id: roomId }
              : c.id === roomId 
                ? mergeContact(c)
                : c
          );
          
          // Also update messages if they were stored under the email key
          setMessages(prevMsgs => {
            if (prevMsgs[msg.fromEmail]) {
              const updatedMsgs = { ...prevMsgs };
              if (!updatedMsgs[roomId]) {
                updatedMsgs[roomId] = [];
              }
              updatedMsgs[roomId] = [...updatedMsgs[roomId], ...prevMsgs[msg.fromEmail]];
              delete updatedMsgs[msg.fromEmail];
              
              // Save the updated messages
              saveMessagesToDB(roomId, updatedMsgs[roomId]);
              // Clean up old email-based messages
              import("../../services/db").then(mb => mb.saveMessagesToDB(msg.fromEmail, [])).catch(e => console.log(e));
              
              return updatedMsgs;
            }
            return prevMsgs;
          });
          
          // Update active chat if it was using the email
          setActive(curr => curr === msg.fromEmail ? roomId : curr);
          
          return updatedContacts;
        } else {
          // Check if contact already exists with proper ID
          const existing = prev.find(c => c.id === roomId);
          if (existing) {
            const contactName = getPreferredName(incomingContact.name, existing.name, existing.fullName, msg.fromEmail, msg.email, msg.senderEmail);
            return prev.map(c => c.id === roomId ? { ...c, ...incomingContact, name: contactName } : c);
          } else {
            const contactName = getPreferredName(incomingContact.name, msg.fromEmail, msg.email, msg.senderEmail);
            return [...prev, { ...incomingContact, name: contactName, color: "#f43f5e" }];
          }
        }
      });
      
      await saveContactToDB(normalizeContact({ ...incomingContact, color: "#f43f5e" }));

      const nextMsg = {
        id: `${msg.fromUserId}-${msg.createdAt}-${Math.random()}`,
        senderId: msg.fromUserId,
        senderEmail: msg.fromEmail || msg.email || msg.senderEmail || "",
        receiverId: currentUser.id,
        receiverEmail: currentUser.email || "",
        text: msg.message,
        type: msg.type
          ? msg.type
          : msg.message?.startsWith("data:image/")
            ? "image"
            : msg.message?.startsWith("data:video/")
              ? "video"
              : msg.message?.startsWith("data:")
                ? "file"
                : "text",
        timestamp: msg.createdAt || new Date().toISOString(),
        status: roomId === active ? "read" : "received"
      };
      
      setMessages(prev => {
        const existing = prev[roomId] || [];
        // Check if this message already exists
        const msgKey = `${nextMsg.senderId || nextMsg.fromUserId}-${nextMsg.timestamp}-${nextMsg.text || ""}`;
        const isDuplicate = existing.some(m => `${m.senderId || m.fromUserId}-${m.timestamp}-${m.text || ""}` === msgKey);
        
        if (isDuplicate) return prev; // Skip if duplicate
        
        return {
          ...prev,
          [roomId]: [...existing, nextMsg]
        };
      });
      
      await saveMessageToDB(roomId, nextMsg);

      if (msg.wasPending) {
        setToast(`Delivered message from ${msg.fromName || msg.fromEmail || "someone"}`);
        setTimeout(() => setToast(null), 3000);
      }
    };

    const onStatus = async ({ userId, status, onlineUsers }) => {
      if (!userId) return;
      
      setContacts(prev => {
        const updated = prev.map(c => 
          c.id === userId 
            ? { ...c, status, updatedAt: new Date().toISOString() } 
            : c
        );
        
        // Find the updated contact for DB save
        const contact = updated.find(c => c.id === userId);
        if (contact) {
          saveContactToDB(contact);
        }
        
        return updated;
      });
      
      // Update online status for others based on onlineUsers list
      if (onlineUsers && Array.isArray(onlineUsers)) {
        setContacts(prev => {
          const updated = prev.map(c => 
            onlineUsers.includes(c.id) && c.status !== "online" 
              ? { ...c, status: "online", updatedAt: new Date().toISOString() } 
              : c
          );
          
          // Save updated contacts to DB
          onlineUsers.forEach(cid => {
            const contact = updated.find(c => c.id === cid);
            if (contact && contact.status === "online") {
              saveContactToDB(contact);
            }
          });
          
          return updated;
        });
      }
    };


    const onSent = ({ toUserId, toEmail, status }) => {
      console.log("[Socket] message-sent:", { toUserId, toEmail, status });
      if (status === "cached" || status === "delivered") {
        setToast(`Message to ${toEmail || "them"} ${status}.`);
        setTimeout(() => setToast(null), 3000);
        
        // Convert local mock emails into backend IDs transparently
        setContacts(prev => {
          let updated = false;
          const next = prev.map(c => {
            if (c.gmail === toEmail && c.id === toEmail && toUserId) {
              updated = true;
              return {
                ...c,
                id: toUserId,
                name: displayName(c) || toEmail?.split("@")[0] || toUserId || "Someone",
              };
            }
            return c;
          });

          const theContact = next.find(c => c.id === toUserId);
          if (theContact) saveContactToDB(theContact);

          return next;
        });
      }
    };

    const onFailed = ({ toEmail, error, reason }) => {
      console.log("[Socket] message-failed:", { toEmail, error, reason });
      console.warn("Message delivery failed:", error || reason);
      // Suppressed the popup to keep the UX smooth even if user isn't found
    };

    const onMusicState = (state) => {
      // { songId, isPlaying, currentTime }
      setMusic(state);
    };

    const PlaySync = ({ songId, time }) => setMusic(p => ({ ...p, songId, isPlaying: true, currentTime: time }));
    const PauseSync = ({ time }) => setMusic(p => ({ ...p, isPlaying: false, currentTime: time }));
    const SeekSync = ({ time }) => setMusic(p => ({ ...p, currentTime: time }));

    s.on("receive-private-message", onMsg);
    s.on("user-status", onStatus);
    s.on("message-sent", onSent);
    s.on("message-failed", onFailed);
    s.on("music-state", onMusicState);
    s.on("play-song", PlaySync);
    s.on("pause-song", PauseSync);
    s.on("seek-song", SeekSync);

    // Add connection debugging
    s.on("connect", () => {
      console.log("[Socket] Connected to server, socket ID:", s.id);
    });
    s.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected from server, reason:", reason);
    });
    s.on("connect_error", (error) => {
      console.log("[Socket] Connection error:", error);
    });

    return () => {
      s.off("receive-private-message", onMsg);
      s.off("user-status", onStatus);
      s.off("message-sent", onSent);
      s.off("message-failed", onFailed);
      s.off("music-state", onMusicState);
      s.off("play-song", PlaySync);
      s.off("pause-song", PauseSync);
      s.off("seek-song", SeekSync);
      s.off("connect");
      s.off("disconnect");
      s.off("connect_error");
      disconnectSocket();
    };
  }, [currentUser.id]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setMenuOpen(false);
    if (menuOpen) document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [menuOpen]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setUserMenuOpen(false);
    if (userMenuOpen) document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [userMenuOpen]);

  const msgs = active ? (messages[active] || []) : [];
  const activeMessage = msgs.find(m => m.fromEmail || m.email || m.senderEmail || m.fromName || m.senderName || m.fullName) || null;

  const contact = contacts.find(c => c.id === active)
    || (active && active.includes("@") ? {
      id: active,
      name: active.split("@")[0],
      gmail: active,
      status: "offline",
      color: "#f43f5e",
      bio: "Not added yet",
    } : activeMessage ? {
      id: active,
      name: displayName({
        name: activeMessage.fromName || activeMessage.senderName || activeMessage.fullName,
        gmail: activeMessage.fromEmail || activeMessage.email || activeMessage.senderEmail,
        userName: activeMessage.userName || activeMessage.fromUserName || activeMessage.senderUsername,
        userId: activeMessage.fromUserId || activeMessage.senderId || activeMessage.userId,
      }),
      gmail: activeMessage.fromEmail || activeMessage.email || activeMessage.senderEmail,
      status: "offline",
      color: "#f43f5e",
      bio: "Not added yet",
    } : null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      stopRecordingTimer();
    };
  }, []);

  const blobToDataURL = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!active) {
      setToast("Select a contact before recording audio.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast("Audio recording is not supported in your browser.");
      setTimeout(() => setToast(null), 3000);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];

      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        stopRecordingTimer();
        setRecording(false);
        setRecordingTime(0);
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        await sendAudioBlob(blob, recorder.mimeType || "audio/webm");
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (error) {
      console.error("Audio recording failed:", error);
      setToast("Could not start audio recording.");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const sendAudioBlob = useCallback(async (blob, mimeType) => {
    if (!active) return;
    const dataUrl = await blobToDataURL(blob);

    const isEmail = active && active.includes("@");
    const receiverEmail = isEmail ? active : (contact?.gmail || contact?.email || undefined);

    const outgoing = {
      id: Date.now(),
      senderId: currentUser.id,
      senderEmail: currentUser.email || "",
      receiverId: active,
      receiverEmail: receiverEmail || "",
      text: dataUrl,
      type: "audio",
      timestamp: new Date().toISOString(),
      status: "sending",
    };

    setMessages(p => {
      const nextMsgs = [...(p[active] || []), outgoing];
      saveMessageToDB(active, outgoing).catch(e => console.log(e));
      return { ...p, [active]: nextMsgs };
    });

    const payload = {
      fromUserId: currentUser.id,
      fromName: currentUser.name,
      fromEmail: currentUser.email,
      toUserId: isEmail ? undefined : active,
      toEmail: isEmail ? active : (contact?.gmail || contact?.email || undefined),
      message: dataUrl,
      type: "audio",
      createdAt: new Date().toISOString(),
      mimeType,
    };

    if (!socket) {
      console.log("[Socket] Socket not available for sending audio");
      return;
    }

    if (isEmail) {
      socket.emit("send-message-by-email", {
        ...payload,
        toEmail: payload.toEmail,
      });
    } else {
      socket.emit("send-private-message", payload);
    }
  }, [active, currentUser.id, currentUser.name, currentUser.email, contact?.gmail, contact?.email]);

  const sendText = useCallback((text) => {
    if (!text.trim() || !active) return;

    const isEmail = active && active.includes("@");
    const receiverEmail = isEmail ? active : (contact?.gmail || contact?.email || undefined);

    const outgoing = {
      id: Date.now(),
      senderId: currentUser.id,
      senderEmail: currentUser.email || "",
      receiverId: active,
      receiverEmail: receiverEmail || "",
      text: text.trim(),
      type: "text",
      timestamp: new Date().toISOString(),
      status: "sending",
    };

    setMessages(p => {
      const nextMsgs = [...(p[active] || []), outgoing];
      saveMessageToDB(active, outgoing).catch(e => console.log(e));
      return { ...p, [active]: nextMsgs };
    });

    const payload = {
      fromUserId: currentUser.id,
      fromName: currentUser.name,
      fromEmail: currentUser.email,
      toUserId: isEmail ? undefined : active,
      toEmail: isEmail ? active : (contact?.gmail || contact?.email || undefined),
      message: text.trim(),
      type: "text",
      createdAt: new Date().toISOString(),
    };

    if (!socket) {
      console.log("[Socket] Socket not available for sending");
      return;
    }

    if (isEmail) {
      console.log("[Socket] Sending message by email:", { fromUserId: currentUser.id, toEmail: payload.toEmail, message: text.trim() });
      socket.emit("send-message-by-email", {
        fromUserId: currentUser.id,
        fromName: currentUser.name,
        fromEmail: currentUser.email,
        toEmail: payload.toEmail,
        message: text.trim(),
        type: "text"
      });
    } else {
      console.log("[Socket] Sending private message:", payload);
      socket.emit("send-private-message", payload);
    }
  }, [active, currentUser.id, currentUser.email, currentUser.name, contact?.gmail, contact?.email]);

  const send = useCallback(() => {
    if (!input.trim() || !active) return;
    sendText(input);
    setInput("");
  }, [input, active, sendText]);

  const fileInputRef = useRef(null);

  const handleFileAttachment = (e) => {
    const file = e.target.files[0];
    if (!file || !active) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const t = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
            ? "audio"
            : "file";
      const isEmail = active && active.includes("@");
      const receiverEmail = isEmail ? active : (contact?.gmail || contact?.email || undefined);

      const outgoing = {
        id: Date.now(),
        senderId: currentUser.id,
        senderEmail: currentUser.email || "",
        receiverId: active,
        receiverEmail: receiverEmail || "",
        text: dataUrl,
        type: t,
        timestamp: new Date().toISOString(),
        status: "sending",
      };
      setMessages(p => {
        const nextMsgs = [...(p[active] || []), outgoing];
        saveMessageToDB(active, outgoing).catch(err => console.log(err));
        return { ...p, [active]: nextMsgs };
      });
      if (socket) {
        const filePayload = {
          fromUserId: currentUser.id,
          fromName: currentUser.name,
          fromEmail: currentUser.email,
          toUserId: isEmail ? undefined : active,
          toEmail: isEmail ? active : (contact?.gmail || contact?.email || undefined),
          message: dataUrl,
          type: t,
          createdAt: new Date().toISOString(),
        };

        if (isEmail) {
          socket.emit("send-message-by-email", filePayload);
        } else {
          socket.emit("send-private-message", filePayload);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const handleInput = e => {
    setInput(e.target.value);
    if (!active) return;
    if (socket) {
      socket.emit("typing", { roomId: active, receiverId: active })
    };
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => { if (socket) { socket.emit("stop_typing", { roomId: active }); } }, 1500);
  };

  const addContact = user => {
    const newC = { 
      id: user.id, 
      name: user.name, 
      gmail: user.gmail || "", 
      avatar: user.avatar, 
      color: user.color, 
      status: user.status || "offline",
      updatedAt: new Date().toISOString(),
      bio: user.bio || "" 
    };
    
    setContacts(p => {
      // Prevent duplicates: remove any contact that has the SAME id OR the SAME email
      const filtered = p.filter(c => {
        const sameId = c.id === user.id;
        const sameEmail = user.gmail && (c.gmail || "").toLowerCase() === (user.gmail || "").toLowerCase();
        return !sameId && !sameEmail;
      });
      
      const next = [newC, ...filtered];
      saveContactToDB(newC).catch(e => console.log("DB save error", e));
      return dedupeContacts(next);
    });
    
    if (!messages[user.id]) {
      setMessages(p => ({ ...p, [user.id]: [] }));
    }
    setActive(user.id);
    setInfoOpen(false);
    setToast(`${user.name} added! 👋`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSearchUser = async (e) => {
    e.preventDefault();
    if (!addEmail.trim()) return;
    
    const userEmail = addEmail.toLowerCase().trim();
    // Instantly connect right here - bypass backend API
    addContact({
      id: userEmail, // We use the email as a temporary ID
      name: userEmail.split("@")[0] + "...", // Guess the name purely from email until the backend catches up
      gmail: userEmail,
      avatar: null,
      color: "#f43f5e",
      status: "offline"
    });
    
    setAddContactOpen(false);
    setAddEmail("");
  };

  const handleAddNewContact = () => {};

  const filtered = dedupeContacts(contacts)
    .filter(c => (c.name || "").toLowerCase().includes(search.toLowerCase()) || (c.gmail || "").toLowerCase().includes(search.toLowerCase()));
  const lastMsg = id => { const m = messages[id] || []; return m[m.length - 1] || null; };
  const unread = id => (messages[id] || []).filter(m => m.senderId !== currentUser.id && m.status !== "read").length;

  useEffect(() => {
    if (!active) return;
    const conversation = messages[active] || [];
    const needsRead = conversation.some(m => m.senderId !== currentUser.id && m.status !== "read");
    if (!needsRead) return;

    const updated = conversation.map(m =>
      m.senderId !== currentUser.id && m.status !== "read"
        ? { ...m, status: "read" }
        : m
    );

    setMessages(prev => ({ ...prev, [active]: updated }));
    saveMessagesToDB(active, updated).catch(err => console.error("Failed to mark messages read:", err));
  }, [active, messages, currentUser.id]);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("user");
    dispatch(logout());
    disconnectSocket();
    navigate("/");
  };

  // Delete chat handler
  const handleDeleteChat = async (contactId) => {
    setMessages(prev => {
      const updated = { ...prev };
      delete updated[contactId];
      return updated;
    });
    
    setContacts(prev => prev.filter(c => c.id !== contactId));
    
    if (active === contactId) {
      setActive(null);
    }
    
    // Clear from IndexedDB
    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open("ChatAppDB", 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      
      const transaction = db.transaction(["contacts", "messages"], "readwrite");
      transaction.objectStore("contacts").delete(contactId);
      
      const msgStore = transaction.objectStore("messages");
      const index = msgStore.index("contactId");
      const range = IDBKeyRange.only(contactId);
      const deleteReq = index.openCursor(range);
      deleteReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
    
    setToast("Chat deleted");
    setTimeout(() => setToast(null), 2000);
    setMenuOpen(false);
  };

  const handleClearChat = async (contactId) => {
    setMessages(prev => ({ ...prev, [contactId]: [] }));
    if (active === contactId) {
      setActive(contactId);
    }

    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open("ChatAppDB", 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      const transaction = db.transaction(["messages"], "readwrite");
      const msgStore = transaction.objectStore("messages");
      const index = msgStore.index("contactId");
      const range = IDBKeyRange.only(contactId);
      const deleteReq = index.openCursor(range);
      deleteReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (err) {
      console.error("Failed to clear chat:", err);
    }

    setToast("Chat cleared");
    setTimeout(() => setToast(null), 2000);
    setMenuOpen(false);
  };


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

        {/* ── ADD MODAL ── */}
        {addContactOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <div style={{ width: 400, background: "#ffffff", borderRadius: 24, padding: 24, boxShadow: "0 24px 60px rgba(244,63,94,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, color: "#4c0519", fontSize: 18 }}>Connect With User</h3>
                <button onClick={() => setAddContactOpen(false)} style={{ background: "none", border: "none", color: "#fb7185", fontSize: 20, cursor: "pointer" }}>✕</button>
              </div>
              <form onSubmit={handleSearchUser} style={{ display: "flex", gap: 8 }}>
                <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="User email..." type="email" style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: "1px solid #ffe4e6", outline: "none", color: "#4c0519", background: "#fff1f2" }} />
                <button type="submit" style={{ padding: "10px 20px", borderRadius: 12, background: "#10b981", color: "white", border: "none", fontWeight: 700, cursor: "pointer", transition: "transform 0.1s" }} onMouseDown={e=>e.currentTarget.style.transform="scale(0.95)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
                  Connect
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Decorative blobs & petals from OTP Verify ── */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="animate-blob absolute -top-24 -left-24 w-96 h-96 rounded-full bg-rose-200 opacity-40 blur-3xl pointer-events-none" />
          <div className="animate-blob delay-300 absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-pink-200 opacity-35 blur-3xl pointer-events-none" style={{ animationDelay: "300ms" }} />
          <div className="animate-blob delay-100 absolute top-1/3 right-1/4 w-56 h-56 rounded-full bg-red-100 opacity-50 blur-2xl pointer-events-none" style={{ animationDelay: "100ms" }} />

          <div className="animate-petal absolute top-10 right-10 w-40 h-40 rounded-full border-[3px] border-rose-200 border-dashed opacity-40 pointer-events-none" />
          <div className="animate-petal delay-300 absolute bottom-10 left-10 w-28 h-28 rounded-full border-2 border-pink-300 border-dotted opacity-35 pointer-events-none" style={{ animationDirection: 'reverse', animationDelay: "300ms" }} />

          {/* Floating hearts (exactly like OtpVerify) */}
          <div className="heart-1 absolute top-20 left-20 text-rose-300 text-4xl select-none pointer-events-none" style={{ filter: "drop-shadow(0 2px 4px rgba(244,63,94,0.3))" }}>♥</div>
          <div className="heart-2 absolute bottom-24 right-20 text-pink-300 text-3xl select-none pointer-events-none" style={{ filter: "drop-shadow(0 2px 4px rgba(244,63,94,0.3))" }}>♥</div>
          <div className="heart-3 absolute top-1/3 left-12 text-rose-200 text-5xl select-none pointer-events-none" style={{ filter: "drop-shadow(0 2px 4px rgba(244,63,94,0.3))" }}>♥</div>
          <div className="heart-1 absolute top-12 right-1/3 text-rose-200 text-2xl select-none pointer-events-none" style={{ animationDelay: "1s" }}>♥</div>
          <div className="heart-2 absolute bottom-12 left-1/3 text-pink-300 text-2xl select-none pointer-events-none" style={{ animationDelay: "2s" }}>♥</div>
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
              <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
                <div style={{ cursor: "pointer", position: "relative" }} onClick={() => { setProfileOpen(true); setUserMenuOpen(false); }}>
                  <Avatar c={currentUser} size={42} />
                </div>
                <div>
                  <div style={{ color: "#4c0519", fontWeight: 800, fontSize: 16 }}>Chats</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ color: "#f43f5e", fontSize: 12, fontWeight: 600 }}>● Online</span>
                    <span style={{ color: "#881337", fontSize: 12, opacity: 0.85, fontWeight: "bold" }}>{currentUser.name || "User"}</span>
                  </div>
                </div>
                
                {/* User Menu Dropdown */}
                {userMenuOpen && (
                  <div style={{ position: "absolute", top: "100%", left: 0, background: "#ffffff", borderRadius: 12, padding: "8px 0", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", minWidth: 160, zIndex: 100, border: "1px solid #ffe4e6", marginTop: "8px" }}>
                    <button onClick={handleLogout} style={{ width: "100%", textAlign: "left", padding: "10px 18px", background: "none", border: "none", cursor: "pointer", color: "#e11d48", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 10, transition: "background .15s" }} onMouseEnter={e => e.currentTarget.style.background = "#fff1f2"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      <MdLogout size={18} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setAddContactOpen(true)} className="addb" style={{ background: "#fb7185", border: "none", cursor: "pointer", color: "white", fontSize: 12, fontWeight: 700, padding: "6px 10px", borderRadius: 12, transition: "all .2s" }}>+ Add</button>
                {["💬", "⋮"].map((ic, i) => <button key={i} className="ib" style={{ background: "none", border: "none", cursor: "pointer", color: "#fb7185", fontSize: 18, padding: "8px 10px", transition: "all .2s" }}>{ic}</button>)}
              </div>
            </div>

            {/* Search */}
            <div style={{ padding: "12px 16px" }}>
              <div style={{ background: "#ffffff", borderRadius: 12, display: "flex", alignItems: "center", padding: "10px 14px", gap: 10, border: "1px solid #ffe4e6", boxShadow: "0 2px 10px rgba(244,63,94,0.05)" }}>
                <span style={{ color: "#fb7185", fontSize: 16 }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." style={{ background: "none", border: "none", color: "#4c0519", fontSize: 14, flex: 1, outline: "none" }} />
              </div>
            </div>

            {/* Add Contact flow removed; registered users appear automatically in your dashboard. */}

            {/* Contact List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {contacts.length === 0 && <div style={{ padding: "40px 20px", textAlign: "center", color: "#fb7185", fontSize: 14, fontWeight: 600 }}>Tap above to add your first contact!</div>}
              {filtered.length === 0 && contacts.length > 0 && <div style={{ padding: "20px", textAlign: "center", color: "#fb7185", fontSize: 13 }}>No contacts match your search</div>}
              {filtered.map(c => {
                const lm = lastMsg(c.id);
                const ur = unread(c.id);
                const on = active === c.id;
                const displayStatus = on ? "online" : "offline";
                return (
                  <div key={c.id} className={`cr${on ? " on" : ""}`} onClick={() => { setActive(c.id); setInfoOpen(false); }}
                    style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", borderBottom: "1px solid rgba(255,228,230,0.5)", background: on ? "#fff1f2" : "transparent", transition: "all .2s" }}>
                    <div style={{ position: "relative" }}><Avatar c={c} size={50} /><StatusDot status={displayStatus} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ color: "#4c0519", fontWeight: 700, fontSize: 15 }}>{displayName(c)}</span>
                        {lm && <span style={{ color: ur > 0 ? "#f43f5e" : "#fb7185", fontSize: 11, fontWeight: ur > 0 ? 700 : 500 }}>
                          {new Date().toDateString() === new Date(lm.timestamp).toDateString() ? new Date(lm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Yesterday'}
                        </span>}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <span style={{ color: active === c.id ? "#e11d48" : "#881337", opacity: 0.8, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 190 }}>
                          {lm ? (
                            <>
                              {lm.senderId === currentUser.id && <Tick status={lm.status} />}
                              {lm.type === "image" ? "📷 Photo" : lm.type === "video" ? "🎬 Video" : lm.type === "file" ? "📎 File" : lm.text}
                            </>
                          ) : <em style={{ opacity: 0.6 }}>Available to chat</em>}
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
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, background: "rgba(255, 255, 255, 0.4)", position: "relative" }}>

            {!active || !contact ? (
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
                      <StatusDot status="online" />
                    </div>
                    <div style={{ cursor: "pointer" }} onClick={() => setInfoOpen(v => !v)}>
                      <div style={{ color: "#4c0519", fontWeight: 800, fontSize: 16 }}>{displayName(contact)}</div>
                      <div style={{ color: "#f43f5e", fontSize: 12, fontWeight: 600 }}>
                        {contact.gmail || contact.email || ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, position: "relative" }}>
                    {["📞", "🎥", "🔍"].map((ic, i) => <button key={i} className="ib" style={{ background: "none", border: "none", cursor: "pointer", color: "#fb7185", fontSize: 18, padding: "8px 10px", transition: "all .2s" }}>{ic}</button>)}

                    {/* The 3 Dots Menu Button */}
                    <button className="ib" onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#fb7185", fontSize: 18, padding: "8px 10px", transition: "all .2s" }}>⋮</button>

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
                          { l: "Clear chat", i: <MdOutlineRemoveCircleOutline size={19} />, action: () => handleClearChat(active) },
                          { l: "Delete chat", i: <MdOutlineDeleteOutline size={19} />, action: () => handleDeleteChat(active) },
                        ].map((item, idx) => item.div ? (
                          <div key={idx} style={{ height: 1, background: "#f1f5f9", margin: "6px 0" }} />
                        ) : (
                          <button key={idx} onClick={() => { setMenuOpen(false); if (item.action) item.action(); }} style={{ width: "100%", textAlign: "left", padding: "10px 18px", background: "none", border: "none", cursor: "pointer", color: item.l === "Delete chat" ? "#e11d48" : "#334155", fontSize: 14, fontWeight: item.l === "Delete chat" ? 600 : 500, display: "flex", alignItems: "center", gap: 14, transition: "background .15s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
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
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#881337" }}>Say hello to {contact.name || contact.gmail || "them"}!</div>
                      <div style={{ fontSize: 14, marginTop: 5, color: "#fb7185" }}>Messages are end-to-end encrypted</div>
                    </div>
                  )}
                  {msgs.map((msg, i) => {
                    const isMe = msg.senderId === currentUser.id;
                    const showDate = i === 0 || new Date(msg.timestamp).toDateString() !== new Date(msgs[i - 1]?.timestamp).toDateString();
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
                          <div style={{ maxWidth: "65%", padding: "10px 14px 6px", background: isMe ? "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)" : "#ffffff", color: isMe ? "white" : "#4c0519", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px", boxShadow: isMe ? "0 4px 14px rgba(244,63,94,0.3)" : "0 4px 14px rgba(0,0,0,0.05)", border: isMe ? "none" : "1px solid #ffe4e6", overflow: "hidden" }}>
                            {msg.type === "image" ? (
                              <img onClick={() => setPreviewMedia({ type: "image", src: msg.text })} src={msg.text} alt="attached" style={{ maxWidth: "100%", borderRadius: 8, marginTop: 4, display: "block", cursor: "pointer" }} />
                            ) : msg.type === "video" ? (
                              <video onClick={() => setPreviewMedia({ type: "video", src: msg.text })} controls style={{ maxWidth: "100%", borderRadius: 8, marginTop: 4, display: "block", cursor: "pointer" }}>
                                <source src={msg.text} type="video/mp4" />
                                Your browser does not support HTML5 video.
                              </video>
                            ) : msg.type === "audio" ? (
                              <audio controls style={{ maxWidth: "100%", borderRadius: 8, marginTop: 4, display: "block" }}>
                                <source src={msg.text} type={msg.text.startsWith("data:audio/") ? msg.text.split(";")[0].split(":")[1] : "audio/mpeg"} />
                                Your browser does not support HTML5 audio.
                              </audio>
                            ) : msg.type === "file" ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, background: "rgba(0,0,0,0.1)", borderRadius: 8 }}>
                                <span style={{ fontSize: 20 }}>📄</span>
                                <a href={msg.text} download="attachment" style={{ color: isMe ? "white" : "#e11d48", fontWeight: "bold", textDecoration: "underline", fontSize: 13, wordBreak: "break-all" }}>Download File</a>
                              </div>
                            ) : (
                              <div style={{ fontSize: 14.5, lineHeight: 1.5, wordBreak: "break-word", fontWeight: 500 }}>{msg.text}</div>
                            )}
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
                        {[0, 1, 2].map(i => <div key={i} className="td" style={{ width: 8, height: 8, borderRadius: "50%", background: "#fb7185" }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>

                {previewMedia && (
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(15, 23, 42, 0.9)",
                    zIndex: 50,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 20,
                  }}>
                    <button onClick={() => setPreviewMedia(null)} style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      border: "none",
                      background: "rgba(255,255,255,0.14)",
                      color: "white",
                      fontSize: 20,
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      cursor: "pointer",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                    }}>✕</button>
                    <div style={{ maxWidth: "100%", maxHeight: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {previewMedia.type === "image" ? (
                        <img src={previewMedia.src} alt="preview" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.45)" }} />
                      ) : (
                        <video controls autoPlay style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.45)" }}>
                          <source src={previewMedia.src} type="video/mp4" />
                          Your browser does not support HTML5 video.
                        </video>
                      )}
                    </div>
                  </div>
                )}

                {/* Input bar */}
                <div style={{ position: "relative", background: "rgba(255, 241, 242, 0.8)", padding: "12px 20px", display: "flex", alignItems: "flex-end", gap: 12, borderTop: "1px solid #ffe4e6", backdropFilter: "blur(4px)" }}>
                  <button onClick={() => setEmojiPickerOpen(v => !v)} className="ib" style={{ background: "none", border: "none", cursor: "pointer", color: "#fb7185", fontSize: 24, padding: "8px", transition: "all .2s" }}>😊</button>
                  {emojiPickerOpen && (
                    <div style={{ position: "absolute", bottom: "56px", left: 0, width: 240, background: "#ffffff", border: "1px solid #fde2e8", borderRadius: 18, padding: 12, boxShadow: "0 18px 50px rgba(15,23,42,0.14)", zIndex: 50, transform: "translateY(-4px)" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8 }}>
                        {["😊","😂","😍","👍","🎉","🔥","😎","🙌","🥳","❤️","👏","🤔"].map((emoji) => (
                          <button key={emoji} type="button" onClick={() => { sendText(emoji); setEmojiPickerOpen(false); }} style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid #fde2e8", background: "#fff", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileAttachment} style={{ display: "none" }} />
                  <button onClick={() => fileInputRef.current?.click()} className="ib" style={{ background: "none", border: "none", cursor: "pointer", color: "#fb7185", fontSize: 22, padding: "8px", transition: "all .2s" }}>📎</button>

                  <div style={{ flex: 1, background: "#ffffff", borderRadius: 16, padding: "10px 16px", display: "flex", alignItems: "center", border: "1px solid #ffe4e6", boxShadow: "inset 0 2px 4px rgba(244,63,94,0.03)" }}>
                    <textarea value={input} onChange={handleInput} onKeyDown={handleKey} placeholder={recording ? "Recording audio..." : `Message ${contact.name || contact.gmail || "them"}...`} rows={1}
                      style={{ background: "none", border: "none", color: "#4c0519", fontSize: 14, flex: 1, resize: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto", outline: "none", fontWeight: 500 }} />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {recording && (
                      <span style={{ color: "#e11d48", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                        Recording {recordingTime}s
                      </span>
                    )}
                    <button className="sb" onClick={() => {
                        if (input.trim()) {
                          send();
                        } else if (recording) {
                          stopRecording();
                        } else {
                          startRecording();
                        }
                      }} style={{ background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)", border: "none", borderRadius: "50%", width: 48, height: 48, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "white", transition: "all .2s", flexShrink: 0, boxShadow: "0 8px 18px rgba(244,63,94,0.35)" }}>
                      {input.trim() ? "➤" : recording ? "⏹" : "🎤"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── INFO PANEL ───────────────────────────────────────────────── */}
          {infoOpen && active && contact && (
            <div style={{ width: 320, background: "rgba(255,255,255,0.7)", borderLeft: "1px solid #ffe4e6", display: "flex", flexDirection: "column", overflowY: "auto", animation: "slideUp .25s cubic-bezier(0.34,1.56,0.64,1)" }}>
              <div style={{ background: "rgba(255, 241, 242, 0.8)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid #ffe4e6" }}>
                <button onClick={() => setInfoOpen(false)} style={{ background: "none", border: "none", color: "#fb7185", fontSize: 20, cursor: "pointer", transition: "all .2s" }}>✕</button>
                <span style={{ color: "#881337", fontWeight: 800, fontSize: 16 }}>Contact Info</span>
              </div>

              <div style={{ padding: "30px 20px 20px", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "1px solid #ffe4e6" }}>
                <Avatar c={contact} size={84} />
                <div style={{ color: "#4c0519", fontWeight: 800, fontSize: 20, mt: 16, marginTop: "16px" }}>{displayName(contact)}</div>
                <div style={{ color: "#f43f5e", fontSize: 13, fontWeight: 600, marginTop: 4 }}>{contact.gmail}</div>
                <div style={{ color: "#881337", fontSize: 13, marginTop: 8, opacity: 0.8, fontStyle: "italic", textAlign: "center" }}>{contact.bio || "Busy building dreams 💖"}</div>
                <div style={{ marginTop: 14, width: "100%", background: "rgba(255,255,255,0.75)", borderRadius: 18, border: "1px solid #fbcfe8", padding: "12px 14px", boxShadow: "0 10px 24px rgba(244,63,94,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#334155", fontSize: 13, fontWeight: 600 }}>
                    <span>Your email</span>
                    <span style={{ color: "#c026d3", fontWeight: 700 }}>{currentUser.email || "Not set"}</span>
                  </div>
                  {contact.gmail && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 8, color: "#4c0519", fontSize: 13 }}>
                      <span>Contact email</span>
                      <span style={{ fontWeight: 600 }}>{contact.gmail}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: "0 20px 20px" }}>
                <div style={{ background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)", borderRadius: 16, padding: "18px", border: "1px solid #fecdd3", boxShadow: "0 8px 24px rgba(244,63,94,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ color: "#881337", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🎵</span> Shared Music
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: music.isPlaying ? "#10b981" : "#fb7185", boxShadow: music.isPlaying ? "0 0 8px #10b981" : "none" }} />
                  </div>
                  <div style={{ color: "#4c0519", fontSize: 14, fontWeight: 700, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {music.songId || "No track playing"}
                  </div>
                  <div style={{ height: 4, background: "rgba(244,63,94,0.1)", borderRadius: 2, marginBottom: 16, position: "relative", cursor: "pointer" }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const p = x / rect.width;
                      socket.emit("seek-song", { roomId: active, time: p * 100 });
                    }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", background: "#f43f5e", borderRadius: 2, width: `${music.currentTime}%`, transition: "width 0.2s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
                    <button onClick={() => {
                      if (music.isPlaying) {
                        socket.emit("pause-song", { roomId: active, time: music.currentTime });
                      } else {
                        socket.emit("play-song", { roomId: active, songId: "Love Symphony", time: music.currentTime });
                      }
                    }} style={{ background: "#f43f5e", border: "none", borderRadius: "50%", width: 44, height: 44, color: "white", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px rgba(244,63,94,0.3)", transition: "transform 0.1s" }}>
                      {music.isPlaying ? "⏸" : "▶"}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ padding: "0 20px" }}>
                {[{ l: "Status", v: contact.lastSeen }, { l: "Email Address", v: contact.gmail }, { l: "Messages Exchanged", v: `${msgs.length} total` }].map(({ l, v }) => (
                  <div key={l} style={{ background: "#ffffff", borderRadius: 12, padding: "14px 16px", marginBottom: "12px", border: "1px solid #ffe4e6", boxShadow: "0 2px 10px rgba(244,63,94,0.03)" }}>
                    <div style={{ color: "#fb7185", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{l}</div>
                    <div style={{ color: "#4c0519", fontSize: 14, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ padding: "8px 20px 24px", marginTop: "auto" }}>
                <button style={{ width: "100%", background: "#fff1f2", border: "2px solid #fecdd3", borderRadius: 12, padding: "14px", color: "#e11d48", cursor: "pointer", fontSize: 14, fontWeight: 700, transition: "all .2s", boxShadow: "0 4px 12px rgba(225,29,72,0.1)" }}>
                  🚫 Block {(contact.name || contact.gmail || "User").split(' ')[0]}
                </button>
              </div>
            </div>
          )}

          {/* ── ADD MODAL ────────────────────────────────────────────────── */}

          {/* ── TOAST ────────────────────────────────────────────────────── */}
          {toast && (
            <div style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", fontWeight: 700, fontSize: 14, padding: "14px 28px", borderRadius: 999, boxShadow: "0 12px 32px rgba(16,185,129,0.4)", animation: "toastIn .3s cubic-bezier(0.34,1.56,0.64,1)", zIndex: 200, whiteSpace: "nowrap", border: "1px solid #34d399" }}>
              {toast}
            </div>
          )}

          {profileOpen && (
            <div onClick={() => setProfileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#ffffff", borderRadius: 28, boxShadow: "0 32px 80px rgba(15,23,42,0.18)", padding: 24, position: "relative" }}>
                <button onClick={() => setProfileOpen(false)} style={{ position: "absolute", top: 18, right: 18, width: 36, height: 36, borderRadius: 12, border: "none", background: "#f8fafc", color: "#9ca3af", fontSize: 18, cursor: "pointer" }}>×</button>
                <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 20 }}>
                  <div style={{ width: 120, height: 120, borderRadius: "50%", overflow: "hidden", background: "#f43f5e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isImageUrl(currentUser.avatar) ? (
                      <img src={currentUser.avatar} alt={currentUser.name || "Profile"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ color: "#ffffff", fontSize: 42, fontWeight: 800 }}>{currentUser.avatar || initials(currentUser.name)}</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#2c3a4b" }}>{currentUser.name || "Me"}</div>
                    <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>{currentUser.email || "No email available"}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
                  <div style={{ padding: 16, borderRadius: 18, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#9d174d", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Email</div>
                    <div style={{ fontSize: 15, color: "#334155" }}>{currentUser.email || "N/A"}</div>
                  </div>
                  <div style={{ padding: 16, borderRadius: 18, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#9d174d", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Your Email</div>
                    <div style={{ fontSize: 15, color: "#334155" }}>{currentUser.email || "Not set"}</div>
                  </div>
                </div>
                <button onClick={handleLogout} style={{ marginTop: 24, width: "100%", padding: "14px 18px", borderRadius: 16, border: "none", background: "#f43f5e", color: "#ffffff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Logout</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}