import os from "os"
import path from "path"
import { which } from "../util/which"

export namespace CangjieSDK {
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
}
