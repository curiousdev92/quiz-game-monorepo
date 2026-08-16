"use client";

import { useEffect } from "react";

import { AuthUser } from "@/lib/api";
import { useGlobalStore } from "@/store/store";

const OnAfterLoad = ({ me }: { me: (AuthUser & { createdAt: string }) | null }) => {
  const setUser = useGlobalStore((st) => st.setUser);

  useEffect(() => {
    if (me) {
      setUser(me);
    }
  }, [me]);

  return null;
};

export default OnAfterLoad;
