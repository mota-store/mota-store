import { getDb } from "./db";
import { sql } from "drizzle-orm";

async function fixSchema() {
    const db = await getDb();
    if (!db) {
        console.error("Não foi possível conectar ao banco de dados");
        return;
    }

    try {
        console.log("Verificando e corrigindo esquema da tabela 'users'...");
        
        // Adicionar colunas se não existirem
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatarUrl LONGTEXT`);
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordHash TEXT`);
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS resetToken VARCHAR(255)`);
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS resetTokenExpires TIMESTAMP NULL`);
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS balance INT NOT NULL DEFAULT 0`);
        
        console.log("Esquema corrigido com sucesso!");
        process.exit(0);
    } catch (err) {
        console.error("Erro ao corrigir esquema:", err);
        process.exit(1);
    }
}

fixSchema();
