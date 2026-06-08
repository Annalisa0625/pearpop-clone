// File: app/admin/users/[userId]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";

type PrimaryRole = "admin" | "company" | "creator" | "unknown";

type AuthUser = {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  phone_confirmed_at: string | null;
  app_metadata: unknown;
  user_metadata: unknown;
};

type OrderLite = {
  id: string;
  created_at: string;
  updated_at: string | null;
  status: string;
  payment_status: string;
  product_name: string | null;
  menu_title_snapshot: string | null;
  buyer_total_amount: number | null;
  creator_payout_amount: number | null;
  currency: string | null;
  b_user_id: string;
  creator_user_id: string;
  accepted_at: string | null;
  captured_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  delivered_post_url: string | null;
};

type DetailPayload = {
  type: PrimaryRole;
  userId: string;
  authUser: AuthUser | null;
  roles: string[];
  profile: Record<string, any> | null;
  userState: Record<string, any> | null;
  company: Record<string, any> | null;
  creator: Record<string, any> | null;
  creatorSocialAccounts: Array<Record<string, any>>;
  creatorMenus: Array<Record<string, any>>;
  portfolioAssets: Array<Record<string, any>>;
  bOrders: OrderLite[];
  cOrders: OrderLite[];
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(value: number | null | undefined, currency?: string | null) {
  if (value == null) return "-";

  const safeCurrency = currency || "JPY";

  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "JPY" ? 0 : 2,
    }).format(value);
  } catch {
    return safeCurrency === "USD"
      ? `$${value.toLocaleString()}`
      : `¥${value.toLocaleString()}`;
  }
}

