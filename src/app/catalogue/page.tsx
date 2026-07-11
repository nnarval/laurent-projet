"use client";

import { useMemo, useState } from "react";
import { catalogue, rechercherProduits } from "@/lib/catalogue";
import { euro } from "@/lib/comparaison";

export default function CataloguePage() {
  const [terme, setTerme] = useState("");
  const [fournisseur, setFournisseur] = useState("");

  const produits = useMemo(() => {
    if (!terme && !fournisseur) return catalogue.produits.slice(0, 60);
    return rechercherProduits(terme, fournisseur || undefined, 200);
  }, [terme, fournisseur]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Catalogue de référence</h1>
      <p className="mt-1 text-slate-600">
        {catalogue.nb_produits} produits issus de votre fichier commande.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={terme}
          onChange={(e) => setTerme(e.target.value)}
          placeholder="Rechercher un produit ou un code…"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <select
          value={fournisseur}
          onChange={(e) => setFournisseur(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
        >
          <option value="">Tous les fournisseurs</option>
          {catalogue.fournisseurs.map((f) => (
            <option key={f.nom} value={f.nom}>
              {f.nom} ({f.nb_produits})
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium">Fournisseur</th>
              <th className="px-4 py-3 font-medium">Conditionnement</th>
              <th className="px-4 py-3 text-right font-medium">Prix négocié HT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {produits.map((p, i) => (
              <tr key={(p.code ?? "") + i} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{p.nom}</div>
                  {p.code && (
                    <div className="text-xs text-slate-400">Code {p.code}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.fournisseur}</td>
                <td className="px-4 py-3 text-slate-600">
                  {p.conditionnement ?? "—"}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {euro(p.prix_ht)}
                  {p.unite_prix && (
                    <span className="ml-1 text-xs font-normal text-slate-400">
                      /{p.unite_prix}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {produits.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Aucun produit trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
