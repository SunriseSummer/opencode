import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { CangjieSDK } from "../../src/cangjie/sdk"
import { LANGUAGE_EXTENSIONS } from "../../src/lsp/language"
import { tmpdir } from "../fixture/fixture"

async function cmd(dir: string, name: string) {
  const ext = process.platform === "win32" ? ".cmd" : ""
  const file = path.join(dir, name + ext)
  const body = process.platform === "win32" ? "@echo off\r\n" : "#!/bin/sh\n"
  await fs.writeFile(file, body)
  if (process.platform !== "win32") await fs.chmod(file, 0o755)
  return file
}

function same(a: string | null | undefined, b: string) {
  if (process.platform === "win32") {
    expect(a?.toLowerCase()).toBe(b.toLowerCase())
    return
  }

  expect(a).toBe(b)
}

describe("cangjie sdk", () => {
  test("maps cangjie source extensions", () => {
    expect(LANGUAGE_EXTENSIONS[".cj"]).toBe("cangjie")
    expect(LANGUAGE_EXTENSIONS[".cangjie"]).toBe("cangjie")
  })

  test("resolves home from CANGJIE_HOME", async () => {
    await using tmp = await tmpdir()
    const root = path.join(tmp.path, "cangjie")

    expect(CangjieSDK.home({ CANGJIE_HOME: root })).toBe(root)
  })

  test("infers home from tools bin", async () => {
    await using tmp = await tmpdir()
    const root = path.join(tmp.path, "cangjie")
    const dir = path.join(root, "tools", "bin")
    await fs.mkdir(dir, { recursive: true })
    await cmd(dir, "LSPServer")

    expect(CangjieSDK.home({ PATH: dir, PATHEXT: process.env["PATHEXT"] })).toBe(root)
  })

  test("finds cjfmt from sdk layout", async () => {
    await using tmp = await tmpdir()
    const root = path.join(tmp.path, "cangjie")
    const dir = path.join(root, "tools", "bin")
    await fs.mkdir(dir, { recursive: true })
    const file = await cmd(dir, "cjfmt")

    same(CangjieSDK.tool("cjfmt", { CANGJIE_HOME: root, PATH: "", HOME: tmp.path, PATHEXT: process.env["PATHEXT"] }), file)
  })

  test("builds sdk runtime env", async () => {
    await using tmp = await tmpdir()
    const root = path.join(tmp.path, "cangjie")
    const got = CangjieSDK.env({ CANGJIE_HOME: root, PATH: "/usr/bin", HOME: tmp.path })

    expect(got.CANGJIE_HOME).toBe(root)
    expect(got.PATH).toContain(path.join(root, "tools", "bin"))
    expect(got.PATH).toContain(path.join(root, "bin"))

    if (process.platform === "win32") return

    const key = process.platform === "darwin" ? "DYLD_LIBRARY_PATH" : "LD_LIBRARY_PATH"
    expect(got[key]).toContain(path.join(root, "tools", "lib"))
    expect(got[key]).toContain(path.join(root, "runtime", "lib"))
  })
})
