import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  FileUp,
  Instagram,
  Smartphone,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { FaTiktok } from "react-icons/fa6";

const SIGNUP_HREF = "/signup/creator";

const faqs = [
  {
    question: "Creator登録に費用はかかりますか？",
    answer: "Creator登録は無料です。登録後、自分のプロフィールやメニューを作成できます。",
  },
  {
    question: "PR投稿とUGC制作は何が違いますか？",
    answer:
      "PR投稿は、自分のInstagram・TikTok・YouTubeなどで商品やサービスを紹介する仕事です。UGC制作は、企業の広告やSNSで使う動画・画像素材を制作して納品する仕事です。",
  },
  {
    question: "フォロワー数が多くなくても登録できますか？",
    answer:
      "登録できます。UGC制作では、フォロワー数だけでなく、撮影・編集・企画・表現力が仕事の価値になります。",
  },
  {
    question: "届いた依頼は必ず受ける必要がありますか？",
    answer:
      "いいえ。依頼内容を確認し、承認または辞退を選べます。内容やスケジュールに合う仕事だけを受けられます。",
  },
  {
    question: "企業とのやり取りや納品はどこで行いますか？",
    answer:
      "案件ごとのやり取り、進行確認、納品、報酬確認までTrendMart上で管理できます。",
  },
];

const comparisonItems = [
  {
    title: "応募型",
    subtitle: "募集案件へ応募して選考を受ける",
    points: [
      "企業・ブランドが条件をまとめて広く募集",
      "応募 → 選考 → 審査 → 条件を再確認",
      "大量募集では少額報酬や商品提供のみの案件も",
    ],
    tone: "neutral",
  },
  {
    title: "代理店型",
    subtitle: "代理店・事務所を介して案件を受ける",
    points: [
      "企業案件を代理店が受注してキャスティング",
      "代理店が条件調整・進行管理を担当",
      "中間コストにより案件価値と受取額に差が出る場合も",
    ],
    tone: "neutral",
  },
  {
    title: "TrendMart",
    subtitle: "自分の仕事を出品して企業から直接依頼",
    points: [
      "自分でメニュー・内容・価格を設定して公開",
      "企業が条件と報酬を確認して直接依頼",
      "条件が合えば受注し、納品・案件完了後に報酬確認",
    ],
    tone: "trend",
  },
] as const;

function PhoneFrame({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="tmv2-phone-step">
      <div className="tmv2-phone-step__meta">
        <span>{step}</span>
        <strong>{title}</strong>
      </div>
      <div className="tmv2-phone" aria-label={title}>
        <div className="tmv2-phone__speaker" />
        <div className="tmv2-phone__screen">{children}</div>
        <div className="tmv2-phone__home" />
      </div>
    </article>
  );
}

