import { describe, expect, it } from "vitest";

import { hasUrlOption, readUrlOptions } from "./url-options";

describe("readUrlOptions", () => {
  it("returns an empty set when no query string is provided", () => {
    expect(readUrlOptions("")).toEqual(new Set());
  });

  it("parses a single option", () => {
    expect(readUrlOptions("?rrr=ctrl-r")).toEqual(new Set(["ctrl-r"]));
  });

  it("parses comma-separated options and normalizes case", () => {
    expect(readUrlOptions("?rrr=Ctrl-R,Foo")).toEqual(new Set(["ctrl-r", "foo"]));
  });

  it("merges repeated query keys", () => {
    expect(readUrlOptions("?rrr=ctrl-r&rrr=foo")).toEqual(new Set(["ctrl-r", "foo"]));
  });

  it("ignores unrelated query keys", () => {
    expect(readUrlOptions("?other=ctrl-r")).toEqual(new Set());
  });

  it("drops empty tokens", () => {
    expect(readUrlOptions("?rrr=,ctrl-r,,")).toEqual(new Set(["ctrl-r"]));
  });
});

describe("hasUrlOption", () => {
  it("returns true when the option is present", () => {
    expect(hasUrlOption("ctrl-r", "?rrr=ctrl-r,foo")).toBe(true);
  });

  it("returns false when the option is absent", () => {
    expect(hasUrlOption("ctrl-r", "?rrr=foo")).toBe(false);
  });

  it("matches options case-insensitively", () => {
    expect(hasUrlOption("CTRL-R", "?rrr=ctrl-r")).toBe(true);
  });
});
