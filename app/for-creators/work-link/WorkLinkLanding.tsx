"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  AtSign,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe2,
  Link2,
  Mail,
  MessageCircle,
  Send,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./work-link.module.css";

const SIGNUP_HREF = "/signup/link";
const LOGIN_HREF = "/login?next=%2Fcreator%2Flink";
const URL_SLUG = "yourname";

const profiles = [
  {
    key: "luna",
    name: "LUNA",
    handle: "@luna.afterdark",
    cta: "ライブ・タイアップを相談する",
    contact: "出演・楽曲制作のお問い合わせ",
    theme: "violet",
    image: "/brand/work-link/artist-night.webp",
    imageAlt: "紫の夜景を背景にした音楽アーティスト",
    socials: ["instagram", "youtube", "tiktok"],
    links: ["Official site", "最新の作品"],
  },
  {
    key: "mio",
    name: "mio",
    handle: "@mio.skinjournal",
    cta: "PR・レビューを相談する",
    contact: "お問い合わせ",
    theme: "ivory",
    image: "/brand/work-link/beauty-lifestyle.webp",
    imageAlt: "アイボリーの空間にいる女性インフルエンサー",
    socials: ["instagram", "tiktok"],
    links: ["公式サイト", "出演・制作実績"],
  },
  {
    key: "ren",
    name: "岩田 蓮",
    handle: "@ren.studio.jp",
    cta: "撮影・イベントを相談する",
    contact: "スタイリングのお問い合わせ",
    theme: "silver",
    image: "/brand/work-link/fashion-music.webp",
    imageAlt: "黒とシルバーのスタイリングをした男性インフルエンサー",
    socials: ["instagram", "youtube", "x"],
    links: ["Official site", "ポートフォリオ"],
  },
  {
    key: "sora",
    name: "Sora Tokyoグルメ",
    handle: "@sora.weekend",
    cta: "来店・旅のPRを相談する",
    contact: "取材のお問い合わせ",
    theme: "olive",
    image: "/brand/work-link/gourmet-travel.webp",
    imageAlt: "夕暮れの旅先で発信する女性インフルエンサー",
    socials: ["instagram", "web"],
    links: ["公式サイト", "出演・制作実績"],
  },
  {
    key: "kai",
    name: "KAITO",
    handle: "@kai.motion",
    cta: "出演・振付を相談する",
    contact: "パフォーマンスのお問い合わせ",
    theme: "cobalt",
    image: "/brand/work-link/dancer-blue.webp",
    imageAlt: "深いブルーの舞台で踊る男性パフォーマー",
    socials: ["instagram", "tiktok", "youtube"],
    links: ["YouTubeを見る", "出演実績"],
  },
  {
    key: "aoi",
    name: "Aoi葵",
    handle: "@aoi.visuals",
    cta: "撮影・映像制作を相談する",
    contact: "制作のお問い合わせ",
    theme: "lavender",
    image: "/brand/work-link/visual-lavender.webp",
    imageAlt: "白とラベンダーのスタジオにいる写真・映像作家",
    socials: ["instagram", "youtube", "web"],
    links: ["Portfolio", "公式サイト"],
  },
  {
    key: "hina",
    name: "HINA ARAI",
    handle: "@hina.arai",
    cta: "出演・ブランド撮影を相談する",
    contact: "マネジメントお問い合わせ",
    theme: "sunset",
    image: "/brand/work-link/talent-sunset.webp",
    imageAlt: "夕暮れの都市を背景にしたモデル・タレント",
    socials: ["instagram", "tiktok", "x"],
    links: ["Official site", "出演・制作実績"],
  },
] as const;

type Profile = (typeof profiles)[number];

const heroProfiles = [profiles[0], profiles[4], profiles[6]] as const;

const socialSources: Record<string, { src?: string; label: string }> = {
  instagram: { src: "/brand/social/instagram.png", label: "Instagram" },
  tiktok: { src: "/brand/social/tiktok.png", label: "TikTok" },
  youtube: { src: "/brand/social/youtube.png", label: "YouTube" },
  x: { src: "/brand/social/x.png", label: "X" },
  web: { label: "Webサイト" },
};

