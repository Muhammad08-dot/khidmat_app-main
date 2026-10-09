// @ts-nocheck
import * as fs from "fs";
import * as path from "path";

const load = (file: string): Record<string, string> =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "..", file), "utf8"));

describe("i18n dictionaries", () => {
  const en = load("en.json");
  const ur = load("ur.json");

  const enKeys = Object.keys(en).sort();
  const urKeys = Object.keys(ur).sort();

  it("English and Urdu expose the exact same keys", () => {
    expect(urKeys).toEqual(enKeys);
  });

  it("has no empty translation values", () => {
    for (const [, v] of Object.entries(en)) expect(v.trim().length).toBeGreaterThan(0);
    for (const [, v] of Object.entries(ur)) expect(v.trim().length).toBeGreaterThan(0);
  });

  it("covers the core navigation + legal labels", () => {
    for (const key of ["tab_home", "nav_privacy", "nav_terms", "nav_safety", "nav_admin"]) {
      expect(en).toHaveProperty(key);
      expect(ur).toHaveProperty(key);
    }
  });
});
