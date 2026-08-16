"use client";

import { Map, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import Button from "@/components/Button";

/** Shown when the server refuses to start a round (out of rounds, no active league…). */
export default function StartError({ message }: { message: string }): React.JSX.Element {
  const router = useRouter();

  return (
    <main className="flex flex-1 flex-col justify-center gap-6 p-4 text-center">
      <TriangleAlert className="mx-auto h-14 w-14 text-wrong" />
      <h1 className="text-2xl font-black text-white">امکان شروع دور وجود ندارد</h1>
      <p className="text-slate-300">{message}</p>
      <div className="flex flex-col gap-3">
        <Button onClick={() => router.push("/quests")}>
          <Map className="h-4 w-4" />
          گرفتن دور بیشتر
        </Button>
        <Button variant="secondary" onClick={() => router.push("/")}>
          بازگشت به خانه
        </Button>
      </div>
    </main>
  );
}
