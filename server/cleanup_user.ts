import { getDb } from "./db";
import { users, orders, orderItems, balanceTransactions, couponRedemptions, cartItems } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function cleanupUser(email: string) {
    const db = await getDb();
    if (!db) {
        console.error("Não foi possível conectar ao banco de dados");
        return;
    }

    try {
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        
        if (!user) {
            console.error(`Usuário com email ${email} não encontrado`);
            return;
        }

        const userId = user.id;
        console.log(`Limpando dados para o usuário ID: ${userId} (${email})`);

        // 1. Deletar itens de pedidos
        const userOrders = await db.select().from(orders).where(eq(orders.userId, userId));
        for (const order of userOrders) {
            await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
        }

        // 2. Deletar pedidos
        await db.delete(orders).where(eq(orders.userId, userId));

        // 3. Deletar transações de saldo
        await db.delete(balanceTransactions).where(eq(balanceTransactions.userId, userId));

        // 4. Deletar resgates de cupons
        await db.delete(couponRedemptions).where(eq(couponRedemptions.userId, userId));

        // 5. Limpar carrinho
        await db.delete(cartItems).where(eq(cartItems.userId, userId));

        // 6. Atualizar saldo para R$ 14,90 (1490 centavos)
        await db.update(users).set({ balance: 1490 }).where(eq(users.id, userId));

        console.log("Limpeza concluída com sucesso! Saldo definido para R$ 14,90.");
    } catch (err) {
        console.error("Erro durante a limpeza:", err);
    }
}

// O email será passado via argumento ou podemos tentar detectar
const targetEmail = process.argv[2];
if (targetEmail) {
    cleanupUser(targetEmail);
} else {
    console.error("Por favor, forneça o email do usuário como argumento.");
}
