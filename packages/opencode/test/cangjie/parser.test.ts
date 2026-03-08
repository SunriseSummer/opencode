import { describe, expect, test } from "bun:test"
import parsers from "../../parsers-config.ts"

describe("cangjie parser", () => {
  test("registers bundled tree-sitter assets", () => {
    const cfg = parsers.parsers.find((p) => p.filetype === "cangjie")

    expect(cfg).toBeDefined()
    expect(cfg?.wasm).toContain("tree-sitter-cangjie.wasm")
    expect(cfg?.queries.highlights).toContainEqual(expect.stringContaining("highlights.scm"))
  })
})
