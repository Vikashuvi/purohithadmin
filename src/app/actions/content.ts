"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

const text = (form: FormData, key: string) => String(form.get(key) || "").trim();
const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

async function audit(actorId: string, action: string, targetType: string, targetId: string, note = "") {
  const supabase = await createClient();
  await supabase.from("admin_actions").insert({ actor_id: actorId, action, target_type: targetType, target_id: targetId, note });
}

export async function savePooja(formData: FormData) {
  const actor = await requireSuperAdmin();
  const supabase = await createClient();
  const id = text(formData, "id");
  const payload = {
    slug: text(formData, "slug"),
    name: text(formData, "name"),
    kannada_name: text(formData, "kannada_name"),
    description: text(formData, "description"),
    duration_minutes: Number(formData.get("duration_minutes") || 120),
    base_price_inr: Number(formData.get("base_price_inr") || 0),
    image_url: text(formData, "image_url") || null,
    seo_title: text(formData, "seo_title") || null,
    seo_description: text(formData, "seo_description") || null,
    is_active: formData.get("is_active") === "on",
    updated_at: new Date().toISOString(),
  };
  const query = id ? supabase.from("poojas").update(payload).eq("id", id) : supabase.from("poojas").insert(payload).select("id").single();
  const { data, error } = await query;
  if (error) redirect(`/content/poojas?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, id ? "update" : "create", "pooja", id || data?.id || payload.slug, payload.name);
  revalidatePath("/content/poojas");
  revalidatePath("/");
}

export async function togglePooja(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  const next = text(formData, "next") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("poojas").update({ is_active: next, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/content/poojas?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, next ? "activate" : "deactivate", "pooja", id);
  revalidatePath("/content/poojas");
}

export async function savePage(formData: FormData) {
  const actor = await requireSuperAdmin();
  const supabase = await createClient();
  const id = text(formData, "id");
  const status = text(formData, "status") || "draft";
  const faqText = text(formData, "faq_items");
  let faqItems: unknown[] = [];
  if (faqText) {
    try { faqItems = JSON.parse(faqText); } catch { redirect("/content/pages/new?error=FAQ+JSON+is+invalid"); }
  }
  const payload = {
    slug: text(formData, "slug"), page_type: text(formData, "page_type"),
    title: text(formData, "title"), description: text(formData, "description"),
    content_md: text(formData, "content_md"), target_keywords: list(text(formData, "target_keywords")),
    locale: text(formData, "locale") || "en-IN", city_slug: text(formData, "city_slug") || null,
    pooja_slug: text(formData, "pooja_slug") || null, canonical_url: text(formData, "canonical_url") || null,
    meta_robots: text(formData, "meta_robots") || "index,follow", faq_items: faqItems,
    structured_data: {}, generation_brief: { audience: text(formData, "audience"), search_intent: text(formData, "search_intent") },
    status, created_by: actor.id, published_by: status === "published" ? actor.id : null,
    published_at: status === "published" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  let pageId = id;
  if (id) {
    const { data: current } = await supabase.from("programmatic_pages").select("*").eq("id", id).single();
    if (current) await supabase.from("content_revisions").insert({ page_id: id, version: current.version, snapshot: current, change_note: text(formData, "change_note"), created_by: actor.id });
    const { error } = await supabase.from("programmatic_pages").update({ ...payload, version: (current?.version || 1) + 1 }).eq("id", id);
    if (error) redirect(`/content/pages/new?id=${id}&error=${encodeURIComponent(error.message)}`);
  } else {
    const { data, error } = await supabase.from("programmatic_pages").insert(payload).select("id").single();
    if (error) redirect(`/content/pages/new?error=${encodeURIComponent(error.message)}`);
    pageId = data.id;
  }
  await audit(actor.id, id ? "update" : "create", "programmatic_page", pageId, payload.title);
  revalidatePath("/content/pages"); revalidatePath("/seo"); revalidatePath("/");
  redirect("/content/pages");
}

export async function saveKeywordCluster(formData: FormData) {
  const actor = await requireSuperAdmin();
  const supabase = await createClient();
  const payload = {
    name: text(formData, "name"), slug: text(formData, "slug"), intent: text(formData, "intent"),
    locale: text(formData, "locale") || "en-IN", city_slug: text(formData, "city_slug") || null,
    pooja_slug: text(formData, "pooja_slug") || null, primary_keyword: text(formData, "primary_keyword"),
    supporting_keywords: list(text(formData, "supporting_keywords")), status: "active", created_by: actor.id,
  };
  const { data, error } = await supabase.from("seo_keyword_clusters").insert(payload).select("id").single();
  if (error) redirect(`/seo?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, "create", "seo_keyword_cluster", data.id, payload.name);
  revalidatePath("/seo");
}

export async function reviewPriest(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  const status = text(formData, "status");
  const supabase = await createClient();
  const { error } = await supabase.from("priest_profiles").update({ verification_status: status, verified_by: actor.id, verified_at: status === "verified" ? new Date().toISOString() : null }).eq("id", id);
  if (error) redirect(`/priests?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, status, "priest_profile", id);
  revalidatePath("/priests"); revalidatePath("/");
}

export async function verifyPaymentSubmission(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  const { url, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${url}/functions/v1/payment-workflow`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: publishableKey },
    body: JSON.stringify({ action: "admin_verify_payment", payment_submission_id: id, admin_user_id: actor.id }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) redirect(`/payments?error=${encodeURIComponent(payload.error || "Could not verify payment")}`);
  await audit(actor.id, "admin_verify", "payment_submission", id);
  revalidatePath("/payments");
  revalidatePath("/");
}
