"use client";

import PlayIcon from "@pub/images/game-icon.png";
import LeaguesIcon from "@pub/images/leagues-icon.png";
import ProfileIcon from "@pub/images/profile-icon.png";
import QuestsIcon from "@pub/images/quests-icon.png";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { MouseEventHandler, useState } from "react";

import StrokeText from "@/components/StrokeText";

type ItemTypes = "home" | "profile" | "leagues" | "quests";

const Footer = () => {
  const router = useRouter();
  const pathname = usePathname();

  const onItemClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    const { id } = e.currentTarget;
    handleNavigate(id as ItemTypes);
  };

  const handleNavigate = (id: ItemTypes) => {
    router.push(id);
  };

  const menuItems = [
    { title: "لیگ ها", route: "/leagues", icon: LeaguesIcon },
    { title: "خانه", route: "/", icon: PlayIcon },
    { title: "پروفایل", route: "/profile", icon: ProfileIcon },
    { title: "مأموریت‌ها", route: "/quests", icon: QuestsIcon },
  ];

  return (
    <footer className="w-full sticky bottom-0 flex z-1">
      <span className="absolute -z-1 inset-0 backdrop-blur-xl"></span>
      {/* mask-[linear-gradient(transparent,black,black)] */}

      {menuItems.map(({ route, title, icon }) => (
        <button
          onClick={onItemClick}
          id={route}
          key={route}
          className={`p-2 flex flex-col text-amber-100 items-center justify-center transition-all origin-center 
            ${pathname === route ? "bg-white/15 w-2/3" : "w-1/3"} 
            ${pathname !== route && route === "/" ? "bg-amber-400/60 animate-pulse" : ""}`}
        >
          <Image src={icon} alt="leagues icon" width={40} unoptimized />
          {pathname === route ? (
            <StrokeText color="gold" strokeColor="darkblue" label={title} fontWeight={600} fontSize={12} />
          ) : null}
        </button>
      ))}

      {/*
      <button
        onClick={onItemClick}
        id="home"
        className={`p-2 flex flex-col text-amber-100 items-center justify-center transition-all origin-center ${pathname === "/" ? "bg-white/15 w-2/3" : "w-1/3"}`}
      >
        <Image src={PlayIcon} alt="play icon" width={40} unoptimized />
        {pathname === "/" ? (
          <StrokeText
            color="gold"
            strokeColor="darkblue"
            label="خانه"
            fontWeight={600}
            fontSize={12}
          />
        ) : null}
      </button>

      <button
        onClick={onItemClick}
        id="profile"
        className={`p-2 flex flex-col text-amber-100 items-center justify-center transition-all origin-center ${pathname === "/profile" ? "bg-white/15 w-2/3" : "w-1/3"}`}
      >
        <Image src={ProfileIcon} alt="profile icon" width={40} unoptimized />
        {pathname === "/profile" ? (
          <StrokeText
            color="gold"
            strokeColor="darkblue"
            label="پروفایل"
            fontWeight={600}
            fontSize={12}
          />
        ) : null}
      </button>

      <button
        onClick={onItemClick}
        id="quests"
        className={`p-2 flex flex-col text-amber-100 items-center justify-center transition-all origin-center ${pathname === "/quests" ? "bg-white/15 w-2/3" : "w-1/3"}`}
      >
        <Image src={QuestsIcon} alt="quests icon" width={40} unoptimized />
        {pathname === "/quests" ? (
          <StrokeText
            color="gold"
            strokeColor="darkblue"
            label="مأموریت‌ها"
            fontWeight={600}
            fontSize={12}
          />
        ) : null}
      </button> */}
    </footer>
  );
};

export default Footer;
