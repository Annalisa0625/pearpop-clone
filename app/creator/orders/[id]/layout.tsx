import { notFound } from "next/navigation";
import { isCreatorOnlyRelease } from "@/lib/release-mode";

export default function CreatorOrderLayout({ children }: { children: React.ReactNode }) {
  if (isCreatorOnlyRelease()) notFound();
  return children;
}
