---
type: Pathway
title: African Voice AI Pathway — Kenya
description: Adapting an India-built voice-AI stack (VoicERA/Pipecat) into Voicera Africa, a Kiswahili-speaking voice SDK for smallholder farmers and field agents — what porting an orchestration layer across geography actually saves, and the code-switching, telephony, institutional, and governance work it doesn't.
tags: [Voice AI, Agriculture, Africa]
sector: Agriculture
stage: Define
timestamp: 2026-09-02
contributor: Crane AI Labs / UNDP AI Hub for Sustainable Development
---

# 0. Reading Guide

This is a point-in-time record of a still-forming pathway, not a finished case study or an endorsement of any product — the source document holds itself to one test: would the next team adapting a voice-AI stack to a new African-language deployment start from a higher baseline having read it. It draws on a working-group call transcript between the People+AI 100 Pathways team, the UNDP AI Hub team, and the Kenya delivery consultants; the Voicera Africa technical and cost architecture document (dated 11 August 2026); an AI policy and data governance contribution prepared for this pathway by Mildred Rebecca Namagembe; and the CINECA fine-tuning pipeline documentation for the shared HPC allocation. Every claim below traces to one of those sources — where the material doesn't yet answer a question the next adopter would ask, that's recorded honestly in Gaps rather than filled in.

The source document rates its own stage explicitly: **Explore-to-Define**, not further along. The core platform is technically complete end-to-end, but no partner data-sharing position is settled, governance instruments are still in draft, and no pilot date is confirmed — this pathway is establishing what works, not validating a settled approach. Reusable value concentrates in Section 3's Solution and Ecosystem units (the strongest-documented territory) and in Section 4's toolkit table. Nothing here has yet been tested against a real farmer's voice — every technical and cost figure describes a system built and measured internally, ahead of live use.

# 1. Pathway Identity

| Field | Value |
|---|---|
| Deployment name | Voicera Africa (African Voice SDK) — a Kiswahili-speaking conversational voice AI agent, delivered as an SDK partner startups integrate into their own platforms, not a standalone product |
| Sector | Agriculture — smallholder farmer access to tractor availability, indicative pricing, and service requests |
| Geography | Kenya — pilot targeted with one Hello Tractor agency in Kisumu, beginning/mid-September 2026 |
| Population served | Smallholder farmers who cannot access services in English and may not own a smartphone — served either directly by voice, or via a field agent relaying to and from a hub manager, depending on which partner startup's workflow the SDK is integrated into |
| Stage reached | Explore-to-Define, by the source document's own explicit self-assessment — core platform, web voice channel, and streaming telephony channel are built; the turn-based telephony channel live in Kenya today is functional but feature-limited (no tool calling or retrieval, no barge-in); no real farmer has yet used the service |
| Contributing organisation(s) | Crane AI Labs (implementing partner — programme deliverables, approvals, and orchestration adaptation); UNDP AI Hub for Sustainable Development (cooperation structure, under the Italy–India–Kenya trilateral framework); MsingiAI (Sauti ASR/TTS model ownership); Hello Tractor (reference deployment partner); CINECA (Leonardo HPC allocation, Italy) |
| Key dates | Letter of Strategic Intent signed 19 February 2026 (AI Impact Summit, New Delhi); technical/cost architecture document dated 11 August 2026; latency and TTS cold-start figures measured 7 August 2026; pathway document dated 17 August 2026; pilot targeted for Kisumu, beginning/mid-September 2026 |
| Summary | An India-built voice-orchestration stack (VoicERA/Pipecat), developed under the same trilateral partnership, adapted into Voicera Africa for Kiswahili-speaking smallholder farmers in Kenya — delivered as a feature-add SDK partner startups like Hello Tractor integrate into their own field-agent workflows, with code-switching, telephony, and governance treated as a distinct, separately-budgeted second phase of work. |
| Scale/impact achieved (as of 17 Aug 2026) | Not yet deployed to real farmers. Core platform, web channel, and streaming telephony channel complete; turn-based telephony channel (the one live in Kenya today) functional but feature-limited. Measured latency (7 Aug 2026, web channel, warm containers, 9 samples): median 1.84s to first audio; TTS synthesis ≈ two-thirds of a 6.28s turn. Producing the current Sauti ASR/TTS models consumed roughly 1,000 GPU-hours of the programme's shared compute allocation. |

