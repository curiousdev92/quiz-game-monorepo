"use client";

import { Toaster } from "react-hot-toast";

export default function AppToaster(): React.JSX.Element {
  return (
    <Toaster
      position="top-center"
      containerStyle={{ direction: "rtl" }}
      toastOptions={{
        duration: 4000,
        style: {
          fontFamily: "inherit",
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 12,
          background: "#1e293b",
          color: "#fff",
          maxWidth: 360,
        },
      }}
    />
  );
}
