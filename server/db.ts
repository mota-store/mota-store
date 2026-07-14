import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { products, cartItems, users, orders, orderItems, coupons, couponRedemptions, balanceTransactions } from "../drizzle/schema";
import type { InsertProduct, InsertCoupon } from "../drizzle/schema";

// Configuração do Banco de Dados
let pool: mysql.Pool | null = null;

export async function getDb() {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error("DATABASE_URL não configurada");
      return null;
    }
    pool = mysql.createPool(dbUrl);
    
    // Tentar criar colunas ausentes automaticamente na primeira conexão
    try {
      const connection = await pool.getConnection();
      console.log("[DB] Verificando integridade do esquema...");
      await connection.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatarUrl LONGTEXT");
      await connection.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordHash TEXT");
      await connection.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS resetToken VARCHAR(255)");
      await connection.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS resetTokenExpires TIMESTAMP NULL");
      await connection.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS balance INT NOT NULL DEFAULT 0");
      connection.release();
      console.log("[DB] Esquema verificado/atualizado.");
    } catch (e) {
      console.error("[DB] Erro ao verificar esquema:", e);
    }
  }
  return drizzle(pool, { schema, mode: "default" });
}

// Helper para calcular o total real do carrinho no servidor usando o preço real do produto
async function calculateCartTotal(tx: any, userId: number) {
  const items = await tx.select({
    quantity: cartItems.quantity,
    price: products.price
  })
  .from(cartItems)
  .innerJoin(products, eq(cartItems.productId, products.id))
  .where(eq(cartItems.userId, userId));
  
  return items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
}

// ============================================
// USER FUNCTIONS
// ============================================

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertUser(data: {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  avatarUrl?: string | null;
  lastSignedIn?: Date;
}) {
  const db = await getDb();
  if (!db) return;

  let existing = await getUserByOpenId(data.openId);
  
  // Fallback: buscar por email se openId não encontrado
  if (!existing && data.email) {
    existing = await getUserByEmail(data.email);
    if (existing) {
      console.log(`[upsertUser] Found existing user by email: ${data.email}. Updating openId to: ${data.openId}`);
    }
  }
  
  if (existing) {
    // Atualizar o usuário e garantir que o openId esteja correto
    await db.update(users)
      .set({ 
        ...data, 
        openId: data.openId // Garante que o openId seja atualizado se veio do fallback por e-mail
      })
      .where(eq(users.id, existing.id));
    return existing.id;
  } else {
    // Tentar inserir, mas capturar erro de duplicidade se ocorrer corrida
    try {
      const [result] = await db.insert(users).values(data as any);
      return result.insertId;
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY' && data.email) {
        const userByEmail = await getUserByEmail(data.email);
        if (userByEmail) {
          await db.update(users)
            .set({ ...data, openId: data.openId })
            .where(eq(users.id, userByEmail.id));
          return userByEmail.id;
        }
      }
      throw error;
    }
  }
}

export async function updateUser(userId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.transaction(async (tx) => {
    // Deletar dados relacionados
    await tx.delete(cartItems).where(eq(cartItems.userId, userId));
    await tx.delete(couponRedemptions).where(eq(couponRedemptions.userId, userId));
    await tx.delete(balanceTransactions).where(eq(balanceTransactions.userId, userId));
    
    // Para ordens, podemos manter para histórico ou deletar
    // Como é exclusão permanente de conta, vamos deletar tudo relacionado
    const userOrders = await tx.select({ id: orders.id }).from(orders).where(eq(orders.userId, userId));
    for (const order of userOrders) {
      await tx.delete(orderItems).where(eq(orderItems.orderId, order.id));
    }
    await tx.delete(orders).where(eq(orders.userId, userId));
    
    // Por fim, deletar o usuário
    await tx.delete(users).where(eq(users.id, userId));
  });
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    loginMethod: users.loginMethod,
    avatarUrl: users.avatarUrl,
    role: users.role,
    balance: users.balance,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    lastSignedIn: users.lastSignedIn,
    orderCount: sql<number>`(SELECT COUNT(*) FROM ${orders} WHERE ${orders.userId} = ${users.id})`,
  })
  .from(users)
  .orderBy(desc(users.createdAt));
  
  return result;
}

