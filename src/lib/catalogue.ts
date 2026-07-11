import catalogueData from "@/data/catalogue.json";

export interface Produit {
  code: string | null;
  nom: string;
  nom_recherche: string;
  conditionnement: string | null;
  prix_ht: number | null;
  unite_prix: string | null;
  fournisseur: string;
  emplacement: string | null;
  unite_base: string | null;
  prix_par_unite: number | null;
}

export interface Fournisseur {
  nom: string;
  nb_produits: number;
}

export interface Catalogue {
  source: string;
  nb_produits: number;
  fournisseurs: Fournisseur[];
  produits: Produit[];
}

export const catalogue = catalogueData as Catalogue;

/** Retire les accents et met en minuscules pour la recherche. */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Liste des fournisseurs triés par nombre de produits décroissant. */
export function listeFournisseurs(): Fournisseur[] {
  return catalogue.fournisseurs;
}

/** Produits d'un fournisseur donné. */
export function produitsDuFournisseur(fournisseur: string): Produit[] {
  return catalogue.produits.filter((p) => p.fournisseur === fournisseur);
}

/**
 * Recherche de produits par nom (et code), éventuellement limitée à un fournisseur.
 * Renvoie au plus `limite` résultats.
 */
export function rechercherProduits(
  terme: string,
  fournisseur?: string,
  limite = 12,
): Produit[] {
  const t = normaliser(terme);
  let base = catalogue.produits;
  if (fournisseur) {
    base = base.filter((p) => p.fournisseur === fournisseur);
  }
  if (!t) {
    return base.slice(0, limite);
  }
  const mots = t.split(/\s+/).filter(Boolean);
  const resultats = base.filter((p) => {
    const cible = p.nom_recherche + " " + (p.code ?? "").toLowerCase();
    return mots.every((m) => cible.includes(m));
  });
  return resultats.slice(0, limite);
}
