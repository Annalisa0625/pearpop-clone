import Image from "next/image";
import Link from "next/link";

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
          <h1 id="tmv2-hero-title"><span><span className="tmv2-hero-brand">Trend Mart</span>で</span><span>SNSの仕事をはじめよう</span></h1>
          <div className="tmv2-hero-visual">
            <Image
              src="/for-creators/v2/hero-creators.webp"
              alt="美容、サロン、旅行、グルメなどのSNSコンテンツを制作するクリエイター"
              width={1672}
              height={941}
              priority
              sizes="(max-width: 860px) 100vw, 58vw"
            />
          </div>
          <div className="tmv2-hero-actions">
            <Link href={SIGNUP_HREF} className="tmv2-primary-cta">無料登録はこちら <span aria-hidden="true">→</span></Link>
          </div>
          <div className="tmv2-hero-support">
            <p className="tmv2-hero-subheading"><span>PR投稿も、</span><span>広告素材・コンテンツ制作も。</span></p>
            <p className="tmv2-hero-lead"><span>カンタン登録3分で。</span><span>あなたのプロフィールを見た企業からの</span><span>直接依頼が届きます。</span></p>
          </div>
        </div>
      </section>

      <section className="tmv2-market-section" aria-label="公開メニューの仕組み">
        <div className="tmv2-market-view" aria-label="公開メニューから企業の直接依頼につながるイメージ">
          <div className="tmv2-market-head">
            <span>公開メニュー</span>
            <span className="tmv2-market-status">受付中</span>
          </div>
          <div className="tmv2-menu-row">
            <div><small>PR投稿</small><strong>Instagram リールで商品紹介</strong></div>
            <b>¥80,000</b>
          </div>
          <div className="tmv2-menu-row">
            <div><small>広告素材制作 / UGC</small><strong>縦型ショート動画 3本</strong></div>
            <b>¥60,000</b>
          </div>
          <div className="tmv2-order-strip">
            <div><small>企業が内容と価格を確認</small><strong>1件から直接依頼</strong></div>
            <span aria-hidden="true">→</span>
          </div>
        </div>
      </section>

      <section className="tmv2-work-types" aria-labelledby="tmv2-work-title">
        <div className="tmv2-section-intro">
          <div>
            <h2 id="tmv2-work-title" className="tmv2-section-heading"><span>TrendMartで扱う<span className="tmv2-accent-pink">仕事</span>は、</span><span><span className="tmv2-accent-purple">大きく2つ。</span></span></h2>
            <p>発信する仕事と、つくって納品する仕事。両方でも、どちらかだけでも始められます。</p>
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
                <h3>広告素材制作 / UGC</h3>
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

      <section className="tmv2-selling" aria-labelledby="tmv2-selling-title">
        <div className="tmv2-selling-copy">
          <h2 id="tmv2-selling-title" className="tmv2-section-heading tmv2-section-heading--purple"><span>仕事内容と<span className="tmv2-accent-purple">価格</span>を、</span><span>先に見せる。</span></h2>
          <p>
            PR投稿とUGC制作で、別々のメニューを作成。対応内容、納期、価格を自分で設定できます。
          </p>
          <p>
            企業はプロフィールと表示価格を確認してから依頼。毎回ゼロから金額を決めるやり取りを減らします。
          </p>
        </div>
        <div className="tmv2-profile-ui" aria-label="Creatorの公開プロフィールとメニューの例">
          <div className="tmv2-browser-line">
            <span>trendmart.jp/in/creator-name</span>
            <span>公開プロフィール</span>
          </div>
          <div className="tmv2-profile-head">
            <div>
              <small>動画クリエイター</small>
              <strong>Beauty・Foodの縦型動画を制作</strong>
              <p>企画・撮影・編集まで対応。広告素材とSNS投稿のメニューを公開しています。</p>
            </div>
            <div className="tmv2-profile-status"><i aria-hidden="true" />依頼受付中</div>
          </div>
          <div className="tmv2-profile-links" aria-label="SNSとポートフォリオ">
            <span>Instagram ↗</span><span>TikTok ↗</span><span>Portfolio ↗</span>
          </div>
          <dl className="tmv2-profile-meta">
            <div><dt>対応媒体</dt><dd>Instagram / TikTok</dd></div>
            <div><dt>納品目安</dt><dd>初稿 7日</dd></div>
            <div><dt>制作物</dt><dd>動画 / 画像</dd></div>
          </dl>
          <div className="tmv2-profile-menu-head"><span>仕事メニュー</span><span>表示価格</span></div>
          <div className="tmv2-profile-menu">
            <div><small>広告素材制作 / UGC</small><strong>縦型ショート動画 1本</strong><p>納品物：動画1本　／　初稿：7日</p></div>
            <b>¥35,000</b>
          </div>
          <div className="tmv2-profile-menu">
            <div><small>PR投稿 / TikTok</small><strong>TikTok 商品紹介投稿</strong><p>投稿：動画1本　／　投稿後レポート</p></div>
            <b>¥70,000</b>
          </div>
          <div className="tmv2-direct-order">
            <div><b>01</b><small>企業</small><strong>メニューと価格を確認</strong></div>
            <span className="tmv2-flow-arrow" aria-hidden="true">→</span>
            <div><b>02</b><small>TrendMart</small><strong>1件から直接依頼</strong></div>
            <span className="tmv2-flow-arrow" aria-hidden="true">→</span>
            <div><b>03</b><small>クリエイター</small><strong>内容を見て承認・辞退</strong></div>
          </div>
        </div>
      </section>

      <section className="tmv2-difference" aria-labelledby="tmv2-difference-title">
        <div className="tmv2-section-intro tmv2-section-intro--light">
          <div>
            <h2 id="tmv2-difference-title" className="tmv2-section-heading tmv2-section-heading--light"><span>応募型とは違う、</span><span><span className="tmv2-accent-pink">直接依頼</span>の仕組み。</span></h2>
            <p>応募して選ばれるだけではなく、自分の仕事を公開して、企業から依頼を受ける仕組みです。</p>
          </div>
        </div>
        <div className="tmv2-compare" role="table" aria-label="従来サービスとTrendMartの仕事の受け方の比較">
          <div className="tmv2-compare-row tmv2-compare-head" role="row">
            <div role="columnheader">仕事の受け方</div><div role="columnheader">クリエイター</div><div role="columnheader">企業・依頼元</div>
          </div>
          <div className="tmv2-compare-row" role="row">
            <div role="cell"><strong>応募型</strong></div>
            <div role="cell">案件を探す → 応募 → 選考</div>
            <div role="cell">募集 → 選考 → 採用後に条件確認</div>
          </div>
          <div className="tmv2-compare-row" role="row">
            <div role="cell"><strong>代理店型</strong></div>
            <div role="cell">相談を受ける → 条件を調整</div>
            <div role="cell">代理店・キャスティングを通して相談</div>
          </div>
          <div className="tmv2-compare-row tmv2-compare-row--trend" role="row">
            <div role="cell"><strong>TrendMart</strong></div>
            <div role="cell">メニューと価格を公開 → 内容を見て承認・辞退</div>
            <div role="cell">クリエイターと価格を確認 → 1件から直接依頼</div>
          </div>
        </div>
      </section>

      <section className="tmv2-process" aria-labelledby="tmv2-process-title">
        <div className="tmv2-process-heading">
          <h2 id="tmv2-process-title" className="tmv2-section-heading tmv2-section-heading--purple"><span>依頼から<span className="tmv2-accent-purple">報酬</span>まで、</span><span>案件ごとに進める。</span></h2>
          <p>
            企業側の決済手続きを先に行う設計で、仕事後の未回収リスクを減らします。
          </p>
        </div>
        <ol className="tmv2-process-list">
          <li><span>1</span><small>企業</small><strong>依頼・<br />支払い手続き</strong></li>
          <li><span>2</span><small>Creator</small><strong>依頼内容を<br />確認</strong></li>
          <li><span>3</span><small>承認後</small><strong>案件開始</strong></li>
          <li><span>4</span><small>制作</small><strong>制作・納品</strong></li>
          <li><span>5</span><small>案件完了後</small><strong>報酬処理</strong></li>
        </ol>
        <p className="tmv2-process-note">
          ※ 企業のCheckout後に正式注文を生成し、Creator承認時に決済を確定（capture）する想定です。報酬は案件完了後の所定の処理を経て受け取れます。
        </p>
      </section>

      <section className="tmv2-summary" aria-labelledby="tmv2-summary-title">
        <div className="tmv2-summary-title">
          <h2 id="tmv2-summary-title" className="tmv2-section-heading"><span><span className="tmv2-accent-pink">プロフィール公開</span>から、</span><span>納品・報酬確認まで。</span></h2>
        </div>
        <div className="tmv2-summary-line" aria-label="TrendMartでできること">
          <span>公開プロフィール</span><span>メニュー</span><span>価格</span><span>直接依頼</span><span>案件管理</span><span>納品</span><span>決済・報酬</span><span>通知</span>
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
        <h2 id="tmv2-final-title">PR投稿も、UGC制作も。<br />自分で価格を決めて始める。</h2>
        <Link href={SIGNUP_HREF} className="tmv2-final-cta">無料でCreator登録 <span aria-hidden="true">→</span></Link>
        <p>PR投稿も、UGC制作も。届いた依頼は内容を確認してから判断できます。</p>
      </section>

      <footer className="tmv2-footer">
        <Image src="/brand/trend-mart-logo.png" alt="TrendMart" width={170} height={48} />
        <nav aria-label="フッターナビゲーション">
          <Link href="/login">ログイン</Link>
          <Link href="/terms">利用規約</Link>
          <Link href="/privacy">プライバシーポリシー</Link>
          <Link href="/legal">運営者情報</Link>
        </nav>
        <small>© 2026 Trendre</small>
      </footer>
    </main>
  );
}