# 2. Effort Details

**Cost anchor (as of 11 Aug 2026).** Three distinct cost shapes, deliberately kept separate rather than collapsed into one figure: a fixed monthly floor (always-on backend, dashboard, voice server, MongoDB Atlas) — currently the dominant cost, independent of call volume; per-call telephony minutes, billed by the provider, scaling with conversation length; and a per-turn cost of roughly 1,970 input tokens at minimum (694 for the system prompt, 640 for tool schemas re-sent every turn, ~640 for retrieved knowledge), rising to ~2,900 with twelve turns of history, plus self-hosted GPU seconds for ASR and TTS — with TTS dominating GPU time. A tool-calling turn costs two completions: roughly 4,000–5,800 input tokens and up to 440 output tokens. No dollar rate card is fixed in the source, deliberately, because provider pricing varies — the token counts and GPU-time shapes are the durable, transferable figures. Training compute is a separate, fourth cost this deployment does not itself pay: fine-tuning runs on the programme's CINECA Leonardo HPC allocation, free at point of use. Against a working estimate of 15–30 GPU-hours for a small ASR fine-tune and 40–80 for a single-speaker TTS fine-tune, the actual draw is now known — producing the current Sauti ASR and TTS models consumed roughly 1,000 GPU-hours of the allocation, the single most transferable number here for an adopter deciding whether to seek subsidised HPC or rent commercially.

**Build effort.** The team adapted VoicERA — an existing voice-agent SDK built for the Indian deployment under the same trilateral partnership — into what is now the African Voice SDK, rather than building orchestration from scratch. In the research engineer's own words, this "saved lots of time because most of the work was purely integration," but customising it for Kenyan conditions "was a bit hard" — a distinct, separately-budgeted adaptation phase, not a configuration change. Team composition: Betty W. Kyalo (programme development, deployment, partner engagement), Gilbert Kiplangat Korir (engineering), and Mildred Rebecca Namagembe (legal and documentation) hold day-to-day operational accountability. This correction happened live, mid-call — the programme's originally-named point of contact was not present and, by the team's own admission, was not in fact the right person to answer detailed operational or technical questions.

**Downstream adoptions.** This pathway is itself downstream of the Indian VoicERA deployment, not yet a source for anything further. A reverse transfer is explicitly anticipated — Crane AI Labs raised the need for a fully local, offline ASR/LLM/TTS variant through the India–Africa exchange programme, in response to unreliable connectivity in parts of Kenya — but this is recorded as an active exploration area, not a shipped capability, and the India-originated telephony and mobile-access approaches already reused here are themselves flagged as untested in the Kenyan context, not settled.

## The 4×4 Coverage Grid

| | Explore | Define | Pilot | Scale |
|---|---|---|---|---|
| **Persona** | ●● (Unit 1) | ●●● (Unit 1) | ○ | ○ |
| **Solution** | ●●● (Units 2, 3) | ●● (Unit 3) | ● (Unit 4) | ○ |
| **Institution** | ● | ●●● (Units 5, 6) | ○ | ○ |
| **Ecosystem** | ●●● (Unit 8) | ●● (Unit 7) | ○ | ○ |

**Where this pathway is most useful to another adopter, by its own account:** Technology and Ecosystem at Explore, and Persona, Institution, and data governance at Define — the architecture-porting decisions and the four-way accountability split are the strongest transferable material. **Where it is weakest:** everything at Pilot and Scale, neither of which this deployment has reached yet.

## Gaps

