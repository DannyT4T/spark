<p align="center">
  <img src="https://img.shields.io/badge/A--Frame-1.7.1-blue" alt="A-Frame">
  <img src="https://img.shields.io/badge/Three.js-r173-green" alt="Three.js">
  <img src="https://img.shields.io/badge/WASM-accelerated-orange" alt="WASM">
  <img src="https://img.shields.io/badge/license-MIT-brightgreen" alt="License">
</p>

# A-Spark ✨

**Gaussian Splatting for A-Frame** — Render high-quality 3D Gaussian Splats in any A-Frame WebXR scene.

A-Spark wraps [Spark.js](https://github.com/sparkjsdev/spark) (a production-grade Gaussian Splat renderer with WASM-accelerated sorting) as a native A-Frame component. Load `.spz`, `.ply`, or `.splat` files with a single HTML tag.

---

## Quick Start

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- 1. Load A-Frame -->
    <script src="https://aframe.io/releases/1.7.1/aframe.min.js"></script>
    
    <!-- 2. Load A-Spark -->
    <script src="https://a-spark.xrcl.app/a-spark.min.js"></script>
  </head>
  <body>
    <a-scene>
      <a-entity
        gaussian-splat="url: https://example.com/scene.spz"
        position="0 0 -3"
      ></a-entity>
    </a-scene>
  </body>
</html>
```

That's it. Two script tags and one component. 🚀

---

## Features

| Feature | Details |
|---|---|
| **File Formats** | `.spz` (compressed), `.ply`, `.splat` |
| **WASM Sorting** | Rust-compiled WebAssembly for fast splat sorting |
| **Spherical Harmonics** | View-dependent lighting effects |
| **A-Frame Native** | Full component lifecycle, works with ECS |
| **WebXR Ready** | Works on Quest 3 and other XR devices |
| **Lightweight** | ~575KB minified (~150KB gzipped) |
| **Zero Config** | Uses A-Frame's bundled Three.js r173 — no conflicts |

---

## Component Properties

```html
<a-entity gaussian-splat="
  url: path/to/file.spz;
  opacity: 1.0;
  splatScale: 1 1 1;
  maxSplats: 0;
"></a-entity>
```

| Property | Type | Default | Description |
|---|---|---|---|
| `url` | string | `''` | URL to the splat file (`.spz`, `.ply`, `.splat`) |
| `opacity` | number | `1.0` | Global opacity (0–1) |
| `splatScale` | vec3 | `1 1 1` | Scale of individual splats. Use `1 -1 -1` to flip Y/Z axes |
| `maxSplats` | number | `0` | Max splats to render (0 = unlimited) |

---

## Events

| Event | Detail | Description |
|---|---|---|
| `splat-loaded` | `{ mesh }` | Fired when the splat file finishes loading |
| `splat-error` | `{ error }` | Fired if loading fails |

```js
el.addEventListener('splat-loaded', (e) => {
  console.log('Loaded', e.detail.mesh.numSplats, 'splats');
});
```

---

## Self-Hosting

### Build from Source

```bash
# Clone the repo
git clone https://github.com/YOUR_ORG/a-spark.git
cd a-spark

# Install dependencies
npm install

# Build (outputs to a-spark/dist/)
node a-spark/build.js
```

This produces:
- `a-spark/dist/a-spark.js` — Full build (~813KB)
- `a-spark/dist/a-spark.min.js` — Minified (~575KB)

### Deploy to Your Own CDN

Upload `a-spark.min.js` to any static host (Netlify, Vercel, Supabase Storage, GitHub Pages, etc.) and reference it via `<script>` tag.

---

## How It Works

A-Spark takes the pre-built [Spark.js](https://github.com/sparkjsdev/spark) ES module and uses [esbuild](https://esbuild.github.io/) to:

1. Convert from ES module to IIFE (browser script)
2. Rewire `import * as THREE from "three"` → `window.THREE` (A-Frame's bundled copy)
3. Bundle the A-Frame component registration

The WASM sorting module is **embedded as base64** in the build — no separate `.wasm` file needed.

---

## Compatibility

| Requirement | Version |
|---|---|
| A-Frame | 1.7.1+ |
| Three.js | r173 (bundled with A-Frame 1.7.1) |
| Browsers | Chrome 90+, Firefox 90+, Safari 16+, Quest Browser |

---

## Credits

- **[Spark.js](https://github.com/sparkjsdev/spark)** — The underlying Gaussian Splat renderer (MIT License)
- **[A-Frame](https://aframe.io/)** — WebXR framework by the A-Frame team
- **[esbuild](https://esbuild.github.io/)** — Lightning-fast bundler

---

## License

MIT License — see [LICENSE](LICENSE) for details.

Based on Spark.js by [sparkjsdev](https://github.com/sparkjsdev).
