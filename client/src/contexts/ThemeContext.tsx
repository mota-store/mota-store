import React, { createContext, useContext, useEffect, useState } from "react";

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

  useEffect(() => {
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

  useEffect(() => {
    const root = document.documentElement;
    if (accentHue === "white") {
      // Se for branco, usamos valores específicos para garantir contraste
      root.style.setProperty("--accent-hue", "0"); // Não importa o hue
      root.style.setProperty("--dynamic-accent-light", "#000000"); // Preto no modo claro para contraste
      root.style.setProperty("--dynamic-accent-dark", "#FFFFFF"); // Branco no modo escuro
    } else {
      root.style.setProperty("--accent-hue", accentHue);
      root.style.removeProperty("--dynamic-accent-light");
      root.style.removeProperty("--dynamic-accent-dark");
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