1. How the code-switching ASR/TTS pipeline performs against real, accented, noisy telephony audio, rather than the clean machine-generated audio used for the August 2026 latency benchmark — a speed figure, not a recognition-accuracy figure. *(Solution/Pilot)*
2. Measured word-error-rate and character-error-rate for code-switched Kiswahili-English speech — recorded by the source as "not started." Without it, code-switching is a described engineering fix, not a validated capability. *(Solution/Pilot)*
3. How the system behaves under concurrent calls, especially given the TTS model's 166-second cold start — load and concurrency testing recorded as "not started," the exact scenario the warm-pool decision in Unit 4 is meant to plan for. *(Solution/Scale)*
4. What the second, unnamed partner startup's field workflow actually looks like, and whether the farmer/field-agent persona split confirmed for Hello Tractor holds for it — explicitly left open ("a little different," "yet to be shared") in the same conversation that mapped Hello Tractor's workflow in detail. *(Persona/Define)*
5. Whether the governance sequence Unit 6 describes has actually been completed and approved by Crane AI Labs, or remains a designed-but-unexecuted process — the source describes what should happen before collection, not that it has happened. *(Institution/Define)*
6. Which organisation is the data controller and which is the processor under the Kenya Data Protection Act 2019 for target-user voice data, and whether that allocation is recorded in an executed agreement — model ownership (MsingiAI) is settled; this legal allocation is a separate, still-open determination. *(Institution/Define)*
7. What live per-call cost this deployment has actually incurred once telephony and GPU usage are billed against real call volume — no real invoiced cost exists yet, since no live target-user calls have occurred; the source deliberately reports only token/GPU-time shapes, not a rate card. *(Solution/Pilot)*
8. The size and end date of the CINECA Leonardo allocation, and what access community contributors retain once it ends — not recorded; every contract in the programme concludes at the end of 2026, and the source treats this as unresolved. *(Ecosystem/Scale)*

# 3. Micro-Innovations

## Persona

**1. The end user is a live variable across partners, not a one-time scoping decision**
- Dimension: Persona
- Stage: Define
- Type: Strategic Decision
- Decision: Track who actually speaks to the voice agent as something confirmed per partner integration, rather than fixed once at programme scoping — and design the SDK itself as a feature add-on into an existing platform (some partners integrating on desktop, others mobile), never as a standalone channel the technology team controls.
- Why: The deployment was originally scoped around the farmer as direct user. By the time of the pathway's working-group call, the team had found the actual first user is often the partner startup integrating the SDK, and one layer further in, a field agent — not the farmer — who speaks to the system on the farmer's behalf in the workflow live today.
- What this looked like here: In Hello Tractor's workflow, a Nairobi regional office (managers, CEO, CTO, engineers) sits above town-level hub managers, with field agents as the intermediaries who relay alerts to farmers and carry feedback back — without the voice AI feature, this relay happens by field agent alone today. A second, confirmed partner startup's workflow was described in the same call as "a little different" and "yet to be shared," meaning the persona answer for that partner was still genuinely open at the time of writing (see Gap 4).
- Condition — applies when: An SDK or feature is being integrated into more than one partner's existing workflow, each with its own structure for who relays information to whom.
- Condition — fails when: A single, standalone deployment with one fixed, already-confirmed direct user — the live-variable framing adds process without a real decision to make.

## Solution

**2. Code-switching has to be engineered into the ASR/TTS layer, separately from the LLM**
- Dimension: Solution
- Stage: Explore
- Type: Tactical Decision
- Decision: Treat code-switching as a capability that has to be built into the speech models themselves, not assumed to be inherited from an LLM that already handles it.
- Why: Msingi AI's voice models initially supported only pure Kiswahili. Kenyan callers routinely code-switch between Kiswahili and English within a single sentence — the LLM already handled this natively, but the ASR and TTS layers did not, and the gap surfaced only once real conversational patterns were tested against the ported stack.
- What this looked like here: The fix went beyond the speech models — a text normaliser for spoken numbers had to be dropped entirely, because a normaliser must assume one output language and breaks the moment a reply mixes two; numbers are now spelled out as words by the language model itself, in whichever language it's speaking in that sentence. The team also found replies came back as long paragraphs rather than short, direct answers, and is fixing this by pulling domain-specific answer conventions directly from Hello Tractor rather than tuning the prompt in isolation. Two further tactical details from the same adaptation pass: the TTS generation seed is now pinned before every call once voice cloning is in use (otherwise consecutive utterances sound like different speakers), and English words inside a Kiswahili reply deliberately carry the cloned reference speaker's Kenyan phonology rather than switching voices mid-sentence — matching how a real bilingual speaker sounds.
- Condition — applies when: Porting a voice stack to a population that code-switches between languages within a single utterance.
- Condition — fails when: The target population is genuinely monolingual — a text normaliser is cheaper and the code-switching adaptation work isn't needed.

