import { drizzle } from "drizzle-orm/mysql2";
import { products } from "./drizzle/schema";

import "dotenv/config";

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL não configurada no .env");
    process.exit(1);
  }
  
  console.log("Iniciando o seed dos produtos...");
  const db = drizzle(DATABASE_URL);

  const productsData = [
    {
      name: "Spotify Premium",
      description: "Música sem anúncios, modo offline e qualidade de áudio superior. Ouça qualquer música, a qualquer hora, em qualquer lugar.",
      price: 2190,
      trialDays: 30,
      category: "music",
      benefits: JSON.stringify([
        "Música sem anúncios",
        "Modo offline",
        "Qualidade de áudio superior",
        "Ouça em qualquer dispositivo"
      ]),
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg",
      affiliateLink: "https://www.spotify.com/premium/",
      isActive: 1,
    },
    {
      name: "YouTube Premium",
      description: "Assista vídeos sem anúncios, baixe para assistir offline e acesse o YouTube Music Premium incluso.",
      price: 2490,
      trialDays: 30,
      category: "video",
      benefits: JSON.stringify([
        "Vídeos sem anúncios",
        "Reprodução em segundo plano",
        "YouTube Music Premium incluso",
        "Downloads offline"
      ]),
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg",
      affiliateLink: "https://www.youtube.com/premium/",
      isActive: 1,
    },
    {
      name: "Amazon Prime Video",
      description: "Filmes, séries e conteúdos originais Amazon. Inclui frete grátis em compras na Amazon.",
      price: 1990,
      trialDays: 30,
      category: "video",
      benefits: JSON.stringify([
        "Filmes e séries originais",
        "Frete grátis Amazon",
        "Prime Music incluso",
        "Acesso em múltiplos dispositivos"
      ]),
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg",
      affiliateLink: "https://www.amazon.com/amazonprime",
      isActive: 1,
    },
    {
      name: "YouTube Music Premium",
      description: "Streaming de música sem interrupções com acesso a milhões de músicas e videoclipes.",
      price: 2190,
      trialDays: 30,
      category: "music",
      benefits: JSON.stringify([
        "Música sem anúncios",
        "Modo áudio apenas",
        "Downloads offline",
        "Recomendações personalizadas"
      ]),
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6a/Youtube_Music_icon.svg",
      affiliateLink: "https://www.youtube.com/premium/",
      isActive: 1,
    },
  ];

  try {
    for (const product of productsData) {
      console.log(`Inserindo: ${product.name}`);
      await db.insert(products).values(product);
    }
    console.log("Seed concluído com sucesso!");
  } catch (error) {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  }
  process.exit(0);
}

seed();
