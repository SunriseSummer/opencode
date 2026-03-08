#!/usr/bin/env bun
/**
 * Tree-sitter Cangjie Parser Build Script
 * 
 * This script automates the process of building tree-sitter-cangjie from source.
 * It downloads the source from CangjieSDK release, builds the WASM parser,
 * and copies the artifacts to the correct location.
 * 
 * Usage: bun run script/build-cangjie-parser.ts
 */

import { $ } from "bun"
import path from "path"
import fs from "fs/promises"

const CANGJIE_VERSION = "1.0.5"
const SOURCE_URL = `https://github.com/SunriseSummer/CangjieSDK/releases/download/${CANGJIE_VERSION}/tree-sitter-cangjie-${CANGJIE_VERSION}.zip`

const cwd = path.join(import.meta.dir, "..")
const outputDir = path.join(cwd, "tree-sitter/cangjie")
const tempDir = path.join(outputDir, "temp")

async function main() {
  console.log(`🔨 Building tree-sitter-cangjie v${CANGJIE_VERSION}...`)

  // Check if tree-sitter CLI is available
  try {
    await $`which tree-sitter`.quiet()
  } catch {
    console.log("📦 Installing tree-sitter-cli...")
    await $`npm install -g tree-sitter-cli`
  }

  // Clean up old temp directory
  console.log("🧹 Cleaning up...")
  await fs.rm(tempDir, { recursive: true, force: true })
  await fs.mkdir(tempDir, { recursive: true })

  // Download source
  console.log("⬇️  Downloading source...")
  const zipPath = path.join(tempDir, "source.zip")
  const curlResult = await $`curl -L -o ${zipPath} ${SOURCE_URL}`.nothrow()
  if (curlResult.exitCode !== 0) {
    console.error("❌ Failed to download source")
    process.exit(1)
  }

  // Extract
  console.log("📂 Extracting...")
  await $`unzip -q ${zipPath} -d ${tempDir}`

  // Find extracted directory
  const entries = await fs.readdir(tempDir, { withFileTypes: true })
  const sourceDir = entries
    .filter(e => e.isDirectory())
    .map(e => path.join(tempDir, e.name))
    .find(p => path.basename(p).includes("tree-sitter"))

  if (!sourceDir) {
    console.error("❌ Could not find extracted source directory")
    process.exit(1)
  }

  // Build WASM
  console.log("🔧 Building WASM parser...")
  try {
    await $`npm install --ignore-scripts`.cwd(sourceDir).quiet()
    await $`node node_modules/tree-sitter-cli/install.js`.cwd(sourceDir).quiet()
    await $`npx tree-sitter build --wasm`.cwd(sourceDir).quiet()
  } catch (error) {
    console.error("❌ Build failed:", error)
    process.exit(1)
  }

  // Copy artifacts
  console.log("📋 Copying artifacts...")
  const wasmPath = path.join(sourceDir, "tree-sitter-cangjie.wasm")
  const highlightsPath = path.join(sourceDir, "queries", "highlights.scm")

  if (await fs.stat(wasmPath).then(() => true).catch(() => false)) {
    await fs.copyFile(wasmPath, path.join(outputDir, "tree-sitter-cangjie.wasm"))
    console.log("  ✓ tree-sitter-cangjie.wasm")
  } else {
    console.error("  ✗ tree-sitter-cangjie.wasm not found")
  }

  if (await fs.stat(highlightsPath).then(() => true).catch(() => false)) {
    await fs.copyFile(highlightsPath, path.join(outputDir, "highlights.scm"))
    console.log("  ✓ highlights.scm")
  } else {
    console.error("  ✗ highlights.scm not found")
  }

  // Cleanup
  console.log("🧹 Cleaning up temp files...")
  await fs.rm(tempDir, { recursive: true, force: true })

  console.log("✅ Build complete!")
  console.log(`\nArtifacts location: ${outputDir}`)
}

main().catch(error => {
  console.error("❌ Error:", error)
  process.exit(1)
})
