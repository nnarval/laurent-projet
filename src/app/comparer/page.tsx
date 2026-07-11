"use client";

import { useMemo, useState } from "react";
import { catalogue } from "@/lib/catalogue";
import { SelecteurProduit } from "@/components/SelecteurProduit";
import {
  comparerLigne,
  synthetiser,
  euro,
  pourcent,
  type LigneFacture,
  type Statut,
} from "@/lib/comparaison";

let compteur = 0;
function nouvelleLigne(): LigneFacture {
  compteur += 1;
  return {
    id: `l${compteur}`,
    produit: null,
    libelleSaisi: "",
    prixFacture: null,
    quantite: null,
  };
}

export default function ComparerPage() {
  const [fournisseur, setFournisseur] = useState("");
  const [lignes, setLignes] = useState<LigneFacture[]>([
    nouvelleLigne(),
    nouvelleLigne(),
    nouvelleLigne(),
  ]);

  const resultats = useMemo(
    () => lignes.map((l) => comparerLigne(l)),
    [lignes],
  );
  const synthese = useMemo(() => synthetiser(resultats), [resultats]);
  const aDesDonnees = lignes.some((l) => l.prixFacture != null);

  function majLigne(id: string, maj: Partial<LigneFacture>) {
    setLignes((prev) => prev.map((l) => (l.id === id ? { ...l, ...maj } : l)));
  }
  function supprimer(id: string) {
    setLignes((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }
  function ajouter() {
    setLignes((prev) => [...prev, nouvelleLigne()]);
  }
  function reinitialiser() {
    setLignes([nouvelleLigne(), nouvelleLigne(), nouvelleLigne()]);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Comparer une facture</h1>
      <p className="mt-1 text-slate-600">
        Choisissez le fournisseur, saisissez les lignes de la facture et laissez
        FactuVérif repérer les écarts.
      </p>

      {/* Choix fournisseur */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <label className="block text-sm font-medium text-slate-700">
          Fournisseur de la facture
        </label>
        <select
          value={fournisseur}
          onChange={(e) => setFournisseur(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 sm:w-96"
        >
          <option value="">Tous les fournisseurs</option>
          {catalogue.fournisseurs.map((f) => (
            <option key={f.nom} value={f.nom}>
              {f.nom} ({f.nb_produits})
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-slate-400">
          Filtrer par fournisseur rend la recherche de produits plus précise.
        </p>
      </div>

      {/* Saisie des lignes */}
      <div className="mt-6 space-y-3">
        <div className="hidden grid-cols-12 gap-3 px-1 text-xs font-medium uppercase tracking-wide text-slate-400 sm:grid">
          <div className="col-span-6">Produit facturé</div>
          <div className="col-span-2">Prix facturé HT</div>
          <div className="col-span-1">Qté</div>
          <div className="col-span-3 text-right">Écart</div>
        </div>

        {lignes.map((ligne) => {
          const r = comparerLigne(ligne);
          return (
            <div
              key={ligne.id}
              className="grid grid-cols-1 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-12"
            >
              <div className="sm:col-span-6">
                <SelecteurProduit
                  fournisseur={fournisseur}
                  produit={ligne.produit}
                  libelle={ligne.libelleSaisi}
                  onChange={(libelle, produit) =>
                    majLigne(ligne.id, {
                      libelleSaisi: libelle,
                      produit,
                    })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <ChampNombre
                  valeur={ligne.prixFacture}
                  onChange={(v) => majLigne(ligne.id, { prixFacture: v })}
                  placeholder="0,00"
                />
              </div>
              <div className="sm:col-span-1">
                <ChampNombre
                  valeur={ligne.quantite}
                  onChange={(v) => majLigne(ligne.id, { quantite: v })}
                  placeholder="1"
                />
              </div>
              <div className="flex items-center justify-between gap-2 sm:col-span-3 sm:justify-end">
                <BadgeEcart statut={r.statut} ecartPct={r.ecartPct} surcout={r.surcout} />
                <button
                  type="button"
                  onClick={() => supprimer(ligne.id)}
                  className="text-slate-300 transition-colors hover:text-red-500"
                  aria-label="Supprimer la ligne"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={ajouter}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          + Ajouter une ligne
        </button>
        <button
          type="button"
          onClick={reinitialiser}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          Réinitialiser
        </button>
      </div>

      {/* Synthèse */}
      {aDesDonnees && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Résultat du contrôle</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <SyntheseCarte
              valeur={euro(synthese.surcoutTotal)}
              label="Surcoût total"
              accent={synthese.surcoutTotal > 0 ? "rouge" : "neutre"}
            />
            <SyntheseCarte
              valeur={synthese.nbSurfactures.toString()}
              label="Lignes surfacturées"
              accent={synthese.nbSurfactures > 0 ? "rouge" : "neutre"}
            />
            <SyntheseCarte
              valeur={synthese.nbConformes.toString()}
              label="Lignes conformes"
              accent="vert"
            />
            <SyntheseCarte
              valeur={synthese.nbInconnus.toString()}
              label="Non rapprochées"
              accent="neutre"
            />
          </div>
          {synthese.surcoutTotal > 0 ? (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              ⚠️ Cette facture présente un surcoût de{" "}
              <strong>{euro(synthese.surcoutTotal)}</strong> par rapport à vos prix
              négociés.
            </p>
          ) : (
            <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              ✓ Aucun surcoût détecté sur les lignes rapprochées.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ChampNombre({
  valeur,
  onChange,
  placeholder,
}: {
  valeur: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={valeur ?? ""}
      onChange={(e) => {
        const brut = e.target.value.replace(",", ".").trim();
        if (brut === "") return onChange(null);
        const n = Number(brut);
        onChange(Number.isFinite(n) ? n : null);
      }}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
    />
  );
}

function BadgeEcart({
  statut,
  ecartPct,
  surcout,
}: {
  statut: Statut;
  ecartPct: number | null;
  surcout: number | null;
}) {
  if (statut === "inconnu") {
    return <span className="text-xs text-slate-300">—</span>;
  }
  if (statut === "ecart_suspect") {
    return (
      <span
        className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"
        title="Écart aberrant, probablement une différence d'unité (ex : prix au carton vs à la pièce)."
      >
        Unité à vérifier
      </span>
    );
  }
  const styles = {
    conforme: "bg-emerald-100 text-emerald-700",
    surfacture: "bg-red-100 text-red-700",
    moins_cher: "bg-sky-100 text-sky-700",
  } as const;
  const libelles = {
    conforme: "Conforme",
    surfacture: "Surfacturé",
    moins_cher: "Moins cher",
  } as const;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[statut]}`}>
      {libelles[statut]}
      {statut !== "conforme" && ecartPct != null ? ` ${pourcent(ecartPct)}` : ""}
      {statut === "surfacture" && surcout ? ` · ${euro(surcout)}` : ""}
    </span>
  );
}

function SyntheseCarte({
  valeur,
  label,
  accent,
}: {
  valeur: string;
  label: string;
  accent: "rouge" | "vert" | "neutre";
}) {
  const couleur =
    accent === "rouge"
      ? "text-red-600"
      : accent === "vert"
        ? "text-emerald-600"
        : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
      <div className={`text-2xl font-bold ${couleur}`}>{valeur}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}
