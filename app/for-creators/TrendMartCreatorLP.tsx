"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Instagram,
  Link2,
  Mail,
  MessageCircle,
  PackageCheck,
  Paperclip,
  Send,
  ShieldCheck,
  Store,
  UploadCloud,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const requests = [
  { title: "Instagramリール制作", budget: "¥50,000", timing: "8月上旬" },
  { title: "商品レビュー", budget: "¥35,000", timing: "8月中旬" },
  { title: "UGC制作", budget: "¥60,000", timing: "9月上旬" },
  { title: "来店・店舗紹介", budget: "¥42,000", timing: "日程相談" },
];

const startStages = [
  { title: "インフルエンサー登録", caption: "プロフィールを作成", kind: "profile" },
  { title: "メニュー・価格を設定", caption: "リール制作　¥50,000", kind: "menu" },
  { title: "届いた依頼を確認", caption: "希望予算　¥50,000", kind: "request" },
  { title: "仕事を進めて報酬へ", caption: "納品完了・報酬予定", kind: "payout" },
] as const;

const faqs = [
  {
    question: "登録に費用はかかりますか？",
    answer: "インフルエンサー登録は無料です。プロフィールと、受けたい仕事のメニューを作成できます。",
  },
  {
    question: "メニューの価格は自分で決められますか？",
    answer: "はい。投稿、リール、UGC制作、来店など、提供する内容ごとに基本価格を設定できます。",
  },
  {
    question: "届いた依頼は必ず受ける必要がありますか？",
    answer: "いいえ。内容、予算、希望時期などを確認し、自分に合うかを判断してから受ける・辞退するを選べます。",
  },
  {
    question: "LINE通知は利用できますか？",
    answer: "はい。LINE連携を設定すると、新しい注文やメッセージ、修正依頼、完了のお知らせを受け取れます。",
  },
  {
    question: "依頼主とはどこでやり取りしますか？",
    answer: "受けた案件はTrend Martの案件チャットで連絡できます。条件や進行情報を案件ごとにまとめられます。",
  },
  {
    question: "報酬はどのように受け取りますか？",
    answer: "案件完了後、報酬ページで報酬予定や振込状況を確認できます。受け取りには事前の口座設定が必要です。",
  },
];

function Phone({ children, label, dark = false }: { children: ReactNode; label: string; dark?: boolean }) {
  return (
    <div className={`tm-phone ${dark ? "tm-phone--dark" : ""}`} aria-label={label}>
      <div className="tm-phone__speaker" />
      <div className="tm-phone__screen">{children}</div>
      <div className="tm-phone__home" />
    </div>
  );
}

