import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
            F
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Factu<span className="text-emerald-600">Vérif</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <NavLink href="/comparer">Comparer une facture</NavLink>
          <NavLink href="/catalogue">Catalogue</NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}
