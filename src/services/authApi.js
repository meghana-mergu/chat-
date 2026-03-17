import axios from "axios";

const BASE_URL = "http://192.168.0.24:5000/api";

export const loginAPI = async (data) => {
  try {
    const res = await axios.post(`${BASE_URL}/login`, data);
    return res.data;
  } catch (err) {
    throw err.response?.data || "Login failed";
  }
};

export const registerAPI = async (data) => {
  try {
    const res = await axios.post(`${BASE_URL}/register`, data);
    return res.data;
  } catch (err) {
    throw err.response?.data || "Register failed";
  }
};
