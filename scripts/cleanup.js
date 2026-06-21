#!/usr/bin/env node
/**
 * Cross-platform cleanup for build artifacts.
 * Removes dist/ and .output/ under each workspace in packages/.
 */
import { readdir, rm } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = join(rootDir, 'packages')

async function safeRemove(path) {
	await rm(path, { recursive: true, force: true })
}

async function main() {
	const entries = await readdir(packagesDir, { withFileTypes: true })
	const packageDirs = entries.filter((e) => e.isDirectory()).map((e) => join(packagesDir, e.name))

	const targets = packageDirs.flatMap((dir) => [join(dir, 'dist'), join(dir, '.output')])

	await Promise.all(targets.map((target) => safeRemove(target)))
}

main().catch((err) => {
	console.error('Cleanup failed:', err)
	process.exitCode = 1
})
