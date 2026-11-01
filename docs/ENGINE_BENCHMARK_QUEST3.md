# Bestie Clinical Sim — Engine Benchmark & Quest 3 Profiling Protocol
## WebXR (Three.js) vs Native APK (Unity / Unreal) Comparative Evaluation

This protocol establishes the benchmarking methodology to evaluate rendering performance, draw call overhead, battery thermals, and latency on the **Meta Quest 3 / 3S** hardware.

---

### 1. Hardware Architecture & Performance Budgets (Meta Quest 3 / 3S)

| Specification | Meta Quest 3 Specification | Mobile Performance Budget |
| :--- | :--- | :--- |
| **SoC / GPU** | Qualcomm Snapdragon XR2 Gen 2 (Adreno 740) | Sustained GPU clock (Level 3 thermal envelope) |
| **RAM** | 8 GB LPDDR5 Unified Memory | Max process memory: $\le 2.0\text{ GB}$ |
| **Resolution** | $2064 \times 2208\text{ px}$ per eye | Recommended eye buffer: $1680 \times 1760$ (scale $0.85\times$) |
| **Refresh Rate** | 72 Hz / 90 Hz | **Frame budget**: $13.88\text{ms}$ (72 Hz) / $11.11\text{ms}$ (90 Hz) |
| **Draw Calls** | CPU-bound driver limit | **Max draw calls**: $\le 120\text{ calls/frame}$ |
| **Triangle Count** | Geometry vertex processing | **Max visible triangles**: $\le 250,000\text{ tris}$ in camera frustum |
| **Texture VRAM** | VRAM footprint | **Max texture memory**: $\le 512\text{ MB}$ uncompressed |

---

### 2. Dual-Track Engine Evaluation Matrix

| Criterion | Track A: WebXR (Three.js) *(Current)* | Track B: Unity URP (OpenXR) | Track C: Unreal Engine 5 (OpenXR) |
| :--- | :--- | :--- | :--- |
| **Distribution** | Instant zero-install URL via Quest Browser | Sideloaded / App Lab / Store APK | Sideloaded / Store APK |
| **Iteration Speed** | Instant reload; shared codebase with React | Recompile & build APK (5–15 mins) | Recompile & cook package (15–30 mins) |
| **Draw Call Batching** | Manual (`InstancedMesh`, geometry merge) | Automatic Dynamic Batching & SRP Batcher | Render Dependency Graph & Nanite (Heavy) |
| **Multiview Stereo** | Supported via `OVR_multiview2` in WebGL2 | Built-in Single-Pass Instanced Stereo | Single-Pass Mobile Multiview |
| **Thermal Throttling** | Low overhead; browser handles compositor | Very low; direct hardware access | Moderate to high; requires heavy tuning |
| **Clinical Backend Integration** | Native HTTP/WebSocket to FastAPI directly | Requires C# `UnityWebRequest` / WebSockets | Requires C++ HTTP / JSON modules |

---

### 3. Automated In-App Profiler (Three.js / WebXR)

To ensure clinical developers and artists receive immediate feedback on Quest 3, an in-scene performance HUD (`src/vr/scene/profiler.js`) tracks:
- **Instantaneous & Average FPS** (green $\ge 70$, amber $50-69$, red $< 50$).
- **Frame Render Time** ($\text{ms}$ per frame).
- **Active Draw Calls** via `renderer.info.render.calls`.
- **Visible Triangle Count** via `renderer.info.render.triangles`.
- **Active Geometries and Textures in VRAM** via `renderer.info.memory`.

---

### 4. Headset Verification Procedure (OVR Metrics Tool)

When evaluating the benchmark scene on physical hardware:
1. Enable Developer Mode on the Meta Quest 3 via the Meta Quest mobile app.
2. Install the official **OVR Metrics Tool** via Meta Quest Developer Hub (MQDH).
3. Set the OVR Metrics overlay mode to **Persistent On-Screen Display**.
4. Open the Meta Quest Browser and navigate to:
   ```
   https://<your-deployed-host>/?vr=1&benchmark=1
   ```
5. Click **Enter VR** and observe the following metrics over a 5-minute continuous encounter:
   - `FPS`: Must maintain solid $72.0\text{ FPS}$ without dropped frames during rapid head rotation.
   - `App GPU Time`: Must stay $< 10.5\text{ms}$.
   - `App CPU Time`: Must stay $< 8.0\text{ms}$.
   - `Stale Frames`: Must remain $< 0.1\%$.

