// File: app/admin/orders/[id]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type AuthUserLite = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

type CompanyRow = {
  id: string;
  user_id: string;
  company_name: string | null;
  contact_email: string | null;
  website_url: string | null;
  phone_number: string | null;
  approval_status: string | null;
  created_at: string | null;
  description: string | null;
  usage_purpose: string | null;
};

type CreatorRow = {
  id: string;
  user_id: string;
  display_name: string;
  full_name: string | null;
  contact_email: string | null;
  avatar_url: string | null;
  category: string | null;
  prefecture: string | null;
  city: string | null;
  country: string | null;
  approval_status: string | null;
  is_public: boolean | null;
  is_suspended: boolean | null;
  stripe_account_id: string | null;
  stripe_onboarding_completed: boolean | null;
  total_orders: number | null;
  created_at: string | null;
};

type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  accepted_at: string | null;
  authorized_at: string | null;
  auto_complete_at: string | null;
  canceled_at: string | null;
  captured_at: string | null;
  completed_at: string | null;
  completed_reason: string | null;
  creator_accept_deadline: string | null;
  deadline: string | null;
  declined_at: string | null;
  delivered_at: string | null;
  delivered_post_url: string | null;
  disputed_at: string | null;
  expired_at: string | null;
  revision_requested_at: string | null;
  revision_count: number | null;
  max_revision_count: number | null;
  revision_note: string | null;
  status: string;
  payment_status: string;
  stripe_payment_status: string | null;
  payment_flow: string | null;
  product_name: string | null;
  product_url: string | null;
  project_type: string | null;
  requirements: string | null;
  post_notes: string | null;
  pr_account: string | null;
  pr_copy_text: string | null;
  pr_hashtags: string[] | null;
  has_free_offer: boolean | null;
  wants_secondary_use: boolean | null;
  menu_title_snapshot: string | null;
  menu_description_snapshot: string | null;
  menu_deliverables_snapshot: string | null;
  menu_platform_snapshot: string | null;
  menu_category_snapshot: string | null;
  menu_type_snapshot: string | null;
  menu_delivery_days_snapshot: number | null;
  menu_allow_secondary_use_snapshot: boolean | null;
  menu_price_amount: number | null;
  buyer_marketplace_fee_amount: number | null;
  buyer_marketplace_fee_rate_bps: number | null;
  buyer_plan_code_snapshot: string | null;
  buyer_plan_public_name_snapshot: string | null;
  buyer_total_amount: number | null;
  creator_transaction_fee_amount: number | null;
  creator_transaction_fee_rate_bps: number | null;
  creator_payout_amount: number | null;
  platform_fee_amount: number | null;
  platform_gross_revenue_amount: number | null;
  fee_rate_bps: number | null;
  stripe_amount: number | null;
  currency: string | null;
  stripe_checkout_session_id: string | null;
  stripe_customer_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  transfer_status: string | null;
  transfer_attempted_at: string | null;
  transfer_failed_reason: string | null;
  transferred_at: string | null;
  b_user_id: string;
  creator_user_id: string;
  creator_id: string | null;
  creator_menu_id: string | null;
  linked_request_id: string | null;
  metadata: unknown;
};

type ChatRow = {
  id: string;
  created_at: string;
  last_message_at: string | null;
  order_id: string | null;
  request_id: string | null;
  company_user_id: string;
  creator_user_id: string;
};

type MessageRow = {
  id: string;
  chat_id: string;
  sender_user_id: string;
  content: string;
  created_at: string;
};

type EventRow = {
  id: string;
  order_id: string;
  actor_user_id: string | null;
  event_type: string;
  event_data: unknown;
  created_at: string;
};

type AssetRow = {
  id: string;
  order_id: string;
  b_user_id: string;
  creator_user_id: string;
  uploaded_by_user_id: string;
  file_name: string;
  file_type: string;
  mime_type: string;
  size_bytes: number;
  storage_bucket: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
  public_url: string | null;
};

