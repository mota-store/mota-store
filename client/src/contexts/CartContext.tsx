import React, { createContext, useContext, ReactNode, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface Position {
  x: number;
  y: number;
}

interface CartContextType {
  cartCount: number;
  triggerFlyAnimation: (startPos: Position) => void;
  invalidateCart: () => Promise<void>;
  flyAnimations: Array<{ id: number; startPos: Position; endPos: Position }>;
  removeFlyAnimation: (id: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  
  const { data: items } = trpc.cart.getItems.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const [flyAnimations, setFlyAnimations] = useState<Array<{ id: number; startPos: Position; endPos: Position }>>([]);

  const cartCount = items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const triggerFlyAnimation = (startPos: Position) => {
    const cartIcon = document.getElementById("cart-icon");
    if (!cartIcon) return;

    const rect = cartIcon.getBoundingClientRect();
    const endPos = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    setFlyAnimations((prev) => [
      ...prev,
      { id: Date.now(), startPos, endPos },
    ]);
  };

  const removeFlyAnimation = (id: number) => {
    setFlyAnimations((prev) => prev.filter((anim) => anim.id !== id));
  };

  const invalidateCart = async () => {
    await utils.cart.getItems.invalidate();
  };

  return (
    <CartContext.Provider
      value={{
        cartCount,
        triggerFlyAnimation,
        invalidateCart,
        flyAnimations,
        removeFlyAnimation,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
