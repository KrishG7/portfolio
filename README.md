# Krish Gupta — Systems, Machine Learning & Tactile Interfaces

Personal engineering portfolio and systems showcase for **Krish Gupta**, undergraduate at the Faculty of Technology, University of Delhi (Batch 2024–2028, B.Tech in Blockchain, Cybersecurity & Machine Learning) with Data Science specialization from IIT Guwahati.

Live site: [krishgupta.vercel.app](https://krishgupta.vercel.app) *(or your deployed Vercel domain)*

---

## Systems & Case Studies Featured

1. **Athena** — Clinical decision support & rare-cancer evidence graph combining FalkorDB Cypher subgraphs with AutoDock Vina computational docking. [Repo](https://github.com/healers-second-look/Athena)
2. **SysCV** — Interactive Linux kernel visualizer intercepting syscalls via Go and `ptrace` in sandboxed Docker containers. [Repo](https://github.com/KrishG7/SysCV)
3. **Brahm-Kosh** — 3D codebase spatial topography and AST complexity analyzer across 13 programming languages. [Repo](https://github.com/KrishG7/Brahm-Kosh)
4. **Wait Zero** — Offline-first OPD queue telemetry for public hospitals under spotty 2G network drops with local SQLite WAL synchronization. [Repo](https://github.com/KrishG7/smart-clinic-booking)
5. **Aegis-Tensor** — Static security scanner inspecting `.safetensors` headers and detecting mantissa steganography at 4.2 GB/s. [Repo](https://github.com/KrishG7/Aegis_Tensor)
6. **TriNetra** — Agricultural intelligence stack fusing Sentinel-2 satellite multi-spectral indices, Gemini vernacular advisories, and APMC price forecasting. [Repo](https://github.com/KrishG7/TriNetra-Farmers-Stack)
7. **Video-Tracer** — Multi-object tracking (MOT) pipeline coupling fine-tuned YOLOv8 bounding boxes with BoT-SORT / ByteTrack motion re-identification. [Repo](https://github.com/KrishG7/Video-Tracer)
8. **Stock Anomaly Detection Pipeline** — Microstructural orderbook anomaly detector with strict walk-forward causal rolling features and zero lookahead leakage. [Repo](https://github.com/KrishG7/stock-anomaly-detection)

---

## Technical Architecture

- **Aesthetic**: Obsidian Black (`#050506`), Maroon (`#8b1e2f`), and Cream (`#fcf9f2`, `#f5f0e4`).
- **Typography**: Geist (Sans), JetBrains Mono (Technical/Telemetry), Newsreader (Serif editorial accents).
- **Kinematic Ripple Engine**: Fullscreen HTML5 2D Canvas rendering 2,877 facial mesh nodes with damp spring restitution and wave dispersion physics. Automatically pauses when out of viewport for 120 FPS performance.
- **Interactive Topography Engine**: Force-directed physics canvas for codebase AST analysis with dynamic node density and repulsion controls.
- **Systems CLI**: Embedded `$ krish_cli` terminal supporting interactive commands (`help`, `skills`, `projects`, `leetcode`, `bio`, `curl cv`, `clear`) and deep inspection queries.
- **Error Handling**: Custom Ring-0 security violation `403.html` error page with eBPF audit logs and interactive privilege escalation terminal.

---

## Local Development

No Node.js build step or compiler required. Run using any local HTTP static server:

```bash
# Python 3
python3 -m http.server 8080

# Or Node npx
npx serve .
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## Deployment to Vercel

The repository includes a production-ready `vercel.json` with clean URLs and immutable edge cache headers:

1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial systems portfolio commit"
   git branch -M main
   git remote add origin https://github.com/KrishG7/portfolio.git
   git push -u origin main
   ```
2. In Vercel, click **Add New Project**, import the GitHub repository, and click **Deploy**. No build commands or environment variables needed.