function daysSince(value: string | null | undefined) {
  if (!value) return null;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return null;

  const diff = Date.now() - time;

  if (diff < 0) return 0;

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getLoginLabel(value: string | null | undefined) {
  if (!value) return "未ログイン";

  const days = daysSince(value);

  if (days == null) return formatDateTime(value);
  if (days === 0) return "今日";
  if (days === 1) return "1日前";
  if (days < 30) return `${days}日前`;
  if (days < 365) return `${Math.floor(days / 30)}ヶ月前`;

  return `${Math.floor(days / 365)}年以上前`;
}

function getRoleLabel(role: PrimaryRole | string) {
  if (role === "company") return "企業";
  if (role === "creator") return "クリエイター";
  if (role === "admin") return "管理者";
  return "未分類";
}

function getStatusLabel(status: string | null | undefined) {
  if (!status) return "-";
  if (status === "checkout_pending") return "Checkout未完了";
  if (status === "authorized_pending_creator") return "C返答待ち";
  if (status === "accepted_captured") return "進行中";
  if (status === "in_progress") return "進行中";
  if (status === "revision_requested") return "修正依頼中";
  if (status === "delivered") return "納品確認待ち";
  if (status === "completed") return "完了";
  if (status === "declined_canceled") return "C辞退";
  if (status === "expired_canceled") return "期限切れ";
  if (status === "capture_failed") return "決済確定失敗";
  if (status === "canceled" || status === "cancelled") return "キャンセル";
  return status;
}

function stringifyJson(value: unknown) {
  if (value == null) return "-";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function copyToClipboard(value: string | null | undefined) {
  if (!value) return;
  void navigator.clipboard?.writeText(value);
}

function Pill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "dark" | "rose" | "amber" | "green" | "red" | "blue";
}) {
  const className =
    tone === "dark"
      ? "bg-slate-950 text-white ring-slate-950"
      : tone === "rose"
        ? "bg-rose-50 text-[#ff5f67] ring-rose-100"
        : tone === "amber"
          ? "bg-amber-50 text-amber-800 ring-amber-100"
          : tone === "green"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
            : tone === "red"
              ? "bg-red-50 text-red-700 ring-red-100"
              : tone === "blue"
                ? "bg-blue-50 text-blue-700 ring-blue-100"
                : "bg-slate-50 text-slate-500 ring-slate-100";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
      <div className="mb-4">
        <h2 className="text-[20px] font-black tracking-[-0.045em] text-slate-950">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-400">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function InfoItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <div
        className={`mt-1 break-words text-sm font-black text-slate-900 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function OrderCard({ order, side }: { order: OrderLite; side: "b" | "c" }) {
  const title =
    order.product_name?.trim() ||
    order.menu_title_snapshot?.trim() ||
    "注文名未設定";

  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <Pill tone={side === "b" ? "blue" : "rose"}>
              {side === "b" ? "B注文" : "C受注"}
            </Pill>
            <Pill>{getStatusLabel(order.status)}</Pill>
            <Pill>{order.payment_status}</Pill>
          </div>

          <p className="truncate text-sm font-black text-slate-950">{title}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            {formatDateTime(order.created_at)}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            href={`/admin/orders/${order.id}`}
            className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
          >
            注文詳細
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;

  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error ?? "failed to load user detail");
      }

      setDetail(json as DetailPayload);
    } catch (error) {
      console.error("admin user detail page error:", error);
      setError("ユーザー詳細の取得に失敗しました");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const displayName = useMemo(() => {
    if (!detail) return "-";

    return (
      detail.company?.company_name ||
      detail.creator?.display_name ||
      detail.profile?.username ||
      detail.authUser?.email ||
      detail.userId
    );
  }, [detail]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="h-36 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.75fr]">
          <div className="h-80 animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100" />
          <div className="h-80 animate-pulse rounded-[28px] bg-white ring-1 ring-slate-100" />
        </div>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <section className="rounded-[28px] bg-white p-8 text-center shadow-[0_18px_55px_rgba(15,23,42,0.045)] ring-1 ring-slate-100">
          <p className="text-lg font-black text-slate-950">
            {error ?? "ユーザー詳細を取得できませんでした"}
          </p>

          <Link
            href="/admin/users"
            className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            ユーザー一覧へ戻る
          </Link>
        </section>
      </main>
    );
  }

  const {
    type,
    roles,
    authUser,
    profile,
    userState,
    company,
    creator,
    creatorSocialAccounts,
    creatorMenus,
    portfolioAssets,
    bOrders,
    cOrders,
  } = detail;

  const companyApproval = company?.approval_status ?? null;
  const creatorApproval = creator?.approval_status ?? null;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <section className="mb-5 rounded-[30px] bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5f67]">
              Admin User Detail
            </p>

            <h1 className="mt-2 break-words text-[32px] font-black tracking-[-0.06em] text-slate-950">
              {displayName}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone={type === "admin" ? "dark" : type === "creator" ? "rose" : "blue"}>
                {getRoleLabel(type)}
              </Pill>

              {roles.map((role) => (
                <Pill key={role}>{role}</Pill>
              ))}

              {companyApproval === "approved" || creatorApproval === "approved" ? (
                <Pill tone="green">承認済み</Pill>
              ) : companyApproval === "pending" || creatorApproval === "pending" ? (
                <Pill tone="amber">未承認</Pill>
              ) : null}

              {profile?.is_suspended || creator?.is_suspended ? (
                <Pill tone="red">停止中</Pill>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/admin/users"
              className="rounded-full bg-slate-50 px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-100"
            >
              ユーザー一覧へ
            </Link>

            <button
              type="button"
              onClick={() => copyToClipboard(detail.userId)}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              IDコピー
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.75fr]">
        <div className="space-y-5">
          <Section title="アカウント情報" description="Auth・ロール・ログイン状態を確認できます。">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <InfoItem label="User ID" value={detail.userId} mono />
              <InfoItem label="メール" value={authUser?.email} />
              <InfoItem label="電話番号" value={authUser?.phone} />
              <InfoItem label="最終ログイン" value={getLoginLabel(authUser?.last_sign_in_at)} />
              <InfoItem label="最終ログイン日時" value={formatDateTime(authUser?.last_sign_in_at)} />
              <InfoItem label="登録日時" value={formatDateTime(authUser?.created_at)} />
              <InfoItem label="メール確認" value={formatDateTime(authUser?.email_confirmed_at)} />
              <InfoItem label="電話確認" value={formatDateTime(authUser?.phone_confirmed_at)} />
              <InfoItem label="ロール" value={roles.join(" / ") || "-"} />
            </div>
          </Section>

          {company ? (
            <Section title="企業情報" description="B企業の登録情報です。">
              <div className="grid gap-3 md:grid-cols-2">
                <InfoItem label="会社名" value={company.company_name} />
                <InfoItem label="承認状態" value={company.approval_status} />
                <InfoItem label="連絡先メール" value={company.contact_email} />
                <InfoItem label="Webサイト" value={company.website_url} />
                <InfoItem label="電話番号" value={company.phone_number} />
                <InfoItem label="登録日時" value={formatDateTime(company.created_at)} />
              </div>

              <div className="mt-3">
                <InfoItem
                  label="説明"
                  value={<p className="whitespace-pre-wrap">{company.description}</p>}
                />
              </div>

              {company.approval_status === "pending" ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Companyとして承認しますか？")) return;

                    const res = await fetch("/api/admin/users/approve-company", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: detail.userId }),
                    });

                    if (!res.ok) {
                      alert("承認に失敗しました");
                      return;
                    }

                    alert("承認しました");
                    location.reload();
                  }}
                  className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
                >
                  Companyとして承認
                </button>
              ) : null}
            </Section>
          ) : null}

          {creator ? (
            <Section title="クリエイター情報" description="Cプロフィールと公開状態を確認できます。">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <InfoItem label="表示名" value={creator.display_name} />
                <InfoItem label="本名" value={creator.full_name} />
                <InfoItem label="連絡先メール" value={creator.contact_email} />
                <InfoItem label="カテゴリ" value={creator.category} />
                <InfoItem label="承認状態" value={creator.approval_status} />
                <InfoItem label="公開状態" value={creator.is_public ? "公開" : "非公開"} />
                <InfoItem label="停止状態" value={creator.is_suspended ? "停止中" : "通常"} />
                <InfoItem
                  label="Stripe Connect"
                  value={creator.stripe_onboarding_completed ? "完了" : "未完了"}
                />
                <InfoItem label="登録日時" value={formatDateTime(creator.created_at)} />
              </div>

              {creator.approval_status === "pending" ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Creatorとして承認しますか？")) return;

                    const res = await fetch("/api/admin/users/approve-creator", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: detail.userId }),
                    });

                    if (!res.ok) {
                      alert("承認に失敗しました");
                      return;
                    }

                    alert("承認しました");
                    location.reload();
                  }}
                  className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
                >
                  Creatorとして承認
                </button>
              ) : null}
            </Section>
          ) : null}

          {creator ? (
            <Section title="SNS情報" description="登録済みSNSアカウントです。">
              {creatorSocialAccounts.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
                  SNS情報はありません。
                </div>
              ) : (
                <div className="grid gap-3">
                  {creatorSocialAccounts.map((sns, index) => (
                    <div
                      key={sns.id ?? `${sns.platform}-${index}`}
                      className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"
                    >
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Pill tone="rose">{sns.platform ?? "SNS"}</Pill>
                        {sns.follower_range ? <Pill>{sns.follower_range}</Pill> : null}
                        {sns.audience_country ? <Pill>{sns.audience_country}</Pill> : null}
                      </div>

                      {sns.url ? (
                        <a
                          href={sns.url}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-sm font-bold text-[#ff5f67] underline"
                        >
                          {sns.url}
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          ) : null}

          {creator ? (
            <Section title="メニュー" description="Cが公開しているメニューです。">
              {creatorMenus.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
                  メニューはありません。
                </div>
              ) : (
                <div className="grid gap-3">
                  {creatorMenus.map((menu, index) => (
                    <div
                      key={menu.id ?? index}
                      className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"
                    >
                      <p className="text-sm font-black text-slate-950">
                        {menu.title ?? menu.menu_title ?? menu.platform ?? "メニュー"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {menu.platform ?? "-"} / {menu.is_active ? "公開" : "非公開"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          ) : null}

          <Section title="注文履歴" description="B発注・C受注の注文履歴です。">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-black text-slate-900">
                  Bとしての注文 {bOrders.length}件
                </h3>

                {bOrders.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
                    B注文はありません。
                  </div>
                ) : (
                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
                    {bOrders.map((order) => (
                      <OrderCard key={order.id} order={order} side="b" />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-black text-slate-900">
                  Cとしての受注 {cOrders.length}件
                </h3>

                {cOrders.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
                    C受注はありません。
                  </div>
                ) : (
                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
                    {cOrders.map((order) => (
                      <OrderCard key={order.id} order={order} side="c" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>
        </div>

        <aside className="space-y-5">
          <Section title="状態サマリー">
            <div className="space-y-3">
              <InfoItem label="種別" value={getRoleLabel(type)} />
              <InfoItem label="B注文数" value={`${bOrders.length}件`} />
              <InfoItem label="C受注数" value={`${cOrders.length}件`} />
              <InfoItem
                label="Connect"
                value={
                  creator
                    ? creator.stripe_onboarding_completed
                      ? "完了"
                      : "未完了"
                    : "-"
                }
              />
            </div>
          </Section>

          <Section title="User State">
            <div className="space-y-3">
              <InfoItem label="プラン" value={userState?.company_plan_code} />
              <InfoItem
                label="課金状態"
                value={userState?.company_subscription_status}
              />
              <InfoItem
                label="今月利用"
                value={`${userState?.monthly_request_used ?? 0} / ${
                  userState?.monthly_request_limit ?? "∞"
                }`}
              />
              <InfoItem
                label="Onboarding"
                value={userState?.onboarding_completed ? "完了" : "未完了"}
              />
            </div>
          </Section>

          <Section title="プロフィール">
            <details className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <summary className="cursor-pointer text-sm font-black text-slate-900">
                profile JSON
              </summary>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-100">
                {stringifyJson(profile)}
              </pre>
            </details>

            <details className="mt-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <summary className="cursor-pointer text-sm font-black text-slate-900">
                auth metadata
              </summary>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-100">
                {stringifyJson(authUser?.user_metadata)}
              </pre>
            </details>
          </Section>

          {creator ? (
            <Section title="ポートフォリオ画像">
              {portfolioAssets.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
                  画像はありません。
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {portfolioAssets.map((asset, index) => (
                    <a
                      key={asset.id ?? index}
                      href={asset.public_url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100"
                    >
                      {asset.public_url ? (
                        <img
                          src={asset.public_url}
                          alt=""
                          className="h-28 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-28 items-center justify-center text-xs font-bold text-slate-400">
                          no image
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </Section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}