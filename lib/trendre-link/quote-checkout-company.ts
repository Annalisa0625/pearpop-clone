export type CheckoutCompany = {
  user_id: string;
  approval_status: string | null;
  company_name: string | null;
  contact_email: string | null;
};

export type CheckoutCompanyAuthorization =
  | { ok: true; company: CheckoutCompany }
  | { ok: false; reason: "missing" | "not_approved" | "owner_mismatch" };

export async function authorizeCheckoutCompany(args: {
  userId: string;
  loadCompany: (userId: string) => Promise<CheckoutCompany | null>;
}): Promise<CheckoutCompanyAuthorization> {
  const company = await args.loadCompany(args.userId);
  if (!company) return { ok: false, reason: "missing" };
  if (company.user_id !== args.userId) {
    return { ok: false, reason: "owner_mismatch" };
  }
  if (company.approval_status !== "approved") {
    return { ok: false, reason: "not_approved" };
  }
  return { ok: true, company };
}
