import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/status-pill";
import { getPeopleData } from "@/lib/data";

export default async function UsersPage() {
  const { users } = await getPeopleData();
  return <><PageHeading eyebrow="Identity and access" title="Customers and operators" description="Review account status and roles. Privileged role changes should be performed through an audited administration workflow."/><div className="table-panel"><div className="table-toolbar"><strong>{users.length} recent accounts</strong><span>Latest 100</span></div><div className="data-table"><div className="table-row people-table table-head"><span>Account</span><span>Role</span><span>Phone</span><span>Status</span><span>Joined</span></div>{users.map((user) => <div className="table-row people-table" key={user.id}><span><strong>{user.full_name || "Unnamed account"}</strong><small>{user.email || user.id}</small></span><span>{user.role.replaceAll("_", " ")}</span><span>{user.phone || "Not provided"}</span><span><StatusPill status={user.is_active ? "active" : "inactive"}/></span><span>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(user.created_at))}</span></div>)}</div></div></>;
}

