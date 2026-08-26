# On-Device OCR Strategy — DocsbyIRA Mobile Invoice Capture

**Audience:** Mobile engineer (Android + iOS)
**Mode:** Evaluate and recommend — you own the recommendation, this document defines the options and the bar
**Status:** Draft for spike
**Date:** 2026-07-30
**Related:** ADR-001 — On-Device Invoice Capture (Tally backend)

---

## 1. What you are being asked to decide

Which OCR engine runs **on the device** in the DocsbyIRA capture app, for Android and iOS, feeding a cloud SLM that produces TallyPrime purchase vouchers.

You are **not** being asked to solve field extraction. The cloud owns that. Your output is text, boxes, and confidence — and a defensible answer to "which engine, and why."

### The three questions your spike must answer

1. Does any on-device engine beat **platform-native OCR** (ML Kit / Apple Vision) by enough to justify its binary size and maintenance cost?
2. If yes, which — **PP-OCRv6** or **DocTR** — and at which model tier?
3. What is the resulting **critical-field exact-match rate**, and is it good enough to gate on?

---

## 2. Read this before you start: two findings that reshape the brief

### 2.1 PP-OCRv6 *tiny* is probably the wrong target

The brief named "PP-OCRv6 (Tiny)". The published numbers argue against it:

| Tier | Params | Detection Hmean | Recognition accuracy | Languages |
|---|---|---|---|---|
| **tiny** | 1.5M | 80.6% | **73.5%** | Not stated as 50-language |
| **small** | 7.7M | 84.1% | **81.3%** | 50 languages |
| medium | 34.5M | 86.2% | 83.2% | 50 languages |

Two things stand out.

**The accuracy gap is large.** Going tiny → small costs 5× the parameters — but 7.7M is *still tiny* in absolute terms, likely 15–30 MB quantised. It buys **+7.8 percentage points** of recognition accuracy. On an invoice, recognition errors don't degrade gracefully: one wrong character in a 15-character GSTIN invalidates the field completely. A 73.5% recogniser is very unlikely to clear a useful critical-field bar.

**The multilingual claim is scoped to small and medium.** PaddlePaddle's announcement states the *medium and small* tiers support 50 languages. Tiny's coverage is not stated on equal terms. Verify this directly before assuming tiny handles your character set.

**→ Benchmark `PP-OCRv6_small` as the primary PaddleOCR candidate. Include tiny only as a floor reference.**

### 2.2 PP-OCRv6's 50 languages do not include Devanagari

The 50 languages are Simplified Chinese, Traditional Chinese, English, Japanese, and **46 Latin-script** languages. Devanagari is not Latin script.

PaddleOCR does ship Devanagari recognition — `devanagari_PP-OCRv5_mobile_rec`, covering Hindi, Marathi, Nepali, Sanskrit, Konkani and English — but it is a **separate v5-generation model**, not part of the v6 unified family.

So if regional-language vendor names and addresses matter to your invoice mix, you are looking at **two recognition models and a script-routing decision**, not one model. If your invoice mix is effectively English-only — which is largely defensible, since GST-mandated invoice fields are conventionally printed in English — this is a non-issue.

**→ Establish the Devanagari share of your corpus in week 1. It changes the architecture, not just the config.**

---

## 3. Candidates

### A. PP-OCRv6_small (PaddleOCR)

Backbone PPLCNetV4; RepLKFPN detection head; EncoderWithLightSVTR recognition head. Released **11 June 2026**.

**Deployment paths — three, which is the real advantage:**

| Path | Format | Notes |
|---|---|---|
| **Paddle Lite** | `.nb` (Naive Buffer) | First-party. ARM NEON optimised, prebuilt Android (arm7/arm8) and iOS libs, official demo apps |
| **ONNX Runtime** | `.onnx` | Official ONNX variants published in the PP-OCRv6 HF collection |
| **RapidOCR** | `.onnx` | Community repack; reported native iOS/Android bindings, 15–30 FPS camera OCR |

**Pros**

- First-party mobile deployment story — you follow documentation instead of blazing a trail
- Smallest credible footprint at usable accuracy
- Three runtime options; you are not locked to one
- Explicitly designed for edge from the outset, not adapted to it

**Cons**

