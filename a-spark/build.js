/**
 * A-Spark Build Script (esbuild-based)
 * 
 * Uses esbuild to properly convert spark.module.js from ESM to IIFE,
 * replacing `import * as THREE from "three"` with window.THREE.
 * Then bundles the A-Frame component wrapper.
 */

import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Create a thin entry point that re-exports spark + registers A-Frame component
const entryContent = `
// Re-export everything from spark
export * from '../dist/spark.module.js';

// Import what we need for the A-Frame component
import { SplatMesh, SparkRenderer, SparkViewpoint, PackedSplats, SplatLoader, VRButton } from '../dist/spark.module.js';

// Inline the A-Frame component registration
${fs.readFileSync(path.join(__dirname, 'aframe-component.js'), 'utf-8')}

// Export to window for direct access
if (typeof window !== 'undefined') {
  window.ASpark = {
    SplatMesh,
    SparkRenderer,
    SparkViewpoint,
    PackedSplats,
    SplatLoader,
    VRButton,
    version: '0.1.0'
  };
}
`;

const entryPath = path.join(__dirname, '_entry.tmp.js');
fs.writeFileSync(entryPath, entryContent, 'utf-8');

const outPath = path.join(__dirname, 'dist', 'a-spark.js');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });

try {
  await build({
    entryPoints: [entryPath],
    bundle: true,
    format: 'iife',
    globalName: 'ASpark',
    outfile: outPath,
    // Make THREE an external global — esbuild will reference window.THREE
    external: ['three'],
    // Tell esbuild that "three" is available as window.THREE
    // We use a plugin for this since esbuild's --global doesn't support external globals directly
    plugins: [{
      name: 'three-global',
      setup(build) {
        // Intercept imports of "three" and provide them from window.THREE
        build.onResolve({ filter: /^three$/ }, () => ({
          path: 'three',
          namespace: 'three-global',
        }));
        build.onLoad({ filter: /.*/, namespace: 'three-global' }, () => ({
          contents: 'module.exports = window.THREE || (typeof AFRAME !== "undefined" && AFRAME.THREE);',
          loader: 'js',
        }));
      }
    }],
    banner: {
      js: [
        '/**',
        ' * A-Spark v0.1.0',
        ' * Gaussian Splatting for A-Frame',
        ' * Based on Spark.js (MIT License) by sparkjsdev',
        ' *',
        ' * Usage:',
        ' *   <script src="https://aframe.io/releases/1.7.1/aframe.min.js"></script>',
        ' *   <script src="a-spark.js"></script>',
        ' *   <a-entity gaussian-splat="url: path/to/file.spz"></a-entity>',
        ' */',
      ].join('\n'),
    },
    logLevel: 'info',
    target: ['es2020'],
    minify: false,
  });

  // Also build minified version
  const outMinPath = path.join(__dirname, 'dist', 'a-spark.min.js');
  await build({
    entryPoints: [outPath],
    bundle: false,
    outfile: outMinPath,
    minify: true,
    target: ['es2020'],
    logLevel: 'silent',
  });

  const stat = fs.statSync(outPath);
  const statMin = fs.statSync(outMinPath);
  console.log(`✅ Built A-Spark: ${outPath}`);
  console.log(`   Size: ${(stat.size / 1024).toFixed(1)} KB`);
  console.log(`✅ Built A-Spark (minified): ${outMinPath}`);
  console.log(`   Size: ${(statMin.size / 1024).toFixed(1)} KB`);
} finally {
  // Clean up temp entry file
  fs.unlinkSync(entryPath);
}
