import { createClient } from "@/lib/supabase/server";
import type { DailyMetric, FeatureMetric, Pooja, ProgrammaticPage } from "./types";

export async function getDashboardData() {
  const supabase = await createClient();
  const [active, daily, features, users, priests, requests, pages] = await Promise.all([
    supabase.from("super_admin_active_user_metrics").select("*").maybeSingle(),
    supabase.from("super_admin_daily_metrics").select("*").order("day", { ascending: true }).limit(30),
    supabase.from("super_admin_feature_usage_30d").select("*").order("total_events", { ascending: false }).limit(8),
    supabase.from("app_users").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("priest_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
    supabase.from("ceremony_requests").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("programmatic_pages").select("id", { count: "exact", head: true }).eq("status", "published"),
  ]);

  return {
    active: active.data || { daily_active_users: 0, weekly_active_users: 0, monthly_active_users: 0, sessions_30d: 0 },
    daily: (daily.data || []) as DailyMetric[],
    features: (features.data || []) as FeatureMetric[],
    totals: {
      users: users.count || 0,
      priests: priests.count || 0,
      openRequests: requests.count || 0,
      publishedPages: pages.count || 0,
    },
  };
}

export async function getPoojas() {
  const supabase = await createClient();
  const { data } = await supabase.from("poojas").select("*").order("updated_at", { ascending: false });
  return (data || []) as Pooja[];
}

export async function getPages() {
  const supabase = await createClient();
  const { data } = await supabase.from("super_admin_content_overview").select("*").order("updated_at", { ascending: false });
  return (data || []) as ProgrammaticPage[];
}

export async function getPeopleData() {
  const supabase = await createClient();
  const [users, priests] = await Promise.all([
    supabase.from("app_users").select("id,full_name,email,phone,role,is_active,created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("priest_profiles").select("id,user_id,display_name,verification_status,rating,review_count,service_areas,pooja_slugs,created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  return { users: users.data || [], priests: priests.data || [] };
}

export async function getSeoData() {
  const supabase = await createClient();
  const [clusters, pages] = await Promise.all([
    supabase.from("seo_keyword_clusters").select("*,programmatic_pages(title,slug,status)").order("updated_at", { ascending: false }),
    supabase.from("super_admin_content_overview").select("*").order("impressions_30d", { ascending: false }),
  ]);
  return { clusters: clusters.data || [], pages: pages.data || [] };
}

export async function getPaymentReviewData() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payment_submissions")
    .select("id,request_id,booking_id,customer_id,pooja_slug,pooja_name,amount_inr,upi_id,status,ai_verified,ai_confidence,ai_summary,invoice_number,created_at,admin_verified_at,ceremony_requests(address,ceremony_date,ceremony_time,landmark,payment_status),bookings(address,booking_date,booking_time,priest_name,customer_name)")
    .order("created_at", { ascending: false })
    .limit(80);
  return data || [];
}
