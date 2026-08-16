"use client";

import CloseButtonIcon from "@pub/images/close-btn.png";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { FC, MouseEventHandler, ReactNode } from "react";

import { preventClickBubble } from "@/lib/helper";

import NoSsr from "./NoSsr";
import ReactPortal from "./ReactPortal";

type PropTypes = {
  show: boolean;
  handleCloseModal?: () => void;
  content: ReactNode;
  closeButton?: boolean;
};

const Modal: FC<PropTypes> = (props) => {
  const { show, handleCloseModal, content, closeButton } = props;

  const handleClose: MouseEventHandler<HTMLElement> = (e) => {
    preventClickBubble(e);
    handleCloseModal?.();
  };

  // usePreventBack(!!handleCloseModal, handleCloseModal);

  return (
    <NoSsr>
      <ReactPortal portalID="modal">
        <AnimatePresence>
          {show ? (
            <motion.div
              className="absolute inset-0 backdrop-blur z-10 bg-system-black/40 flex justify-center items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            >
              <motion.div
                className="w-11/12 relative flex justify-center"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7, transition: { delay: 0 } }}
              >
                {closeButton ? (
                  <button onClick={handleClose} className="absolute -top-9 left-9 z-2 cursor-pointer">
                    <Image src={CloseButtonIcon} alt="red close icon" width={40} height={40} />
                  </button>
                ) : null}

                {content}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </ReactPortal>
    </NoSsr>
  );
};

export default Modal;
