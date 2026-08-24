import { Check, MapPin, X } from "lucide-react";
import { reviewPriest } from "@/app/actions/content";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/status-pill";
import { getPeopleData } from "@/lib/data";

export default async function PriestsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ priests }, query] = await Promise.all([getPeopleData(), searchParams]);
  return <><PageHeading eyebrow="Provider operations" title="Priest quality and coverage" description="Verify applications, inspect specialties, and keep marketplace supply trustworthy."/>{query.error && <div className="notice error">{decodeURIComponent(query.error)}</div>}<div className="provider-list">{priests.map((priest) => <article className="provider-row" key={priest.id}><div className="provider-avatar">{priest.display_name?.slice(0, 2).toUpperCase()}</div><div className="provider-main"><div><h2>{priest.display_name}</h2><StatusPill status={priest.verification_status}/></div><p><MapPin size={14}/>{priest.service_areas?.join(", ") || "Service area not supplied"}</p><small>{priest.pooja_slugs?.join(" · ") || "No specialties selected"}</small></div><div className="provider-score"><strong>{Number(priest.rating).toFixed(1)}</strong><small>{priest.review_count} reviews</small></div><div className="provider-actions"><form action={reviewPriest}><input type="hidden" name="id" value={priest.id}/><input type="hidden" name="status" value="rejected"/><button className="secondary-button"><X size={16}/>Reject</button></form><form action={reviewPriest}><input type="hidden" name="id" value={priest.id}/><input type="hidden" name="status" value="verified"/><button className="primary-button"><Check size={16}/>Verify</button></form></div></article>)}{!priests.length && <div className="empty-state roomy">No priest profiles found.</div>}</div></>;
}

