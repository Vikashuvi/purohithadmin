import { CheckCircle2, Download, ReceiptText, ShieldAlert } from "lucide-react";
import { verifyPaymentSubmission } from "@/app/actions/content";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/status-pill";
import { getPaymentReviewData } from "@/lib/data";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [payments, query] = await Promise.all([getPaymentReviewData(), searchParams]);
  const pending = payments.filter((payment) => !["admin_verified", "released"].includes(payment.status)).length;

  return <>
    <PageHeading
      eyebrow="Finance operations"
      title="Payment review"
      description="Review UPI screenshots, AI confidence, generated invoices, and release verified ceremony requests to matching priests."
    />
    {query.error && <div className="notice error">{decodeURIComponent(query.error)}</div>}
    <section className="kpi-grid">
      <div className="kpi"><ReceiptText/><span><small>Total submissions</small><strong>{payments.length}</strong><em>UPI proof records</em></span></div>
      <div className="kpi"><ShieldAlert/><span><small>Needs review</small><strong>{pending}</strong><em>Admin decision pending</em></span></div>
      <div className="kpi"><CheckCircle2/><span><small>AI verified</small><strong>{payments.filter((payment) => payment.ai_verified).length}</strong><em>Still requires admin check</em></span></div>
      <div className="kpi"><ReceiptText/><span><small>Total value</small><strong>{formatMoney(payments.reduce((sum, payment) => sum + Number(payment.amount_inr || 0), 0))}</strong><em>Submitted amount</em></span></div>
    </section>
    <div className="table-panel">
      <div className="table-toolbar"><strong>{payments.length} payment submissions</strong><span>AI review is assistive; admin confirmation releases provider notifications.</span></div>
      <div className="data-table">
        <div className="table-row payments-table table-head"><span>Submission</span><span>Amount</span><span>AI confidence</span><span>Invoice</span><span>Action</span></div>
        {payments.map((payment) => {
          const ceremony = Array.isArray(payment.ceremony_requests) ? payment.ceremony_requests[0] : payment.ceremony_requests;
          const booking = Array.isArray(payment.bookings) ? payment.bookings[0] : payment.bookings;
          const address = ceremony?.address || booking?.address || "Address not supplied";
          const when = ceremony?.ceremony_date || booking?.booking_date || payment.created_at;
          const time = ceremony?.ceremony_time || booking?.booking_time || "";
          return <div className="table-row payments-table" key={payment.id}>
            <span><strong>{payment.pooja_name || payment.pooja_slug || "Ceremony payment"}</strong><small>{address}</small><small>{formatDate(`${when} ${time}`.trim())}</small><StatusPill status={payment.status}/></span>
            <span><strong>{formatMoney(payment.amount_inr)}</strong><small>{payment.upi_id}</small></span>
            <span><strong>{Math.round(Number(payment.ai_confidence || 0) * 100)}%</strong><small>{payment.ai_summary || "No AI summary"}</small></span>
            <span><strong>{payment.invoice_number || "Pending"}</strong><small>{formatDate(payment.created_at)}</small></span>
            <span className="payment-actions">
              {payment.invoice_number && <a className="secondary-button" href={`/api/invoices/${payment.id}`}><Download size={15}/>Invoice</a>}
              {payment.status === "admin_verified" ? <span className="status status-verified">Released</span> : <form action={verifyPaymentSubmission}><input type="hidden" name="id" value={payment.id}/><button className="primary-button"><CheckCircle2 size={15}/>Verify</button></form>}
            </span>
          </div>;
        })}
        {!payments.length && <div className="empty-state roomy">No UPI payment submissions yet.</div>}
      </div>
    </div>
  </>;
}
