"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyMetric } from "@/lib/types";

export function ActivityChart({ data }: { data: DailyMetric[] }) {
  const values = data.map((item) => ({ ...item, label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(item.day)) }));
  if (!values.length) return <div className="empty-chart"><strong>No session data yet</strong><span>Activity appears after the Expo and web clients send session heartbeats.</span></div>;
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={values} margin={{ top: 10, right: 4, left: -24, bottom: 0 }}><defs><linearGradient id="activeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e44b14" stopOpacity={0.24}/><stop offset="100%" stopColor="#e44b14" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#ece9e4"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#78746e", fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "#78746e", fontSize: 11 }}/><Tooltip contentStyle={{ border: "1px solid #e6e1da", borderRadius: 8, boxShadow: "0 10px 30px rgba(36,28,21,.08)" }}/><Area type="monotone" dataKey="active_users" name="Active users" stroke="#e44b14" strokeWidth={2.5} fill="url(#activeFill)"/><Area type="monotone" dataKey="bookings_created" name="Requests" stroke="#171513" strokeWidth={2} fill="transparent"/></AreaChart></ResponsiveContainer></div>;
}

