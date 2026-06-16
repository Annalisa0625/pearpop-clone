// File: lib/banks/zengin.ts
type UnknownRecord = Record<string, unknown>;

export type BankBranch = {
  code: string;
  name: string;
  kana: string | null;
  hira: string | null;
  roma: string | null;
};

export type Bank = {
  code: string;
  name: string;
  kana: string | null;
  hira: string | null;
  roma: string | null;
  branches: BankBranch[];
};

let cachedBanks: Bank[] | null = null;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function normalizeCode(value: unknown, length: number) {
  const text = String(value ?? "")
    .normalize("NFKC")
    .replace(/\D/g, "");

  if (!text) return "";

  return text.padStart(length, "0").slice(-length);
}

function normalizeSearchText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function getBranchSource(record: UnknownRecord) {
  return (
    record.branches ??
    record.branch ??
    record.branchs ??
    record.children ??
    record.offices ??
    {}
  );
}

function normalizeBranches(source: unknown): BankBranch[] {
  const rows: Array<[string | null, unknown]> = Array.isArray(source)
    ? source.map((value) => [null, value])
    : isRecord(source)
      ? Object.entries(source)
      : [];

  return rows
    .map(([fallbackCode, value]) => {
      if (!isRecord(value)) return null;

      const code = normalizeCode(
        getString(value, [
          "code",
          "id",
          "branch_code",
          "branchCode",
          "office_code",
          "officeCode",
        ]) || fallbackCode,
        3
      );

      const name = getString(value, [
        "name",
        "branch_name",
        "branchName",
        "office_name",
        "officeName",
      ]);

      const kana =
        getString(value, ["kana", "name_kana", "nameKana", "branch_kana"]) ||
        null;
      const hira =
        getString(value, ["hira", "name_hira", "nameHira", "branch_hira"]) ||
        null;
      const roma =
        getString(value, ["roma", "name_roma", "nameRoma", "romaji"]) || null;

      if (!code || !name) return null;

      return {
        code,
        name,
        kana,
        hira,
        roma,
      };
    })
    .filter((branch): branch is BankBranch => Boolean(branch))
    .sort((a, b) => a.code.localeCompare(b.code, "ja"));
}

function looksLikeBankCollection(value: unknown) {
  if (Array.isArray(value)) {
    return value.some(isRecord);
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).some((item) => {
    if (!isRecord(item)) return false;

    return Boolean(
      getString(item, [
        "name",
        "bank_name",
        "bankName",
        "label",
        "hira",
        "kana",
        "roma",
      ])
    );
  });
}

function pickBankCollection(raw: unknown) {
  if (!isRecord(raw)) return raw;

  const candidates = [
    raw.banks,
    raw.bank,
    raw.data,
    raw.zenginCode,
    raw.default,
    raw,
  ];

  for (const candidate of candidates) {
    if (looksLikeBankCollection(candidate)) {
      return candidate;
    }
  }

  return raw;
}

function normalizeBanks(source: unknown): Bank[] {
  const rows: Array<[string | null, unknown]> = Array.isArray(source)
    ? source.map((value) => [null, value])
    : isRecord(source)
      ? Object.entries(source)
      : [];

  return rows
    .map(([fallbackCode, value]) => {
      if (!isRecord(value)) return null;

      const code = normalizeCode(
        getString(value, [
          "code",
          "id",
          "bank_code",
          "bankCode",
          "financial_code",
          "financialCode",
        ]) || fallbackCode,
        4
      );

      const name = getString(value, [
        "name",
        "bank_name",
        "bankName",
        "label",
      ]);

      const kana =
        getString(value, ["kana", "name_kana", "nameKana", "bank_kana"]) ||
        null;
      const hira =
        getString(value, ["hira", "name_hira", "nameHira", "bank_hira"]) ||
        null;
      const roma =
        getString(value, ["roma", "name_roma", "nameRoma", "romaji"]) || null;

      const branches = normalizeBranches(getBranchSource(value));

      if (!code || !name) return null;

      return {
        code,
        name,
        kana,
        hira,
        roma,
        branches,
      };
    })
    .filter((bank): bank is Bank => Boolean(bank))
    .sort((a, b) => a.code.localeCompare(b.code, "ja"));
}

export async function getBanks() {
  if (cachedBanks) {
    return cachedBanks;
  }

  const zenginModule = (await import("zengin-code")) as unknown;
  const raw = isRecord(zenginModule)
    ? (zenginModule.default ?? zenginModule)
    : zenginModule;

  const bankCollection = pickBankCollection(raw);
  const banks = normalizeBanks(bankCollection);

  if (banks.length === 0) {
    throw new Error("銀行コードデータを読み込めませんでした");
  }

  cachedBanks = banks;

  return banks;
}

export async function searchBanks(q: string, limit = 30) {
  const banks = await getBanks();
  const query = normalizeSearchText(q);

  const safeLimit = Math.min(Math.max(limit, 1), 100);

  if (!query) {
    return banks.slice(0, safeLimit).map((bank) => ({
      code: bank.code,
      name: bank.name,
      kana: bank.kana,
      hira: bank.hira,
      roma: bank.roma,
    }));
  }

  return banks
    .filter((bank) => {
      return [
        bank.code,
        bank.name,
        bank.kana,
        bank.hira,
        bank.roma,
      ].some((value) => normalizeSearchText(value).includes(query));
    })
    .slice(0, safeLimit)
    .map((bank) => ({
      code: bank.code,
      name: bank.name,
      kana: bank.kana,
      hira: bank.hira,
      roma: bank.roma,
    }));
}

export async function getBankByCode(bankCode: string) {
  const banks = await getBanks();
  const code = normalizeCode(bankCode, 4);

  return banks.find((bank) => bank.code === code) ?? null;
}

export async function searchBranches(bankCode: string, q: string, limit = 50) {
  const bank = await getBankByCode(bankCode);

  if (!bank) {
    return null;
  }

  const query = normalizeSearchText(q);
  const safeLimit = Math.min(Math.max(limit, 1), 200);

  const branches = !query
    ? bank.branches
    : bank.branches.filter((branch) => {
        return [
          branch.code,
          branch.name,
          branch.kana,
          branch.hira,
          branch.roma,
        ].some((value) => normalizeSearchText(value).includes(query));
      });

  return {
    bank: {
      code: bank.code,
      name: bank.name,
      kana: bank.kana,
      hira: bank.hira,
      roma: bank.roma,
    },
    branches: branches.slice(0, safeLimit),
  };
}