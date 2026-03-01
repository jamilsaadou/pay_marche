import Image from "next/image";
import { FaArrowRightFromBracket } from "react-icons/fa6";

import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { SecuredNav, type LinkConfig } from "@/components/secured-nav";

const links: (LinkConfig & { roles: UserRole[] })[] = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: "dashboard",
    roles: [UserRole.ADMIN, UserRole.COLLECTOR],
  },
  {
    href: "/collecte",
    label: "Collecte",
    icon: "collecte",
    roles: [UserRole.ADMIN, UserRole.COLLECTOR],
  },
  {
    href: "/paiements",
    label: "Paiements",
    icon: "paiements",
    roles: [UserRole.ADMIN, UserRole.COLLECTOR],
  },
  {
    href: "/exposants",
    label: "Exposants",
    icon: "exposants",
    roles: [UserRole.ADMIN],
  },
  {
    href: "/utilisateurs",
    label: "Utilisateurs",
    icon: "utilisateurs",
    roles: [UserRole.ADMIN],
  },
  {
    href: "/boutiques",
    label: "Boutiques",
    icon: "boutiques",
    roles: [UserRole.ADMIN],
  },
  {
    href: "/parametres",
    label: "Parametres",
    icon: "parametres",
    roles: [UserRole.ADMIN],
  },
  {
    href: "/logs",
    label: "Logs",
    icon: "logs",
    roles: [UserRole.ADMIN],
  },
];

export default async function SecuredLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();
  const availableLinks = links.filter((link) => link.roles.includes(user.role));

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:flex-row">
        <aside className="glass-card stagger-item w-full p-5 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-[19rem]">
          <div className="rounded-xl bg-white/70 px-3 py-3">
            <Image src="/marchedela.png" alt="Marche de la Refondation" width={220} height={58} className="h-auto w-auto" priority />
          </div>

          <div className="mt-4 rounded-xl bg-gradient-to-r from-primary-500/90 to-accent-500/90 px-4 py-3 text-white shadow-lg">
            <p className="text-xs uppercase tracking-[0.18em]">Espace</p>
            <h2 className="mt-1 text-lg font-semibold">{user.role === UserRole.ADMIN ? "Administration" : "Collecteur"}</h2>
            <p className="text-sm text-white/90">{user.fullName}</p>
          </div>

          <SecuredNav links={availableLinks} />

          <form action="/api/auth/logout" method="post" className="mt-8">
            <button type="submit" className="btn btn-secondary flex w-full items-center justify-center gap-2">
              <FaArrowRightFromBracket className="text-sm" />
              <span>Se deconnecter</span>
            </button>
          </form>
        </aside>

        <main className="flex-1 space-y-4">{children}</main>
      </div>
    </div>
  );
}
