"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import Button from "@/components/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <TriangleAlert className="h-14 w-14 text-wrong" />
      <h1 className="text-2xl font-black text-white">مشکلی پیش آمد</h1>
      <p className="text-slate-300">ارتباط با سرور برقرار نشد یا خطایی رخ داد. لطفا دوباره تلاش کنید.</p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button label="تلاش دوباره" onClick={reset} />
        <Link href="/">
          <Button label="بازگشت به خانه" variant="secondary" className="w-full" />
        </Link>
      </div>
    </main>
  );
}
