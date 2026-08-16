import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AdminPage from "@/layouts/AdminPage";

export default async function Page() {
  const token = (await cookies()).get("token")?.value;

  return !token ? redirect("/login") : <AdminPage token={token} />;
}
