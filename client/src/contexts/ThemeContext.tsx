import React, { createContext, useContext, useEffect, useState, useLayoutEffect } from "react";

type Theme = "light" | "dark";

export const ACCENT_COLORS = [
  { name: "Original", value: "260", hex: "#0F172A" }, // Azul original
  { name: "Roxo", value: "280", hex: "#7C3AED" },
  { name: "Verde", value: "142", hex: "#16A34A" },
  { name: "Vermelho", value: "25", hex: "#E11D48" }, 
  { name: "Rosa", value: "330", hex: "#DB2777" },
  { name: "Branco", value: "white", hex: "#FFFFFF" }, 
  { name: "Ciano", value: "190", hex: "#0891B2" },
  { name: "Amarelo", value: "85", hex: "#EAB308" }, 
];

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
  accentHue: string;
  setAccentHue: (hue: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  const [accentHue, setAccentHue] = useState<string>(() => {
    return localStorage.getItem("accent-hue") || "260";
  });

  // Usar useLayoutEffect para aplicar as classes de tema antes da renderização
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  // Aplicar cores de destaque instantaneamente
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (accentHue === "white") {
      root.style.setProperty("--accent-hue", "0");
      root.style.setProperty("--dynamic-accent-light", "#000000");
      root.style.setProperty("--dynamic-accent-dark", "#FFFFFF");
      // Ajustar o foreground para preto quando o fundo for branco para manter contraste
      root.style.setProperty("--accent-foreground-dynamic", "#000000");
    } else {
      root.style.setProperty("--accent-hue", accentHue);
      root.style.removeProperty("--dynamic-accent-light");
      root.style.removeProperty("--dynamic-accent-dark");
      root.style.removeProperty("--accent-foreground-dynamic");
    }
    localStorage.setItem("accent-hue", accentHue);
  }, [accentHue]);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable, accentHue, setAccentHue }}>
      {/* 
        Injetamos um estilo inline dinâmico para garantir que a mudança seja sentida 
        imediatamente por todos os componentes que dependem de variáveis CSS.
      */}
      <style>{`
        :root {
          --accent-hue: ${accentHue === "white" ? "0" : accentHue};
          ${accentHue === "white" ? "--dynamic-accent-light: #000000; --dynamic-accent-dark: #FFFFFF; --accent-foreground-dynamic: #000000;" : ""}
        }
      `}</style>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
