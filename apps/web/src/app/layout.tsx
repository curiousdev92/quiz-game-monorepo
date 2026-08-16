import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppToaster from "@/components/AppToaster";
import GlobalErrorCatcher from "@/components/GlobalErrorCatcher";
import OnAfterLoad from "@/components/OnAfterLoad";
import Footer from "@/layouts/Footer";
import { api, ApiError } from "@/lib/api";

import { IranYekanXVF } from "../../public/fonts";

import "./globals.css";

export const metadata: Metadata = { title: "مسابقه تریویا" };

type PropTypes = Readonly<{ children: React.ReactNode }>;

export default async function RootLayout({ children }: PropTypes) {
  let me = null;
  const token = (await cookies()).get("token")?.value;
  try {
    if (token) {
      me = await api.me(token);
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/api/auth/logout");
    }
  }

  return (
    <html lang="fa" className="bg-gray-900 h-full overflow-hidden" dir="rtl">
      <body
        dir="rtl"
        className={`${IranYekanXVF.className} antialiased overflow-auto max-w-screen mx-auto w-md h-full flex`}
      >
        <div className="relative flex flex-col overflow-auto grow bg-[url(/images/game-bg.jpg)] bg-cover bg-center bg-no-repeat">
          <div className="grow flex flex-col">{children}</div>

          <Footer />

          <div id="modal"></div>
        </div>

        <AppToaster />
        <GlobalErrorCatcher />
      </body>

      <OnAfterLoad me={me} />
    </html>
  );
}
