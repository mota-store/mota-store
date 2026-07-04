import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { getProducts, getProductById, getCartItems, addToCart, getUserOrders, updateUser } from "./db";
import { loginUser, registerUser } from "./_core/email-auth";
import { SignJWT } from "jose";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
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
        const result = await registerUser(input.email, input.password, input.name);
        
        if (result.success && result.userId) {
          const loginResult = await loginUser(input.email, input.password);
          
          if (loginResult.success && loginResult.user) {
            const { sdk } = await import("./_core/sdk");
            const token = await sdk.createSessionToken(loginResult.user.openId, {
              name: loginResult.user.name,
            });
            
            const cookieOptions = getSessionCookieOptions(ctx.req);
            ctx.res.cookie(COOKIE_NAME, token, {
              ...cookieOptions,
              maxAge: ONE_YEAR_MS,
            });
            
            return { success: true, user: loginResult.user };
          }
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
            name: result.user.name,
          });
          
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, {
            ...cookieOptions,
            maxAge: ONE_YEAR_MS,
          });
          
          return { success: true, user: result.user };
        }
        return result;
      }),
    updateProfile: protectedProcedure
      .input(z.object({ 
        name: z.string().optional(), 
        avatarUrl: z.string().optional(),
        password: z.string().min(6).optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const updateData: any = { name: input.name, avatarUrl: input.avatarUrl };
        
        if (input.password) {
          const bcrypt = await import("bcrypt");
          updateData.password = await bcrypt.hash(input.password, 10);
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
        await sendPasswordResetEmail(user.email!, user.name || "Cliente", token);
        
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
