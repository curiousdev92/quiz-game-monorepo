import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import QuestsPage from "@/layouts/Quests";

export default async function Page() {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/login?ref=/profile");

  return <QuestsPage token={token} />;
}
