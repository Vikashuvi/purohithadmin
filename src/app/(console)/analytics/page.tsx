import { Activity, CalendarCheck2, MousePointerClick, Route } from "lucide-react";
import { ActivityChart } from "@/components/charts";
import { Kpi } from "@/components/kpi";
import { PageHeading } from "@/components/page-heading";
import { getDashboardData } from "@/lib/data";

export default async function AnalyticsPage() {
  const { active, daily, features } = await getDashboardData();
  const totalEvents = features.reduce((sum, item) => sum + Number(item.total_events), 0);
  return <><PageHeading eyebrow="Product intelligence" title="Audience and feature analytics" description="Privacy-conscious platform telemetry across web, iOS, Android, and Expo web."/><section className="kpi-grid"><Kpi label="DAU" value={active.daily_active_users} detail="Distinct signed-in or anonymous visitors" icon={Activity} tone="orange"/><Kpi label="WAU" value={active.weekly_active_users} detail="Trailing seven-day audience" icon={CalendarCheck2}/><Kpi label="MAU" value={active.monthly_active_users} detail="Trailing 30-day audience" icon={Route} tone="green"/><Kpi label="Feature events" value={totalEvents} detail="Top event families shown below" icon={MousePointerClick}/></section><section className="panel chart-panel wide"><div className="panel-heading"><div><p className="eyebrow">Audience trend</p><h2>Daily activity and ceremony demand</h2></div></div><ActivityChart data={daily}/></section><section className="table-panel"><div className="table-toolbar"><strong>Feature adoption, last 30 days</strong><span>Events are append-only</span></div><div className="data-table"><div className="table-row analytics-table table-head"><span>Feature</span><span>Events</span><span>Users</span><span>Sessions</span><span>Last used</span></div>{features.map((feature) => <div className="table-row analytics-table" key={feature.event_name}><span><strong>{feature.event_name.replaceAll("_", " ")}</strong></span><span>{feature.total_events}</span><span>{feature.unique_users}</span><span>{feature.unique_sessions}</span><span>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(feature.last_used_at))}</span></div>)}</div></section></>;
}