function SocialIcon({ platform, small = false }: { platform: string; small?: boolean }) {
  const item = socialSources[platform];
  return (
    <span className={`${styles.socialIcon} ${small ? styles.socialIconSmall : ""}`} title={item.label}>
      {item.src ? <Image src={item.src} alt="" width={small ? 18 : 24} height={small ? 18 : 24} unoptimized /> : <Globe2 size={small ? 15 : 18} aria-hidden="true" />}
      <span className="sr-only">{item.label}</span>
    </span>
  );
}

function ProfilePhone({ profile, clone = false }: { profile: Profile; clone?: boolean }) {
  return (
    <article className={`${styles.phone} ${styles[`phone_${profile.theme}`]}`} aria-label={clone ? undefined : `${profile.name}の完成プロフィール例`} aria-hidden={clone || undefined} inert={clone || undefined}>
      <div className={styles.phonePortrait}>
        <Image src={profile.image} alt={profile.imageAlt} fill sizes="280px" className={styles.portraitPhoto} unoptimized />
      </div>
      <div className={styles.phoneBody}>
        <div className={styles.profileRow}>
          <span className={styles.avatar}><Image src={profile.image} alt="" fill sizes="38px" unoptimized /></span>
          <div><strong>{profile.name}</strong><span>{profile.handle}</span></div>
        </div>
        <div className={styles.socialRow}>{profile.socials.map((social) => <SocialIcon platform={social} small key={social} />)}</div>
        <div className={styles.mockLinks}>
          {profile.links.map((label) => <div className={styles.mockLink} key={label}><span>{label}</span><ExternalLink size={12} /></div>)}
          <div className={styles.mockContact}><Mail size={13} /><span>{profile.contact}</span></div>
        </div>
        <div className={styles.mockRequest}><BriefcaseBusiness size={14} /><span>{profile.cta}</span></div>
      </div>
    </article>
  );
}

function useReveal(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add(styles.enhanced);
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(styles.visible);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8%" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [rootRef]);
}

