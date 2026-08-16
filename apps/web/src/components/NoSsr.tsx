"use client";

import { FC, ReactNode } from "react";

import { useMounted } from "@/hooks/use-mounted";

type PropTypes = { children: ReactNode };

const NoSsr: FC<PropTypes> = (props) => {
  const { children } = props;

  const mounted = useMounted();

  if (!mounted) return null;

  return <>{children}</>;
};

export default NoSsr;
