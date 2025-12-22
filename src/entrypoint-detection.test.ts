import { describe, test, expect } from "bun:test";
import {
  getWxtEntrypointInfo,
  getWxtEntrypointName,
  isUiPageEntrypoint,
  shouldSkipConsoleForward,
} from "./index";

const ENTRYPOINTS_DIR = "/project/entrypoints";

describe("getWxtEntrypointInfo", () => {
  describe("extracts entrypoint info from directory-based paths", () => {
    test("popup directory", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/popup/main.ts", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "popup",
        dirName: "popup",
        isInSubdirectory: true,
      });
      expect(
        getWxtEntrypointInfo("/project/entrypoints/popup/index.tsx", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "popup",
        dirName: "popup",
        isInSubdirectory: true,
      });
    });

    test("options directory", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/options/main.ts", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "options",
        dirName: "options",
        isInSubdirectory: true,
      });
    });

    test("devtools directory", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/devtools/index.tsx", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "devtools",
        dirName: "devtools",
        isInSubdirectory: true,
      });
    });

    test("sidepanel directory", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/sidepanel/index.tsx", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "sidepanel",
        dirName: "sidepanel",
        isInSubdirectory: true,
      });
    });

    test("named sidepanel (settings.sidepanel)", () => {
      expect(
        getWxtEntrypointInfo(
          "/project/entrypoints/settings.sidepanel/index.tsx",
          ENTRYPOINTS_DIR
        )
      ).toEqual({
        name: "settings",
        dirName: "settings.sidepanel",
        isInSubdirectory: true,
      });
    });

    test("sandbox directory", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/sandbox/index.html", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "sandbox",
        dirName: "sandbox",
        isInSubdirectory: true,
      });
    });

    test("named sandbox (preview.sandbox)", () => {
      expect(
        getWxtEntrypointInfo(
          "/project/entrypoints/preview.sandbox/index.tsx",
          ENTRYPOINTS_DIR
        )
      ).toEqual({
        name: "preview",
        dirName: "preview.sandbox",
        isInSubdirectory: true,
      });
    });

    test("newtab directory", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/newtab/index.tsx", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "newtab",
        dirName: "newtab",
        isInSubdirectory: true,
      });
    });

    test("history directory", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/history/index.tsx", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "history",
        dirName: "history",
        isInSubdirectory: true,
      });
    });

    test("bookmarks directory", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/bookmarks/index.tsx", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "bookmarks",
        dirName: "bookmarks",
        isInSubdirectory: true,
      });
    });

    test("background directory", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/background/index.ts", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "background",
        dirName: "background",
        isInSubdirectory: true,
      });
    });

    test("content script directory", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/content/index.ts", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "content",
        dirName: "content",
        isInSubdirectory: true,
      });
    });

    test("named content script (overlay.content)", () => {
      expect(
        getWxtEntrypointInfo(
          "/project/entrypoints/overlay.content/index.ts",
          ENTRYPOINTS_DIR
        )
      ).toEqual({
        name: "overlay",
        dirName: "overlay.content",
        isInSubdirectory: true,
      });
    });

    test("unlisted script directory", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/worker/index.ts", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "worker",
        dirName: "worker",
        isInSubdirectory: true,
      });
    });
  });

  describe("extracts entrypoint info from single-file paths", () => {
    test("popup.html (single-file)", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/popup.html", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "popup",
        dirName: "popup",
        isInSubdirectory: false,
      });
    });

    test("popup.ts (single-file unlisted-script)", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/popup.ts", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "popup",
        dirName: "popup",
        isInSubdirectory: false,
      });
    });

    test("background.ts", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/background.ts", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "background",
        dirName: "background",
        isInSubdirectory: false,
      });
    });

    test("overlay.content.ts (content script)", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/overlay.content.ts", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "overlay",
        dirName: "overlay.content",
        isInSubdirectory: false,
      });
    });

    test("settings.sidepanel.html (named sidepanel)", () => {
      expect(
        getWxtEntrypointInfo(
          "/project/entrypoints/settings.sidepanel.html",
          ENTRYPOINTS_DIR
        )
      ).toEqual({
        name: "settings",
        dirName: "settings.sidepanel",
        isInSubdirectory: false,
      });
    });

    test("settings.sidepanel.ts (single-file, treated as unlisted-script)", () => {
      expect(
        getWxtEntrypointInfo(
          "/project/entrypoints/settings.sidepanel.ts",
          ENTRYPOINTS_DIR
        )
      ).toEqual({
        name: "settings",
        dirName: "settings.sidepanel",
        isInSubdirectory: false,
      });
    });

    test("test.sandbox.html (named sandbox)", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/test.sandbox.html", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "test",
        dirName: "test.sandbox",
        isInSubdirectory: false,
      });
    });
  });

  describe("handles additional CSS extensions", () => {
    test("sass files", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/styles.sass", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "styles",
        dirName: "styles",
        isInSubdirectory: false,
      });
    });

    test("stylus files", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/theme.styl", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "theme",
        dirName: "theme",
        isInSubdirectory: false,
      });
    });

    test("stylus (full extension)", () => {
      expect(
        getWxtEntrypointInfo("/project/entrypoints/app.stylus", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "app",
        dirName: "app",
        isInSubdirectory: false,
      });
    });
  });

  describe("supports custom entrypointsDir", () => {
    test("src/entrypoints", () => {
      expect(
        getWxtEntrypointInfo(
          "/project/src/entrypoints/popup/main.ts",
          "/project/src/entrypoints"
        )
      ).toEqual({
        name: "popup",
        dirName: "popup",
        isInSubdirectory: true,
      });
    });

    test("custom-entrypoints", () => {
      expect(
        getWxtEntrypointInfo(
          "/project/custom-entrypoints/background/index.ts",
          "/project/custom-entrypoints"
        )
      ).toEqual({
        name: "background",
        dirName: "background",
        isInSubdirectory: true,
      });
    });

    test("handles trailing slash in entrypointsDir", () => {
      expect(
        getWxtEntrypointInfo(
          "/project/entrypoints/popup/main.ts",
          "/project/entrypoints/"
        )
      ).toEqual({
        name: "popup",
        dirName: "popup",
        isInSubdirectory: true,
      });
    });

    test("handles windows-style paths", () => {
      expect(
        getWxtEntrypointInfo(
          "C:\\project\\src\\entrypoints\\popup\\main.ts",
          "C:\\project\\src\\entrypoints"
        )
      ).toEqual({
        name: "popup",
        dirName: "popup",
        isInSubdirectory: true,
      });
    });
  });

  describe("returns null for non-entrypoint paths", () => {
    test("node_modules", () => {
      expect(
        getWxtEntrypointInfo(
          "/project/node_modules/react/index.js",
          ENTRYPOINTS_DIR
        )
      ).toBeNull();
    });

    test("src directory", () => {
      expect(
        getWxtEntrypointInfo("/project/src/components/Button.tsx", ENTRYPOINTS_DIR)
      ).toBeNull();
    });

    test("root files", () => {
      expect(getWxtEntrypointInfo("/project/index.ts", ENTRYPOINTS_DIR)).toBeNull();
    });

    test("different entrypoints directory", () => {
      expect(
        getWxtEntrypointInfo(
          "/project/entrypoints/popup/main.ts",
          "/project/src/entrypoints"
        )
      ).toBeNull();
    });
  });

  describe("handles URL-style paths from Vite dev server", () => {
    // During Vite dev server mode, transform() receives URL-style paths like
    // /entrypoints/popup/main.tsx instead of /Users/.../entrypoints/popup/main.tsx

    test("popup directory (URL-style)", () => {
      expect(
        getWxtEntrypointInfo("/entrypoints/popup/main.tsx", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "popup",
        dirName: "popup",
        isInSubdirectory: true,
      });
    });

    test("options directory (URL-style)", () => {
      expect(
        getWxtEntrypointInfo("/entrypoints/options/main.tsx", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "options",
        dirName: "options",
        isInSubdirectory: true,
      });
    });

    test("devtools directory (URL-style)", () => {
      expect(
        getWxtEntrypointInfo("/entrypoints/devtools/index.tsx", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "devtools",
        dirName: "devtools",
        isInSubdirectory: true,
      });
    });

    test("background directory (URL-style)", () => {
      expect(
        getWxtEntrypointInfo("/entrypoints/background/index.ts", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "background",
        dirName: "background",
        isInSubdirectory: true,
      });
    });

    test("single-file entrypoint (URL-style)", () => {
      expect(
        getWxtEntrypointInfo("/entrypoints/background.ts", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "background",
        dirName: "background",
        isInSubdirectory: false,
      });
    });

    test("named sidepanel (URL-style)", () => {
      expect(
        getWxtEntrypointInfo("/entrypoints/settings.sidepanel/index.tsx", ENTRYPOINTS_DIR)
      ).toEqual({
        name: "settings",
        dirName: "settings.sidepanel",
        isInSubdirectory: true,
      });
    });
  });
});