function Hero() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [typedSlug, setTypedSlug] = useState("");
  const [slugFading, setSlugFading] = useState(false);
  const profile = heroProfiles[active];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (paused || media.matches) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % heroProfiles.length), 5200);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    let cancelled = false;

    const clearTimer = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
    };

    const startCycle = () => {
      clearTimer();
      if (cancelled || media.matches || document.hidden) {
        setTypedSlug(URL_SLUG);
        setSlugFading(false);
        return;
      }
      let index = 0;
      setTypedSlug("");
      setSlugFading(false);

      const typeNext = () => {
        if (cancelled || document.hidden) return;
        index += 1;
        setTypedSlug(URL_SLUG.slice(0, index));
        if (index < URL_SLUG.length) {
          timer = window.setTimeout(typeNext, 140);
          return;
        }
        timer = window.setTimeout(() => {
          setSlugFading(true);
          timer = window.setTimeout(() => {
            setTypedSlug("");
            setSlugFading(false);
            timer = window.setTimeout(startCycle, 400);
          }, 220);
        }, 1600);
      };

      timer = window.setTimeout(typeNext, 140);
    };

    const syncMotion = () => startCycle();
    media.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    startCycle();

    return () => {
      cancelled = true;
      clearTimer();
      media.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
    };
  }, []);

  const select = (index: number) => { setActive(index); setPaused(true); };

  return (
    <section className={`${styles.hero} ${styles[`hero_${profile.theme}`]}`} onPointerDown={() => setPaused(true)}>
      <div key={profile.key} className={styles.heroBackdrop}>
        <Image src={profile.image} alt={profile.imageAlt} fill priority sizes="100vw" className={styles.heroPhoto} unoptimized />
      </div>
      <div className={styles.heroShade} aria-hidden="true" />
      <div className={styles.heroNoise} aria-hidden="true" />
      <header className={styles.header}>
        <Link href="/for-creators/work-link" aria-label="Trendre Link トップへ" className={styles.logoLink}><span>Trendre</span> <em>Link</em></Link>
        <nav aria-label="アカウント"><Link href={LOGIN_HREF} className={styles.loginLink}>ログイン</Link><Link href={SIGNUP_HREF} className={styles.headerCta}>無料で始める</Link></nav>
      </header>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <h1>あなたの世界観を、<br />ひとつのページに。</h1>
          <p className={styles.lead}>好きなURLとデザインを選んで、<br />SNSも、サイトも、仕事の窓口もひとつに。</p>
          <div className={styles.urlCreator}>
            <span className={styles.urlLabel}>あなた専用のURL</span>
            <span className="sr-only">trendre.jp/in/yourname</span>
            <div className={styles.urlField} aria-hidden="true"><span>trendre.jp/in/</span><span className={`${styles.typedSlug} ${slugFading ? styles.typedSlugFading : ""}`}>{typedSlug}</span><span className={styles.reducedSlug}>yourname</span></div>
            <small id="url-note">登録後に好きなURLを設定できます</small>
          </div>
          <div className={styles.heroActions}>
            <Link href={SIGNUP_HREF} className={styles.primaryCta}>無料でリンクを作る<ArrowRight size={17} /></Link>
            <small className={styles.ctaNote}>専用URLを無料で発行</small>
          </div>
        </div>
        <div key={`${profile.key}-ui`} className={styles.heroProfileUi}>
          <div className={styles.heroIdentity}><span className={styles.heroAvatar}><Image src={profile.image} alt="" fill sizes="48px" unoptimized /></span><span><strong>{profile.name}</strong></span></div>
          <div className={styles.heroSocials}>{profile.socials.map((social, index) => <span key={social} style={{ "--item-index": index } as React.CSSProperties}><SocialIcon platform={social} /></span>)}</div>
          <div className={styles.heroLinks}>{profile.links.map((label, index) => <div key={label} style={{ "--item-index": index } as React.CSSProperties}><span>{label}</span><ExternalLink size={13} /></div>)}<div className={styles.heroContact}><Mail size={13} /><span>{profile.contact}</span></div></div>
          <div className={styles.heroWorkButton}><BriefcaseBusiness size={15} /><span>{profile.cta}</span></div>
        </div>
        <div className={styles.heroDots} role="tablist" aria-label="ページ例を切り替える">
          {heroProfiles.map((item, index) => <button key={item.key} type="button" role="tab" aria-selected={index === active} aria-label={`${item.name}のページ例`} onClick={() => select(index)}><span /></button>)}
        </div>
      </div>
    </section>
  );
}

