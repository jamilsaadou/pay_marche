import Image from "next/image";
import { FaShieldAlt } from "react-icons/fa";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error;

  return (
    <main className="min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-center">
        <section className="glass-card w-full max-w-xl p-6 sm:p-9">
          <div className="rounded-xl bg-white/70 px-3 py-3">
            <Image src="/marchedela.png" alt="Marche de la Refondation" width={220} height={58} className="h-auto w-auto" priority />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="icon-badge">
              <FaShieldAlt />
            </span>
            <h1 className="font-serif text-3xl font-semibold text-zinc-900 sm:text-4xl">Connexion securisee</h1>
          </div>
          <p className="mt-3 text-sm text-zinc-700 sm:text-base">
            Admin et collecteurs accedent ici pour enregistrer les paiements, suivre les encaissements et attribuer les boutiques.
          </p>

          {errorMessage ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {decodeURIComponent(errorMessage)}
            </div>
          ) : null}

          <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-zinc-800">
                Email
              </label>
              <input id="email" name="email" type="email" required className="field" placeholder="admin@plateforme.com" />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-zinc-800">
                Mot de passe
              </label>
              <input id="password" name="password" type="password" required className="field" />
            </div>

            <button type="submit" className="btn btn-primary w-full">
              Se connecter
            </button>
          </form>

          <p className="mt-4 text-xs text-zinc-600">
            Tu peux creer ton premier admin via le script seed Prisma (`npm run db:seed`).
          </p>
        </section>
      </div>
    </main>
  );
}
