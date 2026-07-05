import { eq, and, sql, gt, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, products, cartItems, orders, orderItems, balanceTransactions, coupons, couponRedemptions, InsertCoupon } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "avatarUrl"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      console.log(`[Auth] Promoting owner ${user.openId} to admin role`);
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    // Set balance to 0 for new users
    values.balance = 0;

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({ passwordHash, resetToken: null, resetTokenExpires: null })
    .where(eq(users.id, userId));
}

export async function setResetToken(userId: number, token: string, expires: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({ resetToken: token, resetTokenExpires: expires })
    .where(eq(users.id, userId));
}

export async function clearResetToken(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({ resetToken: null, resetTokenExpires: null })
    .where(eq(users.id, userId));
}

export async function getProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.isActive, 1));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCartItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cartItems).where(eq(cartItems.userId, userId));
}

export async function addToCart(userId: number, productId: number, quantity: number = 1) {
  const db = await getDb();
  if (!db) return;
  await db.insert(cartItems).values({ userId, productId, quantity });
}

export async function removeFromCart(cartItemId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId));
}

export async function updateUser(userId: number, data: { name?: string; avatarUrl?: string; passwordHash?: string; balance?: number; hasCashbackBenefit?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function depositBalance(userId: number, amount: number): Promise<{
  success: boolean;
  newBalance: number;
  cashbackActivated: boolean;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    // 1. Obter saldo atual com FOR UPDATE
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update").limit(1);
    if (!user) throw new Error("Usuário não encontrado");

    const newBalance = user.balance + amount;
    const cashbackActivated = amount >= 500 && user.hasCashbackBenefit === 0;
    const hasCashbackBenefit = user.hasCashbackBenefit === 1 || amount >= 500 ? 1 : 0;

    // 2. Atualizar usuário
    await tx.update(users)
      .set({ balance: newBalance, hasCashbackBenefit })
      .where(eq(users.id, userId));

    // 3. Registrar transação
    await tx.insert(balanceTransactions).values({
      userId,
      amount,
      type: "deposit",
      description: `Recarga de carteira via PIX - R$ ${(amount / 100).toFixed(2).replace(".", ",")}`,
      newBalance,
    });

    return { success: true, newBalance, cashbackActivated };
  });
}

export async function createOrder(userId: number, totalAmount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(orders).values({
    userId,
    totalAmount,
    status: "pending",
    paymentMethod: "pix",
  });

  return { id: result.insertId };
}

export async function updateOrderStatus(orderId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ status: status as any }).where(eq(orders.id, orderId));

  // Clear cart only after successful payment
  if (status === "completed") {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (order) {
      await db.delete(cartItems).where(eq(cartItems.userId, order.userId));
    }
  }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  const allUsers = await db.select().from(users).orderBy(desc(users.id));

  const usersWithOrders = await Promise.all(allUsers.map(async (user) => {
    const userOrders = await db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.userId, user.id));

    return {
      ...user,
      orderCount: Number(userOrders[0]?.count) || 0
    };
  }));

  return usersWithOrders;
}

export async function getUserBalance(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [user] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.balance ?? 0;
}

export async function addUserBalance(userId: number, amount: number): Promise<{ success: boolean; newBalance: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Usar transação para segurança
  const result = await db.transaction(async (tx) => {
    // 1. Obter saldo atual
    const [currentUser] = await tx.select({ balance: users.balance }).from(users).where(eq(users.id, userId)).for("update").limit(1);
    if (!currentUser) throw new Error("Usuário não encontrado");

    const newBalance = currentUser.balance + amount;
    if (newBalance < 0) throw new Error("Saldo não pode ser negativo");

    // 2. Atualizar saldo
    await tx.update(users).set({ balance: newBalance }).where(eq(users.id, userId));

    // 3. Registrar transação
    await tx.insert(balanceTransactions).values({
      userId,
      amount,
      type: "admin_credit",
      description: `Crédito administrativo de R$ ${(amount / 100).toFixed(2).replace(".", ",")}`,
      newBalance,
    });

    return { success: true, newBalance };
  });

  return result;
}

export async function getUserTransactions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(balanceTransactions).where(eq(balanceTransactions.userId, userId)).orderBy(desc(balanceTransactions.createdAt));
}

// ============================================
// COUPON FUNCTIONS
// ============================================

export async function createCoupon(input: InsertCoupon): Promise<any> {
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

export async function redeemCoupon(code: string, userId: number): Promise<{ success: boolean; value?: number; error?: string; newBalance?: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.transaction(async (tx) => {
    // 1. Buscar cupom
    const [coupon] = await tx.select().from(coupons).where(and(eq(coupons.code, code), eq(coupons.isActive, 1))).limit(1);
    if (!coupon) return { success: false, error: "Cupom inválido ou inativo" };

    // 2. Verificar expiração
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { success: false, error: "Cupom expirado" };
    }

    // 3. Verificar limite de resgates
    if (coupon.currentRedemptions >= coupon.maxRedemptions) {
      return { success: false, error: "Cupom já atingiu o limite de resgates" };
    }

    // 4. Verificar se o usuário já resgatou este cupom
    const existingRedemption = await tx.select().from(couponRedemptions)
      .where(and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.userId, userId)))
      .limit(1);
    if (existingRedemption.length > 0) {
      return { success: false, error: "Você já resgatou este cupom" };
    }

    // 5. Registrar resgate
    await tx.insert(couponRedemptions).values({ couponId: coupon.id, userId });

    // 6. Incrementar contador de resgates
    await tx.update(coupons).set({ currentRedemptions: coupon.currentRedemptions + 1 }).where(eq(coupons.id, coupon.id));

    // 7. Creditar saldo
    const [currentUser] = await tx.select({ balance: users.balance }).from(users).where(eq(users.id, userId)).for("update").limit(1);
    if (!currentUser) throw new Error("Usuário não encontrado");

    const newBalance = currentUser.balance + coupon.value;
    await tx.update(users).set({ balance: newBalance }).where(eq(users.id, userId));

    // 8. Registrar transação
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

  return result;
}

