import os from "os"
import path from "path"
import { which } from "../util/which"

export namespace CangjieSDK {
  /** Minimum supported Cangjie SDK version */
  export const MIN_VERSION = "1.0.5"

  const root = (bin: string) => {
    const dir = path.dirname(path.normalize(bin))
    if (dir.endsWith(path.join("tools", "bin"))) return path.dirname(path.dirname(dir))
    if (dir.endsWith("bin")) return path.dirname(dir)
  }

  const concat = (...list: (string | undefined)[]) => list.filter(Boolean).join(path.delimiter)

  export function arch(input = os.arch()) {
    if (input === "x64") return "x86_64"
    if (input === "arm64") return "aarch64"
    return input
  }

  export function home(env: NodeJS.ProcessEnv = process.env) {
    if (env.CANGJIE_HOME) return env.CANGJIE_HOME

    for (const name of ["LSPServer", "cjfmt", "cjpm"]) {
      const bin = which(name, env)
      if (bin) return root(bin)
    }
  }

  export function env(input: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    const root = home(input)
    if (!root) return input

    const PATH = concat(
      path.join(root, "bin"),
      path.join(root, "tools", "bin"),
      input.PATH ?? input.Path,
      input.HOME ? path.join(input.HOME, ".cjpm", "bin") : undefined,
    )

    if (process.platform === "win32") {
      return {
        ...input,
        CANGJIE_HOME: root,
        PATH,
      }
    }

    const key = process.platform === "darwin" ? "DYLD_LIBRARY_PATH" : "LD_LIBRARY_PATH"
    const lib = concat(
      path.join(root, "runtime", "lib", `${process.platform === "darwin" ? "darwin" : "linux"}_${arch()}_cjnative`),
      path.join(root, "tools", "lib"),
      input[key],
    )

    return {
      ...input,
      CANGJIE_HOME: root,
      PATH,
      [key]: lib,
    }
  }

  export function tool(name: string, input: NodeJS.ProcessEnv = process.env) {
    return which(name, env(input))
  }

  /**
   * Get the version of the installed Cangjie SDK
   * @returns The version string (e.g., "1.0.5") or null if not found
   */
  export async function version(env: NodeJS.ProcessEnv = process.env): Promise<string | null> {
    const cjpm = tool("cjpm", env)
    if (!cjpm) return null

    try {
      const { $: $exec } = await import("bun")
      const output = await $exec`${cjpm} --version`.text().catch(() => "")
      const match = output.match(/(\d+\.\d+\.\d+)/)
      return match?.[1] ?? null
    } catch {
      return null
    }
  }

  /**
   * Check if the installed SDK version meets the minimum requirement
   */
  export async function checkVersion(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
    const v = await version(env)
    if (!v) return false

    // Simple version comparison (assumes semver format)
    const parts = v.split(".").map(Number)
    const minParts = MIN_VERSION.split(".").map(Number)

    for (let i = 0; i < Math.max(parts.length, minParts.length); i++) {
      const part = parts[i] ?? 0
      const minPart = minParts[i] ?? 0
      if (part > minPart) return true
      if (part < minPart) return false
    }
    return true
  }

  /**
   * Check if the SDK is properly installed and configured
   * @returns An object with check results and any error messages
   */
  export async function validate(env: NodeJS.ProcessEnv = process.env): Promise<{
    valid: boolean
    home: string | null
    version: string | null
    tools: { cjpm: boolean; cjfmt: boolean; lsp: boolean }
    errors: string[]
  }> {
    const errors: string[] = []
    const sdkHome = home(env)
    const tools = { cjpm: false, cjfmt: false, lsp: false }

    if (!sdkHome) {
      errors.push("Cangjie SDK not found. Please install CangjieSDK and set CANGJIE_HOME or add tools to PATH.")
      return { valid: false, home: null, version: null, tools, errors }
    }

    // Check for required tools
    tools.cjpm = tool("cjpm", env) !== null
    tools.cjfmt = tool("cjfmt", env) !== null
    tools.lsp = tool("LSPServer", env) !== null

    if (!tools.cjpm) errors.push("cjpm not found in SDK")
    if (!tools.cjfmt) errors.push("cjfmt not found in SDK")
    if (!tools.lsp) errors.push("LSPServer not found in SDK")

    // Check version
    const v = await version(env)
    const versionOk = v ? await checkVersion(env) : false
    if (v && !versionOk) {
      errors.push(`Cangjie SDK version ${v} is below minimum required version ${MIN_VERSION}`)
    }

    return {
      valid: tools.cjpm && tools.cjfmt && tools.lsp && versionOk,
      home: sdkHome,
      version: v,
      tools,
      errors,
    }
  }
}
