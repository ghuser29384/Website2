import type { ReactNode } from "react";

interface MessageThreadLayoutProps {
  children: ReactNode;
}

export default function MessageThreadLayout({ children }: MessageThreadLayoutProps) {
  return (
    <>
      <style>{`
        .marketplace-app-shell #main-content > .section {
          display: block !important;
        }
      `}</style>
      {children}
    </>
  );
}
