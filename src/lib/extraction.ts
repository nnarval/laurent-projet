import Anthropic from "@anthropic-ai/sdk";

/** Une ligne telle que lue sur la facture PDF. */
export interface LigneExtraite {
  designation: string;
  quantite: number | null;
  unite: string | null;
  prix_unitaire_ht: number | null;
  montant_ht: number | null;
}

/** Facture lue depuis un PDF. */
export interface FactureExtraite {
  fournisseur: string | null;
  numero_facture: string | null;
  date: string | null;
  lignes: LigneExtraite[];
}

/** Modèle utilisé pour la lecture (configurable via variable d'environnement). */
const MODELE = process.env.MODELE_EXTRACTION || "claude-opus-4-8";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    fournisseur: { anyOf: [{ type: "string" }, { type: "null" }] },
    numero_facture: { anyOf: [{ type: "string" }, { type: "null" }] },
    date: { anyOf: [{ type: "string" }, { type: "null" }] },
    lignes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          designation: { type: "string" },
          quantite: { anyOf: [{ type: "number" }, { type: "null" }] },
          unite: { anyOf: [{ type: "string" }, { type: "null" }] },
          prix_unitaire_ht: { anyOf: [{ type: "number" }, { type: "null" }] },
          montant_ht: { anyOf: [{ type: "number" }, { type: "null" }] },
        },
        required: [
          "designation",
          "quantite",
          "unite",
          "prix_unitaire_ht",
          "montant_ht",
        ],
      },
    },
  },
  required: ["fournisseur", "numero_facture", "date", "lignes"],
} as const;

const INSTRUCTIONS = `Tu es un assistant qui lit des factures de fournisseurs de restaurant (souvent des PDF scannés).
Extrait TOUTES les lignes de produits de cette facture.

Pour chaque ligne produit, renvoie :
- designation : le libellé du produit exactement comme écrit sur la facture
- quantite : la quantité facturée (nombre), ou null
- unite : l'unité (kg, L, pièce, carton, colis...), ou null
- prix_unitaire_ht : le prix unitaire HORS TAXES (nombre à virgule, ex 3.20), ou null
- montant_ht : le montant total HT de la ligne, ou null

Renvoie aussi : fournisseur (nom), numero_facture, date.

Règles importantes :
- N'inclus PAS les lignes de total, sous-total, TVA, acompte, frais de port, ou en-têtes.
- Les prix sont en euros ; utilise le point comme séparateur décimal.
- Si une valeur est illisible ou absente, mets null (n'invente jamais un chiffre).`;

/**
 * Lit un PDF de facture (encodé en base64) et renvoie les lignes structurées.
 * Nécessite la variable d'environnement ANTHROPIC_API_KEY.
 */
export async function extraireFacturePDF(
  base64: string,
): Promise<FactureExtraite> {
  const client = new Anthropic(); // lit ANTHROPIC_API_KEY dans l'environnement

  const response = await client.messages.create({
    model: MODELE,
    max_tokens: 8000,
    output_config: {
      format: { type: "json_schema", schema: SCHEMA },
      effort: "low",
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          { type: "text", text: INSTRUCTIONS },
        ],
      },
    ],
  } as Anthropic.MessageCreateParamsNonStreaming);

  const bloc = response.content.find((b) => b.type === "text");
  if (!bloc || bloc.type !== "text") {
    throw new Error("La lecture n'a renvoyé aucun texte.");
  }
  return JSON.parse(bloc.text) as FactureExtraite;
}
