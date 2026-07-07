import bcrypt from "bcrypt";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./notification";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string; userId?: number; user?: any }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return { success: false, error: "Email already registered" };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const finalName = name || email.split("@")[0];
    const result = await db.insert(users).values({
      email,
      passwordHash,
      name: finalName,
      loginMethod: "email",
      openId: `email_${email}`,
      lastSignedIn: new Date(),
    });

    const userId = (result as any).insertId;
    return { success: true, userId, user: { id: userId, email, name: finalName, openId: `email_${email}` } };
  } catch (error) {
    console.error("[Email Auth] Registration failed:", error);
    return { success: false, error: "Registration failed" };
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: any }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Find user by email
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length === 0) {
      return { success: false, error: "Invalid email or password" };
    }

    const user = result[0];

    // Verify password
    if (!user.passwordHash) {
      return { success: false, error: "Invalid email or password" };
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      return { success: false, error: "Invalid email or password" };
    }

    // Update last signed in
    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, user.id));

    return { success: true, user };
  } catch (error) {
    console.error("[Email Auth] Login failed:", error);
    return { success: false, error: "Login failed" };
  }
}