// Reset Password Functions
export async function setResetToken(userId: number, token: string, expires: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ resetToken: token, resetTokenExpires: expires }).where(eq(users.id, userId));
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function clearResetToken(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ resetToken: null, resetTokenExpires: null }).where(eq(users.id, userId));
}

export async function updatePassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

// ============================================
// PRODUCT FUNCTIONS
// ============================================

export async function getProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.isActive, 1));
}

export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProduct(input: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(products).values({
    ...input,
    isActive: 1,
  });

  const [product] = await db.select().from(products).where(eq(products.id, result.insertId)).limit(1);
  return product;
}

export async function updateProduct(id: number, input: Partial<InsertProduct> & { isActive?: boolean | number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set(input).where(eq(products.id, id));
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return product;
}

export async function deleteProduct(productId: number) {
  const db = await getDb();
  if (!db) return;

  return await db.transaction(async (tx) => {
    // 1. Remover o produto dos carrinhos de todos os usuários
    await tx.delete(cartItems).where(eq(cartItems.productId, productId));

    // 2. Para itens de pedidos já realizados, o ideal é NÃO deletar para manter o histórico.
    // Em vez disso, o banco costuma dar erro de Foreign Key.
    // Vamos apenas marcar o produto como inativo se ele já tiver sido vendido,
    // ou deletar se for um produto novo sem vendas.
    
    const [hasSales] = await tx.select({ count: count() }).from(orderItems).where(eq(orderItems.productId, productId));
    
    if (hasSales && (hasSales as any).count > 0) {
      // Se já foi vendido, apenas desativamos para não quebrar o histórico de pedidos dos clientes
      await tx.update(products).set({ isActive: 0 }).where(eq(products.id, productId));
      return { success: true, action: "deactivated" };
    } else {
      // Se nunca foi vendido, podemos deletar permanentemente
      await tx.delete(products).where(eq(products.id, productId));
      return { success: true, action: "deleted" };
    }
  });
}

// ============================================
// CART FUNCTIONS
// ============================================

export async function getCartItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cartItems).where(eq(cartItems.userId, userId));
}

const lastAddRequest = new Map<string, number>();

export async function addToCart(userId: number, productId: number, quantity: number = 1) {
  const db = await getDb();
  if (!db) return;
  
  // Removido debounce de 500ms para permitir atualizações rápidas do carrinho
  // A transação do banco de dados e a restrição de quantidade garantem a integridade.
  
  await db.transaction(async (tx) => {
    const [existingItem] = await tx.select().from(cartItems).where(
      and(eq(cartItems.userId, userId), eq(cartItems.productId, productId))
    ).limit(1);
    
    const currentQty = existingItem?.quantity || 0;
    let newQty = currentQty + quantity;
    
    if (newQty > 5) {
      newQty = 5;
    }
    
    if (newQty < 1 && existingItem) {
      // Se a quantidade for menor que 1, poderíamos remover, mas o frontend geralmente chama remove
      // Por segurança, vamos manter no mínimo 1 se estivermos apenas atualizando
      newQty = 1;
    }
    
    if (existingItem) {
      await tx.update(cartItems)
        .set({ quantity: newQty })
        .where(eq(cartItems.id, existingItem.id));
    } else {
      await tx.insert(cartItems).values({ userId, productId, quantity: newQty });
    }
  });
}

export async function removeFromCart(cartItemId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
}

// ============================================
// ORDER FUNCTIONS
// ============================================

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId));
}

export async function createOrder(userId: number, _totalAmountFromClient: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const totalAmount = await calculateCartTotal(tx, userId);
    
    if (totalAmount <= 0) {
      throw new Error("Carrinho vazio ou inválido");
    }

    const [result] = await tx.insert(orders).values({
      userId,
      totalAmount,
      status: "pending",
      paymentMethod: "pix",
    });

    const orderId = result.insertId;

    const items = await tx.select({
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      price: products.price
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId));

    for (const item of items) {
      await tx.insert(orderItems).values({
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.price,
      });
    }

    return { id: orderId };
  });
}

