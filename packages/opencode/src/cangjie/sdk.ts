import { Process } from "../util/process"
import { which } from "../util/which"

export namespace CangjieSDK {
  /** Minimum supported Cangjie SDK version */
  export const MIN_VERSION = "1.0.0"

  const satisfies = (v: string) => {
    const curr = v.split(".").map(Number)
    const need = MIN_VERSION.split(".").map(Number)
    for (let i = 0; i < Math.max(curr.length, need.length); i++) {
      const a = curr[i] ?? 0
      const b = need[i] ?? 0
      if (a > b) return true
      if (a < b) return false
    }
    return true
  }

  export function home(env: NodeJS.ProcessEnv = process.env) {
    return env.CANGJIE_HOME ?? null
  }

  export function env(input: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    return input
  }

  export function tool(name: string, input: NodeJS.ProcessEnv = process.env) {
    const bin = which(name, input)
    if (bin) return bin
    if (process.platform !== "win32") return null
    return which(`${name}.exe`, input)
  }

  /**
   * Get the version of the installed Cangjie SDK
   * @returns The version string (e.g., "1.0.0") or null if not found
   */
  export async function version(env: NodeJS.ProcessEnv = process.env): Promise<string | null> {
    const cjc = tool("cjc", env)
    if (!cjc) return null

    const out = await Process.run([cjc, "-v"], { env, nothrow: true }).catch(() => null)
    if (!out) return null
    const text = Buffer.concat([out.stdout, out.stderr]).toString()
    const match = text.match(/(\d+\.\d+\.\d+)/)
    return match?.[1] ?? null
  }

  /**
   * Check if the installed SDK version meets the minimum requirement
   */
  export async function checkVersion(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
    const v = await version(env)
    return !!v && satisfies(v)
  }

  /**
   * Check if the SDK is properly installed and configured
   * @returns An object with check results and any error messages
   */
  export async function validate(env: NodeJS.ProcessEnv = process.env): Promise<{
    valid: boolean
    home: string | null
    version: string | null
    tools: { cjfmt: boolean; lsp: boolean }
    errors: string[]
  }> {
    const errors: string[] = []
    const tools = {
      cjfmt: tool("cjfmt", env) !== null,
      lsp: tool("LSPServer", env) !== null,
    }

    if (!tools.lsp) errors.push("LSPServer not found in PATH")

    // Check version
    const v = await version(env)
    const valid = !!v && satisfies(v)
    if (!v) errors.push("Unable to read Cangjie version from cjc -v")
    if (v && !valid) {
      errors.push(`Cangjie version ${v} is below minimum required version ${MIN_VERSION}`)
    }

    return {
      valid: tools.lsp && valid,
      home: home(env),
      version: v,
      tools,
      errors,
    }
  }
}
