import { io } from "socket.io-client";

// Ensure this matches the backend URL used in authApi.js
const SOCKET_URL = "http://192.168.0.121:5000";

export const socket = io(SOCKET_URL, {
  autoConnect: false, // We'll connect manually when the dashboard loads to avoid unnecessary connections
});

export const connectSocket = (userId) => {
  if (socket.disconnected) {
    socket.auth = { userId };
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
