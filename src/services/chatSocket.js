import { io } from "socket.io-client";

// Ensure this matches the backend URL used in authApi.js
const SOCKET_URL = "https://mes-ioa3.onrender.com";

export const socket = io(SOCKET_URL, {
  autoConnect: false, // We'll connect manually when the dashboard loads to avoid unnecessary connections
});

export const connectSocket = (userId) => {
  if (!userId) return socket;
  // Always update auth BEFORE connecting — prevents race condition where
  // socket.connect() fires before auth is set (causing undefined userId on server)
  socket.auth = { userId };
  if (socket.disconnected) {
    socket.connect();
  } else if (socket.connected && socket.auth?.userId !== userId) {
    // User identity changed — reconnect with correct identity
    socket.disconnect();
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