describe("getWxtEntrypointName (backward compat)", () => {
  test("extracts name from popup directory", () => {
    expect(getWxtEntrypointName("/project/entrypoints/popup/main.ts")).toBe(
      "popup"
    );
  });

  test("extracts name from background directory", () => {
    expect(
      getWxtEntrypointName("/project/entrypoints/background/index.ts")
    ).toBe("background");
  });

  test("returns null for non-entrypoint paths", () => {
    expect(getWxtEntrypointName("/project/src/utils.ts")).toBeNull();
  });
});

describe("isUiPageEntrypoint", () => {
  describe("returns true for UI page entrypoints", () => {
    test("popup", () => {
      expect(isUiPageEntrypoint("popup")).toBe(true);
    });

    test("options", () => {
      expect(isUiPageEntrypoint("options")).toBe(true);
    });

    test("devtools", () => {
      expect(isUiPageEntrypoint("devtools")).toBe(true);
    });

    test("sidepanel", () => {
      expect(isUiPageEntrypoint("sidepanel")).toBe(true);
    });

    test("newtab", () => {
      expect(isUiPageEntrypoint("newtab")).toBe(true);
    });

    test("history", () => {
      expect(isUiPageEntrypoint("history")).toBe(true);
    });

    test("bookmarks", () => {
      expect(isUiPageEntrypoint("bookmarks")).toBe(true);
    });

    test("sandbox", () => {
      expect(isUiPageEntrypoint("sandbox")).toBe(true);
    });

    test("named sidepanel variants (dirName)", () => {
      expect(isUiPageEntrypoint("settings.sidepanel")).toBe(true);
      expect(isUiPageEntrypoint("my-panel.sidepanel")).toBe(true);
    });

    test("named sandbox variants (dirName)", () => {
      expect(isUiPageEntrypoint("preview.sandbox")).toBe(true);
      expect(isUiPageEntrypoint("test.sandbox")).toBe(true);
    });
  });

  describe("returns false for non-UI entrypoints", () => {
    test("background", () => {
      expect(isUiPageEntrypoint("background")).toBe(false);
    });

    test("content (content script)", () => {
      expect(isUiPageEntrypoint("content")).toBe(false);
    });

    test("content script variants (dirName with .content suffix)", () => {
      expect(isUiPageEntrypoint("overlay.content")).toBe(false);
      expect(isUiPageEntrypoint("inject.content")).toBe(false);
    });

    test("unlisted scripts", () => {
      expect(isUiPageEntrypoint("worker")).toBe(false);
      expect(isUiPageEntrypoint("utils")).toBe(false);
      expect(isUiPageEntrypoint("helper")).toBe(false);
    });

    test("arbitrary names that happen to contain UI keywords", () => {
      expect(isUiPageEntrypoint("popup-helper")).toBe(false);
      expect(isUiPageEntrypoint("my-options")).toBe(false);
      expect(isUiPageEntrypoint("devtools-utils")).toBe(false);
    });
  });
});

