# SkillWalk

Watch a YouTube tutorial become a working local result. SkillWalk reads a tutorial's captions and sampled frames, prepares a plan with local Gemma, then runs supported workflows, browser checks and bounded repairs.

**Approve once, then watch.** The three featured examples use vetted execution recipes. Other YouTube URLs enter a separate experimental source-analysis and execution pipeline, without per-video rules. There is no paid model API, account requirement or automatic deployment.

SkillWalk uses local Gemma models to follow tutorials. Results depend on the tutorial’s tools, available materials, and your computer. Tutorials using compatible local tools may work more reliably. Tutorials demonstrating other models or services may require adaptations that change the result. SkillWalk will check compatibility before starting.

## Requirements

The host is tested on **Windows with Node.js 24**. Document processing runs in Linux containers.

- Node.js 24 and npm.
- Docker Desktop running Linux containers.
- Ollama running locally with `gemma3:4b` and `embeddinggemma`.
- `yt-dlp.exe` and `ffmpeg.exe` available on PATH. Set `YTDLP_BIN` or `FFMPEG_BIN` to their executable paths if needed.
- Internet access for initial packages, models, tutorial media and source downloads, and for the embedded YouTube player.

Model weights and generated results are not included. Setup downloads large dependencies and extraction weights; allow several minutes and enough disk space. Inference speed and memory use depend on your hardware.

## Start locally

Download or clone the project and open PowerShell in its folder. Start Docker Desktop and Ollama first. If Ollama is already running, use that service.

For a single Ollama service on its usual local port:

```powershell
ollama pull gemma3:4b
ollama pull embeddinggemma
npm ci
$env:OLLAMA_BASE = 'http://127.0.0.1:11434'
$env:OLLAMA_TEXT_BASE = 'http://127.0.0.1:11434'
$env:GEMMA_TEXT_MODEL = 'gemma3:4b'
$env:DOCUMENT_EMBEDDING_BASE = 'http://127.0.0.1:11434'
npm run setup:document
npm start
```

