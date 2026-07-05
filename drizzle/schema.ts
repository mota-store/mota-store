import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  avatarUrl: text("avatarUrl"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  resetToken: varchar("resetToken", { length: 255 }),
  resetTokenExpires: timestamp("resetTokenExpires"),
  balance: int("balance").default(0).notNull(), // saldo em centavos
  hasCashbackBenefit: int("has_cashback_benefit").default(0).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Products table for streaming services
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // "Spotify Premium", "Amazon Prime", etc.
  description: text("description"),
  price: int("price").notNull(), // Price in cents
  trialDays: int("trial_days").notNull(), // 30, 7, etc.
  benefits: text("benefits"), // JSON array of benefits
  imageUrl: varchar("image_url", { length: 512 }),
  affiliateLink: varchar("affiliate_link", { length: 512 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // "music", "video", "combined"
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Cart items table
 */
export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  productId: int("product_id").notNull().references(() => products.id),
  quantity: int("quantity").default(1).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

/**
 * Orders table
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  totalAmount: int("total_amount").notNull(), // in cents
  status: mysqlEnum("status", ["pending", "completed", "failed", "cancelled"]).default("pending").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  transactionId: varchar("transaction_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order items table (items within an order)
 */
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull().references(() => orders.id),
  productId: int("product_id").notNull().references(() => products.id),
  quantity: int("quantity").default(1).notNull(),
  priceAtPurchase: int("price_at_purchase").notNull(), // in cents
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Balance transactions - registro de todas movimentações de saldo
 */
export const balanceTransactions = mysqlTable("balance_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  amount: int("amount").notNull(), // positivo = crédito, negativo = débito (em centavos)
  type: mysqlEnum("type", [
    "deposit",
    "purchase",
    "refund",
    "admin_credit",
    "coupon",
    "adjustment",
  ]).notNull(),
  description: text("description"),
  relatedOrderId: int("related_order_id"),
  relatedCouponId: int("related_coupon_id"),
  newBalance: int("new_balance").notNull(), // saldo após a transação
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BalanceTransaction = typeof balanceTransactions.$inferSelect;
export type InsertBalanceTransaction = typeof balanceTransactions.$inferInsert;

/**
 * Coupons table
 */
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // código único (ex: SUMMER10)
  value: int("value").notNull(), // valor do cupom em centavos
  description: text("description"),
  maxRedemptions: int("max_redemptions").default(1).notNull(), // quantas pessoas podem resgatar (1 = único, null = ilimitado)
  currentRedemptions: int("current_redemptions").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

/**
 * Coupon redemptions - registro de quem resgatou qual cupom
 */
export const couponRedemptions = mysqlTable("coupon_redemptions", {
  id: int("id").autoincrement().primaryKey(),
  couponId: int("coupon_id").notNull().references(() => coupons.id),
  userId: int("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type InsertCouponRedemption = typeof couponRedemptions.$inferInsert;