export async function updateOrderStatus(orderId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ status: status as any }).where(eq(orders.id, orderId));

  if (status === "completed") {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (order) {
      await db.delete(cartItems).where(eq(cartItems.userId, order.userId));
    }
  }
}

// ============================================
// WALLET FUNCTIONS
// ============================================

export async function getUserBalance(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [user] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.balance ?? 0;
}

export async function depositBalance(userId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error("Usuário não encontrado");

    const newBalance = user.balance + amount;
    // const hasCashbackBenefit = user.hasCashbackBenefit === 1 || amount >= 500 ? 1 : 0;

    await tx.update(users).set({ balance: newBalance }).where(eq(users.id, userId));

    console.log(`[Deposit] Crediting ${amount} cents to user ${userId}. New balance: ${newBalance}`);
    await tx.insert(balanceTransactions).values({
      userId,
      amount,
      type: "deposit",
      description: `Recarga de carteira via PIX - R$ ${(amount / 100).toFixed(2).replace(".", ",")}`,
      newBalance,
    });

    return { success: true, newBalance, cashbackActivated: false };
  });
}

const lastCheckoutTime = new Map<string, number>();

export async function checkoutWithBalance(userId: number, _amountFromClient: number, _itemsFromClient: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Trava de segurança: impede requisições duplicadas em menos de 5 segundos
  const now = Date.now();
  const lastTime = lastCheckoutTime.get(userId.toString()) || 0;
  if (now - lastTime < 5000) {
    throw new Error("Por favor, aguarde alguns segundos antes de tentar novamente.");
  }
  lastCheckoutTime.set(userId.toString(), now);

  return await db.transaction(async (tx) => {
    const cartTotal = await calculateCartTotal(tx, userId);
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update").limit(1);
    
    if (!user) return { success: false, error: "Usuário não encontrado" };
    
    const hasCashback = false; // user.hasCashbackBenefit === 1;
    const discount = hasCashback ? Math.floor(cartTotal * 0.1) : 0;
    const finalAmount = cartTotal - discount;

    if (user.balance < finalAmount) {
      return { success: false, error: "Saldo insuficiente" };
    }

    const newBalance = user.balance - finalAmount;
    await tx.update(users).set({ balance: newBalance }).where(eq(users.id, userId));

    const [orderResult] = await tx.insert(orders).values({
      userId,
      totalAmount: finalAmount,
      status: "completed",
      paymentMethod: "balance",
    });

    const orderId = orderResult.insertId;

    const items = await tx.select({
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      price: products.price
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId));

    for (const item of items) {
      await tx.insert(orderItems).values({
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.price,
      });
    }

    await tx.insert(balanceTransactions).values({
      userId,
      amount: -finalAmount,
      type: "purchase",
      description: `Compra realizada com saldo - Pedido #${orderId}`,
      relatedOrderId: orderId,
      newBalance,
    });

    await tx.delete(cartItems).where(eq(cartItems.userId, userId));

    return { success: true, orderId };
  });
}

export async function checkoutWithBalanceAndPix(userId: number, input: { totalAmount: number, balanceToUse: number, cartItems: any[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const cartTotal = await calculateCartTotal(tx, userId);
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update").limit(1);
    
    if (!user) return { success: false, error: "Usuário não encontrado" };
    
    const balanceToUse = Math.min(user.balance, input.balanceToUse);
    const remainingAmount = cartTotal - balanceToUse;

    if (remainingAmount <= 0) {
      return { success: false, error: "Saldo é suficiente para pagar o total. Use pagamento com saldo." };
    }

    // Deduzir saldo imediatamente e criar pedido pendente
    const newBalance = user.balance - balanceToUse;
    await tx.update(users).set({ balance: newBalance }).where(eq(users.id, userId));

    const [orderResult] = await tx.insert(orders).values({
      userId,
      totalAmount: cartTotal,
      status: "pending",
      paymentMethod: "balance_pix",
    });

    const orderId = orderResult.insertId;

    const items = await tx.select({
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      price: products.price
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId));

    for (const item of items) {
      await tx.insert(orderItems).values({
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.price,
      });
    }

    await tx.insert(balanceTransactions).values({
      userId,
      amount: -balanceToUse,
      type: "purchase",
      description: `Pagamento parcial com saldo - Pedido #${orderId}`,
      relatedOrderId: orderId,
      newBalance,
    });

    return { success: true, orderId, remainingAmount };
  });
}

