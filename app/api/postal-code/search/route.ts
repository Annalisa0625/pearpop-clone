// File: app/api/postal-code/search/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ZIPCLOUD_ENDPOINT = "https://zipcloud.ibsnet.co.jp/api/search";
const ZIPCLOUD_TIMEOUT_MS = 8000;

type ZipCloudResult = {
  zipcode: string;
  prefcode: string;
  address1: string;
  address2: string;
  address3: string;
  kana1: string;
  kana2: string;
  kana3: string;
};

type ZipCloudResponse = {
  status: number;
  message: string | null;
  results: ZipCloudResult[] | null;
};

function normalizePostalCode(value: string | null) {
  return (value ?? "").replace(/[^\d]/g, "").slice(0, 7);
}

function formatPostalCode(value: string) {
  const digits = normalizePostalCode(value);

  if (digits.length <= 3) return digits;

  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const postalCode = normalizePostalCode(
    searchParams.get("postal_code") ?? searchParams.get("zipcode")
  );

  if (postalCode.length !== 7) {
    return NextResponse.json(
      { error: "郵便番号は7桁で入力してください。" },
      { status: 400 }
    );
  }

  try {
    const url = `${ZIPCLOUD_ENDPOINT}?zipcode=${encodeURIComponent(
      postalCode
    )}&limit=20`;

    const res = await fetchWithTimeout(url, ZIPCLOUD_TIMEOUT_MS);
    const json = (await res.json().catch(() => null)) as ZipCloudResponse | null;

    if (!res.ok || !json) {
      return NextResponse.json(
        { error: "住所を取得できませんでした。" },
        { status: 502 }
      );
    }

    if (json.status !== 200) {
      return NextResponse.json(
        { error: json.message ?? "郵便番号を確認してください。" },
        { status: json.status === 400 ? 400 : 502 }
      );
    }

    if (!Array.isArray(json.results) || json.results.length === 0) {
      return NextResponse.json(
        { error: "住所が見つかりませんでした。" },
        { status: 404 }
      );
    }

    const addresses = json.results.map((item) => {
      const prefecture = item.address1?.trim() ?? "";
      const city = item.address2?.trim() ?? "";
      const town = item.address3?.trim() ?? "";

      return {
        postal_code: formatPostalCode(item.zipcode),
        raw_postal_code: normalizePostalCode(item.zipcode),
        prefecture,
        city,
        town,
        address_line1: town,
        full_address: `${prefecture}${city}${town}`,
      };
    });

    return NextResponse.json({
      ok: true,
      postal_code: formatPostalCode(postalCode),
      addresses,
    });
  } catch (error) {
    console.error("postal code search error:", error);

    return NextResponse.json(
      { error: "住所を自動入力できませんでした。" },
      { status: 500 }
    );
  }
}