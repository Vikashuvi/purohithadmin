"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpenText, CalendarDays, CreditCard, FileText, Gauge, Languages, Search, Settings, ShieldCheck, UsersRound } from "lucide-react";

const sections = [
  { label: "Operate", items: [
    { href: "/", label: "Overview", icon: Gauge },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/users", label: "Customers", icon: UsersRound },
    { href: "/priests", label: "Priests", icon: ShieldCheck },
    { href: "/payments", label: "Payments", icon: CreditCard },
  ]},
  { label: "Publish", items: [
    { href: "/content/poojas", label: "Puja catalog", icon: CalendarDays },
    { href: "/content/pages", label: "Content", icon: FileText },
    { href: "/seo", label: "Search growth", icon: Search },
    { href: "/settings", label: "Configuration", icon: Settings },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark">PC</span><span><strong>Purohith Connect</strong><small>Command center</small></span></div>
    <nav className="nav-groups">
      {sections.map((section) => <div key={section.label} className="nav-group"><p>{section.label}</p>{section.items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === href : pathname.startsWith(href);
        return <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`}><Icon size={18}/><span>{label}</span></Link>;
      })}</div>)}
    </nav>
    <div className="sidebar-foot"><BookOpenText size={17}/><span>Production workspace</span><Languages size={16}/></div>
  </aside>;
}
