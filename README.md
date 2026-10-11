# 👁️ AeroAir: Touchless 21-Landmark Spatial Computing Controller

> 100% on-device client-side computer vision gesture controller running via MediaPipe Hands WebAssembly. Zero cloud streaming, zero video data leaves your machine. Track 21 3D hand landmarks in real time to paint in 3D air and trigger touchless spatial gestures.

---

## ⚡ Features

### 1. 🔒 100% Client-Side Private Computer Vision
- Powered by Google MediaPipe Hands running locally in WebAssembly on your GPU.
- Processes 60 FPS live video stream directly inside browser memory. Zero video frames are transmitted over the network.

### 2. 🖐️ 21 3D Landmark Skeletal Overlay
- Real-time cyber skeletal tracking with 21 joint nodes across wrist, palm base, thumb, and four fingers.
- Mirrored coordinate space with Exponential Moving Average (EMA) smoothing filter to eliminate hand tremor jitter.

### 3. ✨ Touchless Air Gestures
- **Index Pinch (👌 Pinch to Draw)**: Touch your index fingertip to your thumb tip to activate spatial air drawing with neon glow particle brushes.
- **Open Palm (🖐️ Laser Reticle)**: Hover laser pointer cursor across the spatial canvas.
- **Peace Sign (✌️ Canvas Wipe)**: Hold up a V-sign peace gesture to trigger an instant animated canvas clear.
- **Thumbs Up (👍 Sparkle Confetti)**: Trigger celebratory particle sparkles and confetti.

### 4. 🎨 Spatial Studio Toolbelt
- Variable neon color palette (Cyber Cyan, Hot Pink, Electric Purple, Laser Yellow, Emerald Green, Pure White).
- Brush radius slider (2px to 24px).
- High-resolution un-mirrored PNG artwork exporter.

---

## 🚀 Quick Start

### Double-Click Launcher
Double-click `AeroAir.command` in Finder to launch.

### Terminal
```bash
./launch.sh
```
Or open `index.html` in Safari, Chrome, or Edge.