- **Seven weeks old at time of writing.** Minimal production mileage, few community bug reports, and the Paddle Lite mobile demos are documented against *older* PP-OCR generations — the v6-specific mobile path may not be paved yet. Budget time to find out.
- Paddle Lite means a second inference runtime in the app if you already carry ONNX Runtime
- Confidence appears to be **per text line** in standard output, coarser than DocTR's per-word — verify, it affects the cloud crop policy
- Devanagari requires the separate v5 model

### B. DocTR (Mindee)

Detection: DBNet / LinkNet / FAST with MobileNetV3 or ResNet backbones. Recognition: CRNN, PARSeq, SAR, MASTER, ViTSTR.

Mobile config: `db_mobilenet_v3_large` + `crnn_mobilenet_v3_large`, exported via `export_model_to_onnx`, run under ONNX Runtime Mobile. OnnxTR exists as a community ONNX pipeline wrapper.

**Pros**

- **Richest confidence signal of any candidate.** Per-word `confidence` (recognition) *and* `objectness_score` (detection) *and* `crop_orientation` with its own confidence. This directly enables the low-confidence crop strategy in the cloud contract, and no other candidate matches it.
- Mature, stable, well-documented Python library
- Wide model menu — you can trade size for accuracy across many points
- Single runtime (ONNX Runtime) shared across platforms

**Cons**

- **No first-party mobile SDK.** Mindee does not ship or support one. You own quantisation, delegate configuration, NNAPI fallbacks and thermal behaviour.
- Larger than PP-OCRv6_small for comparable or worse accuracy — expect ~30–60 MB for the mobile config
- Python-first library; the mobile path is unofficial territory
- Ignore SAR and MASTER entirely. They are built for scene text — curved signage, perspective distortion. Invoices are flat, axis-aligned print. You would pay 3× parameters for robustness to a distortion class your inputs don't contain.

### C. Platform-native — ML Kit (Android) + Apple Vision (iOS)

**This is your baseline and you must measure it.**

**Pros**

- Zero or near-zero binary cost
- Vendor-optimised for vendor silicon; no tuning, no thermal work, no delegate debugging
- ML Kit covers Latin **and Devanagari**
- Fastest path to a shipping capture experience

**Cons**

- Two engines, two accuracy profiles, two sets of bugs
- Behaviour can shift under you with OS updates
- No fine-tuning, no model control
- Confidence granularity and quality differ between the two platforms — check what each actually exposes

**Do not skip this arm.** If neither PP-OCRv6_small nor DocTR beats native by a meaningful margin on critical-field exact match, the correct recommendation is *ship native, save the binary, spend the effort on the cloud stage*. Teams routinely over-engineer this layer because they never measured the free option.

### Not recommended for evaluation

**Tesseract** — poor on camera-captured images, effectively obsolete for this use case.
**On-device VLMs** (Qwen3-VL, SmolVLM class) — multi-GB quantised; not deployable to the mid-range Android fleet that dominates the Indian market. Revisit in 12–18 months.
**EasyOCR, Surya** — too heavy for mobile.

---

## 4. Benchmark protocol

This is the substance of the spike. A recommendation without this data is an opinion.

### 4.1 Dataset

**Minimum 300 real invoices**, stratified — *not* a convenience sample, and *not* public benchmark data. Public OCR benchmarks will mislead you here; your inputs have a specific and unusual distribution.

Stratify across:

| Axis | Strata |
|---|---|
| Print type | Laser · inkjet · **thermal** · **dot-matrix** · carbon copy |
| Capture | Flatbed scan · good phone photo · poor light · skewed · glare · crumpled |
| Language | English-only · mixed English/Devanagari |
| QR | Present · absent |
| Layout | Single-page · multi-page · dense line items (>15 rows) |

Thermal and dot-matrix matter disproportionately — they are common in Indian SME purchase flows and they are where cheap recognisers collapse.

**Ground truth:** field-level labels for the critical set, plus full line-item tables for a 100-invoice subset. This is real annotation work. Scope it explicitly; it is the long pole of the spike.

### 4.2 Metrics — in priority order

**L0 — QR decode rate.** What fraction of invoices carry a decodable signed QR? Measure this first. It may materially reduce how much the OCR engine has to carry, and it is nearly free to measure.

**L1 — Critical-field exact-match rate.** *The primary metric.* Exact string match, no fuzzy credit, on:

- Supplier GSTIN
- Recipient GSTIN
- Invoice number
- Invoice date
- Grand total
- Taxable value, CGST/SGST/IGST amounts

Report per field. A GSTIN at 88% and a total at 97% are very different problems.