// ============================================
// COUPON FUNCTIONS
// ============================================

export async function getAllCoupons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function createCoupon(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(coupons).values(data as any);
  const [coupon] = await db.select().from(coupons).where(eq(coupons.id, result.insertId)).limit(1);
  return coupon;
}

export async function toggleCouponActive(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(coupons).set({ isActive: isActive ? 1 : 0 }).where(eq(coupons.id, id));
}

export async function deleteCoupon(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(coupons).where(eq(coupons.id, id));
}

export async function redeemCoupon(userId: number, code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const [coupon] = await tx.select().from(coupons).where(eq(coupons.code, code.toUpperCase())).limit(1);
    
    if (!coupon) throw new Error("Cupom inválido");
    if (coupon.isActive === 0) throw new Error("Cupom inativo");
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error("Cupom expirado");
    if (coupon.currentRedemptions >= coupon.maxRedemptions) throw new Error("Cupom esgotado");

    const [alreadyRedeemed] = await tx.select().from(couponRedemptions).where(
      and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.userId, userId))
    ).limit(1);

    if (alreadyRedeemed) throw new Error("Você já resgatou este cupom");

    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update").limit(1);
    if (!user) throw new Error("Usuário não encontrado");

    const newBalance = user.balance + coupon.value;
    await tx.update(users).set({ balance: newBalance }).where(eq(users.id, userId));
    
    await tx.update(coupons)
      .set({ currentRedemptions: coupon.currentRedemptions + 1 })
      .where(eq(coupons.id, coupon.id));

    await tx.insert(couponRedemptions).values({
      couponId: coupon.id,
      userId,
    });

    await tx.insert(balanceTransactions).values({
      userId,
      amount: coupon.value,
      type: "coupon",
      description: `Cupom resgatado: ${coupon.code}`,
      relatedCouponId: coupon.id,
      newBalance,
    });

    return { success: true, value: coupon.value, newBalance };
  });
}

// ============================================
// ADMIN DASHBOARD STATS
// ============================================

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;

  const [totalUsers] = await db.select({ count: count() }).from(users);
  const [totalProducts] = await db.select({ count: count() }).from(products);
  const [totalOrders] = await db.select({ count: count() }).from(orders);
  const [completedOrders] = await db.select({ count: count() }).from(orders).where(eq(orders.status, "completed"));
  
  const revenueResult = await db.select({ total: sql<number>`SUM(${orders.totalAmount})` }).from(orders).where(eq(orders.status, "completed"));
  const totalRevenue = revenueResult[0]?.total || 0;

  const recentOrders = await db.select({
    id: orders.id,
    userName: users.name,
    totalAmount: orders.totalAmount,
    status: orders.status,
    createdAt: orders.createdAt
  })
  .from(orders)
  .leftJoin(users, eq(orders.userId, users.id))
  .orderBy(desc(orders.createdAt))
  .limit(5);

  return {
    users: (totalUsers as any).count,
    products: (totalProducts as any).count,
    orders: (totalOrders as any).count,
    completedOrders: (completedOrders as any).count,
    revenue: totalRevenue,
    recentOrders
  };
}

export async function addUserBalance(userId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update").limit(1);
    if (!user) throw new Error("Usuário não encontrado");

    const newBalance = user.balance + amount;
    await tx.update(users).set({ balance: newBalance }).where(eq(users.id, userId));

    await tx.insert(balanceTransactions).values({
      userId,
      amount,
      type: "admin_credit",
      description: `Crédito administrativo - R$ ${(amount / 100).toFixed(2).replace(".", ",")}`,
      newBalance,
    });

    return { success: true, newBalance };
  });
}

export async function getUserTransactions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(balanceTransactions).where(eq(balanceTransactions.userId, userId)).orderBy(desc(balanceTransactions.createdAt));
}