// ============================================
// WALLET / CHECKOUT FUNCTIONS
// ============================================

export async function checkoutWithBalance(userId: number, amount: number, items: Array<{ productId: number; quantity: number; price: number }>): Promise<{ success: boolean; orderId?: number; error?: string; newBalance?: number; cashbackApplied?: boolean; discountAmount?: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.transaction(async (tx) => {
    // 1. Verificar saldo e benefício de cashback
    const [currentUser] = await tx.select({ balance: users.balance, hasCashbackBenefit: users.hasCashbackBenefit }).from(users).where(eq(users.id, userId)).for("update").limit(1);
    if (!currentUser) return { success: false, error: "Usuário não encontrado" };

    let finalAmount = amount;
    let cashbackApplied = false;
    let discountAmount = 0;

    if (currentUser.hasCashbackBenefit === 1) {
      discountAmount = Math.floor(amount * 0.1);
      finalAmount = amount - discountAmount;
      cashbackApplied = true;
    }

    if (currentUser.balance < finalAmount) {
      return { success: false, error: "Saldo insuficiente" };
    }

    // 2. Verificar se todos os produtos existem (validação adicional)
    for (const item of items) {
      const [product] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (!product || product.price !== item.price) {
        return { success: false, error: `Preço do produto alterado ou produto não encontrado` };
      }
    }

    // 3. Deduzir saldo
    const newBalance = currentUser.balance - finalAmount;
    await tx.update(users).set({ balance: newBalance }).where(eq(users.id, userId));

    // 4. Registrar transação
    await tx.insert(balanceTransactions).values({
      userId,
      amount: -finalAmount, // negativo = débito
      type: "purchase",
      description: cashbackApplied 
        ? `Compra via saldo com 10% de cashback aplicado - ${items.length} item(ns)` 
        : `Compra via saldo - ${items.length} item(ns)`,
      newBalance,
    });

    // 5. Criar ordem
    const [orderResult] = await tx.insert(orders).values({
      userId,
      totalAmount: finalAmount,
      status: "completed", // já pago com saldo
      paymentMethod: "balance",
    });

    const orderId = orderResult.insertId;

    // 6. Criar itens da ordem
    for (const item of items) {
      await tx.insert(orderItems).values({
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.price,
      });
    }

    // 7. Limpar carrinho
    await tx.delete(cartItems).where(eq(cartItems.userId, userId));

    return { success: true, orderId, newBalance, cashbackApplied, discountAmount };
  });

  return result;
}

// ============================================
// PRODUCT CRUD (ADMIN)
// ============================================

export async function createProduct(input: {
  name: string;
  description?: string;
  price: number;
  trialDays: number;
  benefits?: string;
  imageUrl?: string;
  affiliateLink: string;
  category: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(products).values({
    name: input.name,
    description: input.description || null,
    price: input.price,
    trialDays: input.trialDays,
    benefits: input.benefits || null,
    imageUrl: input.imageUrl || null,
    affiliateLink: input.affiliateLink,
    category: input.category,
    isActive: 1,
  });

  const [product] = await db.select().from(products).where(eq(products.id, result.insertId)).limit(1);
  return product;
}

export async function updateProduct(id: number, input: {
  name?: string;
  description?: string;
  price?: number;
  trialDays?: number;
  benefits?: string;
  imageUrl?: string;
  affiliateLink?: string;
  category?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, any> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.price !== undefined) updateData.price = input.price;
  if (input.trialDays !== undefined) updateData.trialDays = input.trialDays;
  if (input.benefits !== undefined) updateData.benefits = input.benefits;
  if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
  if (input.affiliateLink !== undefined) updateData.affiliateLink = input.affiliateLink;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;

  await db.update(products).set(updateData).where(eq(products.id, id));

  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return product;
}

export async function deleteProduct(productId: number) {
  const db = await getDb();
  if (!db) return;
  // Soft delete - desativar produto
  await db.update(products).set({ isActive: 0 }).where(eq(products.id, productId));
}

export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).orderBy(desc(products.createdAt));
}

// ============================================
// ADMIN: LIST ALL ORDERS
// ============================================

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];
  // Retorna orders com info do usuário
  const result = await db.select({
    order: orders,
    userName: users.name,
    userEmail: users.email,
  })
  .from(orders)
  .leftJoin(users, eq(orders.userId, users.id))
  .orderBy(desc(orders.createdAt));

  return result.map(r => ({
    ...r.order,
    userName: r.userName,
    userEmail: r.userEmail,
  }));
}
