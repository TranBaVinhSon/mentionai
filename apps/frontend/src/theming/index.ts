import { colors, opacity } from "./colors";

export interface ThemeVariables {
  background: string;
  foreground: string;
  border: string;
  muted: string;
  "muted-foreground": string;
  body: string;
  "body-foreground": string;
  "primary-foreground": string;
}

export const themes: Record<string, ThemeVariables> = {
  default: {
    background: colors.neutral[50],
    foreground: "#373632",
    border: opacity(colors.neutral[200], 80),
    muted: colors.neutral[100],
    "muted-foreground": colors.neutral[400],
    body: opacity(colors.neutral[200], 50),
    "body-foreground": colors.neutral[700],
    "primary-foreground": colors.indigo[500],
  },
  dark: {
    background: colors.neutral[950],
    foreground: colors.neutral[100],
    border: colors.neutral[900],
    muted: colors.neutral[800],
    "muted-foreground": colors.neutral[600],
    body: colors.neutral[900],
    "body-foreground": colors.neutral[200],
    "primary-foreground": colors.teal[400],
  },
};

export * from "./provider";
