import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function update() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    console.log('Adicionando colunas de recuperação de senha...');
    await connection.execute('ALTER TABLE users ADD COLUMN resetToken VARCHAR(255) NULL');
    await connection.execute('ALTER TABLE users ADD COLUMN resetTokenExpires TIMESTAMP NULL');
    console.log('Colunas adicionadas com sucesso!');
  } catch (err: any) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Colunas já existem.');
    } else {
      console.error('Erro:', err);
    }
  } finally {
    await connection.end();
  }
}

update();
