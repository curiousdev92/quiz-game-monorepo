import { AuthUser } from "@/lib/api";

export interface UserSlice {
  user: AuthUser | null;
  setUser: (data: UserSlice["user"]) => void;
}
