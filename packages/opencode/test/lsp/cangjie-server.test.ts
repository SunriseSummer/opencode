import { describe, expect, test, beforeEach } from "bun:test"
import path from "path"
import { LSPClient } from "../../src/lsp/client"
import { LSPServer } from "../../src/lsp/server"
import { Instance } from "../../src/project/instance"
import { Log } from "../../src/util/log"

// Fake LSP server that records args it was started with
function spawnFakeServer() {
  const { spawn } = require("child_process")
  const serverPath = path.join(__dirname, "../fixture/lsp/fake-lsp-server.js")
  return {
    process: spawn(process.execPath, [serverPath], {
      stdio: "pipe",
    }),
  }
}

describe("Cangjie LSP server", () => {
  beforeEach(async () => {
    await Log.init({ print: true })
  })

  test("spawn config includes --stdio argument", () => {
    const info = LSPServer.Cangjie
    expect(info.id).toBe("cangjie")
    expect(info.extensions).toEqual([".cj"])
  })

  test("initializes and communicates over stdio", async () => {
    const handle = spawnFakeServer() as any

    const client = await Instance.provide({
      directory: process.cwd(),
      fn: () =>
        LSPClient.create({
          serverID: "cangjie",
          server: handle as unknown as LSPServer.Handle,
          root: process.cwd(),
        }),
    })

    expect(client.connection).toBeDefined()

    await client.shutdown()
  })
})
