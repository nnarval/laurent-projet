import type { Produit } from "./catalogue";

export type Statut =
  | "conforme"
  | "surfacture"
  | "moins_cher"
  | "ecart_suspect"
  | "inconnu";

/** Une ligne saisie depuis la facture du fournisseur. */
export interface LigneFacture {
  id: string;
  produit: Produit | null; // produit du catalogue rapproché (ou null si non trouvé)
  libelleSaisi: string; // ce qui est écrit sur la facture
  prixFacture: number | null; // prix unitaire HT facturé
  quantite: number | null; // quantité facturée (défaut 1)
}

/** Résultat de la comparaison d'une ligne. */
export interface ResultatLigne {
  id: string;
  libelle: string;
  fournisseur: string | null;
  prixReference: number | null;
  prixFacture: number | null;
  unitePrix: string | null;
  quantite: number;
  ecartUnitaire: number | null; // prixFacture - prixReference
  ecartPct: number | null;
  surcout: number | null; // ecartUnitaire * quantite (positif = trop payé)
  statut: Statut;
}

/** Tolérance par défaut : 1 % pour absorber les arrondis. */
export const TOLERANCE_DEFAUT = 0.01;

/**
 * Au-delà de ce rapport entre prix facturé et prix de référence, l'écart est
 * jugé aberrant (presque toujours une différence d'unité : prix au carton vs à
 * la pièce). On ne le compte alors pas comme une vraie surfacturation.
 */
export const SEUIL_RATIO = 4;

export function comparerLigne(
  ligne: LigneFacture,
  tolerance = TOLERANCE_DEFAUT,
): ResultatLigne {
  const quantite = ligne.quantite && ligne.quantite > 0 ? ligne.quantite : 1;
  const prixReference = ligne.produit?.prix_ht ?? null;
  const prixFacture = ligne.prixFacture;
  const libelle = ligne.produit?.nom ?? ligne.libelleSaisi ?? "—";

  const base: ResultatLigne = {
    id: ligne.id,
    libelle,
    fournisseur: ligne.produit?.fournisseur ?? null,
    prixReference,
    prixFacture,
    unitePrix: ligne.produit?.unite_prix ?? null,
    quantite,
    ecartUnitaire: null,
    ecartPct: null,
    surcout: null,
    statut: "inconnu",
  };

  if (prixReference == null || prixFacture == null) {
    return base;
  }

  const ecartUnitaire = arrondi(prixFacture - prixReference);
  const ecartPct = prixReference !== 0 ? ecartUnitaire / prixReference : null;
  const surcout = arrondi(ecartUnitaire * quantite);
  const ratio = prixReference > 0 ? prixFacture / prixReference : null;

  let statut: Statut;
  if (ratio != null && (ratio > SEUIL_RATIO || ratio < 1 / SEUIL_RATIO)) {
    // écart aberrant : très probablement une différence d'unité, pas une vraie dérive
    statut = "ecart_suspect";
  } else if (ecartPct != null && Math.abs(ecartPct) <= tolerance) {
    statut = "conforme";
  } else if (ecartUnitaire > 0) {
    statut = "surfacture";
  } else {
    statut = "moins_cher";
  }

  return { ...base, ecartUnitaire, ecartPct, surcout, statut };
}

/** Synthèse globale d'un ensemble de résultats. */
export interface Synthese {
  nbLignes: number;
  nbConformes: number;
  nbSurfactures: number;
  nbMoinsChers: number;
  nbSuspects: number; // écarts aberrants (différence d'unité probable)
  nbInconnus: number;
  surcoutTotal: number; // somme des surcoûts positifs (ce que le resto paie en trop)
  economieTotale: number; // somme des écarts négatifs (en valeur absolue)
}

export function synthetiser(resultats: ResultatLigne[]): Synthese {
  const s: Synthese = {
    nbLignes: resultats.length,
    nbConformes: 0,
    nbSurfactures: 0,
    nbMoinsChers: 0,
    nbSuspects: 0,
    nbInconnus: 0,
    surcoutTotal: 0,
    economieTotale: 0,
  };
  for (const r of resultats) {
    switch (r.statut) {
      case "conforme":
        s.nbConformes++;
        break;
      case "surfacture":
        s.nbSurfactures++;
        if (r.surcout && r.surcout > 0) s.surcoutTotal += r.surcout;
        break;
      case "moins_cher":
        s.nbMoinsChers++;
        if (r.surcout && r.surcout < 0) s.economieTotale += Math.abs(r.surcout);
        break;
      case "ecart_suspect":
        s.nbSuspects++;
        break;
      default:
        s.nbInconnus++;
    }
  }
  s.surcoutTotal = arrondi(s.surcoutTotal);
  s.economieTotale = arrondi(s.economieTotale);
  return s;
}

/** Formatage euro. */
export function euro(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

/** Formatage pourcentage signé. */
export function pourcent(n: number | null): string {
  if (n == null) return "—";
  const signe = n > 0 ? "+" : "";
  return signe + (n * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " %";
}

function arrondi(n: number): number {
  return Math.round(n * 100) / 100;
}