**3. Two telephony paths, because the local provider doesn't support one**
- Dimension: Solution
- Stage: Define
- Type: Failure and Fix
- Failure: The orchestration pattern ported from India assumes websocket-capable telephony; the practical Kenyan provider does not expose websocket media, so the streaming channel could not be configured out of the box for the phone line actually used in Kenya today.
- Fix: The platform now runs two channel implementations side by side — a streaming websocket channel (built, used where providers support it) and a record-then-play webhook channel (functional, but without tool calling, retrieval, or barge-in). Bringing the turn-based webhook channel — the one actually live in Kenya today — to feature parity with the streaming channel is named as the main open engineering item.
- Insight: An orchestration pattern encodes the infrastructure assumptions of the region it was built in, and telephony is where those assumptions are buried most deeply — porting it across geographies is a development workstream, not a configuration step, and the gap only shows up once a real local provider is wired in.
- Condition — applies when: Porting a telephony-dependent voice stack to a new region without first confirming the local provider's technical capabilities (websocket support specifically).

**4. Synthesis, not the language model, is where the latency and the cost concentrate**
- Dimension: Solution
- Stage: Pilot
- Type: Strategic Decision
- Decision: Target speed and cost optimisation at the text-to-speech stage first, and treat scale-to-zero versus a warm GPU pool as a deliberate, explicit decision rather than something inherited silently from the pilot's default configuration.
- Why: Measured 7 August 2026 on the web channel, warm containers, nine samples: within a full 6.28-second turn, TTS synthesis took 3.92 seconds against 1.25 for LLM generation and 0.49 for speech-to-text — roughly two-thirds of the turn, the opposite of where latency attention usually goes. The TTS model itself is ~9.5GB and takes 166 seconds to load into a cold container — named explicitly as the single most important cost decision at production scale: scale-to-zero (the current default) minimises idle cost but makes the first call after an idle period feel broken, while a warm pool removes that at continuous cost.
- What this looked like here: Tool schemas add roughly 640 input tokens to every turn regardless of whether a tool is plausibly needed — out of a ~1,970-token per-turn floor — making schema trimming a cheap, compounding lever alongside reply-length caps.
- Condition — applies when: Running a self-hosted, neural TTS stage in a cascaded voice pipeline, where synthesis time is not yet instrumented separately from the rest of the turn.
- Condition — fails when: Latency figures haven't been measured stage-by-stage yet — optimising before instrumenting risks targeting the wrong stage entirely, as this deployment's own figures show.

## Institution

**5. Programme oversight, cooperation structure, legal accountability, and model ownership are four separate roles**
- Dimension: Institution
- Stage: Define
- Type: Strategic Decision
- Decision: Establish the accountable institution, the cooperation structure it sits within, the legal data controller/processor, and the model owner as four distinct, separately-resolved determinations, rather than treating "who's in the room" as settling all four at once.
- Why: Programme accountability (deliverables, approvals, internal governance) sits with Crane AI Labs, which leads the pathway end to end. The cooperation structure is the UNDP AI Hub and the Italy–India–Kenya trilateral framework — the AI Hub is not led by Crane; Crane runs one pathway within it. Model ownership sits with MsingiAI, which built the Sauti ASR and TTS models — attributing them to Crane, the implementing partner, would misrepresent where the work was done. Legal accountability under Kenyan law — who is the controller and who is the processor — is a separate determination and, as of this document, not yet settled (see Gap 6).
- What this looked like here: The programme's originally-named point of contact was not present on the working-group call and, by the team's own live correction, was not in fact the right person to answer detailed operational or technical questions — day-to-day accountability sits with three other named consultants instead. Conflating these four roles is what caused that confusion in the first place, before the interview even reached technical questions.
- Condition — applies when: A deployment sits inside a multi-party cooperation framework and no single organisation obviously holds all four roles at once.

