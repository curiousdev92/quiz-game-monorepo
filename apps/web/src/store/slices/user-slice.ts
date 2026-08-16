import { StateCreator } from "zustand";

import { UserSlice } from "../types/zustand";

export const createUserSlice: StateCreator<UserSlice> = (set) => ({
  user: null,
  setUser: (data) => set(() => ({ user: data })),
});
