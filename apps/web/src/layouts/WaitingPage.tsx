import WaitingImage from "@pub/images/waiting-hero.png";
import Image from "next/image";

export default function WaitingPage() {
  return (
    <div className="grow items-center flex">
      {" "}
      <Image src={WaitingImage} alt="waiting for game" className="animate-bounce" />
    </div>
  );
}
