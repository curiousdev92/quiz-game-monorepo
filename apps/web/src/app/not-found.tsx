import { Compass } from "lucide-react";
import Link from "next/link";

import Button from "@/components/Button";

export default function NotFound(): React.JSX.Element {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <Compass className="h-14 w-14 text-brand-500" />
      <h1 className="text-2xl font-black text-white">صفحه پیدا نشد</h1>
      <p className="text-slate-300">صفحه‌ای که دنبالش هستید وجود ندارد.</p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link href="/">
          <Button label="بازگشت به خانه" className="w-full" />
        </Link>
      </div>
    </main>
  );
}
