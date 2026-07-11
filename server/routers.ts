import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { getProducts, getProductById, getCartItems, addToCart, getUserOrders, updateUser } from "./db";
import { loginUser, registerUser } from "./_core/email-auth";
import { z } from "zod";
import * as emailService from "./email";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => {
      return opts.ctx.user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    register: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(6), name: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { registerUser } = await import("./_core/email-auth");
        const result = await registerUser(input.email, input.password, input.name);
        
        if (result.success && result.user) {
          const { sdk } = await import("./_core/sdk");
          
          const token = await sdk.createSessionToken(result.user.openId, {
            name: result.user.name || input.name || result.user.email?.split("@")[0] || "Usuário",
          });
          
          const cookieOptions = getSessionCookieOptions(ctx.req);
          
          ctx.res.cookie(COOKIE_NAME, token, {
            ...cookieOptions,
            maxAge: ONE_YEAR_MS,
          });
          
          console.log(`[Register Auto-Login] Sucesso para: ${input.email}`);
          
          // Enviar e-mail de boas-vindas apenas no registro manual inicial
          // Usamos uma variável global simples para evitar envios duplicados em rajada (burst)
          const globalAny = global as any;
          if (!globalAny.lastWelcomeEmailSent) {
            globalAny.lastWelcomeEmailSent = new Map<string, number>();
          }
          const lastSent = globalAny.lastWelcomeEmailSent.get(input.email) || 0;
          const now = Date.now();
          
          if (now - lastSent > 30000) { // 30 segundos de intervalo
            globalAny.lastWelcomeEmailSent.set(input.email, now);
            try {
              const emailService = await import("./email");
              await emailService.sendWelcomeEmail(result.user.email!, result.user.name || "Cliente");
            } catch (e) {
              console.error("[Register] Failed to send welcome email:", e);
            }
          }

          return { success: true, user: result.user };
        }
        return result;
      }),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const result = await loginUser(input.email, input.password);
        if (result.success && result.user) {
          const { sdk } = await import("./_core/sdk");
          const token = await sdk.createSessionToken(result.user.openId, {
            name: result.user.name || result.user.email?.split("@")[0] || "Usuário",
          });

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, {
            ...cookieOptions,
            maxAge: ONE_YEAR_MS,
          });

          console.log("[Login] Cookie definido para:", result.user.email);
          return { success: true, user: result.user };
        }
        return result;
      }),
    updateProfile: protectedProcedure
      .input(z.object({ 
        name: z.string().optional(), 
        avatarUrl: z.string().optional(),
        password: z.string().min(6).optional(),
        verificationCode: z.string().length(4).optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const updateData: any = { name: input.name, avatarUrl: input.avatarUrl };
        
        if (input.password) {
          if (input.verificationCode) {
            const { getUserByResetToken, clearResetToken } = await import("./db");
            const user = await getUserByResetToken(input.verificationCode);
            if (!user || user.id !== ctx.user.id || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
              return { success: false, error: "Código de verificação inválido ou expirado" };
            }
            await clearResetToken(ctx.user.id);
          }

          const bcrypt = await import("bcrypt");
          updateData.passwordHash = await bcrypt.hash(input.password, 10);
        }
        
        await updateUser(ctx.user.id, updateData);
        return { success: true };
      }),
    uploadAvatar: protectedProcedure
      .input(z.object({ base64Data: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Validar que é uma data URL válida
        if (!input.base64Data.startsWith("data:image/")) {
          throw new Error("Avatar inválido. Deve ser uma imagem em base64.");
        }
        
        // Limitar tamanho (máximo ~500KB em base64, que corresponde a ~375KB de imagem)
        if (input.base64Data.length > 600000) {
          throw new Error("Imagem muito grande. Máximo 500KB.");
        }
        
        // Atualizar o perfil com o base64 diretamente
        await updateUser(ctx.user.id, { avatarUrl: input.base64Data });
        return { success: true };
      }),
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const { getUserByEmail, setResetToken } = await import("./db");
        const crypto = await import("crypto");
        
        const user = await getUserByEmail(input.email);
        if (!user) return { success: true };

        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 3600000);

        await setResetToken(user.id, token, expires);
        
        emailService.sendPasswordResetEmail(user.email!, user.name || "Cliente", token).catch(e => {
          console.error("[ForgotPassword] Failed to send reset email:", e);
        });
        
        return { success: true };
      }),
    resetPassword: publicProcedure
      .input(z.object({ token: z.string(), password: z.string().min(6) }))
      .mutation(async ({ input }) => {
        const { getUserByResetToken, updatePassword } = await import("./db");
        const bcrypt = await import("bcrypt");
        
        const user = await getUserByResetToken(input.token);
        if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
          return { success: false, error: "Token inválido ou expirado" };
        }

        const passwordHash = await bcrypt.hash(input.password, 10);
        await updatePassword(user.id, passwordHash);
        
        return { success: true };
      }),
    requestVerificationCode: protectedProcedure
      .input(z.object({ digits: z.number().default(4) }).optional())
      .mutation(async ({ ctx, input }) => {
        const { setResetToken, getUserByOpenId } = await import("./db");
        
        // Trava global por memória para evitar rajadas (bursts) rápidas que o DB pode não pegar a tempo
        const globalAny = global as any;
        if (!globalAny.lastVerificationSent) globalAny.lastVerificationSent = new Map<string, number>();
        const lastSentMemory = globalAny.lastVerificationSent.get(ctx.user.email!) || 0;
        if (Date.now() - lastSentMemory < 10000) { // 10 segundos de trava de memória
          return { success: true, alreadySent: true };
        }
        globalAny.lastVerificationSent.set(ctx.user.email!, Date.now());

        // Verificar se já existe um código enviado recentemente no banco (menos de 30 segundos)
        const user = await getUserByOpenId(ctx.user.openId);
        if (user?.resetTokenExpires) {
          const now = new Date();
          const expires = new Date(user.resetTokenExpires);
          const diffSeconds = (expires.getTime() - now.getTime()) / 1000;
          if (diffSeconds > 570) {
            return { success: true, alreadySent: true };
          }
        }
        
        const digits = input?.digits || 4;
        const min = Math.pow(10, digits - 1);
        const max = Math.pow(10, digits) - 1;
        const code = Math.floor(min + Math.random() * (max - min + 1)).toString();
        const expires = new Date(Date.now() + 600000);

        await setResetToken(ctx.user.id, code, expires);
        
        emailService.sendVerificationCodeEmail(ctx.user.email!, ctx.user.name || "Cliente", code).catch(e => {
          console.error("[VerificationCode] Failed to send code email:", e);
        });
        
        return { success: true };
      }),

    deleteAccount: protectedProcedure
      .input(z.object({ verificationCode: z.string().length(6) }))
      .mutation(async ({ ctx, input }) => {
        const { getUserByResetToken, deleteUser, clearResetToken } = await import("./db");
        
        const user = await getUserByResetToken(input.verificationCode);
        if (!user || user.id !== ctx.user.id || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
          return { success: false, error: "Código de verificação inválido ou expirado" };
        }

        await deleteUser(ctx.user.id);
        
        // Limpar cookie de sessão
        const { getSessionCookieOptions } = await import("./_core/cookies");
        const { COOKIE_NAME } = await import("../shared/const");
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

        return { success: true };
      }),
  }),

  // ============================================
  // ADMIN ROUTES (protegidas com adminProcedure)
  // ============================================
  admin: router({
    listUsers: adminProcedure.query(async () => {
      const { getAllUsers } = await import("./db");
      return getAllUsers();
    }),

    addUserBalance: adminProcedure
      .input(z.object({
        userId: z.number(),
        amount: z.number().positive(), // em centavos
      }))
      .mutation(async ({ input }) => {
        const { addUserBalance } = await import("./db");
        return addUserBalance(input.userId, input.amount);
      }),

    createCoupon: adminProcedure
      .input(z.object({
        code: z.string().min(3).max(50).toUpperCase(),
        value: z.number().positive(), // em centavos
        description: z.string().max(255).optional(),
        maxRedemptions: z.number().min(1).max(10000).optional(), // null = ilimitado
        expiresAt: z.string().datetime().optional(),
      }))
      .mutation(async ({ input }) => {
        const { createCoupon } = await import("./db");
        return createCoupon({
          code: input.code,
          value: input.value,
          description: input.description ?? null,
          maxRedemptions: input.maxRedemptions ?? 1,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        } as any);
      }),

    listCoupons: adminProcedure.query(async () => {
      const { getAllCoupons } = await import("./db");
      return getAllCoupons();
    }),

    toggleCoupon: adminProcedure
      .input(z.object({
        couponId: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const { toggleCouponActive } = await import("./db");
        await toggleCouponActive(input.couponId, input.isActive);
        return { success: true };
      }),

    deleteCoupon: adminProcedure
      .input(z.object({ couponId: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteCoupon } = await import("./db");
        await deleteCoupon(input.couponId);
        return { success: true };
      }),

    // Produto CRUD
    createProduct: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(2000).optional(),
        price: z.number().positive(), // em centavos
        trialDays: z.number().min(0).max(365),
        benefits: z.string().max(2000).optional(),
        imageUrl: z.string().max(512).optional(),
        affiliateLink: z.string().max(512),
        category: z.string().min(1).max(100),
      }))
      .mutation(async ({ input }) => {
        const { createProduct } = await import("./db");
        return createProduct(input);
      }),

    updateProduct: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(2000).optional(),
        price: z.number().positive().optional(),
        trialDays: z.number().min(0).max(365).optional(),
        benefits: z.string().max(2000).optional(),
        imageUrl: z.string().max(512).optional(),
        affiliateLink: z.string().max(512).optional(),
        category: z.string().min(1).max(100).optional(),
        isActive: z.union([z.boolean(), z.number().int().min(0).max(1)]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateProduct } = await import("./db");
        const updateData = {
          ...input,
          ...(input.isActive !== undefined && { isActive: typeof input.isActive === 'boolean' ? (input.isActive ? 1 : 0) : input.isActive })
        };
        return updateProduct(input.id, updateData);
      }),

    deleteProduct: adminProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteProduct } = await import("./db");
        await deleteProduct(input.productId);
        return { success: true };
      }),

    listAllProducts: adminProcedure.query(async () => {
      const { getAllProducts } = await import("./db");
      return getAllProducts();
    }),

    // Histórico de transações de um usuário
    getUserTransactions: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const { getUserTransactions } = await import("./db");
        return getUserTransactions(input.userId);
      }),

    // Todas as orders do banco
    listAllOrders: adminProcedure.query(async () => {
      const { getAllOrders } = await import("./db");
      return getAllOrders();
    }),
  }),

  // ============================================
  // COUPON ROUTES
  // ============================================
  coupon: router({
    redeem: protectedProcedure
      .input(z.object({ code: z.string().toUpperCase().min(1).max(50) }))
      .mutation(async ({ ctx, input }) => {
        const { redeemCoupon } = await import("./db");
        return redeemCoupon(input.code, ctx.user.id);
      }),
  }),

  // ============================================
  // WALLET ROUTES
  // ============================================
  wallet: router({
    getBalance: protectedProcedure.query(async ({ ctx }) => {
      const { getUserBalance } = await import("./db");
      return getUserBalance(ctx.user.id);
    }),

    getUserTransactions: protectedProcedure.query(async ({ ctx }) => {
      const { getUserTransactions } = await import("./db");
      return getUserTransactions(ctx.user.id);
    }),

    checkoutWithBalance: protectedProcedure
      .input(z.object({
        amount: z.number().positive(), // em centavos
        cartItems: z.array(z.object({
          productId: z.number(),
          quantity: z.number().min(1),
          price: z.number().positive(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const { checkoutWithBalance } = await import("./db");
        return checkoutWithBalance(ctx.user.id, input.amount, input.cartItems);
      }),

    checkoutWithBalanceAndPix: protectedProcedure
      .input(z.object({
        totalAmount: z.number().positive(),
        balanceToUse: z.number().positive(),
        cartItems: z.array(z.object({
          productId: z.number(),
          quantity: z.number().min(1),
          price: z.number().positive(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const { checkoutWithBalanceAndPix } = await import("./db");
        return checkoutWithBalanceAndPix(ctx.user.id, input.totalAmount, input.balanceToUse, input.cartItems);
      }),

    createDepositPix: protectedProcedure
      .input(z.object({ amount: z.number().min(100) }))
      .mutation(async ({ ctx, input }) => {
        const { efiPayment } = await import("./efi-payment");
        const txid = `DEP${Date.now()}${ctx.user.id}`;
        return efiPayment.createPix(input.amount / 100, ctx.user.id, `Recarga de Carteira - MOTA STORE`);
      }),

    confirmDeposit: protectedProcedure
      .input(z.object({ amount: z.number().positive(), txid: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { depositBalance } = await import("./db");
        const { efiPayment } = await import("./efi-payment");
        
        // Validar status do PIX antes de creditar (segurança)
        const pixStatus = await efiPayment.checkPixStatus(input.txid);
        if (pixStatus.status !== "COMPLETED") {
          throw new Error("PIX não foi confirmado. Status: " + pixStatus.status);
        }
        
        // Validar que o valor pago corresponde ao valor solicitado (tolerância de 1 centavo)
        const amountDifference = Math.abs((pixStatus.amount || 0) - (input.amount / 100));
        if (amountDifference > 0.01) {
          throw new Error(`Valor do PIX (R$ ${pixStatus.amount?.toFixed(2)}) não corresponde ao valor solicitado (R$ ${(input.amount / 100).toFixed(2)})`);
        }
        
        return depositBalance(ctx.user.id, input.amount);
      }),

    checkDepositStatus: protectedProcedure
      .input(z.object({ txid: z.string() }))
      .query(async ({ input }) => {
        const { efiPayment } = await import("./efi-payment");
        return efiPayment.checkPixStatus(input.txid);
      }),

    getCashbackStatus: protectedProcedure.query(async ({ ctx }) => {
      const { getUserByOpenId } = await import("./db");
      const user = await getUserByOpenId(ctx.user.openId!);
      return { hasCashbackBenefit: user?.hasCashbackBenefit === 1 };
    }),
  }),

  products: router({
    list: publicProcedure.query(() => getProducts()),
    getById: publicProcedure.input(z.number()).query(({ input }) => getProductById(input)),
  }),

  cart: router({
    getItems: protectedProcedure.query(({ ctx }) => getCartItems(ctx.user.id)),
    addItem: protectedProcedure
      .input(z.object({ productId: z.number(), quantity: z.number().optional() }))
      .mutation(({ ctx, input }) => addToCart(ctx.user.id, input.productId, input.quantity || 1)),
    removeItem: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        const { removeFromCart } = await import("./db");
        await removeFromCart(input);
        return { success: true };
      }),
  }),

  orders: router({
    list: protectedProcedure.query(({ ctx }) => getUserOrders(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({ totalAmount: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { createOrder } = await import("./db");
        return createOrder(ctx.user.id, input.totalAmount);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        status: z.enum(["pending", "completed", "failed", "cancelled"])
      }))
      .mutation(async ({ input }) => {
        const { updateOrderStatus } = await import("./db");
        await updateOrderStatus(input.orderId, input.status);
        return { success: true };
      }),
  }),

  payments: router({
    createPix: protectedProcedure
      .input(z.object({ orderId: z.number(), amount: z.number() }))
      .mutation(async ({ input }) => {
        const { createPixPayment } = await import("./efi-payment");
        return createPixPayment(input.amount, input.orderId);
      }),
    checkStatus: protectedProcedure
      .input(z.object({ txid: z.string() }))
      .query(async ({ input }) => {
        const { checkPixPaymentStatus } = await import("./efi-payment");
        return checkPixPaymentStatus(input.txid);
      }),
  }),
});

export type AppRouter = typeof appRouter;
