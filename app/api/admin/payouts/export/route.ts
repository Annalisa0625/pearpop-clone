// File: app/api/admin/payouts/export/route.ts

import { NextRequest, NextResponse } from "next/server";
import * as iconv from "iconv-lite";

import { requireAdminApi } from "@/lib/admin/guard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PayoutBatchRow = {
  id: string;
  batch_code: string | null;
  payout_method: string;
  status: string;
  period_start: string;
  period_end: string;
  scheduled_date: string | null;
  total_orders: number;
  total_creators: number;
  total_payout_amount: number;
  total_transfer_fee: number;
  total_withholding_amount: number;
  total_adjustment_amount: number;
  total_net_amount: number;
  currency: string;
  csv_file_name: string | null;
  exported_at: string | null;
  locked_at: string | null;
  created_at: string;
};

type PayoutItemRow = {
  id: string;
  payout_batch_id: string;
  creator_id: string;
  creator_user_id: string;
  payout_method: string;
  status: string;
  gross_amount: number;
  adjustment_amount: number;
  withholding_amount: number;
  transfer_fee: number;
  net_amount: number;
  currency: string;
  bank_name_snapshot: string | null;
  bank_code_snapshot: string | null;
  branch_name_snapshot: string | null;
  branch_code_snapshot: string | null;
  account_type_snapshot: string | null;
  account_number_snapshot: string | null;
  account_holder_name_snapshot: string | null;
  account_holder_kana_snapshot: string | null;
  exported_at: string | null;
};

type GmoCsvRow = {
  payout_item_id: string;
  creator_user_id: string;
  bank_code: string;
  branch_code: string;
  deposit_type: "1" | "2" | "4" | "9";
  account_number: string;
  recipient_name: string;
  amount: number;
};

const FULL_WIDTH_KANA =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン" +
  "ァィゥェォッャュョヮヵヶ" +
  "ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポヴ" +
  "ー「」、。";

const HALF_WIDTH_KANA = [
  "ｱ","ｲ","ｳ","ｴ","ｵ","ｶ","ｷ","ｸ","ｹ","ｺ",
  "ｻ","ｼ","ｽ","ｾ","ｿ","ﾀ","ﾁ","ﾂ","ﾃ","ﾄ",
  "ﾅ","ﾆ","ﾇ","ﾈ","ﾉ","ﾊ","ﾋ","ﾌ","ﾍ","ﾎ",
  "ﾏ","ﾐ","ﾑ","ﾒ","ﾓ","ﾔ","ﾕ","ﾖ","ﾗ","ﾘ",
  "ﾙ","ﾚ","ﾛ","ﾜ","ｦ","ﾝ","ｧ","ｨ","ｩ","ｪ",
  "ｫ","ｯ","ｬ","ｭ","ｮ","ﾜ","ｶ","ｹ","ｶﾞ","ｷﾞ",
  "ｸﾞ","ｹﾞ","ｺﾞ","ｻﾞ","ｼﾞ","ｽﾞ","ｾﾞ","ｿﾞ","ﾀﾞ","ﾁﾞ",
  "ﾂﾞ","ﾃﾞ","ﾄﾞ","ﾊﾞ","ﾋﾞ","ﾌﾞ","ﾍﾞ","ﾎﾞ","ﾊﾟ","ﾋﾟ",
  "ﾌﾟ","ﾍﾟ","ﾎﾟ","ｳﾞ","ｰ","｢","｣","､","｡",
] as const;

const KANA_MAP = new Map<string, string>(
  Array.from(FULL_WIDTH_KANA).map((character, index) => [
    character,
    HALF_WIDTH_KANA[index] ?? character,
  ])
);

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getInteger(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? Math.round(numberValue) : 0;
}

function normalizeDigits(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[^\d]/g, "");
}

function hiraganaToKatakana(value: string) {
  return value.replace(/[ぁ-ゖ]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) + 0x60)
  );
}

function toHalfWidthKana(value: string) {
  return Array.from(value)
    .map((character) => KANA_MAP.get(character) ?? character)
    .join("");
}