**6. Data governance is sequenced before collection, and enforced by configuration, not policy alone**
- Dimension: Institution
- Stage: Define
- Type: Strategic Decision
- Decision: Establish accountability, lawful basis, consent evidence, data-flow mapping, security, and incident handling before any target-user voice is collected — and keep the deployment in an enforced simulation mode, using public, synthetic, or test data only, until that sequence is complete.
- Why: In Mildred Namagembe's own framing, "retrofitting community consent onto a corpus already collected is not something that can be done honestly after the fact, so the record is opened at the start." The interim no-collection rule is enforced by deployment configuration, not just by policy — partner endpoint access is a deployment-level decision that cannot be switched on by editing an agent in the dashboard, so the gate is technical, not just procedural.
- What this looked like here: Consent is layered by use rather than treated as a single event — recorded separately for recording, for model training or open release, for cross-border processing, for use of a reference voice in cloning, and for any future speaker-recognition function, since the caller and the person who supplies the reference voice for cloning may be different people requiring different notices. The data flow itself is mapped as a multi-provider, multi-jurisdiction route (telephony, hosting, the agent database, the vector store, the embedding provider, hosted speech services, the external LLM service, any partner API) rather than described as a single hosting location, since a single conversational turn can place transcript text with more than one external provider, in different jurisdictions, within seconds. Data minimisation is enforced inside the versioned system prompt itself — agents are instructed never to solicit mobile-money PINs, national ID numbers, or bank details — because once such data is elicited in a transcript, it already exists in the log and any downstream provider; preventing the question is more reliable than filtering the answer afterward.
- Condition — applies when: A voice pipeline is cascaded across multiple external providers and hasn't yet processed real target-user data.
- Condition — fails when: Collection has already begun without this sequence — the source is explicit that consent cannot be honestly retrofitted onto a corpus already gathered.

## Ecosystem

**7. Shared compute access is a two-step, finite, time-bounded benefit — not an evergreen resource**
- Dimension: Ecosystem
- Stage: Define
- Type: Strategic Decision
- Decision: Treat the programme's shared HPC allocation as requiring a specific two-step access process, and plan around it as shared and time-bounded rather than as a standing resource.
- Why: The clearest material asset the trilateral cooperation delivers to this pathway is not a document or a convening — it's GPU time. Fine-tuning runs on CINECA's Leonardo cluster under a shared programme allocation, free at point of use, but access requires a personal HPC account first, then association with the project allocation by the AI Hub's technical focal point — an account without that association carries zero budget, recorded as the step teams most often miss.
- What this looked like here: Node-hours are drawn from one shared pool and consumed by whoever runs first, making allocation planning an ecosystem-governance question rather than a purely engineering one. The arrangement is also time-bounded by the programme itself — every contract concludes at the end of 2026, and the source material does not record what access community contributors retain once the allocation ends (see Gap 8).
- Condition — applies when: A deployment depends on a shared, programme-funded compute allocation rather than commercially procured infrastructure.

**8. Reverse-transferred learnings are treated as untested, not settled**
- Dimension: Ecosystem
- Stage: Explore
- Type: Strategic Decision
- Decision: Reuse cross-geography learnings from the source deployment while explicitly flagging them as unbenchmarked in the new context, rather than presenting a successful transfer as proof it will work again.
- Why: Telephony and mobile-access approaches developed in the Indian VoicERA deployment were passed to the African team and are described as having worked well in India — but the team was explicit that "some of the things which are unique to India might be different in Africa," treating this as still to be benchmarked once the Kenyan deployment goes live, not as a settled transfer.
- What this looked like here: The requirement for a fully local, offline ASR/LLM/TTS variant — running without a telephony layer at all, for areas with no reliable internet — surfaced through this same exchange programme, raised by Crane AI Labs in response to Kenyan field conditions rather than originating from the core technology team's own roadmap. It's recorded as an active exploration area, not a shipped capability.
- Condition — applies when: Reusing a technical or process learning from a deployment in a different geography or infrastructure context.
- Condition — fails when: The learning has already been benchmarked against the new context's own conditions — at that point it's a confirmed finding, not a flagged assumption.