Open [SkillWalk](http://127.0.0.1:4179/tutorial). Stop the host with Ctrl+C.

The single-service configuration is supported by the code; the full end-to-end checks used a split profile: vision/answers with `gemma3:4b` on port 11435, and source interpretation with an existing Gemma alias `local-gemma`, plus `embeddinggemma`, on port 11434. That alias is not shipped. To use an existing split installation, set `OLLAMA_BASE`, `OLLAMA_TEXT_BASE`, `GEMMA_TEXT_MODEL` and `DOCUMENT_EMBEDDING_BASE` accordingly. Results can differ between models and configurations.

Setup builds `skillwalk-document:local` and prepares the version-matched, hash-verified browser sandbox profile. It fails explicitly if an existing profile has changed. It does not disable sandboxing or change Windows security policies. Later starts reuse the local runtime and caches.

## Use SkillWalk

1. Start with the document tutorial, choose an alternative, or paste a YouTube link. Preview and confirm the video. Featured videos use their reviewed demonstration flow; unfamiliar videos are assessed from their actual source requirements.
2. Watch the source analysis, then review the plan, supplied sample and model differences. No writing or content upload is required for the demonstration.
3. The execution overview has a disclosed ten-second approval countdown with **Pause** and **Start now**. Leaving, hiding or reloading this view pauses approval.
4. After approval, execution continues without another required click, including if the viewer disconnects. Follow the actual browser activity, checks and repairs.
5. When checks pass, explore the result or download its checked source. **Try it yourself** provides optional practice with the original tutorial.

**Stop** prevents subsequent steps after the current operation finishes safely, including delivery after a final check. A request after completion returns an explicit already-finished response. Failed or interrupted runs are labelled; they do not become verified results.

Featured presentation runs retain their optional direction window and saved outputs. Unfamiliar videos use the experimental source contract. Inline edits produce a separate copy that has **not** been re-tested.

## Experimental unfamiliar-tutorial pipeline

The experimental worker defaults to `gemma3:12b` for text and vision, separately from featured demonstrations. Download it explicitly into the Ollama service used by `OLLAMA_BASE` before running unfamiliar tutorials. The download is approximately 8.2 GB; runtime memory and latency also depend on context length and GPU memory. No model is downloaded automatically and no cloud fallback is used.

Set `EXPERIMENTAL_OLLAMA_BASE` to a local loopback service and `EXPERIMENTAL_GEMMA_MODEL` to an installed Gemma model to override this trial profile. The larger model is a test candidate, not a guarantee of fidelity or reliability.

Unfamiliar URLs use captions, nine uniformly sampled frames, offline OCR and local vision. Public GitHub or CodePen source linked by the creator can supplement that evidence; inaccessible links are recorded, not bypassed. GitHub material is pinned and hashed. Downloaded source is untrusted data and is never executed on the host.

Local Gemma extracts source-cited requirements, operations and interactions. When matching creator HTML is available, a network-isolated browser measures its initial content, structure and computed styles before any candidate is generated; those measurements ground the contract. Otherwise, local source interpretation supplies the content and style assertions. A finite capability check selects standalone offline HTML/CSS/JavaScript or the full isolated multimodal document adapter. Unknown services, credentials and unsupported operations remain explicit compatibility failures. Document configuration comes from the source; its Python implementation is the audited reusable adapter.

HTML checks exercise actual interactions, visible content, semantic structure, computed styles, runtime errors, network attempts and overflow. A separate local vision comparison checks actual source and rendered output. Document runs check extraction, retrieval and answers before comparing source requirements and operations. Model interpretation can still be wrong; a model's pass is not independent proof of complete visual equivalence. The real unfamiliar-tutorial acceptance work is ongoing; fixture tests and historical featured outputs do not establish it.

Media acquisition accepts durations from 20 seconds to one hour, filters individual downloads at 128 MiB, monitors media files against a 256 MiB limit at 100 ms intervals, and rejects oversized cached or final media. The monitored limit can overshoot between checks. English captions are required. Sampled frames can miss important details; unreadable source references cannot establish fidelity. Failed runs remain incomplete and have no verified final download.

## Featured examples and preserved baselines

| Tutorial | Earlier checked baseline | Demonstrated scope |
| --- | --- | --- |
| [Multimodal PDF questions - Nariman Codes](https://youtu.be/hBDNv47KCKo) | Local Streamlit app | Main workflow: PDF extraction, Gemma image/table descriptions, embeddings, retrieval and answers |
| [HTML presentations - Zara Zhang](https://youtu.be/372Iksaz8b0) | Five-slide HTML deck | Three cover previews, automatic selection, generation, browser tests, repairs and editing |
| [Frontend design - AI Coding Daily](https://youtu.be/DVlHZufvP10) | Local HTML/CSS homepage | Initial page, reference-guided revision, desktop/mobile checks and repairs; no Laravel/PHP backend |

The reusable PDF adapter follows the [MIT-licensed source](https://github.com/NarimanN2/ollama-playground/tree/bb2ae8d1d3665d725afd5db5df1823203002c15c/multi-modal-rag) at revision `bb2ae8d1d3665d725afd5db5df1823203002c15c`. Reviewed Python implements the workflow; Gemma interprets the source and produces configuration instructions. This is not arbitrary autonomous program synthesis or a creator-supplied Agent Skill.

The presentation uses recorded [frontend-slides](https://github.com/zarazhangrui/frontend-slides) reference material; the frontend alternative uses the video's linked [frontend-design reference](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md). Both videos demonstrate Claude. SkillWalk uses local Gemma, so appearance, quality and reliability may differ. Functional checks do not prove visual equivalence.

### Document adaptations and limits

- The video uses Gemma 3 27B; this version uses Gemma 3 4B. EmbeddingGemma replaces llama3.2 because the tested llama3.2 service did not support embeddings.
- The creator's sample PDF was unavailable. The supplied population worksheet is labelled synthetic and is not current research.
- The full HI_RES image/table workflow remains. Layout-preserving native PDF text is added, alongside local embeddings, 1000-character chunks with 200 overlap, and retrieval of up to eight chunks.
- Image descriptions can invent labels or values. A table description stays inspectable but is excluded from answers when a single detected table's labels match native text. This heuristic does not prove complete cell coverage.
- Retrieved passages fit a bounded context window. Relevant evidence can still be missed; compare answers with the PDF.

The checked runtime is local Linux/Docker. Running the downloaded Python app independently on native Windows or macOS has not been verified.

## What you are watching

The viewer distinguishes file/model work, live isolated Chromium capture and the delivered interactive result. It does not present screenshot playback or simulated typing as live execution. Model output and operation details are optional.

The completed PDF app runs on a separate local origin. Its recorded checked answers are labelled separately from new questions. You may upload a non-sensitive PDF under 10 MB; this does not replace the original checked archive or verification snapshots.

## Local data and isolation

The host binds to `127.0.0.1:4179`; the document app is relayed at `127.0.0.1:4180`. Host, Origin and request-token checks protect local APIs. Only one job runs at a time. This is a local prototype, not an authenticated public service.

Document processing uses a nonroot, read-only container on an internal network. A restricted broker forwards approved operations to fixed local Ollama endpoints. Unrelated host folders and the Docker socket are not mounted. A host lease stops owned containers after the host disappears. Browser checks retain Chromium sandboxing, a pinned default-deny seccomp profile and bounded resources.

Runs, user PDFs, source downloads, model logs and verification evidence remain in ignored `.artifacts/`. Uploaded content can persist there after use. Do not share that directory or use sensitive PDFs unintentionally. Model inference stays local; YouTube and initial downloads still use the internet.

Downloads are gated on checked hashes. Changed files cannot silently replace a verified result. New HTML runs allow three generation/check attempts. Document instruction repair allows two retries. Historical deck/website and cover runs retain their previous bounds. Runtime failures stop explicitly.

## Verification

Fast tests require Node.js and installed dependencies, without model calls or a downloaded tutorial cache. HTTP and readiness tests create isolated, synthetic fixtures:

```powershell
npm test
```

After document setup, the full check uses the actual video, local models and isolated browser. Run it when another job is not active:

```powershell
node src/document-flow-check.mjs
```

Additional controlled UI checks use installed Microsoft Edge and do not call a model:

```powershell
node src/reconnect-ui-check.mjs
node src/style-ui-check.mjs
```

The style harness requires an existing presentation run with three generated cover previews in `.artifacts/experiments/`. Complete that tutorial first on a fresh checkout. It verifies automatic progression and optional practice, not new model quality. The reconnect harness covers cleanup/reload, delayed analysis replies and preserved source edits.

Historical verification included four Python heartbeat tests, eight strict real-model document/browser checks, and six answers from a separately uploaded synthetic PDF containing prose, a table and an image. The second PDF covered cross-page evidence and honest unknowns. It is bounded test coverage, not a guarantee for every PDF. Fresh browser/local-vision rechecks also passed on previously generated presentation and homepage outputs; those were not new generations.

## License and credits

SkillWalk's original code is [MIT licensed](LICENSE). The document adaptation retains its [upstream MIT notice](document/SOURCE-LICENSE.txt). Bundled fonts retain the SIL Open Font License notices beside them in `web/assets/`.

Tutorial videos, downloaded reference materials, models and dependencies retain their own terms. The project's MIT license does not relicense them. Downloaded materials and private planning/review documents are not included in the repository.


For code-linked experimental tutorials, SkillWalk pins creator source files, measures the page before generation, and analyzes requirements, operations and individual visible states separately. It replays bounded actions on creator and output pages at the same viewport, compares DOM/style/geometry and screenshots, then separately judges video coverage, content and style. Crop dimensions do not establish original recording zoom.

Execution evidence is saved in execution-report.json; source-fidelity evidence and the combined verifier decision remain separate. An uncertain visual judgment does not regenerate an artifact that passed execution checks, and does not enable a verified download. These bounded comparisons do not establish general unfamiliar-tutorial reliability. The three featured examples retain their existing flows.

For suitable plain-background references, a bounded foreground measurement may estimate recording scale from the video and pinned source only. Both source and output use the same capture settings; the artifact CSS is not rewritten. Scaling is rejected if it changes captured visible content or computed styles at a responsive breakpoint. The estimate is a hypothesis, not proof of the original browser zoom. Replay permits at most four raster-different pixels while captured DOM, style and geometry must match; video fidelity remains a separate gate.

Video checks inventory source regions and compute crop containment from their proposed bounds. Source-image text is transcribed separately and compared with browser text, preserving signs and repeated labels. Styling is described from each image separately before comparison. These checks remain model-dependent: omitted regions, non-DOM text, off-screen content and incomplete style descriptions can prevent a reliable verdict. A passing creator/output replay alone is not a video-fidelity pass.
