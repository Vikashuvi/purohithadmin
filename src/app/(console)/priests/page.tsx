import Image from "next/image";
import { Check, Download, ExternalLink, FileUp, MapPin, Pencil, UserRoundPlus, X } from "lucide-react";
import { bulkOnboardPriests, onboardPriest, reviewPriest, savePriestListing } from "@/app/actions/content";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/status-pill";
import { getPeopleData, getPoojas } from "@/lib/data";

const publicBaseUrl = "https://purohith-connect-lj21.vercel.app";

const languages = ["Kannada", "Sanskrit", "English", "Hindi", "Tamil", "Telugu", "Marathi"];

export default async function PriestsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const [{ priests }, poojas, query] = await Promise.all([getPeopleData(), getPoojas(), searchParams]);
  return <>
    <PageHeading eyebrow="Provider operations" title="Priest quality and coverage" description="Verify applications, maintain public marketplace profiles, and control the areas where each priest can be discovered."/>
    {query.error && <div className="notice error">{decodeURIComponent(query.error)}</div>}
    {query.success && <div className="notice success">{decodeURIComponent(query.success)}</div>}
    <section className="panel bulk-onboard-panel">
      <div className="bulk-onboard-copy"><span className="feature-icon"><FileUp size={19}/></span><div><p className="eyebrow">High-volume onboarding</p><h2>Import 100+ Purohits in one operation</h2><p>Upload a prepared CSV to create managed marketplace profiles without sending invitations or emails. Existing priest emails are updated instead of duplicated.</p></div></div>
      <form action={bulkOnboardPriests} className="bulk-onboard-form">
        <label>Priest roster CSV<input name="csv_file" type="file" accept=".csv,text/csv" required/><small>Up to 250 rows and 2 MB per import. Separate multiple values with a vertical bar.</small></label>
        <div className="bulk-onboard-actions"><a className="secondary-button" href="/templates/purohit-bulk-onboarding.csv" download><Download size={16}/>Download template</a><button className="primary-button"><FileUp size={16}/>Import roster</button></div>
      </form>
      <div className="bulk-onboard-facts"><span><strong>No email sent</strong>Managed profiles are created silently.</span><span><strong>Duplicate-aware</strong>Existing priest records are updated.</span><span><strong>Row-level results</strong>Valid rows continue if another row fails.</span></div>
    </section>
    <details className="create-drawer onboard-drawer">
      <summary><UserRoundPlus size={18}/><span><strong>Add one Purohit manually</strong><small>Create a managed profile directly. No invitation or email is sent.</small></span></summary>
      <form action={onboardPriest} className="editor-form onboard-form">
        <div className="form-section"><span>01</span><div><strong>Identity and access</strong><small>The console silently creates a managed priest account.</small></div></div>
        <div className="form-grid">
          <label>Full name<input name="full_name" required minLength={2} placeholder="Sri Ramachandra Bhat"/></label>
          <label>Email address<input name="email" type="email" required placeholder="purohit@example.com"/></label>
          <label>Phone number<input name="phone" inputMode="tel" placeholder="+91 98765 43210"/></label>
          <label>Years of experience<input name="years_experience" type="number" min="0" max="80" defaultValue="1" required/></label>
          <label className="span-2">Profile headline<input name="profile_headline" required placeholder="Smartha Vedic Purohit for home ceremonies"/></label>
          <label className="span-2">About the Purohit<textarea name="bio" rows={4} required placeholder="Training, tradition, ceremony experience, and the families served."/></label>
        </div>
        <div className="form-section"><span>02</span><div><strong>Coverage and services</strong><small>These fields control matching, marketplace filters, and location pages.</small></div></div>
        <div className="form-grid">
          <label>Service areas<input name="service_areas" required placeholder="Jayanagar, JP Nagar, Basavanagudi"/></label>
          <label>Primary service area<input name="primary_service_area" required placeholder="Jayanagar"/></label>
          <fieldset className="span-2 choice-field"><legend>Languages</legend><div className="choice-grid">{languages.map((language) => <label key={language}><input type="checkbox" name="languages" value={language}/><span>{language}</span></label>)}</div></fieldset>
          <fieldset className="span-2 choice-field"><legend>Puja specialties</legend><div className="choice-grid">{poojas.filter((pooja) => pooja.is_active).map((pooja) => <label key={pooja.id}><input type="checkbox" name="pooja_slugs" value={pooja.slug}/><span>{pooja.name}</span></label>)}</div></fieldset>
          <label>Starting price (INR)<input name="starting_price_inr" type="number" min="0" defaultValue="1000" required/></label>
          <label>Maximum price (INR)<input name="max_price_inr" type="number" min="0" defaultValue="5000" required/></label>
        </div>
        <div className="form-section"><span>03</span><div><strong>Marketplace presentation</strong><small>Add real portfolio media and choose whether the profile needs review.</small></div></div>
        <div className="form-grid">
          <label className="span-2">Profile photo URL<input name="photo_url" type="url" placeholder="https://.../profile.jpg"/></label>
          <label className="span-2">Portfolio image URLs, one per line<textarea name="portfolio_urls" rows={4} placeholder="https://.../ceremony-1.jpg"/></label>
          <label>Initial status<select name="verification_status" defaultValue="pending"><option value="pending">Pending review</option><option value="verified">Verified and publishable</option></select></label>
        </div>
        <div className="onboard-summary"><Check size={17}/><span><strong>One-step managed onboarding</strong><small>Creates or links the account without email, writes the public profile, adds service prices, and records the admin action.</small></span></div>
        <div className="form-actions"><button className="primary-button"><UserRoundPlus size={16}/>Create Purohit account</button></div>
      </form>
    </details>
    <div className="provider-list">{priests.map((priest) => {
      const publicReady = priest.verification_status === "verified" && priest.slug && priest.photo_url && priest.submitted_at;
      return <article className="provider-row" key={priest.id}>
        <div className="provider-avatar">{priest.photo_url ? <Image src={priest.photo_url} alt="" width={48} height={48}/> : priest.display_name?.slice(0, 2).toUpperCase()}</div>
        <div className="provider-main"><div><h2>{priest.display_name}</h2><StatusPill status={priest.verification_status}/></div><p><MapPin size={14}/>{priest.service_areas?.join(", ") || "Service area not supplied"}</p><small>{priest.pooja_slugs?.join(" · ") || "No specialties selected"}</small></div>
        <div className="provider-score"><strong>{Number(priest.rating).toFixed(1)}</strong><small>{priest.review_count} reviews</small></div>
        <div className="provider-actions">
          {publicReady && <a className="secondary-button" href={`${publicBaseUrl}/purohits/${priest.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Profile</a>}
          <details className="provider-editor"><summary className="secondary-button"><Pencil size={15}/>Edit</summary><form action={savePriestListing} className="editor-form"><input type="hidden" name="id" value={priest.id}/><div className="form-grid">
            <label>Name<input name="display_name" defaultValue={priest.display_name || ""} required/></label>
            <label>Headline<input name="profile_headline" defaultValue={priest.profile_headline || ""} placeholder="Vedic priest for home ceremonies"/></label>
            <label className="span-2">About<textarea name="bio" rows={4} defaultValue={priest.bio || ""}/></label>
            <label className="span-2">Profile photo URL<input name="photo_url" type="url" defaultValue={priest.photo_url || ""}/></label>
            <label className="span-2">Portfolio image URLs, one per line<textarea name="portfolio_urls" rows={4} defaultValue={(priest.portfolio_urls || []).join("\n")}/></label>
            <label>Service areas, comma separated<input name="service_areas" defaultValue={(priest.service_areas || []).join(", ")} placeholder="Jayanagar, Basavanagudi"/></label>
            <label>Primary service area<input name="primary_service_area" defaultValue={priest.primary_service_area || ""} placeholder="Jayanagar"/></label>
            <label>Languages, comma separated<input name="languages" defaultValue={(priest.languages || []).join(", ")} placeholder="Kannada, Sanskrit"/></label>
            <label>Puja slugs, comma separated<input name="pooja_slugs" defaultValue={(priest.pooja_slugs || []).join(", ")} placeholder="rudrabhishek, griha-pravesh"/></label>
            <label>Starting price (INR)<input name="starting_price_inr" type="number" min="0" defaultValue={priest.starting_price_inr || 0}/></label>
            <label>Maximum price (INR)<input name="max_price_inr" type="number" min="0" defaultValue={priest.max_price_inr || priest.starting_price_inr || 0}/></label>
          </div><div className="form-actions"><button className="primary-button">Save marketplace profile</button></div></form></details>
          <form action={reviewPriest}><input type="hidden" name="id" value={priest.id}/><input type="hidden" name="status" value="rejected"/><button className="secondary-button" title="Reject profile"><X size={16}/></button></form>
          <form action={reviewPriest}><input type="hidden" name="id" value={priest.id}/><input type="hidden" name="status" value="verified"/><button className="primary-button" title="Verify profile"><Check size={16}/></button></form>
        </div>
      </article>;
    })}{!priests.length && <div className="empty-state roomy">No priest profiles found.</div>}</div>
  </>;
}
