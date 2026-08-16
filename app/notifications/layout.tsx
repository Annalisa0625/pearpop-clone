import type { ReactNode } from "react";

import { CreatorReleaseModeProvider } from "@/app/creator/CreatorReleaseMode";
import { isCreatorOnlyRelease } from "@/lib/release-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NotificationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: roles } = user
    ? await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
    : { data: null };
  const isCreator = roles?.some((role) => role.role === "creator") ?? false;

  return (
    <CreatorReleaseModeProvider
      isCreatorOnly={isCreatorOnlyRelease() && isCreator}
    >
      {children}
    </CreatorReleaseModeProvider>
  );
}
