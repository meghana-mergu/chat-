import axios from "axios";

const BASE_URL = "http://192.168.0.121";

export const loginAPI = async (data) => {
  try {
    const res = await axios.post(`${BASE_URL}:5000/api/auth/login`, data);
    return res.data;
  } catch (err) {
    throw err.response?.data?.message || "Login failed";
  }
};

export const registerAPI = async (data) => {
  console.log(data);
  
  try {
    const res = await axios.post(
      `${BASE_URL}:5000/api/auth/register`,
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data", 
        },
      }
    );

    return res.data;
  } catch (err) {
    throw err.response?.data?.message || "Register failed";
  }
};

// --- Dashboard APIs ---

export const getContactsAPI = async (userId) => {
  try {
    const res = await axios.get(`${BASE_URL}:5000/api/chat/sendMessages/${userId}`);
    return res.data;
  } catch (err) {
    throw err.response?.data?.message || "Failed to fetch contacts";
  }
};

export const getMessagesAPI = async (roomId) => {
  try {
    const res = await axios.get(`${BASE_URL}:5000/api/chat/messages/${roomId}`);
    return res.data;
  } catch (err) {
    throw err.response?.data?.message || "Failed to fetch messages";
  }
};
