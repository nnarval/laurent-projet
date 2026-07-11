import { catalogue, normaliser, type Produit } from "./catalogue";
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

/** Index des produits par code (le code est unique dans le catalogue). */
const PAR_CODE = new Map<string, Produit>();
for (const p of catalogue.produits) {
  if (p.code) PAR_CODE.set(String(p.code).trim(), p);
}

/** Rapprochement certain par code article, si présent dans le catalogue. */
export function produitParCode(code: string | null | undefined): Produit | null {
  if (!code) return null;
  return PAR_CODE.get(String(code).trim()) ?? null;
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

/** Mots parasites à ignorer dans les libellés (unités, conditionnements, marques génériques). */
const MOTS_BRUIT = new Set([
  "kg", "g", "cl", "l", "ml", "gr", "x", "ue", "bte", "pce", "abc", "crf", "ivc", "edt",
]);

/** Vrai si le mot est du bruit (nombre, mesure, code de conditionnement). */
function estBruit(m: string): boolean {
  if (/^\d+([.,]\d+)?$/.test(m)) return true; // nombre pur
  if (/^\d*(kg|g|cl|l|ml|gr)$/.test(m)) return true; // mesure : 370g, 70cl…
  if (/^x?\d+$/.test(m)) return true; // x2, x8
  return MOTS_BRUIT.has(m);
}

/** Découpe un libellé en mots significatifs (≥3 lettres, hors bruit). */
function motsSignificatifs(texte: string): string[] {
  return normaliser(texte)
    .split(/[^a-z0-9]+/)
    .filter((m) => m.length >= 3 && !estBruit(m));
}

/** Deux mots correspondent s'ils sont identiques ou partagent un préfixe long (≥5). */
function tokenCorrespond(a: string, b: string): boolean {
  if (a === b) return true;
  const n = Math.min(a.length, b.length);
  return n >= 5 && (a.startsWith(b) || b.startsWith(a));
}

/** Score de similarité (coefficient de Dice) entre deux listes de mots. */
function scoreMots(q: string[], c: string[]): number {
  if (q.length === 0 || c.length === 0) return 0;
  const utilise = new Array(c.length).fill(false);
  let inter = 0;
  for (const x of q) {
    for (let j = 0; j < c.length; j++) {
      if (!utilise[j] && tokenCorrespond(x, c[j])) {
        inter++;
        utilise[j] = true;
        break;
      }
    }
  }
  return (2 * inter) / (q.length + c.length);
}

/** Seuil minimal de similarité pour accepter un rapprochement par nom. */
const SEUIL_NOM = 0.34;

/** Mots significatifs pré-calculés pour chaque produit du catalogue. */
const MOTS_CATALOGUE: { produit: Produit; mots: string[] }[] =
  catalogue.produits.map((p) => ({ produit: p, mots: motsSignificatifs(p.nom) }));

/**
 * Cherche le produit du catalogue qui correspond le mieux à une désignation.
 * Limité au fournisseur si connu. Renvoie null si la correspondance est trop faible.
 */
export function meilleurProduit(
  designation: string,
  fournisseur: string | null,
): Produit | null {
  const q = motsSignificatifs(designation);
  if (q.length === 0) return null;

  let meilleur: Produit | null = null;
  let meilleurScore = 0;
  for (const { produit, mots } of MOTS_CATALOGUE) {
    if (fournisseur && produit.fournisseur !== fournisseur) continue;
    const s = scoreMots(q, mots);
    if (s > meilleurScore) {
      meilleurScore = s;
      meilleur = produit;
    }
  }
  return meilleurScore >= SEUIL_NOM ? meilleur : null;
}

/** Transforme une facture lue en analyse complète (rapprochement + écarts). */
export function analyserFacture(
  fichier: string,
  facture: FactureExtraite,
): FactureAnalysee {
  const fournisseurCatalogue = detecterFournisseur(facture.fournisseur);

  const lignes: LigneFacture[] = facture.lignes.map((l, i) => ({
    id: `${fichier}-${i}`,
    // 1) rapprochement certain par code, 2) sinon rapprochement par nom
    produit:
      produitParCode(l.code) ?? meilleurProduit(l.designation, fournisseurCatalogue),
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
