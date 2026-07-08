import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
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
  }
  return drizzle(pool, { schema, mode: "default" });
}

// REGRA FIXA DE PREÇO: Todos os produtos custam R$ 5,00 (500 centavos)
const FIXED_PRICE = 500;

// Helper para calcular o total real do carrinho no servidor
async function calculateCartTotal(tx: any, userId: number) {
  const items = await tx.select().from(cartItems).where(eq(cartItems.userId, userId));
  return items.reduce((sum: number, item: any) => sum + (FIXED_PRICE * item.quantity), 0);
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

  const existing = await getUserByOpenId(data.openId);
  if (existing) {
    await db.update(users).set(data).where(eq(users.id, existing.id));
    return existing.id;
  } else {
    const [result] = await db.insert(users).values(data as any);
    return result.insertId;
  }
}

export async function updateUser(userId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users);
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

export async function updateProduct(id: number, input: Partial<InsertProduct> & { isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set(input).where(eq(products.id, id));
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return product;
}

export async function deleteProduct(productId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(products).where(eq(products.id, productId));
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
  
  const requestKey = `${userId}-${productId}`;
  const now = Date.now();
  const lastRequest = lastAddRequest.get(requestKey) || 0;
  
  if (now - lastRequest < 500) {
    console.log(`[AddToCart] Ignorando requisição duplicada para usuário ${userId}, produto ${productId}`);
    return;
  }
  lastAddRequest.set(requestKey, now);
  
  await db.transaction(async (tx) => {
    const [existingItem] = await tx.select().from(cartItems).where(
      and(eq(cartItems.userId, userId), eq(cartItems.productId, productId))
    ).limit(1);
    
    const currentQty = existingItem?.quantity || 0;
    const newQty = currentQty + quantity;
    
    if (newQty > 5) {
      throw new Error("Limite máximo de 5 unidades por produto excedido");
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

    const items = await tx.select().from(cartItems).where(eq(cartItems.userId, userId));
    for (const item of items) {
      await tx.insert(orderItems).values({
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: FIXED_PRICE,
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
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update").limit(1);
    if (!user) throw new Error("Usuário não encontrado");

    const newBalance = user.balance + amount;
    const hasCashbackBenefit = user.hasCashbackBenefit === 1 || amount >= 500 ? 1 : 0;

    await tx.update(users).set({ balance: newBalance, hasCashbackBenefit }).where(eq(users.id, userId));

    await tx.insert(balanceTransactions).values({
      userId,
      amount,
      type: "deposit",
      description: `Recarga de carteira via PIX - R$ ${(amount / 100).toFixed(2).replace(".", ",")}`,
      newBalance,
    });

    return { success: true, newBalance, cashbackActivated: amount >= 500 && user.hasCashbackBenefit === 0 };
  });
}

export async function checkoutWithBalance(userId: number, _amountFromClient: number, _itemsFromClient: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const cartTotal = await calculateCartTotal(tx, userId);
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update").limit(1);
    
    if (!user) return { success: false, error: "Usuário não encontrado" };
    
    const hasCashback = user.hasCashbackBenefit === 1;
    const discount = hasCashback ? Math.floor(cartTotal * 0.1) : 0;
    const finalAmount = cartTotal - discount;

    if (user.balance < finalAmount) {
      return { success: false, error: "Saldo insuficiente" };
    }

    const newBalance = user.balance - finalAmount;
    await tx.update(users).set({ balance: newBalance }).where(eq(users.id, userId));

    await tx.insert(balanceTransactions).values({
      userId,
      amount: -finalAmount,
      type: "purchase",
      description: hasCashback ? "Compra com 10% de cashback" : "Compra via saldo",
      newBalance,
    });

    const [orderResult] = await tx.insert(orders).values({
      userId,
      totalAmount: finalAmount,
      status: "completed",
      paymentMethod: "balance",
    });

    const orderId = orderResult.insertId;

    const items = await tx.select().from(cartItems).where(eq(cartItems.userId, userId));
    for (const item of items) {
      await tx.insert(orderItems).values({
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: FIXED_PRICE,
      });
    }

    await tx.delete(cartItems).where(eq(cartItems.userId, userId));

    return { success: true, orderId, newBalance, cashbackApplied: hasCashback, discountAmount: discount };
  });
}

export async function checkoutWithBalanceAndPix(userId: number, _totalFromClient: number, balanceToUse: number, _itemsFromClient: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const cartTotal = await calculateCartTotal(tx, userId);
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update").limit(1);

    if (!user) return { success: false, error: "Usuário não encontrado" };
    if (user.balance < balanceToUse) return { success: false, error: "Saldo insuficiente" };

    const remainingAmount = cartTotal - balanceToUse;
    if (remainingAmount <= 0) return { success: false, error: "Use saldo total" };

    const newBalance = user.balance - balanceToUse;
    await tx.update(users).set({ balance: newBalance }).where(eq(users.id, userId));

    await tx.insert(balanceTransactions).values({
      userId,
      amount: -balanceToUse,
      type: "purchase",
      description: `Pagamento parcial via saldo - restante via PIX`,
      newBalance,
    });

    const [orderResult] = await tx.insert(orders).values({
      userId,
      totalAmount: cartTotal,
      status: "pending",
      paymentMethod: "balance_pix",
    });

    const orderId = orderResult.insertId;

    const items = await tx.select().from(cartItems).where(eq(cartItems.userId, userId));
    for (const item of items) {
      await tx.insert(orderItems).values({
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: FIXED_PRICE,
      });
    }

    return { success: true, orderId, remainingAmount, newBalance };
  });
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    order: orders,
    userName: users.name,
    userEmail: users.email,
  })
  .from(orders)
  .leftJoin(users, eq(orders.userId, users.id))
  .orderBy(desc(orders.createdAt));
}

