import {
  catalogue,
  normaliser,
  produitsDuFournisseur,
  type Produit,
} from "./catalogue";
import {
  comparerLigne,
  synthetiser,
  type LigneFacture,
  type ResultatLigne,
  type Synthese,
} from "./comparaison";
import type { FactureExtraite } from "./extraction";

/** Résultat complet de l'analyse d'une facture. */
export interface FactureAnalysee {
  fichier: string;
  fournisseur: string | null; // nom lu sur la facture
  fournisseurCatalogue: string | null; // fournisseur rapproché du catalogue
  numero: string | null;
  date: string | null;
  resultats: ResultatLigne[];
  synthese: Synthese;
}

/** Tente de rattacher le nom lu sur la facture à un fournisseur du catalogue. */
export function detecterFournisseur(nom: string | null): string | null {
  if (!nom) return null;
  const n = normaliser(nom);
  let meilleur: string | null = null;
  let meilleureLongueur = 0;
  for (const f of catalogue.fournisseurs) {
    const fn = normaliser(f.nom);
    if (!fn) continue;
    if (n.includes(fn) || fn.includes(n)) {
      // on garde la correspondance la plus longue (la plus spécifique)
      if (fn.length > meilleureLongueur) {
        meilleureLongueur = fn.length;
        meilleur = f.nom;
      }
    }
  }
  return meilleur;
}

/**
 * Cherche le produit du catalogue qui correspond le mieux à une désignation.
 * Limité au fournisseur si connu. Renvoie null si la correspondance est trop faible.
 */
export function meilleurProduit(
  designation: string,
  fournisseur: string | null,
): Produit | null {
  const base = fournisseur
    ? produitsDuFournisseur(fournisseur)
    : catalogue.produits;
  const mots = normaliser(designation)
    .split(/\s+/)
    .filter((m) => m.length > 2);
  if (mots.length === 0) return null;

  let meilleur: Produit | null = null;
  let meilleurScore = 0;
  for (const p of base) {
    const cible = p.nom_recherche;
    let score = 0;
    for (const m of mots) {
      if (cible.includes(m)) score++;
    }
    const ratio = score / mots.length;
    if (ratio > meilleurScore) {
      meilleurScore = ratio;
      meilleur = p;
    }
  }
  // au moins la moitié des mots significatifs doivent correspondre
  return meilleurScore >= 0.5 ? meilleur : null;
}

/** Transforme une facture lue en analyse complète (rapprochement + écarts). */
export function analyserFacture(
  fichier: string,
  facture: FactureExtraite,
): FactureAnalysee {
  const fournisseurCatalogue = detecterFournisseur(facture.fournisseur);

  const lignes: LigneFacture[] = facture.lignes.map((l, i) => ({
    id: `${fichier}-${i}`,
    produit: meilleurProduit(l.designation, fournisseurCatalogue),
    libelleSaisi: l.designation,
    prixFacture: l.prix_unitaire_ht,
    quantite: l.quantite,
  }));

  const resultats = lignes.map((l) => comparerLigne(l));
  const synthese = synthetiser(resultats);

  return {
    fichier,
    fournisseur: facture.fournisseur,
    fournisseurCatalogue,
    numero: facture.numero_facture,
    date: facture.date,
    resultats,
    synthese,
  };
}
