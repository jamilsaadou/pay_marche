"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaCashRegister, FaChartPie, FaClipboardList, FaCog, FaFileInvoiceDollar, FaStore, FaUserTie, FaUsers } from "react-icons/fa";

export type LinkConfig = {
  href: string;
  label: string;
  icon: "dashboard" | "collecte" | "paiements" | "exposants" | "utilisateurs" | "boutiques" | "parametres" | "logs";
};

type SecuredNavProps = {
  links: LinkConfig[];
};

const iconMap = {
  dashboard: FaChartPie,
  collecte: FaCashRegister,
  paiements: FaFileInvoiceDollar,
  exposants: FaUsers,
  utilisateurs: FaUserTie,
  boutiques: FaStore,
  parametres: FaCog,
  logs: FaClipboardList,
} as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SecuredNav({ links }: SecuredNavProps) {
  const pathname = usePathname();

  return (
    <nav className="mt-5 space-y-2">
      {links.map((link) => {
        const Icon = iconMap[link.icon];
        const active = isActive(pathname, link.href);

        return (
          <Link key={link.href} href={link.href} className={`nav-chip ${active ? "nav-chip-active" : ""}`}>
            <Icon className="text-sm" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