# 4. Toolkits and Playbooks

| # | Asset | Type | Reuse condition |
|---|---|---|---|
| — | African Voice SDK / Voicera Africa platform — the customised VoicERA/Pipecat-derived stack (agent configuration, ASR/LLM/TTS orchestration, RAG, sandboxed tool runner) | Toolkit Asset | Adding a new deployment is a configuration and knowledge-base exercise once the underlying stack itself has been adapted for the target region — not a new engineering cycle. |
| — | Voicera Africa technical & cost architecture document (11 Aug 2026) | Toolkit Asset | Dated system architecture, model stack, and cost breakdown for partner and funder technical review; token/GPU-time shapes rather than a dollar rate card, by design. |
| — | CINECA fine-tuning pipeline documentation | Toolkit Asset | End-to-end guide for fine-tuning African-language ASR/TTS models on the Leonardo HPC cluster (account and allocation access, data preparation, evaluation by dialect slice, on-device export) — written so a contributor doesn't need the original project team. |
| — | Kenya governance instrument set (in development) | Toolkit Asset | Participant information sheet, layered consent forms, data governance register, DPIA screening, breach notification, and partner compliance declaration — not yet complete or available for reuse; approval runs through Crane AI Labs programme sign-off, with the completed set delivered to the UNDP AI Hub on completion. The transferable part today is the sequence in Unit 6, not the templates themselves. |
| — | 4×4 grid-mapped interview questionnaire | Toolkit Asset | The question set used to run this pathway's own working-group interview, sequenced broad-to-specific across Persona, Technology, Institution, and Ecosystem — reusable for any future pathway interview. |

# 6. Retrieval Guide

*"Who is our actual end user — the farmer, or the partner's field agent?"* → Unit 1

*"Our LLM already handles code-switching — do we still need to worry about it?"* → Unit 2

*"Our telephony provider doesn't support our voice stack's expected protocol"* → Unit 3

*"Where should we focus latency and cost optimisation in a voice pipeline?"* → Unit 4

*"Who should be accountable for what in a multi-party cooperation deployment?"* → Unit 5

*"How do we sequence data governance before we've collected any real user data?"* → Unit 6

*"How do we plan around a shared, programme-funded compute allocation?"* → Unit 7

*"Can we trust a technical or process learning transferred from another geography?"* → Unit 8

---

## Source Trace

*Contributor-only — not surfaced to adopters.*

| Source file | Covers | Notes |
|---|---|---|
| African Voice AI Pathway.docx.pdf (full narrative pathway document, dated 17 Aug 2026) | All sections — Section 1 (identity, scale, cost, dates); Section 2 (cost anchor, build effort, downstream framing); all 8 units in Section 3; Gaps 1–8; Section 4 (reusable assets, from the document's own Annexure 3); Section 2's coverage grid (grounded in the document's own Annexure 2 stage-navigation table) | Primary source, superseding earlier draft material used for a prior version of this pathway (African Voice AI Pathway.docx + 03_Metadata_Units.md.docx, both marked with unresolved `⟨NEEDS⟩` placeholders). This version is a complete, polished document with named quotes (Betty Kyallo, Gilbert Kiplangat Korir, Mildred Rebecca Namagembe), a resolved persona finding, a full institution/data-governance/ecosystem/cost treatment, a 10-item gaps table, and its own stage self-assessment (Explore-to-Define) — read in full and used as the authoritative source for this rewrite. Two claims present in the earlier, thinner source material are not carried forward here because this newer, more complete document does not corroborate them: an "offline-first, on-device inference as the first architectural phase" sequencing claim (the offline/edge variant is explicitly described here as an active exploration area, not yet built), and an unverified claim about this deployment informing the Indian programme's next cycle via edge-quantisation techniques. |
