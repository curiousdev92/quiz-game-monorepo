"use client";

import BackImage from "@pub/images/back-btn.png";
import CloseImage from "@pub/images/close-btn.png";
import InfoImage from "@pub/images/info-btn.png";
import { useRouter } from "next/navigation";
import { FC, ReactNode, useState } from "react";

import ContextWrapper from "@/components/ContextWrapper";
import Modal from "@/components/Modal";

type PropTypes = {
  onBackClick?: () => void;
  onClose?: () => void;
  middleContent?: ReactNode;
  infoModalContent?: ReactNode;
  hasClose?: boolean;
  hasInfo?: boolean;
};

const Header: FC<PropTypes> = (props) => {
  const { onBackClick, middleContent, infoModalContent, onClose, hasClose = true, hasInfo = true } = props;
  const [modal, setModal] = useState<boolean>(false);
  const router = useRouter();

  const goBack = () => {
    onBackClick ? onBackClick() : router.back();
  };

  const showInfo = () => {
    hasInfo && setModal(true);
  };

  const closePage = () => {
    onClose?.();
  };

  const hideModal = () => setModal(false);

  return (
    <>
      <header className="z-10 p-4 flex sticky top-0 items-start h-20">
        <div
          className="absolute inset-0 -z-1 backdrop-blur"
          style={{
            maskImage: "linear-gradient(rgb(15, 13, 55), rgb(15, 13, 55), transparent)",
          }}
        ></div>
        <button onClick={onClose ? closePage : goBack} className="size-12 cursor-pointer">
          {hasClose ? (
            <img src={onClose ? CloseImage.src : BackImage.src} alt="Back icon" width={47.18} height={48} />
          ) : null}
        </button>

        <div className="grow">{middleContent}</div>

        <button onClick={showInfo} className="size-12 cursor-pointer">
          {hasInfo ? <img src={InfoImage.src} alt="Info icon" width={47.18} height={48} /> : null}
        </button>
      </header>

      <Modal
        show={modal}
        content={
          <ContextWrapper
            content={infoModalContent}
            title={"راهنما"}
            ribbonType="yellow"
            hasCTA={true}
            onCTAClick={hideModal}
          />
        }
        handleCloseModal={hideModal}
      />
    </>
  );
};

export default Header;
