/**
 * Browser console format specifier parsing and ANSI color conversion.
 *
 * Converts browser-style %c/%s format strings to ANSI-colored terminal output.
 */

const ANSI_RESET = "\x1b[39m";

/** CSS color keywords that should reset to default terminal color */
const RESET_KEYWORDS = new Set(["inherit", "initial", "unset", "revert"]);

/** Regex to extract color value from CSS style string (case-insensitive) */
const COLOR_REGEX = /(^|;)\s*color\s*:\s*([^;]+)/i;

/**
 * Check if args array has format specifiers that need processing.
 */
export function hasFormatSpecifiers(args: unknown[]): boolean {
  if (args.length === 0) return false;
  const first = args[0];
  return (
    typeof first === "string" && (first.includes("%c") || first.includes("%s"))
  );
}

/**
 * Extract the color value from a CSS style string.
 * Returns undefined if no color property found.
 */
function extractColorFromCSS(cssStyle: string): string | undefined {
  const match = cssStyle.match(COLOR_REGEX);
  if (!match || !match[2]) return undefined;

  let color = match[2].trim();
  // Strip !important
  color = color.replace(/\s*!important\s*$/i, "").trim();
  return color || undefined;
}

/**
 * Convert a CSS color value to ANSI escape sequence.
 * Returns null if color is invalid, ANSI_RESET for reset keywords,
 * or the ANSI code string for valid colors.
 */
function cssColorToANSI(color: string | undefined): string | null {
  if (!color) return null;

  // Handle reset keywords
  const normalized = color.toLowerCase().trim();
  if (RESET_KEYWORDS.has(normalized)) {
    return ANSI_RESET;
  }

  // Use Bun.color() if available
  // Use ansi-16m for consistent output regardless of TTY
  if (typeof Bun !== "undefined" && typeof Bun.color === "function") {
    const ansi = Bun.color(color, "ansi-16m");
    // Bun.color returns null for invalid colors
    return ansi ?? null;
  }

  // Fallback for non-Bun environments
  const result = fallbackCssToAnsi(color);
  return result || null;
}

/**
 * Fallback color conversion for non-Bun environments.
 * Handles hex colors, rgb(), and common named colors.
 */
function fallbackCssToAnsi(color: string): string {
  const c = color.trim().toLowerCase();

  // Hex color: #RGB or #RRGGBB
  if (c.startsWith("#")) {
    const hex = c.slice(1);
    let r: number;
    let g: number;
    let b: number;
    if (hex.length === 3) {
      const h0 = hex[0] ?? "";
      const h1 = hex[1] ?? "";
      const h2 = hex[2] ?? "";
      r = parseInt(h0 + h0, 16);
      g = parseInt(h1 + h1, 16);
      b = parseInt(h2 + h2, 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      return ""; // Invalid hex
    }
    if (isNaN(r) || isNaN(g) || isNaN(b)) return "";
    return `\x1b[38;2;${r};${g};${b}m`;
  }

  // RGB function: rgb(r, g, b)
  const rgbMatch = c.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgbMatch) {
    const [, rs, gs, bs] = rgbMatch;
    return `\x1b[38;2;${rs};${gs};${bs}m`;
  }

  // Common named colors
  const namedColors: Record<string, [number, number, number]> = {
    red: [255, 0, 0],
    green: [0, 128, 0],
    blue: [0, 0, 255],
    white: [255, 255, 255],
    black: [0, 0, 0],
    yellow: [255, 255, 0],
    cyan: [0, 255, 255],
    magenta: [255, 0, 255],
    orange: [255, 165, 0],
    purple: [128, 0, 128],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    pink: [255, 192, 203],
    brown: [165, 42, 42],
    lime: [0, 255, 0],
    navy: [0, 0, 128],
    teal: [0, 128, 128],
    olive: [128, 128, 0],
    maroon: [128, 0, 0],
    aqua: [0, 255, 255],
  };

  const namedColor = namedColors[c];
  if (namedColor) {
    const [r, g, b] = namedColor;
    return `\x1b[38;2;${r};${g};${b}m`;
  }

  return ""; // Unknown color
}

/**
 * Format console args with ANSI colors.
 *
 * Parses %c and %s format specifiers from the first argument and applies
 * corresponding styles or substitutions from subsequent arguments.
 */
export function formatMessageWithANSI(args: unknown[]): string {
  if (args.length === 0) return "";

  const first = args[0];
  if (typeof first !== "string") {
    // No format string, just join as plain text
    return args.map(stringifyArg).join(" ");
  }

  // Check if format specifiers present
  if (!first.includes("%c") && !first.includes("%s")) {
    return args.map(stringifyArg).join(" ");
  }

  const formatStr = first;
  let argIndex = 1; // Start consuming from second arg
  let result = "";
  let ansiEmitted = false; // Track if any ANSI code was emitted
  let i = 0;

  while (i < formatStr.length) {
    // Check for %% escape
    if (formatStr[i] === "%" && formatStr[i + 1] === "%") {
      result += "%";
      i += 2;
      continue;
    }

    // Check for format specifier
    if (formatStr[i] === "%") {
      const specifier = formatStr[i + 1];

      if (specifier === "c") {
        // %c - apply style from next arg
        // Browser behavior: each %c starts fresh - reset if no color provided
        if (argIndex < args.length) {
          const styleArg = args[argIndex];
          argIndex++;

          if (typeof styleArg === "string") {
            const color = extractColorFromCSS(styleArg);
            const ansiCode = cssColorToANSI(color);
            if (ansiCode) {
              result += ansiCode;
              ansiEmitted = true;
            } else if (ansiEmitted) {
              // No usable color but we had prior styling - reset to default
              result += ANSI_RESET;
            }
          } else if (ansiEmitted) {
            // Non-string style arg with prior styling - reset to default
            result += ANSI_RESET;
          }
        }
        // Missing arg: skip the %c (consume nothing, emit nothing)
        i += 2;
        continue;
      }

      if (specifier === "s") {
        // %s - substitute with next arg
        if (argIndex < args.length) {
          result += stringifyArg(args[argIndex]);
          argIndex++;
        } else {
          // Missing arg: leave %s literal
          result += "%s";
        }
        i += 2;
        continue;
      }

      // Unknown %x - treat as literal
      result += formatStr[i];
      i++;
      continue;
    }

    // Regular character
    result += formatStr[i];
    i++;
  }

  // Append trailing reset only if ANSI was emitted
  if (ansiEmitted) {
    result += ANSI_RESET;
  }

  // Append any remaining args
  while (argIndex < args.length) {
    result += " " + stringifyArg(args[argIndex]);
    argIndex++;
  }

  return result;
}

/**
 * Convert an argument to string for display.
 */
function stringifyArg(arg: unknown): string {
  if (arg === undefined) return "undefined";
  if (arg === null) return "null";
  if (typeof arg === "string") return arg;
  if (typeof arg === "number" || typeof arg === "boolean") return String(arg);
  if (arg instanceof Error) return arg.toString();
  if (typeof arg === "object") {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}