export default function TrendMartCreatorLPV2() {
  return (
    <main className="tmv2-shell">
      <header className="tmv2-header">
        <Link href="/" className="tmv2-brand" aria-label="TrendMart ホーム">
          <Image
            src="/brand/trend-mart-logo.png"
            alt="TrendMart"
            width={185}
            height={52}
            priority
          />
        </Link>
        <nav className="tmv2-header-nav" aria-label="メインナビゲーション">
          <Link href="/login" className="tmv2-login">ログイン</Link>
          <Link href={SIGNUP_HREF} className="tmv2-header-cta">無料でCreator登録</Link>
        </nav>
      </header>

      <section className="tmv2-hero" aria-labelledby="tmv2-hero-title">
        <div className="tmv2-hero-copy">
          <h1 id="tmv2-hero-title">
            <span><span className="tmv2-hero-brand">TrendMart</span>で</span>
            <span>SNSの仕事をはじめよう</span>
          </h1>
          <div className="tmv2-hero-visual">
            <Image
              src="/for-creators/v2/hero-creators.webp"
              alt="美容、サロン、旅行、グルメなどのSNSコンテンツを制作するクリエイター"
              width={1672}
              height={941}
              priority
              unoptimized
            />
          </div>
          <div className="tmv2-hero-actions">
            <Link href={SIGNUP_HREF} className="tmv2-primary-cta">
              無料登録はこちら <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="tmv2-hero-support">
            <p className="tmv2-hero-subheading">PR投稿も、広告素材・コンテンツ制作も。</p>
            <p className="tmv2-hero-lead">
              カンタン登録3分で。あなたのプロフィールを見た企業から直接依頼が届きます。
            </p>
          </div>
        </div>
      </section>

      <section className="tmv2-market-section" aria-labelledby="tmv2-market-title">
        <div className="tmv2-market-intro">
          <h2 id="tmv2-market-title">あなただけのプロフィールと<br />メニューを作成</h2>
        </div>

        <div className="tmv2-market-stage" aria-label="企業がCreatorのプロフィールとメニューを見て依頼する画面イメージ">
          <div className="tmv2-creator-card">
            <div className="tmv2-portfolio-cover">
              <div className="tmv2-portfolio-gallery" aria-label="Miuのポートフォリオ3件">
                <figure className="tmv2-portfolio-item tmv2-portfolio-item--lifestyle">
                  <Image
                    src="/for-creators/v2/portfolio/miu-portfolio-lifestyle.png"
                    alt="MiuのライフスタイルSNS投稿例"
                    fill
                    sizes="(max-width: 860px) 58vw, 340px"
                  />
                </figure>
                <div className="tmv2-portfolio-gallery__side">
                  <figure className="tmv2-portfolio-item tmv2-portfolio-item--instagram">
                    <Image
                      src="/for-creators/v2/portfolio/miu-portfolio-instagram.png"
                      alt="MiuのInstagram投稿例"
                      fill
                      sizes="(max-width: 860px) 38vw, 210px"
                    />
                  </figure>
                  <figure className="tmv2-portfolio-item tmv2-portfolio-item--tiktok">
                    <Image
                      src="/for-creators/v2/portfolio/miu-portfolio-tiktok.png"
                      alt="MiuのTikTok美容投稿例"
                      fill
                      sizes="(max-width: 860px) 38vw, 210px"
                    />
                  </figure>
                </div>
              </div>
            </div>

            <div className="tmv2-creator-profile">
              <div className="tmv2-avatar" aria-hidden="true">
                <Image
                  src="/brand/work-link/beauty-lifestyle.webp"
                  alt=""
                  fill
                  sizes="64px"
                />
              </div>
              <div className="tmv2-creator-profile__copy">
                <div className="tmv2-creator-name-row">
                  <strong>Miu / 韓国コスメ紹介</strong>
                </div>
                <div className="tmv2-social-badges" aria-label="対応SNS">
                  <span className="tmv2-social-badge tmv2-social-badge--instagram"><Instagram size={14} /> Instagram</span>
                  <span className="tmv2-social-badge tmv2-social-badge--tiktok"><FaTiktok size={13} /> TikTok</span>
                  <span className="tmv2-social-badge tmv2-social-badge--ugc"><Camera size={14} /> UGC</span>
                </div>
              </div>
            </div>

            <div className="tmv2-service-list" aria-label="公開中の仕事メニュー">
              <div className="tmv2-service-row is-selected">
                <span className="tmv2-service-icon tmv2-service-icon--instagram"><Instagram size={18} /></span>
                <div><small>Instagram</small><strong>Instagram投稿</strong></div>
                <b>¥20,000〜</b>
                <ChevronRight size={18} aria-hidden="true" />
              </div>
              <div className="tmv2-service-row">
                <span className="tmv2-service-icon tmv2-service-icon--tiktok"><FaTiktok size={17} /></span>
                <div><small>TikTok</small><strong>TikTok投稿</strong></div>
                <b>¥15,000〜</b>
                <ChevronRight size={18} aria-hidden="true" />
              </div>
              <div className="tmv2-service-row">
                <span className="tmv2-service-icon tmv2-service-icon--ugc"><Camera size={18} /></span>
                <div><small>UGC / 素材納品</small><strong>UGC動画制作</strong></div>
                <b>¥25,000〜</b>
                <ChevronRight size={18} aria-hidden="true" />
              </div>
            </div>
          </div>

          <aside className="tmv2-order-panel" aria-label="企業側のメニュー選択画面">
            <div className="tmv2-order-panel__top">
              <span>選択中のメニュー</span>
              <span className="tmv2-order-panel__pill">Instagram</span>
            </div>
            <div className="tmv2-order-panel__service">
              <span className="tmv2-order-panel__icon"><Instagram size={20} /></span>
              <div><small>PR投稿</small><strong>Instagram投稿</strong></div>
            </div>
            <dl className="tmv2-order-panel__details">
              <div><dt>基本価格</dt><dd>¥20,000〜</dd></div>
              <div><dt>内容</dt><dd>フィード / リール投稿</dd></div>
              <div><dt>依頼時</dt><dd>条件・納期を入力</dd></div>
            </dl>
            <button type="button" className="tmv2-order-panel__button" tabIndex={-1}>このメニューで依頼する</button>
          </aside>
        </div>
      </section>

      <section className="tmv2-work-types" aria-labelledby="tmv2-work-title">
        <div className="tmv2-section-intro">
          <div>
            <h2 id="tmv2-work-title" className="tmv2-section-heading">
              <span>TrendMartで扱う<span className="tmv2-accent-pink">仕事</span>は</span>
              <span><span className="tmv2-accent-purple">大きく2つ</span></span>
            </h2>
            <p>発信する仕事と、作って納品する仕事<br />両方でも片方だけでも始められる</p>
          </div>
        </div>
        <div className="tmv2-work-grid">
          <article className="tmv2-work-item tmv2-work-item--pr">
            <div className="tmv2-work-code"><span>PR</span><small>自分のSNSで紹介</small></div>
            <div className="tmv2-work-content">
              <div className="tmv2-work-copy">
                <h3>PR投稿</h3>
                <p>自分のInstagram、TikTok、YouTubeなどで、商品やサービスを紹介する仕事。</p>
                <dl>
                  <div><dt>企業が買うもの</dt><dd>SNSでの紹介・投稿</dd></div>
                  <div><dt>価値になるもの</dt><dd>発信内容、媒体、フォロワーとの関係</dd></div>
                </dl>
              </div>
            </div>
          </article>
          <article className="tmv2-work-item tmv2-work-item--ugc">
            <div className="tmv2-work-code"><span>UGC</span><small>企業へ制作物を納品</small></div>
            <div className="tmv2-work-content">
              <div className="tmv2-work-copy">
                <h3>UGC：広告用の素材作成</h3>
                <p>企業の広告やSNSで使う、動画・画像コンテンツを制作して納品する仕事。</p>
                <dl>
                  <div><dt>企業が買うもの</dt><dd>動画・画像の制作物</dd></div>
                  <div><dt>価値になるもの</dt><dd>撮影、編集、企画、表現力</dd></div>
                </dl>
                <p className="tmv2-ugc-note">大きなフォロワー数がなくても、制作力そのものが判断材料になります。</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="tmv2-difference" aria-labelledby="tmv2-difference-title">
        <div className="tmv2-section-intro">
          <div>
            <h2 id="tmv2-difference-title" className="tmv2-section-heading tmv2-section-heading--purple">
              <span>TrendMartと</span>
              <span>他サービスの違い</span>
            </h2>
            <p>「応募して選ばれる」だけではなく、自分の仕事と価格を公開して企業から依頼を受ける選択肢です。</p>
          </div>
        </div>

        <div className="tmv2-comparison-cards">
          {comparisonItems.map((item) => (
            <article key={item.title} className={`tmv2-comparison-card ${item.tone === "trend" ? "is-trend" : ""}`}>
              <div className="tmv2-comparison-card__head">
                <div><h3>{item.title}</h3><p>{item.subtitle}</p></div>
              </div>
              <ul>
                {item.points.map((point) => <li key={point}><Check size={15} />{point}</li>)}
              </ul>
            </article>
          ))}
        </div>

        <div className="tmv2-ugc-callout">
          <div className="tmv2-ugc-callout__icon"><Camera size={24} /></div>
          <div>
            <p className="tmv2-ugc-callout__label">UGC案件の魅力</p>
            <h3>投稿なしでも、制作力が仕事になる。</h3>
            <p>広告用の動画・写真を素材として企業へ納品。自分のSNSをPR投稿で埋めることなく、撮影・編集・表現力で報酬につなげられます。</p>
          </div>
        </div>
      </section>

      <section className="tmv2-process" aria-labelledby="tmv2-process-title">
        <div className="tmv2-process-heading">
          <h2 id="tmv2-process-title" className="tmv2-section-heading tmv2-section-heading--purple">
            <span>依頼から完了まで</span>
            <span><span className="tmv2-accent-purple">TrendMartで一括管理</span></span>
          </h2>
          <p>依頼内容・報酬・納期を確認してから受注。制作、納品、承認、報酬確認まで案件ごとに進められます。</p>
        </div>
        <ol className="tmv2-process-list">
          <li><span>1</span><small>企業</small><strong>条件と報酬を<br />添えて依頼</strong></li>
          <li><span>2</span><small>Creator</small><strong>内容・納期を<br />確認</strong></li>
          <li><span>3</span><small>受注</small><strong>承認して<br />制作開始</strong></li>
          <li><span>4</span><small>納品</small><strong>投稿URL /<br />ファイルを提出</strong></li>
          <li><span>5</span><small>完了</small><strong>承認後に<br />報酬を確認</strong></li>
        </ol>
      </section>

      <section className="tmv2-summary" aria-labelledby="tmv2-summary-title">
        <div className="tmv2-summary-title">
          <p className="tmv2-summary-kicker">HOW IT WORKS</p>
          <h2 id="tmv2-summary-title" className="tmv2-section-heading">
            <span><span className="tmv2-accent-pink">登録</span>から</span>
            <span>ご利用までの流れ</span>
          </h2>
          <p>スマホで登録して、仕事を公開。依頼が届いたら内容を確認し、制作・納品へ進みます。</p>
        </div>

        <div className="tmv2-phone-flow">
          <PhoneFrame step="1" title="登録・メニュー作成">
            <div className="tmv2-mini-header"><span>TrendMart</span><small>1 / 2</small></div>
            <div className="tmv2-mini-profile">
              <span className="tmv2-mini-avatar"><Smartphone size={18} /></span>
              <div><small>Creator profile</small><strong>プロフィール登録</strong></div>
            </div>
            <div className="tmv2-mini-menu-card">
              <Instagram size={16} />
              <div><small>Instagram</small><strong>PR投稿</strong></div>
              <b>¥20,000〜</b>
            </div>
            <div className="tmv2-mini-button">メニューを公開</div>
          </PhoneFrame>

          <PhoneFrame step="2" title="依頼が届く">
            <div className="tmv2-mini-header"><span>通知</span><Bell size={15} /></div>
            <div className="tmv2-line-notice">
              <span>LINE</span>
              <div><small>TrendMart</small><strong>新しい依頼が届きました</strong><p>Instagram投稿 / ¥20,000〜</p></div>
            </div>
            <div className="tmv2-mini-request-card">
              <small>新しい依頼</small>
              <strong>新商品のPR投稿</strong>
              <p>希望日：9月上旬</p>
            </div>
            <div className="tmv2-mini-button is-dark">依頼内容を確認</div>
          </PhoneFrame>

          <PhoneFrame step="3" title="制作・納品">
            <div className="tmv2-mini-header"><span>進行中の案件</span><Camera size={15} /></div>
            <div className="tmv2-mini-work-visual"><Sparkles size={22} /><span>撮影・編集</span></div>
            <div className="tmv2-mini-choice"><span><Instagram size={14} /> SNS投稿</span><span><Camera size={14} /> UGC素材</span></div>
            <div className="tmv2-mini-upload"><FileUp size={17} /><div><small>納品</small><strong>URL / ファイル</strong></div></div>
            <div className="tmv2-mini-button">納品する</div>
          </PhoneFrame>

          <PhoneFrame step="4" title="承認・報酬確認">
            <div className="tmv2-mini-header"><span>案件完了</span><CheckCircle2 size={15} /></div>
            <div className="tmv2-mini-success"><CheckCircle2 size={32} /><strong>納品が承認されました</strong><p>おつかれさまでした</p></div>
            <div className="tmv2-mini-reward"><WalletCards size={18} /><div><small>報酬</small><strong>¥20,000</strong></div></div>
            <div className="tmv2-mini-button is-dark">報酬を確認</div>
          </PhoneFrame>
        </div>
      </section>

      <section className="tmv2-faq" aria-labelledby="tmv2-faq-title">
        <div className="tmv2-faq-heading">
          <h2 id="tmv2-faq-title" className="tmv2-section-heading tmv2-section-heading--purple">よくある質問</h2>
        </div>
        <div className="tmv2-faq-list">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}<span aria-hidden="true">＋</span></summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="tmv2-final" aria-labelledby="tmv2-final-title">
        <p className="tmv2-final-label">Creator登録は無料</p>
        <h2 id="tmv2-final-title"><span>PR投稿もUGC制作も</span><span>SNSの仕事を</span><span>TrendMartで</span></h2>
        <Link href={SIGNUP_HREF} className="tmv2-final-cta">無料でCreator登録 <span aria-hidden="true">→</span></Link>
      </section>

      <footer className="tmv2-footer">
        <Image src="/brand/trend-mart-logo.png" alt="TrendMart" width={170} height={48} />
        <nav aria-label="フッターナビゲーション">
          <Link href="/login">ログイン</Link>
          <Link href="/terms">利用規約</Link>
          <Link href="/privacy">プライバシーポリシー</Link>
        </nav>
        <small>© 2026 Trendre</small>
      </footer>
    </main>
  );
}