function normalizeRecipientName(value: unknown) {
  const source = hiraganaToKatakana(String(value ?? ""))
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[・･]/g, " ")
    .replace(/[，,]/g, " ")
    .replace(/[＆&]/g, " ")
    .replace(/[　\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return toHalfWidthKana(source)
    .replace(/[・･]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getShiftJisByteLength(value: string) {
  return iconv.encode(value, "Shift_JIS").length;
}

function isValidRecipientName(value: string) {
  if (!value) return false;
  if (getShiftJisByteLength(value) > 30) return false;

  return /^[ｦ-ﾟA-Z0-9 ()｢｣\/.\-]+$/u.test(value);
}

function normalizeDepositType(value: unknown): "1" | "2" | "4" | "9" | null {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();

  if (normalized === "ordinary" || normalized === "普通" || normalized === "1") {
    return "1";
  }

  if (normalized === "checking" || normalized === "当座" || normalized === "2") {
    return "2";
  }

  if (normalized === "savings" || normalized === "貯蓄" || normalized === "4") {
    return "4";
  }

  if (normalized === "other" || normalized === "その他" || normalized === "9") {
    return "9";
  }

  return null;
}

function escapeCsvCell(value: string | number) {
  const text = String(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\r") ||
    text.includes("\n")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toGmoCsv(rows: GmoCsvRow[]) {
  return rows
    .map((row) =>
      [
        row.bank_code,
        row.branch_code,
        row.deposit_type,
        row.account_number,
        row.recipient_name,
        row.amount,
        "",
        "",
      ]
        .map((value) => escapeCsvCell(value))
        .join(",")
    )
    .join("\r\n");
}

function createFileName(batch: PayoutBatchRow) {
  const safeCode =
    getString(batch.batch_code).replace(/[^A-Za-z0-9_-]/g, "") ||
    batch.id.replace(/-/g, "").slice(0, 12);

  return `gmo-aozora-${safeCode}.csv`;
}

function validateAndBuildRows(items: PayoutItemRow[]) {
  const rows: GmoCsvRow[] = [];
  const errors: string[] = [];

  for (const item of items) {
    const bankCode = normalizeDigits(item.bank_code_snapshot);
    const branchCode = normalizeDigits(item.branch_code_snapshot);
    const accountNumber = normalizeDigits(item.account_number_snapshot);
    const depositType = normalizeDepositType(item.account_type_snapshot);
    const recipientName = normalizeRecipientName(
      item.account_holder_kana_snapshot
    );
    const amount = getInteger(item.net_amount);

    const itemErrors: string[] = [];

    if (item.payout_method !== "manual_bank_transfer") {
      itemErrors.push("銀行振込以外の明細です");
    }

    if (!["ready", "exported"].includes(item.status)) {
      itemErrors.push(`CSV出力対象外の状態です（${item.status}）`);
    }

    if ((item.currency || "JPY").toUpperCase() !== "JPY") {
      itemErrors.push("通貨がJPYではありません");
    }

    if (!/^\d{4}$/.test(bankCode)) {
      itemErrors.push("銀行コードが4桁ではありません");
    }

    if (!/^\d{3}$/.test(branchCode)) {
      itemErrors.push("支店コードが3桁ではありません");
    }

    if (!/^\d{6,7}$/.test(accountNumber)) {
      itemErrors.push("口座番号が6〜7桁ではありません");
    }

    if (!depositType) {
      itemErrors.push("預金種目がGMOあおぞら形式へ変換できません");
    }

    if (!isValidRecipientName(recipientName)) {
      itemErrors.push(
        "受取人名が空欄、30バイト超過、または全銀許容外の文字を含んでいます"
      );
    }

    if (!Number.isInteger(amount) || amount <= 0 || amount > 9_999_999_999) {
      itemErrors.push("振込金額が1〜9,999,999,999円の範囲ではありません");
    }

    if (itemErrors.length > 0 || !depositType) {
      errors.push(
        `C ${item.creator_user_id} / 明細 ${item.id}: ${itemErrors.join("、")}`
      );
      continue;
    }

    rows.push({
      payout_item_id: item.id,
      creator_user_id: item.creator_user_id,
      bank_code: bankCode,
      branch_code: branchCode,
      deposit_type: depositType,
      account_number: accountNumber,
      recipient_name: recipientName,
      amount,
    });
  }

  return { rows, errors };
}

async function findExportBatch(
  db: any,
  requestedBatchId: string | null
): Promise<PayoutBatchRow | null> {
  const selectColumns = `
    id,
    batch_code,
    payout_method,
    status,
    period_start,
    period_end,
    scheduled_date,
    total_orders,
    total_creators,
    total_payout_amount,
    total_transfer_fee,
    total_withholding_amount,
    total_adjustment_amount,
    total_net_amount,
    currency,
    csv_file_name,
    exported_at,
    locked_at,
    created_at
  `;

  if (requestedBatchId) {
    const { data, error } = await db
      .from("payout_batches")
      .select(selectColumns)
      .eq("id", requestedBatchId)
      .eq("payout_method", "manual_bank_transfer")
      .in("status", ["draft", "exported"])
      .maybeSingle();

    if (error) throw error;

    return (data as PayoutBatchRow | null) ?? null;
  }

  const { data: draftBatch, error: draftError } = await db
    .from("payout_batches")
    .select(selectColumns)
    .eq("payout_method", "manual_bank_transfer")
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (draftError) throw draftError;
  if (draftBatch) return draftBatch as PayoutBatchRow;

  const { data: exportedBatch, error: exportedError } = await db
    .from("payout_batches")
    .select(selectColumns)
    .eq("payout_method", "manual_bank_transfer")
    .eq("status", "exported")
    .order("exported_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exportedError) throw exportedError;

  return (exportedBatch as PayoutBatchRow | null) ?? null;
}

async function rollbackBatchClaim(args: {
  db: any;
  batch: PayoutBatchRow;
  fileName: string;
}) {
  if (args.batch.status !== "draft") return;

  try {
    await args.db
      .from("payout_batches")
      .update({
        status: "draft",
        csv_file_name: args.batch.csv_file_name,
        exported_at: args.batch.exported_at,
        locked_at: args.batch.locked_at,
      })
      .eq("id", args.batch.id)
      .eq("status", "exported")
      .eq("csv_file_name", args.fileName);
  } catch (error) {
    console.error("admin payout export rollback failed:", error);
  }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdminApi();

  if (!admin.ok) {
    return admin.response;
  }

  const db = supabaseAdmin as any;
  let claimedBatch: PayoutBatchRow | null = null;
  let claimedFileName: string | null = null;

  try {
    const url = new URL(req.url);
    const requestedBatchId = getString(url.searchParams.get("batch_id")) || null;

    const batch = await findExportBatch(db, requestedBatchId);

    if (!batch) {
      return NextResponse.json(
        {
          error:
            "CSV出力できる振込バッチがありません。先に月次振込バッチを作成してください。",
        },
        { status: 409 }
      );
    }

    if ((batch.currency || "JPY").toUpperCase() !== "JPY") {
      return NextResponse.json(
        { error: "GMOあおぞらCSVはJPYの振込バッチのみ出力できます" },
        { status: 409 }
      );
    }

    const { data: itemRows, error: itemsError } = await db
      .from("payout_items")
      .select(
        `
        id,
        payout_batch_id,
        creator_id,
        creator_user_id,
        payout_method,
        status,
        gross_amount,
        adjustment_amount,
        withholding_amount,
        transfer_fee,
        net_amount,
        currency,
        bank_name_snapshot,
        bank_code_snapshot,
        branch_name_snapshot,
        branch_code_snapshot,
        account_type_snapshot,
        account_number_snapshot,
        account_holder_name_snapshot,
        account_holder_kana_snapshot,
        exported_at
      `
      )
      .eq("payout_batch_id", batch.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true });

    if (itemsError) {
      throw itemsError;
    }

    const items = ((itemRows ?? []) as PayoutItemRow[]).filter(Boolean);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "振込バッチにCSV出力可能な明細がありません" },
        { status: 409 }
      );
    }

    const { rows, errors } = validateAndBuildRows(items);

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error:
            "GMOあおぞらCSVへ変換できない振込明細があります。内容を修正してから再度出力してください。",
          invalid_count: errors.length,
          messages: errors,
        },
        { status: 409 }
      );
    }

    const calculatedNetAmount = rows.reduce(
      (total, row) => total + row.amount,
      0
    );

    if (
      getInteger(batch.total_creators) !== rows.length ||
      getInteger(batch.total_net_amount) !== calculatedNetAmount
    ) {
      return NextResponse.json(
        {
          error:
            "振込バッチの集計値と明細が一致しません。CSV出力を停止しました。",
          batch_total_creators: getInteger(batch.total_creators),
          csv_row_count: rows.length,
          batch_total_net_amount: getInteger(batch.total_net_amount),
          csv_total_amount: calculatedNetAmount,
        },
        { status: 409 }
      );
    }

    const csv = `${toGmoCsv(rows)}\r\n`;
    const shiftJisBytes = new Uint8Array(iconv.encode(csv, "Shift_JIS"));
    const fileName = batch.csv_file_name || createFileName(batch);
    const nowIso = new Date().toISOString();

    if (batch.status === "draft") {
      const { data: claimed, error: claimError } = await db
        .from("payout_batches")
        .update({
          status: "exported",
          csv_file_name: fileName,
          exported_at: nowIso,
          locked_at: batch.locked_at || nowIso,
        })
        .eq("id", batch.id)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();

      if (claimError) {
        throw claimError;
      }

      if (!claimed) {
        return NextResponse.json(
          {
            error:
              "この振込バッチは別の操作で更新されました。画面を再読み込みしてからやり直してください。",
          },
          { status: 409 }
        );
      }

      claimedBatch = batch;
      claimedFileName = fileName;

      const payoutItemIds = rows.map((row) => row.payout_item_id);

      const { data: updatedItems, error: itemUpdateError } = await db
        .from("payout_items")
        .update({
          status: "exported",
          exported_at: nowIso,
        })
        .in("id", payoutItemIds)
        .eq("payout_batch_id", batch.id)
        .eq("status", "ready")
        .select("id");

      if (itemUpdateError) {
        throw itemUpdateError;
      }

      if ((updatedItems ?? []).length !== payoutItemIds.length) {
        throw new Error("CSV出力状態へ更新できなかった振込明細があります");
      }
    }

    return new NextResponse(shiftJisBytes, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=Shift_JIS",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
        "X-Payout-Batch-Id": batch.id,
        "X-Payout-Batch-Code": batch.batch_code || "",
        "X-Payout-Creator-Count": String(rows.length),
        "X-Payout-Total-Amount": String(calculatedNetAmount),
      },
    });
  } catch (error) {
    console.error("admin payout batch CSV export error:", error);

    if (claimedBatch && claimedFileName) {
      await rollbackBatchClaim({
        db,
        batch: claimedBatch,
        fileName: claimedFileName,
      });
    }

    return NextResponse.json(
      {
        error: "振込バッチCSVの出力に失敗しました",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}