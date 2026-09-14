"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parse } from "csv-parse/sync";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

const text = (form: FormData, key: string) => String(form.get(key) || "").trim();
const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const pipeList = (value: unknown) => String(value || "").split("|").map((item) => item.trim()).filter(Boolean);

type PriestImportRow = {
  full_name: string;
  email?: string;
  phone?: string;
  profile_headline?: string;
  bio?: string;
  years_experience: number;
  service_areas: string[];
  primary_service_area?: string;
  languages: string[];
  pooja_slugs: string[];
  starting_price_inr: number;
  max_price_inr: number;
  photo_url?: string;
  portfolio_urls: string[];
  verification_status: "pending" | "verified";
};

async function runManagedPriestImport(priests: PriestImportRow[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("admin-user-management", {
    body: { action: "bulk_onboard_priests", priests },
  });
  if (error) return { error: error.message, data: null };
  if (data?.error) return { error: String(data.error), data: null };
  return { error: null, data };
}

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

export async function savePriestListing(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  if (!id) redirect("/priests?error=Priest+profile+is+required");

  const startingPrice = Number(formData.get("starting_price_inr") || 0);
  const maximumPrice = Number(formData.get("max_price_inr") || 0);
  if (startingPrice < 0 || maximumPrice < startingPrice) {
    redirect("/priests?error=Price+range+is+invalid");
  }

  const payload = {
    display_name: text(formData, "display_name"),
    profile_headline: text(formData, "profile_headline"),
    bio: text(formData, "bio"),
    photo_url: text(formData, "photo_url") || null,
    portfolio_urls: text(formData, "portfolio_urls").split("\n").map((item) => item.trim()).filter(Boolean),
    service_areas: list(text(formData, "service_areas")),
    primary_service_area: text(formData, "primary_service_area") || null,
    languages: list(text(formData, "languages")),
    pooja_slugs: list(text(formData, "pooja_slugs")),
    starting_price_inr: startingPrice,
    max_price_inr: maximumPrice,
    updated_at: new Date().toISOString(),
  };
  const supabase = await createClient();
  const { error } = await supabase.from("priest_profiles").update(payload).eq("id", id);
  if (error) redirect(`/priests?error=${encodeURIComponent(error.message)}`);
  if (payload.pooja_slugs.length) {
    const services = payload.pooja_slugs.map((slug) => ({
      priest_id: id,
      pooja_slug: slug,
      price_paise: Math.max(startingPrice, 1) * 100,
      is_active: true,
      updated_at: new Date().toISOString(),
    }));
    await supabase.from("priest_services").upsert(services, { onConflict: "priest_id,pooja_slug" });
  }
  await audit(actor.id, "update_marketplace_listing", "priest_profile", id, payload.display_name);
  revalidatePath("/priests");
  revalidatePath("/seo/locations");
  revalidatePath("/");
}

export async function setAccountState(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  const active = text(formData, "active") === "true";
  const note = text(formData, "note");
  if (!id || id === actor.id) redirect("/users?error=You+cannot+change+your+own+account+state");
  const supabase = await createClient();
  const { error } = await supabase.from("app_users").update({ is_active: active, moderation_note: note || null, moderated_at: new Date().toISOString(), moderated_by: actor.id, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/users?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, active ? "reactivate" : "suspend", "app_user", id, note);
  revalidatePath("/users"); revalidatePath("/");
}

export async function changeAccountRole(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  const role = text(formData, "role");
  if (!id || id === actor.id) redirect("/users?error=You+cannot+change+your+own+role");
  if (!["customer", "priest", "support", "admin"].includes(role)) redirect("/users?error=Unsupported+role");
  const supabase = await createClient();
  const { error } = await supabase.from("app_users").update({ role, moderated_at: new Date().toISOString(), moderated_by: actor.id, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/users?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, "change_role", "app_user", id, role);
  revalidatePath("/users"); revalidatePath("/priests"); revalidatePath("/");
}

export async function reportAccount(formData: FormData) {
  const actor = await requireSuperAdmin();
  const reportedUserId = text(formData, "id");
  const category = text(formData, "category") || "other";
  const details = text(formData, "details");
  if (!reportedUserId || reportedUserId === actor.id) redirect("/users?error=You+cannot+report+yourself");
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_reports").insert({ reported_user_id: reportedUserId, reported_by: actor.id, category, details }).select("id").single();
  if (error) redirect(`/users?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, "report", "app_user", reportedUserId, `${category}: ${details}`);
  revalidatePath("/users");
  if (data?.id) redirect(`/users?success=${encodeURIComponent("Report added to the review queue")}`);
}

export async function resolveUserReport(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = text(formData, "id");
  const status = text(formData, "status");
  const note = text(formData, "resolution_note");
  if (!["resolved", "dismissed", "reviewing"].includes(status)) redirect("/users?error=Unsupported+report+status");
  const supabase = await createClient();
  const { error } = await supabase.from("user_reports").update({ status, resolution_note: note, resolved_by: actor.id, resolved_at: status === "reviewing" ? null : new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/users?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, `report_${status}`, "user_report", id, note);
  revalidatePath("/users");
}

export async function inviteAccount(formData: FormData) {
  const actor = await requireSuperAdmin();
  const email = text(formData, "email").toLowerCase();
  const fullName = text(formData, "full_name");
  const role = text(formData, "role") || "priest";
  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("admin-user-management", { body: { email, full_name: fullName, role } });
  if (error) redirect(`/users?error=${encodeURIComponent(error.message)}`);
  await audit(actor.id, "invite_requested", "app_user", email, role);
  revalidatePath("/users"); revalidatePath("/priests");
  redirect(`/users?success=${encodeURIComponent(`Invitation sent to ${email}`)}`);
}

export async function onboardPriest(formData: FormData) {
  const actor = await requireSuperAdmin();
  const startingPrice = Number(formData.get("starting_price_inr") || 0);
  const maximumPrice = Number(formData.get("max_price_inr") || startingPrice);
  const payload = {
    email: text(formData, "email").toLowerCase(),
    full_name: text(formData, "full_name"),
    phone: text(formData, "phone"),
    profile_headline: text(formData, "profile_headline"),
    bio: text(formData, "bio"),
    years_experience: Number(formData.get("years_experience") || 0),
    service_areas: list(text(formData, "service_areas")),
    primary_service_area: text(formData, "primary_service_area"),
    languages: formData.getAll("languages").map(String),
    pooja_slugs: formData.getAll("pooja_slugs").map(String),
    photo_url: text(formData, "photo_url"),
    portfolio_urls: text(formData, "portfolio_urls").split("\n").map((item) => item.trim()).filter(Boolean),
    starting_price_inr: startingPrice,
    max_price_inr: maximumPrice,
    verification_status: text(formData, "verification_status") || "pending",
  };
  if (!payload.email.includes("@") || payload.full_name.length < 2) redirect("/priests?error=Valid+name+and+email+are+required");
  if (!payload.service_areas.length || !payload.languages.length || !payload.pooja_slugs.length) redirect("/priests?error=Select+an+area%2C+language%2C+and+at+least+one+puja");
  if (startingPrice < 0 || maximumPrice < startingPrice) redirect("/priests?error=Price+range+is+invalid");

  const { data, error } = await runManagedPriestImport([payload as PriestImportRow]);
  if (error || data?.failed) {
    const rowError = data?.results?.[0]?.error;
    redirect(`/priests?error=${encodeURIComponent(rowError || error || "Could not onboard Purohit")}`);
  }
  await audit(actor.id, "onboard_priest", "priest_profile", String(data.results[0].priest_profile_id), payload.full_name);
  revalidatePath("/priests"); revalidatePath("/users"); revalidatePath("/seo/locations"); revalidatePath("/");
  redirect(`/priests?success=${encodeURIComponent(`${payload.full_name} was onboarded without sending an invitation`)}`);
}

export async function bulkOnboardPriests(formData: FormData) {
  const actor = await requireSuperAdmin();
  const file = formData.get("csv_file");
  if (!(file instanceof File) || file.size === 0) redirect("/priests?error=Choose+a+CSV+file+to+import");
  if (file.size > 2_000_000) redirect("/priests?error=CSV+file+must+be+smaller+than+2MB");

  let records: Record<string, string>[];
  try {
    records = parse(await file.text(), { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch {
    redirect("/priests?error=The+CSV+file+could+not+be+read");
  }
  if (!records.length || records.length > 250) redirect("/priests?error=Import+between+1+and+250+Purohits+at+a+time");

  const priests: PriestImportRow[] = records.map((row) => ({
    full_name: String(row.full_name || "").trim(),
    email: String(row.email || "").trim().toLowerCase(),
    phone: String(row.phone || "").trim(),
    profile_headline: String(row.profile_headline || "").trim(),
    bio: String(row.bio || "").trim(),
    years_experience: Number(row.years_experience || 0),
    service_areas: pipeList(row.service_areas),
    primary_service_area: String(row.primary_service_area || "").trim(),
    languages: pipeList(row.languages),
    pooja_slugs: pipeList(row.pooja_slugs),
    starting_price_inr: Number(row.starting_price_inr || 0),
    max_price_inr: Number(row.max_price_inr || row.starting_price_inr || 0),
    photo_url: String(row.photo_url || "").trim(),
    portfolio_urls: pipeList(row.portfolio_urls),
    verification_status: row.verification_status === "verified" ? "verified" : "pending",
  }));
  const { data, error } = await runManagedPriestImport(priests);
  if (error) redirect(`/priests?error=${encodeURIComponent(error)}`);

  await audit(actor.id, "bulk_onboard_priests_requested", "priest_profile_batch", crypto.randomUUID(), `${data.succeeded}/${data.total} onboarded`);
  revalidatePath("/priests"); revalidatePath("/users"); revalidatePath("/seo/locations"); revalidatePath("/");
  const failedNames = (data.results || []).filter((result: { ok: boolean }) => !result.ok).slice(0, 3).map((result: { name?: string; row: number }) => result.name || `row ${result.row}`).join(", ");
  const message = `${data.succeeded} of ${data.total} Purohits onboarded${data.failed ? `. Review failed rows: ${failedNames}` : ""}`;
  redirect(`/priests?${data.failed ? "error" : "success"}=${encodeURIComponent(message)}`);
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

export async function approveProviderRelease(formData: FormData) {
  const actor = await requireSuperAdmin();
  const earningId = text(formData, "earning_id");
  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) redirect("/login?error=session_expired");

  const { url, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${url}/functions/v1/payment-workflow`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: "approve_provider_release", earning_id: earningId }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) redirect(`/payments?error=${encodeURIComponent(payload.error || "Could not queue provider release")}`);
  await audit(actor.id, "approve_provider_release", "provider_earning", earningId);
  revalidatePath("/payments");
  revalidatePath("/");
}
