import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HomePage from "@/layouts/HomePage";
import WaitingPage from "@/layouts/WaitingPage";
import { api, ApiError, AuthUser } from "@/lib/api";

export default async function Page() {
  const activeLeague = await api.activeLeague();
  const token = (await cookies()).get("token")?.value;
  let me = null;

  if (token) {
    try {
      me = (await api.me(token)) as AuthUser & { createdAt: string };
      const roundBudgets = await api.roundBudget(token);

      const isAdmin = me?.isAdmin ?? false;
      const outOfRounds = !isAdmin && roundBudgets?.league && roundBudgets.remaining <= 0;

      if (outOfRounds) {
        redirect("/leagues");
      }
    } catch (e) {
      // Stale/invalid token → clear it; anything else (incl. the redirect
      // above) propagates to the error boundary / Next.
      if (e instanceof ApiError && e.status === 401) {
        redirect("/api/auth/logout");
      }
      throw e;
    }
  }

  return activeLeague ? <HomePage activeLeague={activeLeague} /> : <WaitingPage />;
}
