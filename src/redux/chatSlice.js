import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  activeUser: null,
  selectedContact: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveUser: (state, action) => {
      state.activeUser = action.payload;
    },
    setSelectedContact: (state, action) => {
      state.selectedContact = action.payload;
    },
  },
});

export const { setActiveUser, setSelectedContact } = chatSlice.actions;
export default chatSlice.reducer;
