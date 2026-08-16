"use client";

import { FC, ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

type PropTypes = { children: ReactNode; portalID?: string };

const ReactPortal: FC<PropTypes> = (props) => {
  const { children, portalID = "portal" } = props;
  const documentEle = window.document.getElementById(portalID) as HTMLElement;

  useEffect(() => {
    document.body.classList.add("overflow-hidden");

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, []);

  return createPortal(children, documentEle);
};

export default ReactPortal;
