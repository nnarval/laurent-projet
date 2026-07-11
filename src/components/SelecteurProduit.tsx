"use client";

import { useEffect, useRef, useState } from "react";
import { rechercherProduits, type Produit } from "@/lib/catalogue";
import { euro } from "@/lib/comparaison";

interface Props {
  fournisseur: string;
  produit: Produit | null;
  libelle: string;
  onChange: (libelle: string, produit: Produit | null) => void;
}

export function SelecteurProduit({ fournisseur, produit, libelle, onChange }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [suggestions, setSuggestions] = useState<Produit[]>([]);
  const conteneur = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function clicExterne(e: MouseEvent) {
      if (conteneur.current && !conteneur.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", clicExterne);
    return () => document.removeEventListener("mousedown", clicExterne);
  }, []);

  function saisir(valeur: string) {
    onChange(valeur, null); // dès qu'on retape, on annule le rapprochement précédent
    setSuggestions(rechercherProduits(valeur, fournisseur || undefined, 8));
    setOuvert(true);
  }

  function choisir(p: Produit) {
    onChange(p.nom, p);
    setOuvert(false);
  }

  return (
    <div ref={conteneur} className="relative">
      <input
        type="text"
        value={libelle}
        onChange={(e) => saisir(e.target.value)}
        onFocus={() => {
          setSuggestions(rechercherProduits(libelle, fournisseur || undefined, 8));
          setOuvert(true);
        }}
        placeholder="Nom du produit sur la facture…"
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 ${
          produit
            ? "border-emerald-400 bg-emerald-50/40"
            : "border-slate-300 bg-white focus:border-emerald-500"
        }`}
      />
      {produit && (
        <div className="mt-1 text-xs text-emerald-700">
          ✓ Rapproché · réf. {euro(produit.prix_ht)}
          {produit.unite_prix ? ` /${produit.unite_prix}` : ""}
        </div>
      )}
      {ouvert && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {suggestions.map((p, i) => (
            <li key={(p.code ?? "") + i}>
              <button
                type="button"
                onClick={() => choisir(p)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-emerald-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">
                    {p.nom}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {p.fournisseur}
                    {p.conditionnement ? ` · ${p.conditionnement}` : ""}
                  </span>
                </span>
                <span className="whitespace-nowrap font-semibold text-slate-700">
                  {euro(p.prix_ht)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
