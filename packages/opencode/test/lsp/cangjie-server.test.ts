import { describe, expect, test, beforeEach } from "bun:test"
import path from "path"
import { spawn } from "child_process"
import { LSPClient } from "../../src/lsp/client"
import { LSPServer } from "../../src/lsp/server"
import { Instance } from "../../src/project/instance"
import { Log } from "../../src/util/log"

function spawnFakeServer() {
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

  test("config has correct id and extensions", () => {
    const info = LSPServer.Cangjie
    expect(info.id).toBe("cangjie")
    expect(info.extensions).toEqual([".cj"])
  })

  test("initializes over stdio", async () => {
    const handle = spawnFakeServer()

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