export async function addUserBalance(userId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const [currentUser] = await tx.select({ balance: users.balance }).from(users).where(eq(users.id, userId)).for("update").limit(1);
    if (!currentUser) throw new Error("Usuário não encontrado");

    const newBalance = currentUser.balance + amount;
    await tx.update(users).set({ balance: newBalance }).where(eq(users.id, userId));

    await tx.insert(balanceTransactions).values({
      userId,
      amount,
      type: "admin_credit",
      description: `Crédito administrativo de R$ ${(amount / 100).toFixed(2).replace(".", ",")}`,
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

// ============================================
// COUPON FUNCTIONS
// ============================================

export async function createCoupon(input: InsertCoupon) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(coupons).values({
    code: input.code,
    value: input.value,
    description: input.description ?? null,
    maxRedemptions: input.maxRedemptions ?? 1,
    currentRedemptions: 0,
    expiresAt: input.expiresAt ?? null,
    isActive: 1,
  });

  const [coupon] = await db.select().from(coupons).where(eq(coupons.id, result.insertId)).limit(1);
  return coupon;
}

export async function getAllCoupons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function toggleCouponActive(couponId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(coupons).set({ isActive: isActive ? 1 : 0 }).where(eq(coupons.id, couponId));
}

export async function deleteCoupon(couponId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(coupons).where(eq(coupons.id, couponId));
}

export async function redeemCoupon(code: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const [coupon] = await tx.select().from(coupons).where(and(eq(coupons.code, code), eq(coupons.isActive, 1))).limit(1);
    if (!coupon) return { success: false, error: "Cupom inválido ou inativo" };

    if (coupon.expiresAt && coupon.expiresAt < new Date()) return { success: false, error: "Cupom expirado" };
    if (coupon.currentRedemptions >= coupon.maxRedemptions) return { success: false, error: "Limite de resgates atingido" };

    const existing = await tx.select().from(couponRedemptions).where(and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.userId, userId))).limit(1);
    if (existing.length > 0) return { success: false, error: "Cupom já resgatado" };

    await tx.insert(couponRedemptions).values({ couponId: coupon.id, userId });
    await tx.update(coupons).set({ currentRedemptions: coupon.currentRedemptions + 1 }).where(eq(coupons.id, coupon.id));

    const [user] = await tx.select({ balance: users.balance }).from(users).where(eq(users.id, userId)).for("update").limit(1);
    if (!user) throw new Error("Usuário não encontrado");

    const newBalance = user.balance + coupon.value;
    await tx.update(users).set({ balance: newBalance }).where(eq(users.id, userId));

    await tx.insert(balanceTransactions).values({
      userId,
      amount: coupon.value,
      type: "coupon",
      description: `Resgate de cupom: ${coupon.code}`,
      relatedCouponId: coupon.id,
      newBalance,
    });

    return { success: true, value: coupon.value, newBalance };
  });
}