**L2 — Line-item recall.** Fraction of ground-truth line-item rows detected at all. This catches detection failures, which are silent — a missed row produces no error signal, just a short voucher. Pair with a totals-footing check.

**L3 — Word-level CER/WER.** Useful for diagnosis, **not** for the decision. An engine can post 97% character accuracy and still fail L1 badly, because errors concentrate in dense small-print alphanumerics — which is exactly where GSTINs live.

**L4 — Confidence calibration.** For each engine, plot confidence against observed error rate on the labelled set. You need three numbers out of this:

- Does a threshold separate correct from incorrect reads usefully?
- What fraction of *actual* errors fall below a candidate threshold? (If under ~70%, confidence-triggered crops won't work and the cloud contract must lean on criticality-based always-send instead.)
- **Is there length bias?** Plot confidence against string length. CTC sequence confidence is often a product of per-step probabilities, which systematically penalises long strings regardless of correctness — meaning your GSTINs and invoice numbers trip the threshold while short noise words pass. If the slope is negative, switch to a length-normalised score, `exp(mean(log p))`.

### 4.3 Operational metrics

| Metric | How to measure |
|---|---|
| Latency p50 / **p95** | Per page, **after thermal soak** — not first-run. Report p95; the tail is what users feel. |
| App size delta | Actual APK/IPA increase, models included, after your normal compression |
| Peak memory | Under sustained capture, not single-shot |
| Battery / thermal | 20 consecutive captures; log for throttling onset |
| Cold-start | Model load time on first invocation — this is a real UX cost |

### 4.4 Reference devices

Fix these before you start and use only these for reported numbers.

- **Android low** — 4 GB RAM, mid-tier SoC, ~₹10–12k class. **Non-negotiable.** This is the Indian market. A result that only holds on a flagship is not a result.
- **Android mid** — 6–8 GB RAM, current mid-range
- **Android high** — current flagship
- **iOS old** — oldest supported iPhone
- **iOS current** — current-generation iPhone

### 4.5 Protocol rules

- Identical input images across all arms. Same preprocessing, or none.
- Fixed seeds; report variance across at least 3 runs.
- Measure after thermal soak.
- No per-engine hand-tuning that isn't also applied to the others.
- **Log every raw output.** You will want to re-score against revised metrics without re-running the fleet.

---

## 5. Decision framework

Score each arm against the gates. The recommendation follows the table, not the vibe.

| Gate | Threshold | Rationale |
|---|---|---|
| **G1** Critical-field exact match | Must beat native baseline by **≥5 pp** | Below this, the binary cost and maintenance burden aren't earned |
| **G2** GSTIN exact match | **≥95%** | Below this the cloud crop-verification path is mandatory, not optional |
| **G3** Line-item recall | **≥98%** | Missed rows are silent failures; this is the dangerous metric |
| **G4** p95 latency, Android low | **≤2.5 s/page** | Capture UX degrades badly past this |
| **G5** App size delta | **≤40 MB** | Product constraint — confirm the actual number with Product |
| **G6** Confidence usable | ≥70% of errors below threshold | Determines whether the cloud contract can rely on confidence-triggered crops |

**Outcomes:**

- **Native passes G1–G6** → ship native. Recommend it without embarrassment; it's the right answer and it's free.
- **PP-OCRv6_small clears all gates** → recommend it. Then decide Paddle Lite vs ONNX Runtime on integration effort, not accuracy.
- **DocTR clears gates and PP-OCRv6 does not** → recommend DocTR; the richer confidence signal is a genuine bonus for the cloud contract.
- **Both clear, results close** → prefer PP-OCRv6_small on size and first-party mobile support, *unless* G6 fails for it and passes for DocTR. Per-word confidence plus objectness score is worth real money in the cloud stage.
- **Nothing clears G2 or G3** → escalate. The answer is architectural, not a model choice: lean harder on QR decode, or move recognition to the cloud entirely.

---

## 6. Suggested spike plan — 3 weeks

**Week 1 — Harness and baseline**

1. Assemble and stratify the 300-invoice corpus; begin annotation
2. Measure QR decode rate (L0) — cheapest, highest-information result available
3. Determine Devanagari share of corpus
4. Build the scoring harness: raw output → field extraction → L1/L2/L3 metrics
5. Run **native baseline** (ML Kit + Vision) end to end

*Gate: if QR coverage is very high and native clears G1–G3, consider stopping here and reporting that.*

**Week 2 — Candidate integration**

6. PP-OCRv6_small via ONNX Runtime — quickest path to a number
7. DocTR mobile config via ONNX Runtime — reuses the same runtime, so incremental
8. PP-OCRv6_tiny as a floor reference (cheap, one config change)
9. If PP-OCRv6 looks strong, additionally try Paddle Lite and compare against its ONNX numbers

**Week 3 — Measure and report**

10. Full metric sweep across all reference devices
11. Confidence calibration analysis, including the length-bias check
12. Write up against the gate table
13. Recommend, with the failure modes you observed and what you'd want to test next

### Deliverables

- Populated gate table, all arms, all reference devices
- Per-field L1 breakdown — not just the aggregate
- Confidence calibration plots per engine
- Recommendation with explicit reasoning against the gates
- Raw outputs archived and re-scorable

---

## 7. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| PP-OCRv6 is 7 weeks old; v6 mobile path may be unpaved | Weeks lost to integration | Timebox to 3 days; fall back to ONNX Runtime if Paddle Lite v6 support lags |
| Annotation is the long pole | Spike slips | Start week 1 day 1; 100 fully-labelled invoices is enough to begin |
| Devanagari need discovered late | Architecture change | Resolve in week 1 |
| Corpus not representative | Wrong recommendation, discovered in production | Stratify deliberately; oversample thermal and dot-matrix |
| Confidence uncalibrated across engines | Cloud contract built on a bad signal | G6 exists for this; do not skip the calibration step |
| Optimising on flagship hardware | Ships broken to the actual market | Android-low is a required reporting device |

---

## 8. Licensing

Both PaddleOCR and DocTR are Apache-2.0 licensed codebases, which is compatible with commercial distribution. So are RapidOCR and Tesseract.

**Confirm model *weight* licences separately from code licences** before shipping — they are not always identical, and this applies to the Devanagari v5 model as well as the v6 family. Get this checked in week 1; a licence problem discovered after integration is expensive.

**Specific warning — Surya.** It appears on virtually every "best open source OCR" list, usually without the caveat: the code is **GPL-3.0** and the models ship under **AI Pubs Rail-M**, which is free for research and for startups under $2M revenue but **requires a separate commercial licence above that**. Treat it as encumbered until legal clears it. It is excluded from this evaluation on deployability grounds anyway (see Appendix B), but the licence is the more durable reason.

---

## 9. Out of scope

- Field extraction / KIE — cloud SLM owns this
- Tally XML generation and ledger resolution — backend
- The device→cloud payload contract — separate document, but your L4 confidence findings feed it directly
- Windows / Linux targets — noted in ADR-001, not part of this evaluation

---

## Appendix A — Reference figures

Parameter counts are published. Binary sizes are **estimates pending your measurement** and are the single most commonly wrong number in this kind of document — measure, don't cite.

| Model | Params | Est. size (quantised) | Detection | Recognition |
|---|---|---|---|---|
| PP-OCRv6_tiny | 1.5M | ~3–6 MB | 80.6% | 73.5% |
| **PP-OCRv6_small** | **7.7M** | **~15–30 MB** | **84.1%** | **81.3%** |
| PP-OCRv6_medium | 34.5M | ~70–140 MB | 86.2% | 83.2% |
| DocTR mobile (db_mnv3 + crnn_mnv3) | ~9–13M | ~30–60 MB | — | — |
| ML Kit | — | small, bundled | — | — |
| Apple Vision | — | ~0 (OS) | — | — |

PP-OCRv6 accuracy figures are from PaddlePaddle's in-house multi-scenario benchmark — **not** an invoice benchmark, and not directly comparable to DocTR's published numbers, which use different evaluation sets. This is precisely why the spike exists: the only numbers that decide this are the ones you generate on your own corpus.

---

## Appendix B — Open-source mobile OCR landscape

Most "best open source OCR" lists mix server-class models with mobile ones. This table is filtered to engines that will **actually run on a phone**.

### Genuinely mobile-deployable

| Engine | Licence | Mobile path | Assessment |
|---|---|---|---|
| **PaddleOCR / PP-OCRv6** | Apache-2.0 | Paddle Lite (`.nb`) · ONNX Runtime | 76k+ GitHub stars. tiny 1.5M / small 7.7M / medium 34.5M params. First-party mobile support with prebuilt Android and iOS libs. **Primary candidate.** |
| **RapidOCR** | Apache-2.0 | ONNX Runtime · OpenVINO · MNN · PyTorch | PaddleOCR models repacked as ONNX. Reported native iOS/Android bindings at 15–30 FPS camera OCR. A delivery mechanism for the same models — not a separate accuracy candidate. Use if Paddle Lite integration turns painful. |
| **DocTR** | Apache-2.0 | `export_model_to_onnx` → ONNX Runtime Mobile | No official mobile SDK; unpaved path. **Best confidence signal of any option** — per-word `confidence`, `objectness_score`, and `crop_orientation`. **Secondary candidate.** |
| **Tesseract** (via `tesseract4android`) | Apache-2.0 | Mature JNI wrapper | ~10 MB, 100+ languages, adequate on clean flatbed scans. **Poor on camera-captured images.** Historical baseline only — not a serious 2026 candidate for this use case. |

### Reference implementation worth reading first

**Ente Photos** rebuilt the PaddleOCR pipeline in Kotlin and wrapped it as a Flutter plugin running on ONNX Runtime Mobile — reported as the first fully open-source Android OCR that works well in production.

This is a working example of precisely the integration this spike scopes. **Read their implementation before writing your own.** It will likely save days on preprocessing parity and postprocessing details, which is where the time actually goes.

### Excluded — server-class, not phone-deployable

Listed so the evaluation record is explicit about what was considered and why it was ruled out.

| Engine | Licence | Reason for exclusion |
|---|---|---|
| Surya | **GPL-3.0 code + AI Pubs Rail-M model** | Strongest layout analysis in the open set, but licence-encumbered — see §8 |
| EasyOCR | Apache-2.0 | Heavy; PyTorch-bound |
| MMOCR | Apache-2.0 | Research toolkit, not a deployment target |
| TrOCR | MIT | Transformer-scale |
| Docling | MIT | ~3B params |
| GOT-OCR2.0 · olmOCR | Apache-2.0 | VLM-scale; multi-GB |

### Closed-source but free and on-device

**ML Kit** (Android) and **Apple Vision** (iOS). Not open source, but they are the **benchmark floor** — zero binary cost, vendor-optimised, and ML Kit covers Devanagari. See §3C; these are a required evaluation arm, not an afterthought.

---

## Sources

- [PP-OCRv6 on Hugging Face: 50-Language OCR from 1.5M to 34.5M Parameters](https://huggingface.co/blog/PaddlePaddle/pp-ocrv6)
- [PP-OCRv6: From 1.5M to 34.5M Parameters — arXiv](https://arxiv.org/html/2606.13108v1)
- [PP-OCRv6 Documentation — PaddleOCR](https://www.paddleocr.ai/latest/en/version3.x/algorithm/PP-OCRv6/PP-OCRv6.html)
- [On-Device Deployment — PaddleOCR Documentation](https://paddlepaddle.github.io/PaddleOCR/main/en/version3.x/deployment/on_device_deployment.html)
- [PaddleOCR Lite deployment — GitHub](https://github.com/PaddlePaddle/PaddleOCR/blob/main/deploy/lite/readme.md)
- [devanagari_PP-OCRv5_mobile_rec — Hugging Face](https://huggingface.co/PaddlePaddle/devanagari_PP-OCRv5_mobile_rec)
- [PP-OCRv5 multi-language documentation](https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/algorithm/PP-OCRv5/PP-OCRv5_multi_languages.en.md)
- [RapidOCR — GitHub](https://github.com/rapidai/rapidocr)
- [The best open-source Android OCR — Ente](https://ente.com/blog/ocr/)
- [Best Open Source OCR Tools & Models for Developers in 2026 — Unstract](https://unstract.com/blog/best-opensource-ocr-tools/)
- [Best Open Source OCR Tools 2026 — imagetotable.ai](https://imagetotable.ai/blog/best-open-source-ocr-tools-2026)
- [Android OCR Libraries: A Field Guide — Iron Software](https://ironsoftware.com/csharp/ocr/blog/ocr-tools/android-ocr-library-list/)
- [doctr.io — docTR documentation](https://mindee.github.io/doctr/modules/io.html)
- [docTR — GitHub](https://github.com/mindee/doctr)
- [Deploy on mobile — ONNX Runtime](https://onnxruntime.ai/docs/tutorials/mobile/)
- [Recognize text in images with ML Kit](https://developers.google.com/ml-kit/vision/text-recognition/v2/ios)
