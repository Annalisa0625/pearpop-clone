import type { ReactNode } from "react";

import CreatorLinkInboxShortcut from "./_components/CreatorLinkInboxShortcut";

export default function CreatorLinkLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CreatorLinkInboxShortcut />
    </>
  );
}
