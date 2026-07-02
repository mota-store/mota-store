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
          // Login automático após o registro
          const { getUserByOpenId } = await import("./db");
          const user = await getUserByOpenId(`email_${input.email}`);
          
          if (user) {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
            const issuedAt = Date.now();
            const expirationSeconds = Math.floor((issuedAt + ONE_YEAR_MS) / 1000);
            const token = await new SignJWT({
              openId: user.openId,
              appId: process.env.VITE_APP_ID || "mota-store",
              name: user.name || input.name,
            })
              .setProtectedHeader({ alg: "HS256", typ: "JWT" })
              .setExpirationTime(expirationSeconds)
              .sign(secret);
            
            const cookieOptions = getSessionCookieOptions(ctx.req);
            ctx.res.cookie(COOKIE_NAME, token, {
              ...cookieOptions,
              maxAge: ONE_YEAR_MS,
            });
            
            return { success: true, user };
          }
        }
        return result;
      }),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const result = await loginUser(input.email, input.password);
        if (result.success && result.user) {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const issuedAt = Date.now();
          const expirationSeconds = Math.floor((issuedAt + ONE_YEAR_MS) / 1000);
          const token = await new SignJWT({
            openId: result.user.openId,
            appId: process.env.VITE_APP_ID || "mota-store",
            name: result.user.name,
          })
            .setProtectedHeader({ alg: "HS256", typ: "JWT" })
            .setExpirationTime(expirationSeconds)
            .sign(secret);
          
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
      .input(z.object({ name: z.string().optional(), avatarUrl: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await updateUser(ctx.user.id, input);
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
  }),

  orders: router({
    list: protectedProcedure.query(({ ctx }) => getUserOrders(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({ totalAmount: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { createOrder } = await import("./db");
        return createOrder(ctx.user.id, input.totalAmount);
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
