import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
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
          const { getSessionCookieOptions } = await import("./_core/cookies");
          const { COOKIE_NAME, ONE_YEAR_MS } = await import("@shared/const");
          
          const token = await sdk.createSessionToken(result.user.openId, {
            name: result.user.name || input.name || result.user.email?.split("@")[0] || "Usuário",
          });
          
          const cookieOptions = getSessionCookieOptions(ctx.req);
          
          // Passo 3.3: Definir o cookie ANTES de retornar
          ctx.res.cookie(COOKIE_NAME, token, {
            ...cookieOptions,
            maxAge: ONE_YEAR_MS,
          });
          
          console.log(`[Register Auto-Login] Sucesso para: ${input.email}`);
          
          // Envio síncrono obrigatório
          try {
            await emailService.sendWelcomeEmail(input.email, input.name);
          } catch (e) {
            console.error("[Register] Failed to send welcome email:", e);
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
          // Se um código de verificação foi fornecido, validar antes de alterar a senha
          if (input.verificationCode) {
            const { getUserByResetToken, clearResetToken } = await import("./db");
            const user = await getUserByResetToken(input.verificationCode);
            if (!user || user.id !== ctx.user.id || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
              return { success: false, error: "Código de verificação inválido ou expirado" };
            }
            // Limpar o código após uso
            await clearResetToken(ctx.user.id);
          }

          const bcrypt = await import("bcrypt");
          updateData.passwordHash = await bcrypt.hash(input.password, 10);
        }
        
        await updateUser(ctx.user.id, updateData);
        return { success: true };
      }),
    getUploadUrl: protectedProcedure
      .input(z.object({ filename: z.string(), contentType: z.string() }))
      .mutation(async ({ input }) => {
        const { ENV } = await import("./_core/env");
        const forgeUrl = ENV.forgeApiUrl?.replace(/\/+$/, "");
        const forgeKey = ENV.forgeApiKey;
        
        if (!forgeUrl || !forgeKey) {
          throw new Error("Storage service not configured");
        }

        const key = `avatars/${Date.now()}_${input.filename}`;
        const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
        presignUrl.searchParams.set("path", key);

        const presignResp = await fetch(presignUrl, {
          headers: { Authorization: `Bearer ${forgeKey}` },
        });

        const { url: s3Url } = (await presignResp.json()) as { url: string };
        return { 
          uploadUrl: s3Url,
          publicUrl: `/manus-storage/${key}` 
        };
      }),
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const { getUserByEmail, setResetToken } = await import("./db");
        const { sendPasswordResetEmail } = await import("./email");
        const crypto = await import("crypto");
        
        const user = await getUserByEmail(input.email);
        if (!user) return { success: true }; // Don't reveal user existence

        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 3600000); // 1 hour

        await setResetToken(user.id, token, expires);
        
        // Envio síncrono obrigatório
        try {
          await emailService.sendPasswordResetEmail(user.email!, user.name || "Cliente", token);
        } catch (e) {
          console.error("[ForgotPassword] Failed to send reset email:", e);
        }
        
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
      .mutation(async ({ ctx }) => {
        const { setResetToken } = await import("./db");
        const { sendVerificationCodeEmail } = await import("./email");
        
        // Gerar código de 4 dígitos
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const expires = new Date(Date.now() + 600000); // 10 minutos

        // Reutilizar o campo resetToken para o código de 4 dígitos
        await setResetToken(ctx.user.id, code, expires);
        
        // Envio síncrono obrigatório
        try {
          await emailService.sendVerificationCodeEmail(ctx.user.email!, ctx.user.name || "Cliente", code);
        } catch (e) {
          console.error("[VerificationCode] Failed to send code email:", e);
        }
        
        return { success: true };
      }),
    verifyCodeAndShowPassword: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { getUserByResetToken } = await import("./db");
        
        const user = await getUserByResetToken(input.code);
        if (!user || user.id !== ctx.user.id || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
          return { success: false, error: "Código inválido ou expirado" };
        }

        // Se o código estiver correto, retornamos um sinal de sucesso. 
        // Nota: No banco a senha está em hash, então o frontend não conseguirá "ver" a senha original.
        // Como o usuário quer "ver a senha atual", e ela é um hash, vamos informar que ela é protegida.
        // Mas para satisfazer o requisito de "ver", vamos permitir que ele veja o hash ou uma mensagem.
        // Na verdade, o ideal é permitir que ele redefina sem saber a antiga se ele tem o código.
        return { success: true };
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
