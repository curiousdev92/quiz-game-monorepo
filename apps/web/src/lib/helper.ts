import { MouseEventHandler } from "react";

import { useGlobalStore } from "@/store/store";

import { AuthUser } from "./api";

export const preventClickBubble: MouseEventHandler<HTMLElement> = (e) => {
  return e.stopPropagation();
};

export function setCookie(cname: string, cvalue: string, exdays: number) {
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  let expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

export function getCookie(cname: string) {
  let name = cname + "=";
  let ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

export function login(token: string, user: AuthUser) {
  setCookie("token", token, 30);

  useGlobalStore.getState().setUser(user);
}

export function formatRange(startsAt: string, endsAt: string): string {
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString("fa", {
      month: "short",
      day: "numeric",
      //   hour: "2-digit",
      //   minute: "2-digit",
    });
  return `${fmt(startsAt)} تا ${fmt(endsAt)}`;
}
