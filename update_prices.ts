import { drizzle } from "drizzle-orm/mysql2";
import { products } from "./drizzle/schema";
import { eq, inArray } from "drizzle-orm";

const DATABASE_URL = 'mysql://3RvvX2vLXvzEDqG.root:TIUcO1NCxhFGdDfD@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}';

async function updatePrices() {
  console.log("Iniciando a atualização dos preços...");
  const db = drizzle(DATABASE_URL);

  try {
    // Atualiza o preço para 500 centavos (R$ 5,00) para os produtos com IDs 1, 2, 3, 4
    const result = await db.update(products)
      .set({ price: 500 })
      .where(inArray(products.id, [1, 2, 3, 4]));
    
    console.log("Preços atualizados com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Erro ao atualizar preços:", error);
    process.exit(1);
  }
}

updatePrices();
