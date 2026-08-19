export class LineAlreadyLinkedError extends Error {
  constructor() {
    super("This LINE account is already linked to another creator account.");
    this.name = "LineAlreadyLinkedError";
  }
}

/** Keeps an unlinked LINE record reserved for its original app user. */
export async function assertLineUserOwnership(
  admin: any,
  lineUserId: string,
  appUserId: string
) {
  const { data, error } = await admin
    .from("line_user_links")
    .select("id, app_user_id")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (error) throw error;
  if (data?.app_user_id && data.app_user_id !== appUserId) {
    throw new LineAlreadyLinkedError();
  }
}