function SectionLead({ title, body, light = false, center = false }: { title: ReactNode; body: ReactNode; light?: boolean; center?: boolean }) {
  return (
    <div className={`tm-section-lead ${light ? "is-light" : ""} ${center ? "is-center" : ""}`} data-reveal>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function RequestDemo({ index }: { index: number }) {
  const request = requests[index];
  return (
    <div className="tm-request-demo" aria-label="依頼カードのサンプル表示">
      <div className="tm-request-card" key={request.title}>
        <div className="tm-request-card__head"><span /><strong>新しい依頼</strong></div>
        <h3>{request.title}</h3>
        <dl>
          <div><dt>希望予算</dt><dd>{request.budget}</dd></div>
          <div><dt>希望時期</dt><dd>{request.timing}</dd></div>
        </dl>
        <div className="tm-request-card__action">内容を確認する <ArrowRight size={15} /></div>
      </div>
      <div className="tm-request-dots" aria-hidden="true">
        {requests.map((requestItem, dotIndex) => <span key={requestItem.title} className={dotIndex === index ? "is-active" : ""} />)}
      </div>
    </div>
  );
}

function FlowLine({ items, accent = false }: { items: Array<{ icon: ReactNode; text: string; note?: string }>; accent?: boolean }) {
  return (
    <ol className={`tm-method-flow ${accent ? "is-accent" : ""}`}>
      {items.map((item, index) => (
        <li key={item.text}>
          <span>{item.icon}</span>
          <div><strong>{item.text}</strong>{item.note ? <p>{item.note}</p> : null}</div>
          {index < items.length - 1 ? <i aria-hidden="true" /> : null}
        </li>
      ))}
    </ol>
  );
}

export default function CreatorLandingPage() {
  const [requestIndex, setRequestIndex] = useState(0);
  const [startIndex, setStartIndex] = useState(0);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [decision, setDecision] = useState<"accept" | "consider" | "decline">("consider");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (reduced || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.14, rootMargin: "0px 0px -5%" },
    );
    revealItems.forEach((item) => observer.observe(item));

    const requestTimer = window.setInterval(() => setRequestIndex((current) => (current + 1) % requests.length), 3300);
    const startTimer = window.setInterval(() => setStartIndex((current) => (current + 1) % startStages.length), 4300);

    return () => {
      observer.disconnect();
      window.clearInterval(requestTimer);
      window.clearInterval(startTimer);
    };
  }, []);

  const activeStart = startStages[startIndex];

  return (
    <main className="tm-lp">
      <header className="tm-header">
        <Link href="/" aria-label="Trend Mart ホーム" className="tm-logo-link">
          <Image src="/brand/trend-mart-logo.png" alt="Trend Mart" width={185} height={52} priority />
        </Link>
        <nav aria-label="メインナビゲーション">
          <Link href="/login" className="tm-login">ログイン</Link>
          <Link href="/signup/creator" className="tm-header-cta">インフルエンサー登録</Link>
        </nav>
      </header>

      <section className="tm-hero">
        <Image src="/for-creators/trend-mart-creator-hero.webp" alt="スマートフォンを手に、撮影現場で仕事へ進むインフルエンサー" fill sizes="100vw" className="tm-hero__image" priority />
        <div className="tm-hero__shade" />
        <div className="tm-hero__content">
          <h1>あなたの発信を、<br />待っている企業がいる。</h1>
          <p className="tm-hero__service">インフルエンサー × ブランド・企業の<br />マッチングプラットフォーム。</p>
          <p className="tm-hero__invite">あなたの発信力を出品しましょう。</p>
          <Link href="/signup/creator" className="tm-primary-cta">インフルエンサー登録 <ArrowRight size={18} /></Link>
          <p className="tm-hero__note"><Check size={13} /> 登録無料・届いた依頼を確認してから判断できます</p>
        </div>
        <RequestDemo index={requestIndex} />
      </section>

      <section className="tm-section tm-matching">
        <SectionLead center title={<>発信力を求めるブランドと、<br />届けたいインフルエンサーをつなぐ。</>} body={<>Trend Martは、インフルエンサーとブランド・企業が直接つながる<br className="tm-desktop-break" />マッチングプラットフォームです。</>} />
        <div className="tm-match-map" data-reveal>
          <div className="tm-match-side">
            <div className="tm-entity"><Building2 /><div><strong>ブランド・企業</strong><span>商品を広めたい</span></div></div>
            <div className="tm-entity"><Store /><div><strong>店舗・サービス</strong><span>魅力を届けたい</span></div></div>
          </div>
          <div className="tm-match-path"><i /><ArrowRight /></div>
          <div className="tm-match-core"><Image src="/brand/trend-mart-logo.png" alt="Trend Mart" width={150} height={42} /><span>依頼と発信力をマッチング</span><CheckCircle2 /></div>
          <div className="tm-match-path"><i /><ArrowRight /></div>
          <div className="tm-match-side">
            <div className="tm-entity"><Camera /><div><strong>クリエイター</strong><span>世界観を活かす</span></div></div>
            <div className="tm-entity"><UserRound /><div><strong>インフルエンサー</strong><span>発信力を仕事へ</span></div></div>
          </div>
        </div>
      </section>

      <section className="tm-section tm-compare">
        <SectionLead title={<>PRの仕事の受け方を、<br />もっと自分らしく。</>} body={<>仕事との出会い方は、ひとつではありません。<br />Trend Martは、自分の価格と判断を軸にできる選択肢です。</>} />
        <div className="tm-compare-list">
          <article className="tm-method" data-reveal>
            <header><UsersRound /><div><h3>一般的な公募型PR案件</h3><p>募集されている案件へ応募する方法</p></div></header>
            <FlowLine items={[
              { icon: <Building2 />, text: "ブランド・企業が広く募集" },
              { icon: <Send />, text: "インフルエンサーが応募" },
              { icon: <PackageCheck />, text: "採用後に商品・サービスを体験" },
              { icon: <Instagram />, text: "SNSへ投稿", note: "商品・サービス提供のみの場合も" },
            ]} />
          </article>
          <article className="tm-method" data-reveal>
            <header><Building2 /><div><h3>代理店・事務所経由</h3><p>担当者を介して仕事を受ける方法</p></div></header>
            <FlowLine items={[
              { icon: <BriefcaseIcon />, text: "代理店・事務所が仕事を獲得" },
              { icon: <FileText />, text: "条件と報酬が提示される" },
              { icon: <Camera />, text: "仕事を実施" },
              { icon: <Banknote />, text: "代理店・事務所を経由して報酬", note: "報酬の決まり方や依頼主との関係が見えにくい場合も" },
            ]} />
          </article>
          <article className="tm-method tm-method--trend" data-reveal>
            <header><Image src="/brand/trend-mart-logo.png" alt="Trend Mart" width={145} height={42} /><div><h3>価格も、仕事も、自分で選ぶ</h3><p>直接つながり、案件ごとに報酬</p></div></header>
            <FlowLine accent items={[
              { icon: <CircleDollarSign />, text: "自分のメニューと価格を設定" },
              { icon: <Link2 />, text: "ブランド・企業から直接依頼" },
              { icon: <FileText />, text: "内容・予算・条件を確認" },
              { icon: <CheckCircle2 />, text: "受けたい仕事を自分で選ぶ" },
              { icon: <WalletCards />, text: "案件ごとに報酬" },
            ]} />
          </article>
        </div>
      </section>

      <section className="tm-section tm-organize">
        <SectionLead light title={<>バラバラだった仕事を、<br />ひとつの流れに。</>} body={<>DMやメールに散らばっていた依頼、条件、<br />納品、報酬確認を案件ごとにまとめられます。</>} />
        <div className="tm-organize-visual" data-reveal>
          <div className="tm-scattered">
            <div><Instagram /><span>DMに依頼</span></div>
            <div><Mail /><span>メールで詳細</span></div>
            <div><MessageCircle /><span>条件確認</span></div>
            <div><Paperclip /><span>書類・ファイル</span></div>
            <div><Banknote /><span>振込を確認</span></div>
          </div>
          <div className="tm-gather-arrow"><span>Trend Martへまとめる</span><ArrowRight /></div>
          <div className="tm-case-hub">
            <div className="tm-case-hub__head"><Image src="/brand/trend-mart-logo.png" alt="Trend Mart" width={125} height={36} /><strong>ひとつの案件</strong></div>
            <div className="tm-case-grid">
              <span><FileText />依頼内容</span><span><CheckCircle2 />条件</span><span><MessageCircle />チャット</span>
              <span><CalendarDays />納期</span><span><UploadCloud />納品</span><span><WalletCards />報酬</span>
            </div>
          </div>
        </div>
      </section>

      <section className="tm-section tm-line">
        <div className="tm-two-column">
          <SectionLead title={<>新しい依頼を、<br />見逃さない。</>} body={<>注文やメッセージをLINEでお知らせ。<br />対応の遅れや機会損失を減らせます。</>} />
          <div className="tm-line-demo" data-reveal>
            <Phone label="LINE通知から依頼内容を確認するデモ">
              <div className={`tm-line-screen ${noticeOpen ? "is-detail" : ""}`}>
                <div className="tm-line-clock">9:41</div>
                <div className="tm-line-notice">
                  <div className="tm-line-logo">L</div>
                  <div><strong>Trend Mart</strong><span>新しい注文が届きました</span><p>内容と希望時期を確認できます。</p></div>
                </div>
                <div className="tm-line-order">
                  <button type="button" onClick={() => setNoticeOpen(false)} aria-label="通知へ戻る">通知</button>
                  <span>新しい依頼</span><h3>Instagramリール制作</h3>
                  <dl><div><dt>希望予算</dt><dd>¥50,000</dd></div><div><dt>希望時期</dt><dd>8月上旬</dd></div></dl>
                  <strong>依頼内容を確認</strong>
                </div>
              </div>
            </Phone>
            <button type="button" className="tm-demo-control" onClick={() => setNoticeOpen((current) => !current)}>{noticeOpen ? "通知に戻る" : "依頼内容を開く"}<ArrowRight size={15} /></button>
          </div>
        </div>
      </section>

      <section className="tm-section tm-details">
        <SectionLead center title={<>条件を見てから、<br />受けるか決められる。</>} body={<>内容、予算、時期を確認して、<br />自分に合う仕事だけを選べます。</>} />
        <div className="tm-detail-layout" data-reveal>
          <Phone label="重要な条件を読みやすくまとめた依頼詳細">
            <div className="tm-ui-title"><button type="button" aria-label="前の画面へ">‹</button><strong>依頼内容</strong><Bell size={17} /></div>
            <div className="tm-detail-main"><span>依頼内容</span><h3>夏の新商品<br />Instagramリール制作</h3></div>
            <div className="tm-detail-facts">
              <div><span>希望SNS</span><strong>Instagram</strong></div><div><span>希望予算</span><strong>¥50,000</strong></div>
              <div><span>希望時期</span><strong>8月上旬</strong></div><div><span>商品提供</span><strong>あり</strong></div>
              <div><span>来店場所</span><strong>オンライン</strong></div><div><span>投稿条件</span><strong>リール1本</strong></div>
            </div>
            <div className="tm-detail-extra"><strong>補足情報</strong><p>30秒以上・ブランドタグを記載</p></div>
            <div className="tm-detail-choice"><button type="button" className={decision === "decline" ? "is-selected" : ""} onClick={() => setDecision("decline")}>辞退する</button><button type="button" className={decision === "consider" ? "is-selected" : ""} onClick={() => setDecision("consider")}>検討する</button><button type="button" className={decision === "accept" ? "is-selected" : ""} onClick={() => setDecision("accept")}>受ける</button></div>
          </Phone>
          <div className="tm-detail-summary">
            <h3>受ける前に、必要なことだけ。</h3>
            <ul><li><Check />依頼内容と希望SNS</li><li><Check />希望予算と希望時期</li><li><Check />商品提供と来店場所</li><li><Check />投稿条件と補足情報</li></ul>
            <p>現在の選択：<strong>{decision === "accept" ? "受ける" : decision === "decline" ? "辞退する" : "検討する"}</strong></p>
          </div>
        </div>
      </section>

      <section className="tm-section tm-journey">
        <SectionLead light title={<>依頼から納品まで、<br />ひとつの流れで。</>} body={<>条件のすり合わせ、制作、投稿、納品まで。<br />案件ごとに必要な情報をまとめて進められます。</>} />
        <div className="tm-journey-flow" data-reveal>
          <div className="tm-journey-line" />
          <article><span><FileText /></span><div><h3>依頼を確認</h3><p>内容・予算・時期をチェック</p><div className="tm-mini-card">Instagramリール制作　¥50,000</div></div></article>
          <article><span><MessageCircle /></span><div><h3>チャットで条件をすり合わせ</h3><p>制作内容と日程を案件内で相談</p><div className="tm-chat-pair"><i>動画は30秒以上でお願いします</i><i>承知しました。8日に共有します</i></div></div></article>
          <article><span><Camera /></span><div><h3>商品受取・訪問・制作</h3><p>決まった条件に沿って制作</p><div className="tm-production-flow" aria-label="商品受取から訪問、制作までの進行イメージ"><div><PackageCheck /><span>商品受取</span><strong>受取済み</strong></div><i /><div><CalendarDays /><span>訪問予定</span><strong>8月8日・店舗</strong></div><i /><div><Camera /><span>制作</span><strong>撮影・編集中</strong></div></div></div></article>
          <article><span><UploadCloud /></span><div><h3>投稿または納品</h3><p>投稿URL・納品URLを提出</p><div className="tm-delivery-url"><Link2 />https://instagram.com/p/...</div></div></article>
          <article><span><CheckCircle2 /></span><div><h3>依頼主が確認・完了</h3><p>確認後、案件が完了へ</p><div className="tm-complete-card"><CheckCircle2 />納品が承認されました</div></div></article>
        </div>
      </section>

      <section className="tm-section tm-payment">
        <SectionLead center title={<>先払いだから、<br />安心して仕事を始められる。</>} body={<>依頼主の事前決済を確認してから仕事を開始。<br />納品・完了後は、報酬として受け取れます。</>} />
        <p className="tm-payment-note">Stripe決済を利用し、個別の請求や未払いリスクを抑える安心設計です。</p>
        <div className="tm-payment-flow" data-reveal>
          <div><span><ShieldCheck /></span><strong>依頼主が<br />Stripeで事前決済</strong></div><i /><div><span><Camera /></span><strong>決済確認後に<br />仕事を開始</strong></div><i /><div><span><UploadCloud /></span><strong>制作・投稿・納品</strong></div><i /><div><span><CheckCircle2 /></span><strong>依頼主が<br />完了を確認</strong></div><i /><div><span><WalletCards /></span><strong>報酬へ反映</strong></div>
        </div>
        <div className="tm-payment-lower" data-reveal>
          <div className="tm-payment-benefits"><p><Check />報酬額と状態を画面で確認</p><p><Check />口座情報をDMで送る負担を軽減</p><p><Check />個別の請求・振込確認を減らす</p></div>
          <div className="tm-payout-panel"><span>報酬予定</span><strong>¥50,000</strong><div><b>新作コスメ リール制作</b><em>完了</em></div></div>
        </div>
      </section>

      <section className="tm-section tm-link">
        <SectionLead light title={<>サービスの中からも、<br />SNSの外からも。</>} body={<>Trendre Linkをプロフィールに掲載すれば、<br />あなたを知っているブランドや店舗からも仕事の相談を受けられます。</>} />
        <div className="tm-link-flow" data-reveal>
          <div className="tm-link-node"><Instagram /><strong>Instagram</strong><span>プロフィール</span></div><div className="tm-link-arrow"><ArrowRight /></div>
          <div className="tm-link-node tm-link-node--profile"><div className="tm-avatar">H</div><strong>HINA ARAI</strong><span>trendre.jp/in/yourname</span></div><div className="tm-link-arrow"><ArrowRight /></div>
          <div className="tm-link-node"><MessageCircle /><strong>仕事の相談</strong><span>条件を入力</span></div><div className="tm-link-arrow"><ArrowRight /></div>
          <div className="tm-link-node tm-link-node--mart"><Image src="/brand/trend-mart-logo.png" alt="Trend Mart" width={135} height={38} /><strong>依頼・進行</strong><span>チャット・納品・報酬</span></div>
        </div>
        <div className="tm-link-roles"><p><strong>Trendre Link</strong><span>仕事を集める入口</span></p><i /><p><strong>Trend Mart</strong><span>仕事を進める場所</span></p></div>
      </section>

      <section className="tm-section tm-start">
        <div className="tm-two-column tm-two-column--start">
          <div>
            <SectionLead title={<>始め方は、<br />シンプル。</>} body={<>登録して、プロフィールと価格を設定。<br />届いた依頼を確認して仕事を始められます。</>} />
            <div className="tm-start-controls" data-reveal>
              {startStages.map((stage, index) => <button type="button" key={stage.title} className={index === startIndex ? "is-active" : ""} onClick={() => setStartIndex(index)}><span>{index + 1}</span><div><strong>{stage.title}</strong><small>{stage.caption}</small></div></button>)}
            </div>
          </div>
          <div className="tm-start-device" data-reveal>
            <Phone label="始め方の4つの状態が切り替わる画面">
              <div className="tm-ui-title"><span /><strong>Trend Martを始める</strong><span /></div>
              <div className="tm-stage-screen" key={activeStart.kind}>
                {activeStart.kind === "profile" ? <><div className="tm-stage-icon"><UserRound /></div><h3>プロフィールを作成</h3><div className="tm-field">表示名</div><div className="tm-field">活動ジャンル</div><button type="button">次へ進む</button></> : null}
                {activeStart.kind === "menu" ? <><div className="tm-stage-icon"><CircleDollarSign /></div><h3>メニューと価格</h3><div className="tm-stage-card"><span>Instagramリール制作</span><strong>¥50,000</strong></div><button type="button">公開する</button></> : null}
                {activeStart.kind === "request" ? <><div className="tm-stage-icon"><FileText /></div><span className="tm-new-order">新しい依頼</span><h3>Instagramリール制作</h3><div className="tm-stage-card"><span>希望予算</span><strong>¥50,000</strong></div><button type="button">内容を確認</button></> : null}
                {activeStart.kind === "payout" ? <><div className="tm-stage-icon"><WalletCards /></div><h3>納品完了</h3><div className="tm-stage-card"><span>報酬予定</span><strong>¥50,000</strong></div><button type="button">報酬を確認</button></> : null}
              </div>
              <div className="tm-stage-dots">{startStages.map((stage, index) => <span key={stage.kind} className={index === startIndex ? "is-active" : ""} />)}</div>
            </Phone>
          </div>
        </div>
      </section>

      <section className="tm-section tm-faq">
        <SectionLead title={<>始める前に、<br />気になること。</>} body="よくある質問をまとめました。" />
        <div className="tm-faq-list" data-reveal>
          {faqs.map((faq) => <details key={faq.question}><summary><span>{faq.question}</span><ChevronDown size={20} /></summary><p>{faq.answer}</p></details>)}
        </div>
      </section>

      <section className="tm-final">
        <div className="tm-final__inner" data-reveal>
          <h2>あなたの発信を、<br />次の仕事につなげよう。</h2>
          <p>価格も、受ける仕事も、自分で決める。<br />依頼から納品・報酬まで、ひとつの場所で。</p>
          <Link href="/signup/creator" className="tm-primary-cta">インフルエンサー登録 <ArrowRight size={18} /></Link>
          <small><Check size={13} />登録無料・まずはプロフィール作成から始められます</small>
        </div>
      </section>

      <footer className="tm-footer">
        <div><Image src="/brand/trend-mart-logo.png" alt="Trend Mart" width={170} height={48} /><p>Trendre Linkで仕事を集め、<br />Trend Martで仕事を進める。</p></div>
        <nav aria-label="フッターナビゲーション"><Link href="/login">ログイン</Link><Link href="/terms">利用規約</Link><Link href="/privacy">プライバシーポリシー</Link><Link href="/legal">運営者情報</Link></nav>
        <small>© 2026 Trendre</small>
      </footer>
    </main>
  );
}

function BriefcaseIcon() {
  return <FileText />;
}
