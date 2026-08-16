import { create } from "zustand";

import { createUserSlice } from "./slices/user-slice";
import { UserSlice } from "./types/zustand";

type SliceTypes = UserSlice; // Continue adding other sliceTypes

export const useGlobalStore = create<SliceTypes>()((...a) => ({
  ...createUserSlice(...a),
}));
