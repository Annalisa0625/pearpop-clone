// File: lib/payouts/manualBankTransfer.ts

export type ManualBankPayoutProfile = {
  bank_name: string | null;
  bank_code: string | null;
  branch_name: string | null;
  branch_code: string | null;
  account_type: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  account_holder_kana: string | null;
};

export type ManualBankValidationResult = {
  ready: boolean;
  warnings: string[];
  normalized: {
    bank_name: string;
    bank_code: string;
    branch_name: string;
    branch_code: string;
    account_type: "ordinary" | "checking";
    account_type_label: "普通" | "当座";
    account_number: string;
    account_holder_name: string;
    account_holder_kana: string;
  };
};

export function normalizeDigits(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[^\d]/g, "");
}

export function normalizeDisplayName(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hiraganaToKatakana(value: string) {
  return value.replace(/[ぁ-ゖ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );
}

export function normalizeTransferAccountName(value: string | null | undefined) {
  return hiraganaToKatakana(String(value ?? ""))
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[\t\r\n]+/g, " ")
    .replace(/[　\s]+/g, " ")
    .trim();
}

export function normalizeAccountType(value: string | null | undefined) {
  return value === "checking" ? "checking" : "ordinary";
}

export function getAccountTypeLabel(value: string | null | undefined) {
  return normalizeAccountType(value) === "checking" ? "当座" : "普通";
}

export function isInvalidAccountNumber(value: string | null | undefined) {
  const digits = normalizeDigits(value);

  if (digits.length !== 7) return true;
  if (digits === "0000000") return true;
  if (/^(\d)\1{6}$/.test(digits)) return true;

  return false;
}

export function isUnsafeDisplayName(value: string | null | undefined) {
  const normalized = normalizeDisplayName(value);

  if (!normalized) return true;
  if (normalized.length > 80) return true;
  if (/[\u0000-\u001F\u007F]/.test(normalized)) return true;

  return false;
}

export function isValidTransferAccountName(value: string | null | undefined) {
  const normalized = normalizeTransferAccountName(value);

  if (!normalized) return false;
  if (normalized.length > 48) return false;

  return /^[ァ-ヶー・A-Z0-9 ()().,\-\/&]+$/.test(normalized);
}

export function validateManualBankPayoutProfile(
  profile: ManualBankPayoutProfile | null | undefined
): ManualBankValidationResult {
  const bankName = normalizeDisplayName(profile?.bank_name);
  const bankCode = normalizeDigits(profile?.bank_code).slice(0, 4);
  const branchName = normalizeDisplayName(profile?.branch_name);
  const branchCode = normalizeDigits(profile?.branch_code).slice(0, 3);
  const accountType = normalizeAccountType(profile?.account_type);
  const accountTypeLabel = getAccountTypeLabel(accountType);
  const accountNumber = normalizeDigits(profile?.account_number).slice(0, 7);
  const accountHolderName = normalizeDisplayName(profile?.account_holder_name);
  const accountHolderKana = normalizeTransferAccountName(
    profile?.account_holder_kana
  );

  const warnings: string[] = [];

  if (!bankName) {
    warnings.push("金融機関名が未登録です");
  }

  if (bankCode.length !== 4) {
    warnings.push("金融機関コードが4桁ではありません");
  }

  if (!branchName) {
    warnings.push("支店名が未登録です");
  }

  if (branchCode.length !== 3) {
    warnings.push("支店コードが3桁ではありません");
  }

  if (accountType !== "ordinary" && accountType !== "checking") {
    warnings.push("口座種別が不正です");
  }

  if (isInvalidAccountNumber(accountNumber)) {
    warnings.push("口座番号が7桁の有効な番号ではありません");
  }

  if (isUnsafeDisplayName(accountHolderName)) {
    warnings.push("口座名義が未登録、または使用できない形式です");
  }

  if (!isValidTransferAccountName(accountHolderKana)) {
    warnings.push(
      "振込用口座名義にCSV振込で使用できない文字、または長すぎる文字列が含まれています"
    );
  }

  return {
    ready: warnings.length === 0,
    warnings,
    normalized: {
      bank_name: bankName,
      bank_code: bankCode,
      branch_name: branchName,
      branch_code: branchCode,
      account_type: accountType,
      account_type_label: accountTypeLabel,
      account_number: accountNumber,
      account_holder_name: accountHolderName,
      account_holder_kana: accountHolderKana,
    },
  };
}

export function buildManualBankInvalidMessage(args: {
  creator_name?: string | null;
  creator_user_id?: string | null;
  order_ids?: string[];
  warnings: string[];
}) {
  const creatorName = args.creator_name || args.creator_user_id || "Unknown creator";
  const orderPart =
    args.order_ids && args.order_ids.length > 0
      ? ` / 注文: ${args.order_ids.join(", ")}`
      : "";

  return `${creatorName}${orderPart}: ${args.warnings.join("、")}`;
}