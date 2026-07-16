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
          
          if (now - lastSent > 30000 || lastSent === 0) { // 30 segundos de intervalo ou primeira vez
            globalAny.lastWelcomeEmailSent.set(input.email, now);
            try {
              console.log(`[Register] Disparando e-mail de boas-vindas para: ${input.email}`);
              const emailService = await import("./email");
              const sent = await emailService.sendWelcomeEmail(result.user.email!, result.user.name || "Cliente");
              console.log(`[Register] Status do envio de boas-vindas: ${sent ? 'Sucesso' : 'Falha'}`);
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
        // Se apenas mudar nome/avatar (sem senha), não precisa de código de verificação
        const hasPasswordChange = !!input.password;
        
        if (hasPasswordChange) {
          // Mudança de senha exige código de verificação
          if (!input.verificationCode) {
            return { success: false, error: "Código de verificação é obrigatório para alterar senha" };
          }
          
          const { getUserByResetToken, clearResetToken } = await import("./db");
          const user = await getUserByResetToken(input.verificationCode);
          if (!user || user.id !== ctx.user.id || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
            return { success: false, error: "Código de verificação inválido ou expirado" };
          }
          await clearResetToken(ctx.user.id);

          const bcrypt = await import("bcrypt");
          const passwordHash = await bcrypt.hash(input.password, 10);
          await updateUser(ctx.user.id, { passwordHash });
          return { success: true };
        }
        
        // Apenas mudar nome/avatar — direto
        const updateData: any = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;
        
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
        
        // Limitar tamanho (máximo ~10MB em base64 para suportar imagens de 5MB)
        if (input.base64Data.length > 14000000) {
          throw new Error("Imagem muito grande no servidor. Máximo 10MB em base64.");
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
        
        console.log(`[ForgotPassword] Disparando e-mail de recuperação para: ${input.email}`);
        await emailService.sendPasswordResetEmail(user.email!, user.name || "Cliente", token).then(sent => {
          console.log(`[ForgotPassword] Status do envio de recuperação: ${sent ? 'Sucesso' : 'Falha'}`);
        }).catch(e => {
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
      .input(z.object({ digits: z.number().min(4).max(6).default(6) }).optional())
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
        
        const digits = input?.digits || 6;
        const min = Math.pow(10, digits - 1);
        const max = Math.pow(10, digits) - 1;
        const code = Math.floor(min + Math.random() * (max - min + 1)).toString();
        const expires = new Date(Date.now() + 600000);

        await setResetToken(ctx.user.id, code, expires);
        
        console.log(`[VerificationCode] Disparando e-mail de código para: ${ctx.user.email}`);
        await emailService.sendVerificationCodeEmail(ctx.user.email!, ctx.user.name || "Cliente", code).then(sent => {
          console.log(`[VerificationCode] Status do envio de código: ${sent ? 'Sucesso' : 'Falha'}`);
        }).catch(e => {
          console.error("[VerificationCode] Failed to send code email:", e);
        });
        
        return { success: true };
      }),

    deleteAccount: protectedProcedure
      .input(z.object({ verificationCode: z.string().length(6) }))
      .mutation(async ({ ctx, input }) => {
        const { getUserByResetToken, deleteUser, clearResetToken } = await import("./db");
        
        // 1. Validar e invalidar o token imediatamente para evitar reentrância/duplicação
        const user = await getUserByResetToken(input.verificationCode);
        if (!user || user.id !== ctx.user.id || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
          throw new Error("Código de verificação inválido ou expirado");
        }

        // Trava global por memória para evitar rajadas (bursts) rápidas de exclusão
        const globalAny = global as any;
        if (!globalAny.lastDeletionSent) globalAny.lastDeletionSent = new Map<number, number>();
        const lastSentMemory = globalAny.lastDeletionSent.get(user.id) || 0;
        if (Date.now() - lastSentMemory < 30000) { // 30 segundos de trava
          return { success: true };
        }
        globalAny.lastDeletionSent.set(user.id, Date.now());

        // Limpar o token no banco ANTES de qualquer outra ação pesada (como enviar e-mail)
        await clearResetToken(user.id);

        // 2. Enviar e-mail de confirmação
        try {
          console.log(`[DeleteAccount] Enviando e-mail de despedida para: ${user.email}`);
          await emailService.sendAccountDeletionEmail(user.email!, user.name || "Cliente");
        } catch (e) {
          console.error("[DeleteAccount] Falha ao enviar e-mail de exclusão:", e);
        }

        // 3. Excluir o usuário
        await deleteUser(ctx.user.id);
        
        // 4. Limpar cookie de sessão
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
        amount: z.number(), // em centavos, aceita positivo ou negativo
      }))
      .mutation(async ({ input }) => {
        const { addUserBalance, getUserById } = await import("./db");
        
        // Trava de idempotência global para evitar cliques duplos no admin
        const globalAny = global as any;
        if (!globalAny.lastAdminBalanceRequest) globalAny.lastAdminBalanceRequest = new Map<string, number>();
        
        const now = Date.now();
        const timeBucket = Math.floor(now / 500);
        const requestId = `${input.userId}-${input.amount}-${timeBucket}`;
        
        if (globalAny.lastAdminBalanceRequest.has(requestId)) {
          console.log(`[admin.addUserBalance] Ignorando requisição duplicada para ${requestId}`);
          const user = await getUserById(input.userId);
          return { success: true, newBalance: user?.balance || 0 };
        }
        globalAny.lastAdminBalanceRequest.set(requestId, now);

        return addUserBalance(input.userId, input.amount);
      }),

    deductUserBalance: adminProcedure
      .input(z.object({
        userId: z.number(),
        amount: z.number().positive(), // em centavos
      }))
      .mutation(async ({ input }) => {
        const { addUserBalance, getUserById } = await import("./db");
        
        // Trava de idempotência global para evitar cliques duplos no admin
        const globalAny = global as any;
        if (!globalAny.lastAdminBalanceRequest) globalAny.lastAdminBalanceRequest = new Map<string, number>();
        
        const now = Date.now();
        const timeBucket = Math.floor(now / 500);
        const requestId = `${input.userId}-${-input.amount}-${timeBucket}`;
        
        if (globalAny.lastAdminBalanceRequest.has(requestId)) {
          console.log(`[admin.deductUserBalance] Ignorando requisição duplicada para ${requestId}`);
          const user = await getUserById(input.userId);
          return { success: true, newBalance: user?.balance || 0 };
        }
        globalAny.lastAdminBalanceRequest.set(requestId, now);

        return addUserBalance(input.userId, -input.amount);
      }),

    deleteUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteUser, getUserById } = await import("./db");
        
        // Trava global por memória para evitar rajadas (bursts) rápidas de exclusão
        const globalAny = global as any;
        if (!globalAny.lastDeletionSent) globalAny.lastDeletionSent = new Map<number, number>();
        const lastSentMemory = globalAny.lastDeletionSent.get(input.userId) || 0;
        if (Date.now() - lastSentMemory < 30000) { // 30 segundos de trava
          return { success: true };
        }
        globalAny.lastDeletionSent.set(input.userId, Date.now());

        const user = await getUserById(input.userId);
        if (user) {
          const emailService = await import("./email");
          await emailService.sendAccountDeletionEmail(user.email!, user.name || "Cliente");
        }
        await deleteUser(input.userId);
        return { success: true };
      }),

    banUser: adminProcedure
      .input(z.object({ userId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { updateUser, getUserById } = await import("./db");
        const user = await getUserById(input.userId);
        if (!user) throw new Error("Usuário não encontrado");
        
        await updateUser(input.userId, { role: 'banned' });

        // Trava de idempotência global para evitar envios duplicados de e-mail de banimento
        const globalAny = global as any;
        if (!globalAny.lastBanEmailSent) globalAny.lastBanEmailSent = new Map<number, number>();
        
        const now = Date.now();
        const lastSent = globalAny.lastBanEmailSent.get(input.userId) || 0;
        
        if (now - lastSent < 30000) { // 30 segundos de trava
          console.log(`[admin.banUser] Ignorando envio de e-mail duplicado para usuário ${input.userId}`);
          return { success: true };
        }
        globalAny.lastBanEmailSent.set(input.userId, now);
        
        const emailService = await import("./email");
        await emailService.sendBanEmail(user.email!, user.name || "Cliente", input.reason || "Violação dos termos de uso");
        
        return { success: true };
      }),

    unbanUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const { updateUser, getUserById } = await import("./db");
        const user = await getUserById(input.userId);
        if (!user) throw new Error("Usuário não encontrado");
        await updateUser(input.userId, { role: 'user' });
        return { success: true };
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
        stock: z.number().int().min(0).default(0),
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
        stock: z.number().int().min(0).optional(),
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

    listAllOrders: adminProcedure.query(async () => {
      const { listAllOrders } = await import("./db");
      return listAllOrders();
    }),
  }),

  // ============================================
  // PUBLIC / USER ROUTES
  // ============================================
  products: router({
    list: publicProcedure.query(async () => {
      return getProducts();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getProductById(input.id);
      }),
  }),

  cart: router({
    getItems: protectedProcedure.query(async ({ ctx }) => {
      return getCartItems(ctx.user.id);
    }),
    addItem: protectedProcedure
      .input(z.object({ productId: z.number(), quantity: z.number().min(-5).max(5).default(1) }))
      .mutation(async ({ ctx, input }) => {
        await addToCart(ctx.user.id, input.productId, input.quantity);
        return { success: true };
      }),
    removeItem: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        const { removeFromCart } = await import("./db");
        await removeFromCart(input);
        return { success: true };
      }),
  }),

  orders: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserOrders(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({ totalAmount: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { createOrder } = await import("./db");
        return createOrder(ctx.user.id, input.totalAmount);
      }),
    updateStatus: protectedProcedure
      .input(z.object({ orderId: z.number(), status: z.string() }))
      .mutation(async ({ input }) => {
        const { updateOrderStatus } = await import("./db");
        await updateOrderStatus(input.orderId, input.status);
        return { success: true };
      }),
    cancel: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { cancelOrder } = await import("./db");
        return cancelOrder(input.orderId, ctx.user.id);
      }),
  }),

  wallet: router({
    getBalance: protectedProcedure.query(async ({ ctx }) => {
      const { getUserBalance } = await import("./db");
      return getUserBalance(ctx.user.id);
    }),
    deposit: protectedProcedure
      .input(z.object({ amount: z.number().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { depositBalance } = await import("./db");
        return depositBalance(ctx.user.id, input.amount);
      }),
    checkoutWithBalance: protectedProcedure
      .input(z.object({ 
        amount: z.number(), 
        cartItems: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
          price: z.number()
        }))
      }))
      .mutation(async ({ ctx, input }) => {
        const { checkoutWithBalance } = await import("./db");
        return checkoutWithBalance(ctx.user.id, input.amount, input.cartItems);
      }),
    checkoutWithBalanceAndPix: protectedProcedure
      .input(z.object({
        totalAmount: z.number(),
        balanceToUse: z.number(),
        cartItems: z.array(z.any())
      }))
      .mutation(async ({ ctx, input }) => {
        const { checkoutWithBalanceAndPix } = await import("./db");
        return checkoutWithBalanceAndPix(ctx.user.id, input);
      }),
    redeemCoupon: protectedProcedure
      .input(z.object({ code: z.string().min(3) }))
      .mutation(async ({ ctx, input }) => {
        const { redeemCoupon } = await import("./db");
        return redeemCoupon(ctx.user.id, input.code);
      }),
    getTransactions: protectedProcedure.query(async ({ ctx }) => {
      const { getUserTransactions } = await import("./db");
      return getUserTransactions(ctx.user.id);
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
