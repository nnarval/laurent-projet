"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { euro, pourcent, type ResultatLigne, type Statut as StatutLigne } from "@/lib/comparaison";
import type { FactureAnalysee } from "@/lib/rapprochement";

type EtatFichier = "attente" | "encours" | "ok" | "erreur";

interface Item {
  id: string;
  nom: string;
  file: File;
  etat: EtatFichier;
  analyse?: FactureAnalysee;
  erreur?: string;
  ouvert?: boolean;
}

const CONCURRENCE = 3;

let compteur = 0;

export default function AnalyserPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [enCours, setEnCours] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const majItem = useCallback((id: string, maj: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...maj } : it)));
  }, []);

  const traiterFichiers = useCallback(
    async (nouveaux: Item[]) => {
      setEnCours(true);
      const file = [...nouveaux];
      async function worker() {
        while (file.length > 0) {
          const it = file.shift();
          if (!it) break;
          majItem(it.id, { etat: "encours" });
          try {
            const fd = new FormData();
            fd.append("fichier", it.file);
            const rep = await fetch("/api/analyser", { method: "POST", body: fd });
            const data = await rep.json();
            if (!rep.ok) {
              majItem(it.id, { etat: "erreur", erreur: data.error || "Erreur inconnue" });
            } else {
              majItem(it.id, { etat: "ok", analyse: data as FactureAnalysee });
            }
          } catch (e) {
            majItem(it.id, {
              etat: "erreur",
              erreur: e instanceof Error ? e.message : "Erreur réseau",
            });
          }
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCE, nouveaux.length) }, worker),
      );
      setEnCours(false);
    },
    [majItem],
  );

  function ajouterFichiers(liste: FileList | null) {
    if (!liste) return;
    const pdfs = Array.from(liste).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (pdfs.length === 0) return;
    const nouveaux: Item[] = pdfs.map((file) => {
      compteur += 1;
      return { id: `f${compteur}`, nom: file.name, file, etat: "attente" as EtatFichier };
    });
    setItems((prev) => [...prev, ...nouveaux]);
    void traiterFichiers(nouveaux);
  }

  function reinitialiser() {
    setItems([]);
  }

  // Synthèse consolidée sur toutes les factures analysées
  const global = useMemo(() => {
    const ok = items.filter((it) => it.etat === "ok" && it.analyse);
    let surcoutTotal = 0;
    let lignesSurfacturees = 0;
    let lignesTotal = 0;
    for (const it of ok) {
      surcoutTotal += it.analyse!.synthese.surcoutTotal;
      lignesSurfacturees += it.analyse!.synthese.nbSurfactures;
      lignesTotal += it.analyse!.synthese.nbLignes;
    }
    return {
      nbFactures: ok.length,
      surcoutTotal: Math.round(surcoutTotal * 100) / 100,
      lignesSurfacturees,
      lignesTotal,
    };
  }, [items]);

  const termine = items.length > 0 && items.every((it) => it.etat === "ok" || it.etat === "erreur");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Analyser des factures</h1>
      <p className="mt-1 text-slate-600">
        Déposez plusieurs factures PDF d&apos;un coup. FactuVérif les lit et repère
        les écarts avec vos prix négociés.
      </p>

      {/* Zone de dépôt */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          ajouterFichiers(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className="mt-6 cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/30"
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            ajouterFichiers(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="text-4xl">📄</div>
        <p className="mt-2 font-medium text-slate-700">
          Glissez vos factures PDF ici, ou cliquez pour les choisir
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Vous pouvez en déposer plusieurs à la fois.
        </p>
      </div>

      {/* Synthèse consolidée */}
      {global.nbFactures > 0 && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Bilan global {enCours && <span className="text-sm font-normal text-slate-400">· analyse en cours…</span>}
            </h2>
            {termine && (
              <button
                onClick={reinitialiser}
                className="text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                Vider
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <Carte valeur={euro(global.surcoutTotal)} label="Surcoût total détecté" accent={global.surcoutTotal > 0 ? "rouge" : "vert"} />
            <Carte valeur={global.nbFactures.toString()} label="Factures analysées" accent="neutre" />
            <Carte valeur={global.lignesSurfacturees.toString()} label="Lignes surfacturées" accent={global.lignesSurfacturees > 0 ? "rouge" : "neutre"} />
            <Carte valeur={global.lignesTotal.toString()} label="Lignes contrôlées" accent="neutre" />
          </div>
          {global.surcoutTotal > 0 && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              ⚠️ Sur l&apos;ensemble des factures, vous payez{" "}
              <strong>{euro(global.surcoutTotal)}</strong> de plus que vos prix
              négociés.
            </p>
          )}
        </div>
      )}

      {/* Liste des fichiers */}
      {items.length > 0 && (
        <div className="mt-6 space-y-3">
          {items.map((it) => (
            <FichierCarte key={it.id} item={it} onToggle={() => majItem(it.id, { ouvert: !it.ouvert })} />
          ))}
        </div>
      )}
    </div>
  );
}

function FichierCarte({ item, onToggle }: { item: Item; onToggle: () => void }) {
  const a = item.analyse;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        onClick={onToggle}
        disabled={item.etat !== "ok"}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Pastille etat={item.etat} />
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-800">{item.nom}</div>
            {a && (
              <div className="truncate text-xs text-slate-400">
                {a.fournisseurCatalogue ?? a.fournisseur ?? "Fournisseur inconnu"}
                {a.numero ? ` · facture ${a.numero}` : ""} · {a.synthese.nbLignes} lignes
              </div>
            )}
            {item.etat === "erreur" && (
              <div className="truncate text-xs text-red-500">{item.erreur}</div>
            )}
            {item.etat === "encours" && (
              <div className="text-xs text-slate-400">Lecture en cours…</div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {a && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                a.synthese.surcoutTotal > 0
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {a.synthese.surcoutTotal > 0
                ? `+${euro(a.synthese.surcoutTotal)}`
                : "Conforme"}
            </span>
          )}
          {item.etat === "ok" && (
            <span className="text-slate-300">{item.ouvert ? "▲" : "▼"}</span>
          )}
        </div>
      </button>

      {item.ouvert && a && (
        <div className="border-t border-slate-100 px-4 py-3">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-2 font-medium">Produit facturé</th>
                <th className="py-2 text-right font-medium">Facturé</th>
                <th className="py-2 text-right font-medium">Référence</th>
                <th className="py-2 text-right font-medium">Écart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {a.resultats.map((r) => (
                <LigneResultat key={r.id} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LigneResultat({ r }: { r: ResultatLigne }) {
  return (
    <tr>
      <td className="py-2 pr-2">
        <div className="text-slate-800">{r.libelle}</div>
      </td>
      <td className="py-2 text-right text-slate-700">{euro(r.prixFacture)}</td>
      <td className="py-2 text-right text-slate-500">{euro(r.prixReference)}</td>
      <td className="py-2 text-right">
        <BadgeEcart statut={r.statut} ecartPct={r.ecartPct} surcout={r.surcout} />
      </td>
    </tr>
  );
}

function BadgeEcart({
  statut,
  ecartPct,
  surcout,
}: {
  statut: StatutLigne;
  ecartPct: number | null;
  surcout: number | null;
}) {
  if (statut === "inconnu") {
    return <span className="text-xs text-slate-300">non rapproché</span>;
  }
  if (statut === "ecart_suspect") {
    return (
      <span className="text-xs text-amber-600" title="Écart aberrant, probablement une différence d'unité (ex : prix au carton vs à la pièce).">
        unité à vérifier
      </span>
    );
  }
  const styles = {
    conforme: "text-emerald-600",
    surfacture: "text-red-600 font-semibold",
    moins_cher: "text-sky-600",
  } as const;
  if (statut === "conforme")
    return <span className={`text-xs ${styles.conforme}`}>✓ conforme</span>;
  return (
    <span className={`text-xs ${styles[statut]}`}>
      {pourcent(ecartPct)}
      {statut === "surfacture" && surcout ? ` · ${euro(surcout)}` : ""}
    </span>
  );
}

function Pastille({ etat }: { etat: EtatFichier }) {
  const map: Record<EtatFichier, string> = {
    attente: "bg-slate-300",
    encours: "bg-amber-400 animate-pulse",
    ok: "bg-emerald-500",
    erreur: "bg-red-500",
  };
  return <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${map[etat]}`} />;
}

function Carte({
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
