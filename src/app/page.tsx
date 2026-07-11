import Link from "next/link";
import { catalogue } from "@/lib/catalogue";

export default function Home() {
  const nbProduits = catalogue.nb_produits;
  const nbFournisseurs = catalogue.fournisseurs.length;
  const topFournisseurs = catalogue.fournisseurs.slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <section className="text-center">
        <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Lecture automatique des factures PDF
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Vos fournisseurs vous facturent-ils
          <br />
          <span className="text-emerald-600">au bon prix&nbsp;?</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          FactuVérif compare chaque ligne de vos factures avec les prix négociés
          de votre fichier commande, et vous montre exactement où vous payez trop
          cher.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/analyser"
            className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-600 px-7 text-base font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Analyser des factures
          </Link>
          <Link
            href="/catalogue"
            className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-7 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Voir le catalogue
          </Link>
        </div>
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        <Stat valeur={nbProduits.toString()} label="produits de référence" />
        <Stat valeur={nbFournisseurs.toString()} label="fournisseurs" />
        <Stat valeur="HT" label="prix négociés suivis" />
      </section>

      <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Principaux fournisseurs
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {topFournisseurs.map((f) => (
            <span
              key={f.nom}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
            >
              {f.nom}
              <span className="ml-1.5 text-slate-400">{f.nb_produits}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <Etape
          num="1"
          titre="Déposez vos factures PDF"
          texte="Glissez plusieurs factures d'un coup — l'IA les lit automatiquement, ligne par ligne."
        />
        <Etape
          num="2"
          titre="Rapprochement automatique"
          texte="Chaque produit est comparé à votre prix négocié, sans aucune saisie manuelle."
        />
        <Etape
          num="3"
          titre="Bilan consolidé"
          texte="Un rapport global met en évidence les surfacturations et le surcoût total en euros."
        />
      </section>

      <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-slate-400">
        Fruits &amp; légumes&nbsp;: prochaine étape, la comparaison à la mercuriale
        hebdomadaire de vos fournisseurs.
      </p>
    </div>
  );
}

function Stat({ valeur, label }: { valeur: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <div className="text-3xl font-bold text-emerald-600">{valeur}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

function Etape({ num, titre, texte }: { num: string; titre: string; texte: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
        {num}
      </div>
      <h3 className="mt-3 font-semibold text-slate-900">{titre}</h3>
      <p className="mt-1 text-sm text-slate-600">{texte}</p>
    </div>
  );
}