describe("shouldSkipConsoleForward", () => {
  describe("skips directory-based UI page entrypoints", () => {
    test("popup directory", () => {
      expect(
        shouldSkipConsoleForward("/project/entrypoints/popup/main.tsx", ENTRYPOINTS_DIR)
      ).toBe(true);
      expect(
        shouldSkipConsoleForward("/project/entrypoints/popup/index.tsx", ENTRYPOINTS_DIR)
      ).toBe(true);
      expect(
        shouldSkipConsoleForward("/project/entrypoints/popup/App.tsx", ENTRYPOINTS_DIR)
      ).toBe(true);
    });

    test("options directory", () => {
      expect(
        shouldSkipConsoleForward("/project/entrypoints/options/index.tsx", ENTRYPOINTS_DIR)
      ).toBe(true);
    });

    test("devtools directory", () => {
      expect(
        shouldSkipConsoleForward("/project/entrypoints/devtools/index.tsx", ENTRYPOINTS_DIR)
      ).toBe(true);
    });

    test("sidepanel directory", () => {
      expect(
        shouldSkipConsoleForward("/project/entrypoints/sidepanel/index.tsx", ENTRYPOINTS_DIR)
      ).toBe(true);
    });

    test("named sidepanel directory", () => {
      expect(
        shouldSkipConsoleForward(
          "/project/entrypoints/settings.sidepanel/index.tsx",
          ENTRYPOINTS_DIR
        )
      ).toBe(true);
    });

    test("newtab directory", () => {
      expect(
        shouldSkipConsoleForward("/project/entrypoints/newtab/index.tsx", ENTRYPOINTS_DIR)
      ).toBe(true);
    });

    test("sandbox directory", () => {
      expect(
        shouldSkipConsoleForward("/project/entrypoints/sandbox/index.tsx", ENTRYPOINTS_DIR)
      ).toBe(true);
    });

    test("named sandbox directory", () => {
      expect(
        shouldSkipConsoleForward(
          "/project/entrypoints/test.sandbox/index.tsx",
          ENTRYPOINTS_DIR
        )
      ).toBe(true);
    });
  });

  describe("does NOT skip single-file entrypoints (WXT treats JS/TS as unlisted-script)", () => {
    test("popup.ts is unlisted-script, not popup", () => {
      expect(
        shouldSkipConsoleForward("/project/entrypoints/popup.ts", ENTRYPOINTS_DIR)
      ).toBe(false);
    });

    test("options.ts is unlisted-script, not options", () => {
      expect(
        shouldSkipConsoleForward("/project/entrypoints/options.ts", ENTRYPOINTS_DIR)
      ).toBe(false);
    });

    test("settings.sidepanel.ts is unlisted-script, not sidepanel", () => {
      expect(
        shouldSkipConsoleForward(
          "/project/entrypoints/settings.sidepanel.ts",
          ENTRYPOINTS_DIR
        )
      ).toBe(false);
    });

    test("test.sandbox.tsx is unlisted-script, not sandbox", () => {
      expect(
        shouldSkipConsoleForward(
          "/project/entrypoints/test.sandbox.tsx",
          ENTRYPOINTS_DIR
        )
      ).toBe(false);
    });
  });

  describe("does NOT skip non-UI entrypoints (critical!)", () => {
    test("background directory", () => {
      expect(
        shouldSkipConsoleForward("/project/entrypoints/background/index.ts", ENTRYPOINTS_DIR)
      ).toBe(false);
      expect(
        shouldSkipConsoleForward("/project/entrypoints/background/main.ts", ENTRYPOINTS_DIR)
      ).toBe(false);
    });

    test("content script directory", () => {
      expect(
        shouldSkipConsoleForward("/project/entrypoints/content/index.ts", ENTRYPOINTS_DIR)
      ).toBe(false);
    });

    test("named content script directory", () => {
      expect(
        shouldSkipConsoleForward(
          "/project/entrypoints/overlay.content/index.ts",
          ENTRYPOINTS_DIR
        )
      ).toBe(false);
      expect(
        shouldSkipConsoleForward(
          "/project/entrypoints/inject.content/index.ts",
          ENTRYPOINTS_DIR
        )
      ).toBe(false);
    });

    test("single-file content script", () => {
      expect(
        shouldSkipConsoleForward("/project/entrypoints/overlay.content.ts", ENTRYPOINTS_DIR)
      ).toBe(false);
    });

    test("unlisted script directory", () => {
      expect(
        shouldSkipConsoleForward("/project/entrypoints/worker/index.ts", ENTRYPOINTS_DIR)
      ).toBe(false);
    });

    test("single-file background", () => {
      expect(
        shouldSkipConsoleForward("/project/entrypoints/background.ts", ENTRYPOINTS_DIR)
      ).toBe(false);
    });
  });

  describe("does NOT skip non-entrypoint files", () => {
    test("src directory", () => {
      expect(
        shouldSkipConsoleForward("/project/src/components/Button.tsx", ENTRYPOINTS_DIR)
      ).toBe(false);
    });

    test("lib directory", () => {
      expect(
        shouldSkipConsoleForward("/project/lib/utils.ts", ENTRYPOINTS_DIR)
      ).toBe(false);
    });

    test("node_modules", () => {
      expect(
        shouldSkipConsoleForward(
          "/project/node_modules/react/index.js",
          ENTRYPOINTS_DIR
        )
      ).toBe(false);
    });
  });

  describe("works with custom entrypointsDir", () => {
    test("src/entrypoints popup directory", () => {
      expect(
        shouldSkipConsoleForward(
          "/project/src/entrypoints/popup/main.tsx",
          "/project/src/entrypoints"
        )
      ).toBe(true);
    });

    test("src/entrypoints background directory", () => {
      expect(
        shouldSkipConsoleForward(
          "/project/src/entrypoints/background/index.ts",
          "/project/src/entrypoints"
        )
      ).toBe(false);
    });
  });

  describe("handles URL-style paths from Vite dev server", () => {
    // Critical regression test: Vite dev server passes URL-style paths
    // like /entrypoints/popup/main.tsx instead of full file system paths.
    // This was causing UI pages to NOT be skipped, leading to React errors.

    test("skips popup directory (URL-style)", () => {
      expect(
        shouldSkipConsoleForward("/entrypoints/popup/main.tsx", ENTRYPOINTS_DIR)
      ).toBe(true);
    });

    test("skips options directory (URL-style)", () => {
      expect(
        shouldSkipConsoleForward("/entrypoints/options/main.tsx", ENTRYPOINTS_DIR)
      ).toBe(true);
    });

    test("skips devtools directory (URL-style)", () => {
      expect(
        shouldSkipConsoleForward("/entrypoints/devtools/index.tsx", ENTRYPOINTS_DIR)
      ).toBe(true);
    });

    test("skips sidepanel directory (URL-style)", () => {
      expect(
        shouldSkipConsoleForward("/entrypoints/sidepanel/index.tsx", ENTRYPOINTS_DIR)
      ).toBe(true);
    });

    test("skips named sidepanel (URL-style)", () => {
      expect(
        shouldSkipConsoleForward("/entrypoints/settings.sidepanel/index.tsx", ENTRYPOINTS_DIR)
      ).toBe(true);
    });

    test("does NOT skip background directory (URL-style)", () => {
      expect(
        shouldSkipConsoleForward("/entrypoints/background/index.ts", ENTRYPOINTS_DIR)
      ).toBe(false);
    });

    test("does NOT skip content script directory (URL-style)", () => {
      expect(
        shouldSkipConsoleForward("/entrypoints/content/index.ts", ENTRYPOINTS_DIR)
      ).toBe(false);
    });

    test("does NOT skip single-file entrypoint (URL-style)", () => {
      expect(
        shouldSkipConsoleForward("/entrypoints/background.ts", ENTRYPOINTS_DIR)
      ).toBe(false);
    });
  });
});
