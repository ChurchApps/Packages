"use client";

import { useEffect, useState } from "react";
import { ApiHelper } from "../../..";
import { ElementInterface, SectionInterface } from "../../helpers";

interface FundTotal { fundId: string; totalAmount: number; donationCount: number; }

interface Props {
  element: ElementInterface;
  churchId: string;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export const CampaignProgressElement = ({ element, churchId, onEdit }: Props) => {
  const answers: any = element.answers || {};
  const fundId = (answers.fundId as string) || "";
  const goal = Number(answers.goalAmount) || 0;
  const title = (answers.title as string) || "";
  const showAmounts = answers.showAmounts !== false && answers.showAmounts !== "false";
  const donateUrl = (answers.donateUrl as string) || "";

  const [data, setData] = useState<FundTotal | null>(null);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    if (!fundId || !churchId) return;
    const params: string[] = [];
    if (answers.startDate) params.push("startDate=" + encodeURIComponent(answers.startDate));
    if (answers.endDate) params.push("endDate=" + encodeURIComponent(answers.endDate));
    const query = params.length ? "?" + params.join("&") : "";
    ApiHelper.getAnonymous("/funds/public/" + churchId + "/" + fundId + "/total" + query, "GivingApi")
      .then((d: FundTotal) => setData(d))
      .catch(() => {});
  }, [churchId, fundId, answers.startDate, answers.endDate]);

  const total = data?.totalAmount || 0;
  const percent = goal > 0 ? Math.round((total / goal) * 100) : 0;

  useEffect(() => {
    const capped = Math.min(100, percent);
    const raf = requestAnimationFrame(() => setBarWidth(capped));
    return () => cancelAnimationFrame(raf);
  }, [percent]);

  if (!fundId) {
    if (onEdit) return <div className="campaign-empty">Campaign Progress: select a fund and set a goal</div>;
    return null;
  }

  return (
    <div id={"el-" + element.id} className="campaignProgress">
      {title && <div className="campaign-title">{title}</div>}
      <div className="campaign-bar">
        <div className="campaign-bar-fill" style={{ width: barWidth + "%" }} />
      </div>
      <div className="campaign-percent">{percent}%</div>
      {showAmounts && goal > 0 && <div className="campaign-amounts">{money(total)} raised of {money(goal)} goal</div>}
      {showAmounts && data && <div className="campaign-count">{data.donationCount.toLocaleString("en-US")} {data.donationCount === 1 ? "donation" : "donations"}</div>}
      {donateUrl && <a className="campaign-give" href={donateUrl}>Give</a>}
    </div>
  );
};
