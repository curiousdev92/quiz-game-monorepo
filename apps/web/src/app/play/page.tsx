import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import PlayPage from "@/layouts/Play/PlayPage";
import StartError from "@/layouts/Play/StartError";
import { api, ApiError, StartedRound } from "@/lib/api";

export default async function Page() {
  const token = (await cookies()).get("token")?.value;

  if (!token) redirect("/login?ref=/play");

  let roundData: StartedRound;
  try {
    roundData = await api.startRound(token);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/api/auth/logout");
    // Recoverable refusal (out of rounds, no active league…) → friendly screen
    // instead of the error boundary.
    if (e instanceof ApiError && e.status !== 0) {
      return <StartError message={e.message} />;
    }
    throw e;
  }

  return <PlayPage roundData={roundData} token={token} />;
}