function GallerySection() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<number | null>(null);
  const dragRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const [current, setCurrent] = useState(0);
  const loopProfiles = [profiles[profiles.length - 1], ...profiles, profiles[0]];

  const cardStep = () => {
    const node = carouselRef.current;
    if (!node || node.children.length < 2) return 0;
    return (node.children[1] as HTMLElement).offsetLeft - (node.children[0] as HTMLElement).offsetLeft;
  };

  const scrollToRenderIndex = (index: number, smooth = true) => {
    const node = carouselRef.current;
    const step = cardStep();
    if (!node || !step) return;
    node.scrollTo({ left: step * index, behavior: smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" });
  };

  const settleLoop = () => {
    const node = carouselRef.current;
    const step = cardStep();
    if (!node || !step) return;
    const renderIndex = Math.round(node.scrollLeft / step);
    const realIndex = renderIndex === 0 ? profiles.length - 1 : renderIndex === profiles.length + 1 ? 0 : renderIndex - 1;
    setCurrent(realIndex);
    if (renderIndex !== 0 && renderIndex !== profiles.length + 1) return;
    const targetIndex = renderIndex === 0 ? profiles.length : 1;
    node.style.scrollBehavior = "auto";
    node.scrollLeft = step * targetIndex;
    window.requestAnimationFrame(() => { node.style.scrollBehavior = ""; });
  };

  useLayoutEffect(() => {
    const node = carouselRef.current;
    if (!node) return;
    const align = () => {
      const step = cardStep();
      if (step) node.scrollLeft = step * (current + 1);
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
  }, []);

  return (
    <section id="page-examples" className={`${styles.section} ${styles.gallerySection}`}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeading} data-reveal="left"><h2>あなたらしさは、<br />ひとつじゃない。</h2><p>7つのページ例をスワイプして、<br />自分に近い世界観を見つけられます。</p></div>
        <div className={styles.swipeWrap} data-reveal="scale">
          <div
            ref={carouselRef}
            className={styles.profileCarousel}
            tabIndex={0}
            aria-label="7つの完成プロフィール例"
            onScroll={() => {
              const node = carouselRef.current;
              const step = cardStep();
              if (node && step) {
                const renderIndex = Math.round(node.scrollLeft / step);
                setCurrent(renderIndex === 0 ? profiles.length - 1 : renderIndex === profiles.length + 1 ? 0 : renderIndex - 1);
              }
              if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
              scrollTimerRef.current = window.setTimeout(settleLoop, 110);
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const step = cardStep();
              if (!step) return;
              const renderIndex = Math.round(event.currentTarget.scrollLeft / step);
              scrollToRenderIndex(renderIndex + (event.key === "ArrowRight" ? 1 : -1));
            }}
            onPointerDown={(event) => {
              if (event.pointerType !== "mouse") return;
              dragRef.current = { x: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
              event.currentTarget.setPointerCapture(event.pointerId);
              event.currentTarget.dataset.dragging = "true";
              event.currentTarget.style.scrollSnapType = "none";
            }}
            onPointerMove={(event) => {
              if (!dragRef.current || event.pointerType !== "mouse") return;
              event.currentTarget.scrollLeft = dragRef.current.scrollLeft - (event.clientX - dragRef.current.x);
            }}
            onPointerUp={(event) => {
              if (!dragRef.current || event.pointerType !== "mouse") return;
              dragRef.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
              delete event.currentTarget.dataset.dragging;
              event.currentTarget.style.scrollSnapType = "";
              const step = cardStep();
              if (step) scrollToRenderIndex(Math.round(event.currentTarget.scrollLeft / step));
            }}
          >
            {loopProfiles.map((profile, index) => <ProfilePhone profile={profile} clone={index === 0 || index === loopProfiles.length - 1} key={`${profile.key}-${index}`} />)}
          </div>
          <div className={styles.galleryCount} aria-hidden="true">{profiles.map((profile, index) => <i className={index === current ? styles.galleryDotActive : ""} key={profile.key} />)}</div>
        </div>
      </div>
    </section>
  );
}

function SocialHubSection() {
  return (
    <section className={`${styles.section} ${styles.socialSection}`}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeading} data-reveal="right"><h2>SNSも、サイトも、<br />あなたの入口に。</h2><p>どこから見つけてもらっても、<br />あなたが見せたい場所へつなげられます。</p></div>
        <div className={styles.socialComposition} data-reveal="depth">
          <div className={styles.socialPortrait}><Image src="/brand/work-link/visual-lavender.webp" alt="自分のSNSやサイトを一つにまとめたプロフィールページ例" fill sizes="(max-width: 819px) 82vw, 420px" unoptimized /></div>
          <div className={styles.socialOrbit} aria-hidden="true">{["instagram", "tiktok", "youtube", "x"].map((platform) => <span key={platform}><SocialIcon platform={platform} /></span>)}</div>
          <div className={styles.socialPagePanel}>
            <strong>Aoi葵</strong>
            <div><span>Portfolio</span><ExternalLink size={13} /></div><div><span>公式サイト</span><ExternalLink size={13} /></div><div><span>お問い合わせ</span><Mail size={13} /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

const requestDetails = ["PRしたい商品・サービス", "希望するSNS", "希望時期・予算", "URL・補足内容"];

function RequestSection() {
  return (
    <section className={`${styles.section} ${styles.requestSection}`}>
      <div className={styles.sectionInner}>
        <div className={`${styles.sectionHeading} ${styles.requestHeading}`} data-reveal="left"><h2>DMやメールに散らばっていた<br />問い合わせも、仕事の相談も、<br />ここからひとつの流れに。</h2><p>PR依頼や出演相談に必要な情報を、<br />はじめから整った形で受け取れます。</p></div>
        <div className={styles.requestComposition} data-reveal="depth">
          <div className={styles.messageSources}><span><AtSign size={17} />DM</span><span><Mail size={17} />メール</span><span><MessageCircle size={17} />問い合わせ</span></div>
          <div className={styles.funnelLine} aria-hidden="true" />
          <div className={styles.requestSheet}><div className={styles.requestSheetHead}><span className={styles.requestAvatar}><Image src="/brand/work-link/artist-night.webp" alt="" fill sizes="42px" unoptimized /></span><div><strong>LUNAへの仕事相談</strong><small>必要な内容を選んで送信</small></div></div>{requestDetails.map((item) => <div key={item}><Check size={14} /><span>{item}</span></div>)}<button type="button">相談内容を入力する<ArrowRight size={14} /></button></div>
        </div>
      </div>
    </section>
  );
}

const formSteps = [
  { title: "相談したい内容", subtitle: "近いものをひとつ選択", options: ["PR投稿", "商品・サービス紹介", "出演・撮影"] },
  { title: "目的・希望SNS", subtitle: "複数のSNSも相談できます", options: ["Instagram", "TikTok", "YouTube"] },
  { title: "希望時期・予算", subtitle: "分かる範囲で選択", options: ["来月まで", "3か月以内", "相談して決めたい"] },
  { title: "連絡先・補足", subtitle: "商品URLや伝えたいことを追加", options: ["連絡先", "商品・サービスURL", "補足メモ"] },
] as const;

function FormSection() {
  const [step, setStep] = useState(0);
  const content = formSteps[step];
  return (
    <section className={`${styles.section} ${styles.formSection}`}>
      <div className={styles.sectionInner}>
        <div className={`${styles.sectionHeading} ${styles.formHeading}`} data-reveal="right"><h2>フォームの活用で、<br />機会損失を限りなくゼロへ。</h2><p>依頼主は必要な内容を選択式で入力。<br />相談に必要な情報を、まとめて受け取れます。</p></div>
        <div className={styles.formStage} data-reveal="depth">
          <div className={styles.formPhone}>
            <div className={styles.progressMeta}><span>仕事相談</span><strong>{step + 1} / {formSteps.length}</strong></div>
            <div className={styles.progressTrack}><span style={{ width: `${((step + 1) / formSteps.length) * 100}%` }} /></div>
            <div key={step} className={styles.formContent}><h3>{content.title}</h3><p>{content.subtitle}</p><div className={styles.formOptions}>{content.options.map((option, index) => <button type="button" key={option} className={index === 0 ? styles.optionSelected : ""}><span>{index === 0 ? <Check size={14} /> : null}</span>{option}</button>)}</div></div>
            <div className={styles.formNav}><button type="button" onClick={() => setStep((value) => Math.max(value - 1, 0))} disabled={step === 0}><ChevronLeft size={17} />戻る</button><button type="button" onClick={() => setStep((value) => Math.min(value + 1, formSteps.length - 1))} disabled={step === formSteps.length - 1}>次へ<ChevronRight size={17} /></button></div>
            <p className={styles.formNote}>相談を送っただけでは正式依頼になりません</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const flowItems = ["相談が届く", "内容・予算を確認", "対応したい相談を選ぶ", "正式依頼へ", "チャット・納品へ"];

function DecisionSection() {
  return (
    <section className={`${styles.section} ${styles.decisionSection}`}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeading} data-reveal="left"><h2>相談を見てから、<br />受けるか決められる。</h2><p>内容や希望予算を確認して、<br />対応したい仕事を選べます。</p></div>
        <div className={styles.flowRail} data-reveal="stack">{flowItems.map((title, index) => <div key={title} style={{ "--item-index": index } as React.CSSProperties}><span><Check size={14} /></span><strong>{title}</strong>{index < flowItems.length - 1 ? <ArrowRight size={15} /> : null}</div>)}</div>
      </div>
    </section>
  );
}

const howTo = [
  ["プロフィールを設定", "写真と自己紹介を登録"],
  ["SNSやサイトを追加", "見せたい場所をひとつに"],
  ["仕事相談ボタンを選択", "依頼の入口を分かりやすく"],
  ["URLをプロフィール欄へ", "公開して活動につなげる"],
] as const;

function HowToSection() {
  return (
    <section className={`${styles.section} ${styles.howToSection}`}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeading} data-reveal="right"><h2>プロフィールとリンクを選んで、<br />あなたのページを公開。</h2></div>
        <div className={styles.howToTrack} data-reveal="stack">{howTo.map(([title, body], index) => <div key={title} style={{ "--item-index": index } as React.CSSProperties}><span>{index === 0 ? <Sparkles /> : index === 1 ? <Link2 /> : index === 2 ? <BriefcaseBusiness /> : <Send />}</span><div><strong>{title}</strong><p>{body}</p></div></div>)}</div>
        <Link href={SIGNUP_HREF} className={styles.inlineCta}>無料で始める<ArrowRight size={16} /></Link>
      </div>
    </section>
  );
}

const connectionFlow = ["相談", "正式依頼", "チャット", "納品", "報酬確認"];

function ConnectionSection() {
  return (
    <section className={`${styles.section} ${styles.connectionSection}`}>
      <div className={styles.sectionInner}>
        <div className={styles.connectionCopy} data-reveal="left"><h2>Trend Martへ</h2><p>チャット、納品、報酬確認まで、<br />仕事の進行をひとつの場所で管理できます。</p><Link href="/for-creators" className={styles.lightCta}>Trend Martについて見る<ArrowRight size={16} /></Link></div>
        <div className={styles.connectionVisual} data-reveal="right"><Image src="/brand/trend-mart-logo.png" alt="Trend Mart" width={932} height={190} unoptimized /><div>{connectionFlow.map((item, index) => <span key={item}>{item}{index < connectionFlow.length - 1 ? <ArrowRight size={12} /> : null}</span>)}</div><div className={styles.connectionIcons}><MessageCircle /><Send /><WalletCards /></div></div>
      </div>
    </section>
  );
}

const faqs = [
  ["Instagram以外のリンクもまとめられますか？", "Instagram、TikTok、YouTube、Xのほか、自分のWebサイトやポートフォリオへの導線もまとめられます。"],
  ["仕事の相談では何を受け取れますか？", "希望するSNS、時期、予算、商品・サービスの情報など、検討に必要な内容を整理して受け取れます。"],
  ["価格をページに公開する必要はありますか？", "ページ上で一律の価格を公開せず、届いた相談内容や希望予算を見て判断できます。"],
  ["届いた相談は必ず受ける必要がありますか？", "いいえ。内容を確認して、対応したい相談だけ次の段階へ進められます。"],
] as const;

function FaqSection() {
  return <section className={`${styles.section} ${styles.faqSection}`}><div className={styles.sectionInner}><div className={styles.sectionHeading} data-reveal="left"><h2>始める前に、<br />気になること。</h2></div><div className={styles.faqList} data-reveal="right">{faqs.map(([question, answer]) => <details key={question}><summary><span>{question}</span><ChevronDown size={19} /></summary><p>{answer}</p></details>)}</div></div></section>;
}

function FinalSection() {
  return (
    <section className={styles.finalSection}>
      <div className={styles.finalGlow} aria-hidden="true" />
      <div className={styles.finalInner} data-reveal="depth"><h2>あなたの世界観を、<br />新しい仕事につなげよう。</h2><p>SNSも、サイトも、仕事の相談も。<br />ひとつのページから始められます。</p><Link href={SIGNUP_HREF} className={styles.finalCta}>無料でリンクを作る<ArrowRight size={18} /></Link><small className={styles.finalNote}>専用URLを無料で発行</small></div>
      <footer className={styles.footer}><strong className={styles.footerLinkBrand}>Trendre Link</strong><div><Link href="/for-creators" aria-label="Trend Martについて"><Image src="/brand/trend-mart-logo.png" alt="Trend Mart" width={932} height={190} unoptimized /></Link><Link href={LOGIN_HREF}>ログイン</Link></div><p>© 2026 Trendre Link</p></footer>
    </section>
  );
}

export default function WorkLinkLanding() {
  const rootRef = useRef<HTMLElement>(null);
  useReveal(rootRef);
  return <main ref={rootRef} className={styles.page}><Hero /><GallerySection /><SocialHubSection /><RequestSection /><FormSection /><DecisionSection /><HowToSection /><ConnectionSection /><FaqSection /><FinalSection /></main>;
}
