import axios from "axios";

const BASE_URL = "https://mes-ioa3.onrender.com";

export const loginAPI = async (data) => {
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, data);
    return res.data;
  } catch (err) {
    throw err.response?.data?.message || "Login failed";
  }
};

export const registerAPI = async (data) => {
  try {
    // data should be FormData with: name, email, password, profileImage (file)
    // Let axios set the Content-Type header with the correct multipart boundary.
    const res = await axios.post(`${BASE_URL}/api/auth/register`, data);
    return res.data;
  } catch (err) {
    throw err.response?.data?.message || "Register failed";
  }
};

export const verifyOtpAPI = async (data) => {
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/verify-otp`,data );
    return res.data;
  } catch (err) {
    throw err.response?.data?.message || "OTP verification failed";
  }
};

// Chat is handled entirely via socket events (no REST endpoints for contacts/messages in this backend)
// We keep these functions as no-ops for compatibility but they are not used by current UI.
export const getContactsAPI = async () => {
  throw "getContactsAPI is not supported in socket-only setup";
};

export const getMessagesAPI = async () => {
  throw "getMessagesAPI is not supported in socket-only setup";
};

export const searchUserByEmailAPI = async () => {
  throw "searchUserByEmailAPI is not supported in socket-only setup";
};
