import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import ProfilePage from "@/layouts/Profile";
import { api, ApiError } from "@/lib/api";

export default async function Page() {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/login?ref=/profile");

  let referral;
  try {
    referral = await api.myReferral(token);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/api/auth/logout");
    throw e;
  }

  return <ProfilePage referral={referral} token={token} />;
}
