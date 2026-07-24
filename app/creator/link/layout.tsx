import type { ReactNode } from "react";

import CreatorLinkWorkspaceNav from "./_components/CreatorLinkWorkspaceNav";

export default function CreatorLinkLayout({ children }: { children: ReactNode }) {
  return (
    <div className="creator-link-workspace">
      {children}
      <CreatorLinkWorkspaceNav />
    </div>
  );
}
