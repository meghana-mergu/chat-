import { createSlice } from "@reduxjs/toolkit";
import { loginAPI, registerAPI } from "../services/authApi";

const initialState = {
  user: null,
  loading: false,
  error: null,
  success: null, // ✅ for success message
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    setUser: (state, action) => {
      state.user = action.payload;
      state.loading = false;
      state.error = null;
    },

    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },

    setSuccess: (state, action) => {
      state.success = action.payload;
      state.loading = false;
      state.error = null;
    },

    logout: (state) => {
      state.user = null;
    },
  },
});

export const {
  setLoading,
  setUser,
  setError,
  setSuccess,
  logout,
} = authSlice.actions;

export default authSlice.reducer;


// ================== ASYNC FUNCTIONS ==================

// LOGIN
export const loginUser = (data) => async (dispatch) => {
  try {
    dispatch(setLoading(true));

    const res = await loginAPI(data);

    dispatch(setUser(res));
  } catch (err) {
    dispatch(setError(err));
  }
};

// REGISTER
export const registerUser = (data) => async (dispatch) => {
  try {
    dispatch(setLoading(true));

    const res = await registerAPI(data);

    dispatch(setSuccess(res.message || "Registered Successfully"));
  } catch (err) {
    dispatch(setError(err));
  }
};
