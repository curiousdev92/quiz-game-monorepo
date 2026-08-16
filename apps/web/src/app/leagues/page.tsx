import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LeaguesPage from "@/layouts/Leagues/LeaguesPage";
import { api } from "@/lib/api";

export default async function Page() {
  const token = (await cookies()).get("token")?.value;
  const activeLeague = await api.activeLeague();

  return !token ? redirect("/login") : <LeaguesPage token={token} activeLeague={activeLeague} />;
}
