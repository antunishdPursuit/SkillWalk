# SkillWalk

Give SkillWalk a reviewed YouTube tutorial, approve the plan, and watch it carry out the workflow with local Gemma. Real execution, browser tests and bounded repairs are visible. No paid model API or deployment.

## Start locally

You need Node.js 24, Docker Desktop with Linux containers, yt-dlp and FFmpeg, and working local Ollama services.

This computer's verified profile uses:

- Vision and document answers: `http://127.0.0.1:11435`, `gemma3:4b`.
- Tutorial interpretation and preparation: `http://127.0.0.1:11434`, the local Gemma profile `local-gemma`.
- Document embeddings: local `embeddinggemma` on port 11434.

The model services must be running before setup. A normal Ollama service can host the models together; set the loopback environment variables below to match your installation. Hardware, model size and quantization affect quality and speed.

```powershell
npm ci
$env:OLLAMA_BASE = 'http://127.0.0.1:11435'
$env:OLLAMA_TEXT_BASE = 'http://127.0.0.1:11434'
$env:GEMMA_TEXT_MODEL = 'local-gemma'
$env:DOCUMENT_EMBEDDING_BASE = 'http://127.0.0.1:11434'
npm run setup:document
npm start
```

Open [SkillWalk](http://127.0.0.1:4179/tutorial). Setup also prepares the version-matched Playwright default-deny sandbox profile and validates its pinned SHA-256 on download and reuse. Changed profiles fail explicitly; runtime never disables sandboxing to continue. The first setup builds a project-specific container and downloads local extraction weights and EmbeddingGemma if missing. It can take several minutes and uses substantial disk space. It does not install Hermes, change security policies or call a paid API.

For a single local Ollama service, set both base URLs to that service and set `GEMMA_TEXT_MODEL` to an available Gemma model; `GEMMA_MODEL` selects the vision model. The document adapter currently requires `gemma3:4b` and `embeddinggemma` in those services. This alternate model configuration is not the verified profile above.

## Use it

1. The document tutorial is selected initially. Preview and confirm the actual video.
2. Gemma reads its real captions, video frames and pinned source materials. Review the proposed workflow, model differences and supplied sample.
3. Execution has a disclosed ten-second approval countdown, with Pause and Start now. Hiding, leaving or reloading this pre-approval view pauses it.
4. After approval, just watch. The full document workflow extracts PDF text, table and chart crops, asks Gemma to describe the images, embeds the content locally, retrieves evidence and answers automatic questions in the actual browser.
5. After checks pass, explore the live local app or download its checked source. Optional questions or your own PDF are use of the delivered app, not required run steps.

After delivery, **Try it yourself** links to the original video and the checked source, with optional steps to repeat the workflow on your own material. It appears below the result and above execution details; it never blocks the automatic run. Changes made during practice are not re-tested automatically. The checked document environment is Linux inside local Docker; native Windows/macOS execution of the downloaded Python app has not been verified.

Stop remains available during execution. It prevents subsequent steps after the current operation finishes safely, including delivery after the final check. A Stop received after delivery returns an explicit already-finished response. Closing the viewer does not cancel approved work. Reconnect restores the current state, including a new run that replaces one still closing. Reopened pre-approval reviews stay paused. Failures and exhausted repair attempts are explicit.

The presentation alternative has a seven-second optional direction window after its covers are checked. Doing nothing selects the recommendation on the server, including when the viewer is hidden or disconnected. Optional changes never become required clicks.

## Available tutorials

**Main: [Multimodal document questioning](https://youtu.be/hBDNv47KCKo)** by Nariman Codes. It follows the MIT-licensed [source workflow](https://github.com/NarimanN2/ollama-playground/tree/bb2ae8d1d3665d725afd5db5df1823203002c15c/multi-modal-rag): Streamlit, unstructured HI_RES extraction, Gemma image/table descriptions, 1000-character chunks with 200 overlap, local embeddings, an in-memory vector store and retrieved-context answers. This adaptation retrieves up to eight chunks (rather than the default four) to reduce omissions across text and visual evidence; it does not guarantee that every relevant source is found.

The video demonstrates Gemma 3 27B; this machine uses Gemma 3 4B. EmbeddingGemma replaces the video's llama3.2 because the installed llama3.2 backend does not support embeddings; the creator explicitly permits another embedding model. The original sample PDF is not included in the repository, so SkillWalk supplies a labelled synthetic table-and-chart worksheet. It is not current population research. Image descriptions are model-derived and can be wrong. Crop prompts use only the image and short same-page heading context. Layout-preserving native PDF text is retained alongside HI_RES extraction; when a single table crop has corresponding extracted labels in the native PDF text, its generated description stays inspectable but is excluded from retrieval to avoid replacing readable rows with invented ones. Answer context has a conservative byte budget within the local model window. No creator-supplied Agent Skill is claimed for this video.

**Alternative: [HTML presentations](https://www.youtube.com/watch?v=372Iksaz8b0)** by Zara Zhang. It uses pinned [frontend-slides](https://github.com/zarazhangrui/frontend-slides) reference material at `9906a34d640d2111f724544cbc50f7f130569ae1`. Gemma creates three actual cover previews, automatically selects a checked recommendation, builds five slides, tests and repairs them, and preserves inline editing and separate edited-copy export. This is a bounded creation path, not every feature of the source skill.

**Alternative: [Frontend design](https://www.youtube.com/watch?v=DVlHZufvP10)** by AI Coding Daily. It reads the actual video evidence and the creator-linked pinned [frontend-design reference](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md). The run creates an initial homepage, applies the reference, tests real desktop/mobile behavior and repairs failures. This is an HTML/CSS adaptation, with no Laravel/PHP backend, plugin installation or deployment.

Both alternatives were demonstrated with Claude. SkillWalk uses local Gemma; appearance, quality and reliability may differ. Functional tests do not establish equivalence to the creator's design. Host typography and previous artifact adaptations remain distinct from the tutorial's original design.

You can paste another YouTube link to check availability. Unreviewed videos can be previewed but cannot execute yet. “Not reviewed” does not mean impossible, and a model disclaimer does not establish support for arbitrary tutorials.

## What is live

The viewer distinguishes file work, actual isolated Chromium capture and the delivered result. There is no simulated typing, YouTube clicking or screenshot playback presented as live activity. Model responses and operation details are optional.

The document app runs on a separate loopback origin. Its source/configuration manifest and downloadable archive are checked before reopening. The default Streamlit deployment toolbar is disabled. The original HTML adapters retain opaque sandboxed previews and hash-gated downloads. Edited slide copies are explicitly not re-tested.

## Isolation and local data

The main server binds only to 127.0.0.1 and validates Host, Origin and a per-server request token. Only one job can run, including cleanup and persistence. This is a local tool, not an authenticated public service.

The document processing container is nonroot, read-only and attached only to an internal Docker network. It receives narrowly mounted app, run-data and bridge folders. A restricted filesystem broker forwards only permitted model operations to fixed local Ollama endpoints. A separate fixed-target relay publishes the app only on 127.0.0.1:4180; it does not provide general network access to the processing container. Neither the Docker socket nor unrelated user folders are mounted. A read-only host heartbeat bounds both owned containers; they exit after the host disappears rather than leaving an unusable runtime behind. Checked report/extraction snapshots are outside writable app mounts, so later uploads do not alter the original verification record.

HTML browser checks retain network isolation, Chromium sandboxing, the version-matched default-deny seccomp profile and bounded resources. Document checks also use sandboxed Chromium. File parsing, source instructions and model output do not authorize unrestricted host commands.

Runs, media, source caches, extraction results and reports stay in ignored `.artifacts/`. User PDFs and model-derived descriptions can remain in their run folder; do not use sensitive documents unless you intend to keep that local record. No automatic remote upload or telemetry is enabled. The embedded YouTube player and initial public source/model/package downloads need internet access.

Repairs are bounded: two document instruction repairs, four full-deck/website repairs and two cover repairs. Dependency or runtime failures stop explicitly rather than consuming unrelated prompt repairs. Interrupted jobs are not silently resumed after a server restart; completed results and failed/stopped states can be restored.

## Verify

```powershell
npm test
node src/document-flow-check.mjs
node src/style-ui-check.mjs
node src/reconnect-ui-check.mjs
```

The document flow check uses the actual tutorial, real local models and a real isolated browser. It tests table/chart extraction, source evidence, a chart-value answer, a cross-source comparison, insufficient-evidence behavior and narrow layout. It also detects invented dates and rejects answers that mention a chart value while denying the requested population answer. A separate real-browser upload test covered a two-page native-text/table and raster-diagram PDF: prose, table, image, cross-page and unsupported questions. This is tested coverage, not a guarantee for every PDF. Native-label matching does not prove every cell in a mixed native/raster table was extracted; check the source and treat image descriptions as estimates. Results are tied to report, extraction and configuration hashes.

The reconnect UI check covers reload during prior-run cleanup, review arriving before the Analyze reply, and preserved source edits. These browser harnesses use the installed Microsoft Edge on the verified Windows host; they do not call a model.

The style UI check uses controlled generation/verification fixtures to test automatic progression, hidden/off-screen/disconnected viewers and reload. It is not a new AI-quality benchmark. Previously generated artifacts and proof evidence remain local.

The CLI presentation commands `npm run proof`, `npm run verify` and `npm run repair` remain available. `npm run acquire -- <YouTube URL>` caches a reviewed video's evidence. Runtime model changes, general tutorial automation, publishing and deployment are outside this implementation.
