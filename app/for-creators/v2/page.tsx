import type { Metadata } from "next";
import TrendMartCreatorLPV2 from "./TrendMartCreatorLPV2";
import "./creator-lp-v2.css";

export const metadata: Metadata = {
  title: "Creator向け | TrendMart",
  description:
    "PR投稿と広告素材制作を、自分のメニューと価格で企業へ提供できるCreator Marketplace。Creator登録は無料です。",
};

export default function ForCreatorsV2Page() {
  return <TrendMartCreatorLPV2 />;
}
