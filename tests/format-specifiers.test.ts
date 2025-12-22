import { test, expect, describe } from "bun:test";
import {
  formatMessageWithANSI,
  hasFormatSpecifiers,
} from "../src/format-specifiers";

describe("hasFormatSpecifiers", () => {
  test("returns true for %c format specifier", () => {
    expect(hasFormatSpecifiers(["%cHello"])).toBe(true);
  });

  test("returns true for %s format specifier", () => {
    expect(hasFormatSpecifiers(["Hello %s"])).toBe(true);
  });

  test("returns true for mixed %c and %s", () => {
    expect(hasFormatSpecifiers(["%cHello %s"])).toBe(true);
  });

  test("returns false for empty array", () => {
    expect(hasFormatSpecifiers([])).toBe(false);
  });

  test("returns false for non-string first arg", () => {
    expect(hasFormatSpecifiers([123, "%c"])).toBe(false);
  });

  test("returns false for plain string", () => {
    expect(hasFormatSpecifiers(["Hello World"])).toBe(false);
  });
});

describe("formatMessageWithANSI", () => {
  const RESET = "\x1b[39m";

  describe("basic cases", () => {
    test("returns empty string for empty args", () => {
      expect(formatMessageWithANSI([])).toBe("");
    });

    test("joins plain args with spaces", () => {
      expect(formatMessageWithANSI(["Hello", "World", 123])).toBe(
        "Hello World 123"
      );
    });

    test("returns plain message when no format specifiers", () => {
      expect(formatMessageWithANSI(["Hello World"])).toBe("Hello World");
    });
  });

  describe("%c color formatting", () => {
    test("applies single color", () => {
      const result = formatMessageWithANSI(["%cHello", "color: red"]);
      expect(result).toContain("\x1b[38;2;255;0;0m");
      expect(result).toContain("Hello");
      expect(result).toEndWith(RESET);
    });

    test("applies hex color", () => {
      const result = formatMessageWithANSI(["%cHello", "color: #3300CC"]);
      expect(result).toContain("\x1b[38;2;51;0;204m");
      expect(result).toContain("Hello");
      expect(result).toEndWith(RESET);
    });

    test("applies short hex color", () => {
      const result = formatMessageWithANSI(["%cHello", "color: #f00"]);
      expect(result).toContain("\x1b[38;2;255;0;0m");
    });

    test("applies multiple colors", () => {
      const result = formatMessageWithANSI([
        "%cHello %cWorld",
        "color: red",
        "color: blue",
      ]);
      expect(result).toContain("\x1b[38;2;255;0;0m");
      expect(result).toContain("\x1b[38;2;0;0;255m");
      expect(result).toContain("Hello ");
      expect(result).toContain("World");
      expect(result).toEndWith(RESET);
    });

    test("handles inherit as reset", () => {
      const result = formatMessageWithANSI([
        "%cHello %cWorld",
        "color: red",
        "color: inherit",
      ]);
      expect(result).toContain("\x1b[38;2;255;0;0m");
      expect(result).toContain(RESET);
      expect(result).toContain("Hello ");
      expect(result).toContain("World");
    });

    test("handles initial as reset", () => {
      const result = formatMessageWithANSI(["%cHello", "color: initial"]);
      expect(result).toContain(RESET);
    });

    test("handles unset as reset", () => {
      const result = formatMessageWithANSI(["%cHello", "color: unset"]);
      expect(result).toContain(RESET);
    });

    test("handles revert as reset", () => {
      const result = formatMessageWithANSI(["%cHello", "color: revert"]);
      expect(result).toContain(RESET);
    });

    test("handles rgb() color", () => {
      const result = formatMessageWithANSI(["%cHello", "color: rgb(100, 150, 200)"]);
      expect(result).toContain("\x1b[38;2;100;150;200m");
    });

    test("extracts color from multi-property CSS", () => {
      const result = formatMessageWithANSI([
        "%cHello",
        "font-weight: bold; color: #ff0000; background: white",
      ]);
      expect(result).toContain("\x1b[38;2;255;0;0m");
    });

    test("strips !important from color", () => {
      const result = formatMessageWithANSI([
        "%cHello",
        "color: red !important",
      ]);
      expect(result).toContain("\x1b[38;2;255;0;0m");
    });

    test("resets color when %c has no color property", () => {
      // Browser behavior: each %c starts fresh
      const result = formatMessageWithANSI([
        "%cRed %cDefault",
        "color: red",
        "font-weight: bold",
      ]);
      expect(result).toContain("\x1b[38;2;255;0;0m"); // Red applied
      expect(result).toContain("Red ");
      // Should have a reset before "Default" since font-weight has no color
      const resetPos = result.indexOf(RESET);
      const defaultPos = result.indexOf("Default");
      expect(resetPos).toBeLessThan(defaultPos);
      expect(resetPos).toBeGreaterThan(0);
    });
  });

  describe("%s substitution", () => {
    test("substitutes string value", () => {
      const result = formatMessageWithANSI(["Hello %s", "World"]);
      expect(result).toBe("Hello World");
    });

    test("substitutes number value", () => {
      const result = formatMessageWithANSI(["Count: %s", 42]);
      expect(result).toBe("Count: 42");
    });

    test("substitutes multiple values", () => {
      const result = formatMessageWithANSI(["%s + %s = %s", 1, 2, 3]);
      expect(result).toBe("1 + 2 = 3");
    });

    test("leaves %s literal when missing arg", () => {
      const result = formatMessageWithANSI(["Hello %s"]);
      expect(result).toBe("Hello %s");
    });
  });

  describe("mixed %c and %s", () => {
    test("handles %c and %s together", () => {
      const result = formatMessageWithANSI([
        "%cHello %s%c!",
        "color: red",
        "World",
        "color: blue",
      ]);
      expect(result).toContain("\x1b[38;2;255;0;0m");
      expect(result).toContain("Hello ");
      expect(result).toContain("World");
      expect(result).toContain("\x1b[38;2;0;0;255m");
      expect(result).toContain("!");
    });

    test("handles debug module style output", () => {
      const result = formatMessageWithANSI([
        "%cnamespace %cMessage%c +0ms",
        "color: #3300CC",
        "color: inherit",
        "color: #3300CC",
      ]);
      expect(result).toContain("\x1b[38;2;51;0;204m");
      expect(result).toContain("namespace ");
      expect(result).toContain("Message");
      expect(result).toContain("+0ms");
    });
  });

  describe("edge cases", () => {
    test("handles %% escape in format string", () => {
      // %% only matters when there are other format specifiers
      const result = formatMessageWithANSI(["%c100%% complete", "color: red"]);
      expect(result).toContain("100% complete");
      expect(result).not.toContain("%%");
    });

    test("handles unknown format specifier literally", () => {
      const result = formatMessageWithANSI(["Hello %x World"]);
      expect(result).toBe("Hello %x World");
    });

    test("appends extra args", () => {
      const result = formatMessageWithANSI([
        "%cHello",
        "color: red",
        "extra1",
        "extra2",
      ]);
      expect(result).toContain("Hello");
      expect(result).toContain("extra1");
      expect(result).toContain("extra2");
    });

    test("handles missing style arg for %c", () => {
      const result = formatMessageWithANSI(["%cHello"]);
      expect(result).toBe("Hello");
    });

    test("handles non-string style arg for %c", () => {
      const result = formatMessageWithANSI(["%cHello", 123]);
      expect(result).toBe("Hello");
    });

    test("handles invalid color gracefully", () => {
      const result = formatMessageWithANSI(["%cHello", "color: notacolor"]);
      // Should not crash, just skip the styling
      expect(result).toContain("Hello");
    });

    test("handles null and undefined args", () => {
      const result = formatMessageWithANSI(["%s %s", null, undefined]);
      expect(result).toBe("null undefined");
    });

    test("does not emit reset when no ANSI emitted", () => {
      // Invalid color - no ANSI should be emitted
      const result = formatMessageWithANSI(["%cHello", "color: invalidcolor"]);
      expect(result).not.toContain(RESET);
    });

    test("handles empty format string", () => {
      const result = formatMessageWithANSI([""]);
      expect(result).toBe("");
    });
  });
});