type DetailPayload = {
  order: OrderRow;
  company: CompanyRow | null;
  creator: CreatorRow | null;
  bAuthUser: AuthUserLite | null;
  creatorAuthUser: AuthUserLite | null;
  chat: ChatRow | null;
  messages: MessageRow[];
  events: EventRow[];
  assets: AssetRow[];
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

function formatShortDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ja-JP", {
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

function formatPercentBps(value: number | null | undefined) {
  if (value == null) return "-";
  return `${(value / 100).toFixed(2).replace(/\.00$/, "")}%`;
}

function formatBytes(value: number | null | undefined) {
  if (value == null) return "-";

  if (value < 1024) return `${value} B`;

  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function getTime(value: string | null | undefined) {
  if (!value) return null;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return null;

  return time;
}

function getAcceptedDays(order: OrderRow) {
  const acceptedTime =
    getTime(order.accepted_at) ??
    getTime(order.captured_at) ??
    getTime(order.updated_at ?? order.created_at);

  if (acceptedTime == null) return null;

  const diff = Date.now() - acceptedTime;

  if (diff < 0) return 0;

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getStatusLabel(status: string) {
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

function isActiveOrder(status: string) {
  return ["accepted_captured", "in_progress", "revision_requested"].includes(
    status
  );
}

function shouldWarnProgress(order: OrderRow) {
  if (!isActiveOrder(order.status)) return false;
  if (order.delivered_post_url) return false;

  const days = getAcceptedDays(order);
  return days != null && days >= 7;
}

function shortId(value: string | null | undefined) {
  if (!value) return "-";
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
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

function InfoItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
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

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
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

function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "dark" | "rose" | "amber" | "green" | "red";
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
              : "bg-slate-50 text-slate-500 ring-slate-100";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function MessageBubble({
  message,
  order,
  company,
  creator,
}: {
  message: MessageRow;
  order: OrderRow;
  company: CompanyRow | null;
  creator: CreatorRow | null;
}) {
  const isCompany = message.sender_user_id === order.b_user_id;
  const isCreator = message.sender_user_id === order.creator_user_id;

  const senderLabel = isCompany
    ? company?.company_name || "企業"
    : isCreator
      ? creator?.display_name || "クリエイター"
      : shortId(message.sender_user_id);

  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Pill tone={isCompany ? "dark" : isCreator ? "rose" : "slate"}>
          {isCompany ? "B" : isCreator ? "C" : "Unknown"}
        </Pill>

        <span className="text-sm font-black text-slate-900">{senderLabel}</span>

        <span className="text-xs font-bold text-slate-400">
          {formatShortDateTime(message.created_at)}
        </span>
      </div>

      <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-700">
        {message.content}
      </p>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error ?? "failed to load order detail");
      }

      setDetail(json as DetailPayload);
    } catch (error) {
      console.error("admin order detail page error:", error);
      setError("注文詳細の取得に失敗しました");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId) return;
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const sortedEvents = useMemo(() => detail?.events ?? [], [detail?.events]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="h-36 animate-pulse rounded-[30px] bg-white ring-1 ring-slate-100" />
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
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
            {error ?? "注文詳細を取得できませんでした"}
          </p>

          <Link
            href="/admin/orders"
            className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            注文一覧へ戻る
          </Link>
        </section>
      </main>
    );
  }

  const {
    order,
    company,
    creator,
    bAuthUser,
    creatorAuthUser,
    chat,
    messages,
    assets,
  } = detail;

  const title =
    order.product_name?.trim() ||
    order.menu_title_snapshot?.trim() ||
    "注文名未設定";

  const acceptedDays = isActiveOrder(order.status)
    ? getAcceptedDays(order)
    : null;
  const progressWarning = shouldWarnProgress(order);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <section
        className={`mb-5 rounded-[30px] bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] ring-1 ${
          progressWarning ? "ring-orange-100" : "ring-slate-100"
        }`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5f67]">
              Admin Order Detail
            </p>

            <h1 className="mt-2 break-words text-[32px] font-black tracking-[-0.06em] text-slate-950">
              {title}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone={isActiveOrder(order.status) ? "dark" : "slate"}>
                {getStatusLabel(order.status)}
              </Pill>

              <Pill>{order.payment_status}</Pill>

              {order.transfer_status ? <Pill>{order.transfer_status}</Pill> : null}

              {acceptedDays != null ? (
                <Pill tone={progressWarning ? "amber" : "slate"}>
                  C承認から{acceptedDays}日
                </Pill>
              ) : null}

              {order.delivered_post_url ? (
                <Pill tone="rose">納品URLあり</Pill>
              ) : isActiveOrder(order.status) ? (
                <Pill tone={progressWarning ? "amber" : "slate"}>
                  納品URLなし
                </Pill>
              ) : null}
            </div>

            {progressWarning ? (
              <div className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm font-bold leading-7 text-orange-700 ring-1 ring-orange-100">
                C承認後7日以上、納品URLが未提出です。チャット状況や進行状況の確認を推奨します。
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/admin/orders"
              className="rounded-full bg-slate-50 px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-100"
            >
              一覧へ戻る
            </Link>

            <Link
              href={`/b/orders/${order.id}`}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              B詳細を見る
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.75fr]">
        <div className="space-y-5">
          <Section title="注文基本情報" description="注文の状態と主要日時を確認できます。">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <InfoItem label="注文ID" value={order.id} mono />
              <InfoItem label="ステータス" value={getStatusLabel(order.status)} />
              <InfoItem label="決済状態" value={order.payment_status} />
              <InfoItem label="作成日時" value={formatDateTime(order.created_at)} />
              <InfoItem label="与信日時" value={formatDateTime(order.authorized_at)} />
              <InfoItem label="C承認日時" value={formatDateTime(order.accepted_at)} />
              <InfoItem label="Capture日時" value={formatDateTime(order.captured_at)} />
              <InfoItem label="納品日時" value={formatDateTime(order.delivered_at)} />
              <InfoItem label="完了日時" value={formatDateTime(order.completed_at)} />
              <InfoItem label="C返答期限" value={formatDateTime(order.creator_accept_deadline)} />
              <InfoItem label="自動完了予定" value={formatDateTime(order.auto_complete_at)} />
              <InfoItem label="更新日時" value={formatDateTime(order.updated_at)} />
            </div>
          </Section>

          <Section title="案件内容" description="Bが注文時に入力した内容です。">
            <div className="grid gap-3 md:grid-cols-2">
              <InfoItem label="案件名" value={order.product_name} />
              <InfoItem label="案件タイプ" value={order.project_type} />
              <InfoItem label="商品・サービスURL" value={order.product_url} />
              <InfoItem label="メニュー" value={order.menu_title_snapshot} />
              <InfoItem label="媒体" value={order.menu_platform_snapshot} />
              <InfoItem label="カテゴリ" value={order.menu_category_snapshot} />
            </div>

            <div className="mt-3 grid gap-3">
              <InfoItem
                label="要件"
                value={<p className="whitespace-pre-wrap">{order.requirements}</p>}
              />
              <InfoItem
                label="注意事項・補足"
                value={<p className="whitespace-pre-wrap">{order.post_notes}</p>}
              />
              <InfoItem label="PR表記/アカウント" value={order.pr_account} />
              <InfoItem
                label="投稿文・ハッシュタグ"
                value={
                  <div className="space-y-2">
                    {order.pr_copy_text ? (
                      <p className="whitespace-pre-wrap">{order.pr_copy_text}</p>
                    ) : null}
                    {order.pr_hashtags?.length ? (
                      <p>
                        {order.pr_hashtags
                          .map((tag) => `#${tag.replace(/^#/, "")}`)
                          .join(" ")}
                      </p>
                    ) : null}
                  </div>
                }
              />
            </div>
          </Section>

          <Section title="納品・修正状況" description="納品URLや修正依頼の状態を確認できます。">
            <div className="grid gap-3 md:grid-cols-2">
              <InfoItem
                label="納品URL"
                value={
                  order.delivered_post_url ? (
                    <a
                      href={order.delivered_post_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#ff5f67] underline"
                    >
                      {order.delivered_post_url}
                    </a>
                  ) : (
                    "-"
                  )
                }
              />
              <InfoItem
                label="修正回数"
                value={`${order.revision_count ?? 0} / ${order.max_revision_count ?? 0}`}
              />
              <InfoItem label="修正依頼日時" value={formatDateTime(order.revision_requested_at)} />
              <InfoItem label="完了理由" value={order.completed_reason} />
            </div>

            <div className="mt-3">
              <InfoItem
                label="修正メモ"
                value={<p className="whitespace-pre-wrap">{order.revision_note}</p>}
              />
            </div>
          </Section>

          <Section title="チャット履歴" description="B/C間のやり取りを確認できます。">
            {!chat ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
                チャットはまだ作成されていません。
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <InfoItem label="Chat ID" value={chat.id} mono />
                  <InfoItem label="作成日時" value={formatDateTime(chat.created_at)} />
                  <InfoItem label="最終メッセージ" value={formatDateTime(chat.last_message_at)} />
                </div>

                {messages.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
                    メッセージはまだありません。
                  </div>
                ) : (
                  <div className="rounded-[24px] bg-slate-50/60 p-3 ring-1 ring-slate-100">
                    <div className="mb-3 flex items-center justify-between gap-3 px-1">
                      <p className="text-xs font-black text-slate-400">
                        メッセージ {messages.length}件
                      </p>
                      <p className="text-xs font-bold text-slate-400">
                        この枠内でスクロールできます
                      </p>
                    </div>

                    <div className="max-h-[520px] space-y-3 overflow-y-auto overscroll-contain pr-2">
                      {messages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          order={order}
                          company={company}
                          creator={creator}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section title="参考資料" description="Bが注文時に添付した資料です。">
            {assets.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
                参考資料はありません。
              </div>
            ) : (
              <div className="grid gap-3">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">
                        {asset.file_name}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {asset.file_type} / {formatBytes(asset.size_bytes)} /{" "}
                        {formatShortDateTime(asset.created_at)}
                      </p>
                    </div>

                    {asset.public_url ? (
                      <a
                        href={asset.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-white px-4 py-2 text-center text-xs font-black text-slate-700 ring-1 ring-slate-100"
                      >
                        開く
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <aside className="space-y-5">
          <Section title="企業情報">
            <div className="space-y-3">
              <InfoItem label="会社名" value={company?.company_name} />
              <InfoItem label="メール" value={bAuthUser?.email ?? company?.contact_email} />
              <InfoItem label="最終ログイン" value={formatDateTime(bAuthUser?.last_sign_in_at)} />
              <InfoItem label="登録日時" value={formatDateTime(bAuthUser?.created_at ?? company?.created_at)} />
              <InfoItem label="Webサイト" value={company?.website_url} />
              <InfoItem label="承認状態" value={company?.approval_status} />
              <InfoItem label="B User ID" value={order.b_user_id} mono />
            </div>
          </Section>

          <Section title="クリエイター情報">
            <div className="space-y-3">
              {creator?.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover ring-1 ring-slate-100"
                />
              ) : null}

              <InfoItem label="表示名" value={creator?.display_name} />
              <InfoItem label="メール" value={creatorAuthUser?.email ?? creator?.contact_email} />
              <InfoItem label="最終ログイン" value={formatDateTime(creatorAuthUser?.last_sign_in_at)} />
              <InfoItem label="登録日時" value={formatDateTime(creatorAuthUser?.created_at ?? creator?.created_at)} />
              <InfoItem label="カテゴリ" value={creator?.category} />
              <InfoItem label="地域" value={[creator?.prefecture, creator?.city].filter(Boolean).join(" / ")} />
              <InfoItem
                label="Stripe Connect"
                value={creator?.stripe_onboarding_completed ? "完了" : "未完了"}
              />
              <InfoItem label="Stripe Account ID" value={creator?.stripe_account_id} mono />
              <InfoItem label="C User ID" value={order.creator_user_id} mono />
            </div>
          </Section>

          <Section title="決済情報">
            <div className="space-y-3">
              <InfoItem
                label="B支払額"
                value={formatPrice(order.buyer_total_amount ?? order.stripe_amount, order.currency)}
              />
              <InfoItem label="メニュー価格" value={formatPrice(order.menu_price_amount, order.currency)} />
              <InfoItem label="B手数料" value={formatPrice(order.buyer_marketplace_fee_amount, order.currency)} />
              <InfoItem label="B手数料率" value={formatPercentBps(order.buyer_marketplace_fee_rate_bps)} />
              <InfoItem label="C手数料" value={formatPrice(order.creator_transaction_fee_amount, order.currency)} />
              <InfoItem label="C手数料率" value={formatPercentBps(order.creator_transaction_fee_rate_bps)} />
              <InfoItem label="C受取予定" value={formatPrice(order.creator_payout_amount, order.currency)} />
              <InfoItem label="Platform Fee" value={formatPrice(order.platform_fee_amount, order.currency)} />
              <InfoItem label="Transfer Status" value={order.transfer_status} />
              <InfoItem label="Transfer Failed Reason" value={order.transfer_failed_reason} />
            </div>
          </Section>

          <Section title="Stripe ID">
            <div className="space-y-3">
              <InfoItem label="Checkout Session" value={order.stripe_checkout_session_id} mono />
              <InfoItem label="PaymentIntent" value={order.stripe_payment_intent_id} mono />
              <InfoItem label="Customer" value={order.stripe_customer_id} mono />
              <InfoItem label="Transfer" value={order.stripe_transfer_id} mono />

              <button
                type="button"
                onClick={() => copyToClipboard(order.id)}
                className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white"
              >
                注文IDをコピー
              </button>
            </div>
          </Section>

          <Section title="注文イベント">
            {sortedEvents.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
                イベントはありません。
              </div>
            ) : (
              <div className="space-y-3">
                {sortedEvents.map((event) => (
                  <details
                    key={event.id}
                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"
                  >
                    <summary className="cursor-pointer text-sm font-black text-slate-900">
                      {event.event_type}
                      <span className="ml-2 text-xs font-bold text-slate-400">
                        {formatShortDateTime(event.created_at)}
                      </span>
                    </summary>

                    <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-100">
                      {stringifyJson(event.event_data)}
                    </pre>
                  </details>
                ))}
              </div>
            )}
          </Section>
        </aside>
      </div>
    </main>
  );
}