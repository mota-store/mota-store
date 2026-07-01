import { getDb } from "./db";
import { products } from "../drizzle/schema";

export async function seedProducts() {
  const db = await getDb();
  if (!db) {
    console.warn("[Seed] Database not available");
    return;
  }

  const productsData = [
    {
      name: "Spotify Premium",
      description: "Acesso ilimitado a milhões de músicas, podcasts e audiobooks. Sem anúncios, qualidade de áudio superior e download para ouvir offline.",
      price: 1199, // R$ 11,99 em centavos
      trialDays: 30,
      benefits: JSON.stringify([
        "Sem anúncios",
        "Qualidade de áudio superior",
        "Download offline",
        "Pule qualquer música",
        "Acesso a podcasts exclusivos"
      ]),
      imageUrl: "https://via.placeholder.com/300x200?text=Spotify+Premium",
      affiliateLink: "https://www.spotify.com/premium/",
      category: "music",
      isActive: 1,
    },
    {
      name: "Amazon Prime Video",
      description: "Acesso a milhares de filmes, séries e conteúdo original. Entrega rápida em compras Amazon, música ilimitada e mais benefícios.",
      price: 1499, // R$ 14,99 em centavos
      trialDays: 30,
      benefits: JSON.stringify([
        "Filmes e séries ilimitados",
        "Conteúdo original exclusivo",
        "Entrega rápida Amazon",
        "Amazon Music ilimitado",
        "Fotos ilimitadas no Amazon Photos"
      ]),
      imageUrl: "https://via.placeholder.com/300x200?text=Amazon+Prime",
      affiliateLink: "https://www.amazon.com/amazonprime",
      category: "video",
      isActive: 1,
    },
    {
      name: "YouTube Premium",
      description: "Assista vídeos sem anúncios, baixe para assistir offline e reproduza em segundo plano. Inclui YouTube Music Premium.",
      price: 1599, // R$ 15,99 em centavos
      trialDays: 30,
      benefits: JSON.stringify([
        "Sem anúncios",
        "Reprodução em segundo plano",
        "Download offline",
        "YouTube Music Premium incluído",
        "Acesso a YouTube Originals"
      ]),
      imageUrl: "https://via.placeholder.com/300x200?text=YouTube+Premium",
      affiliateLink: "https://www.youtube.com/premium/",
      category: "video",
      isActive: 1,
    },
    {
      name: "YouTube Music Premium",
      description: "Acesso a mais de 100 milhões de músicas, playlists curadas e recomendações personalizadas. Sem anúncios.",
      price: 1299, // R$ 12,99 em centavos
      trialDays: 30,
      benefits: JSON.stringify([
        "100+ milhões de músicas",
        "Sem anúncios",
        "Download offline",
        "Reprodução em segundo plano",
        "Recomendações personalizadas"
      ]),
      imageUrl: "https://via.placeholder.com/300x200?text=YouTube+Music",
      affiliateLink: "https://www.youtube.com/premium/",
      category: "music",
      isActive: 1,
    },
  ];

  try {
    for (const product of productsData) {
      await db.insert(products).values(product);
    }
    console.log("[Seed] Products inserted successfully");
  } catch (error) {
    console.error("[Seed] Failed to insert products:", error);
  }
}

// Run seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedProducts().then(() => process.exit(0));
}
