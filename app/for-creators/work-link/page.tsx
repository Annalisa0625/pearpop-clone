import type { Metadata } from "next";
import WorkLinkLanding from "./WorkLinkLanding";

export const metadata: Metadata = {
  title: "自分専用のプロフィールリンクを作る | Trendre Link",
  description:
    "好きなURLとデザインを選んで、SNS、サイト、仕事の相談窓口を一つに。Trendreのプロフィール・仕事依頼リンク作成サービスです。",
};

export default function WorkLinkPage() {
  return <WorkLinkLanding />;
}
