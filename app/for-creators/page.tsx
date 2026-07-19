import type { Metadata } from "next";
import CreatorLandingPage from "./TrendMartCreatorLP";
import "./creator-lp.css";

export const metadata: Metadata = {
  title: "インフルエンサー向け | Trend Mart",
  description:
    "インフルエンサーとブランド・企業が直接つながるマッチングプラットフォーム。依頼確認からチャット、納品、報酬確認までをひとつにまとめます。",
};

export default function ForCreatorsPage() {
  return <CreatorLandingPage />;
}
