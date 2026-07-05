import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL não configurada no ambiente");
  }

  const connection = await mysql.createConnection(dbUrl);
  
  try {
    console.log("Verificando se a coluna já existe...");
    const [rows] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'has_cashback_benefit'"
    );
    
    if ((rows as any[]).length > 0) {
      console.log("Coluna has_cashback_benefit já existe. Nada a fazer.");
    } else {
      console.log("Adicionando coluna has_cashback_benefit...");
      await connection.execute(
        "ALTER TABLE users ADD COLUMN has_cashback_benefit INT NOT NULL DEFAULT 0"
      );
      console.log("Coluna adicionada com sucesso!");
    }
  } catch (error) {
    console.error("Erro durante a migração:", error);
  } finally {
    await connection.end();
  }
}

migrate().catch(console.error);
