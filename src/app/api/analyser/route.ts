import { NextResponse } from "next/server";
import { extraireFacturePDF } from "@/lib/extraction";
import { analyserFacture } from "@/lib/rapprochement";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Clé API Anthropic manquante. Ajoutez ANTHROPIC_API_KEY dans les variables d'environnement.",
      },
      { status: 503 },
    );
  }

  let fichier: File | null = null;
  try {
    const form = await req.formData();
    const valeur = form.get("fichier");
    if (valeur instanceof File) fichier = valeur;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!fichier) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await fichier.arrayBuffer());
    const base64 = buffer.toString("base64");
    const facture = await extraireFacturePDF(base64);
    const analyse = analyserFacture(fichier.name, facture);
    return NextResponse.json(analyse);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erreur lors de la lecture du PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
