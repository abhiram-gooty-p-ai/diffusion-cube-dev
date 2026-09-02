# 100 Pathways — Adoption Companion

## What this is

A Next.js web app, the conversational companion to **100pathways.com** — themed to match it exactly and linked back to it from every page's header. A signed-in user falls into one of two roles, each with its own dedicated flow (see "Roles and flows" below): **Explorers** (now branded **Analyse**, `/analyse`) work through their own AI adoption against the existing corpus, in a single unified conversational script rather than a menu of intents; **Contributors** turn their own deployment write-up into a new corpus pathway page and push it live themselves. Everything either flow says is grounded in a corpus of real deployment pathways, committed into this repo (`content/wiki/`) plus anything since community-published (`published_pathways` in Supabase). Standing is tracked on a 4 dimensions × 4 stages grid internally, rendered as a real 4×4 table behind a "Grid" button the user opens in a modal — not shown persistently or as status chips — kept current from the same `<grid_update>` JSON contract described below, and populated only on turns that actually engage a specific pathway (a generic best-practices question leaves it untouched). The Analyse flow can produce one persisted document (Analysis Document, offered only once real pathway coverage exists — see "The Analyse flow" below), stored and reopenable from Supabase.

Two renames matter for anyone reading old code, old links, or old docs: the app itself went through **Strengthen → Navigate → Analyse** (component filenames like `StrengthenWorkspace.tsx` and internal identifiers like `intent: 'navigate'` still lag the current name — this is expected, not a bug, and old stored values are accepted for backward compatibility). `/navigate` still exists purely as a redirect to `/analyse` for old links.

## Roles and flows

Three kinds of signed-in user, on top of the existing `user_roles` table:

- **Analyse** (`adopter` role, formerly "Explorer") — entry point `/analyse` (opens a fresh adoption, or `?open=<id>` to reopen an existing one), **not** intent-driven: there's no menu, no hero — chat opens directly on a fixed opening line and the single unified script (`lib/explorer-intents.ts`'s `ANALYSE_FLOW`) figures out from the conversation itself what the user needs (see "The Analyse flow" below).
- **Contributor** (`pathway_contributor` role) — entry point `/contribute`, document-first: "+ New Contribution" opens chat directly (no hero) with a fixed request for deployment documents. `contributorSystemPrompt` drives four steps, entirely its own (this flow shares no step text with Analyse, since it forbids any judgment language about the shared material, positive or negative): (1) wait for documents; (2) once they arrive, exactly one of three outcomes — confirm an inferred stage, ask plainly which stage fits, or say there's not enough and pause (no draft attempted); (3) the moment the stage is settled, generation happens automatically — the model signals this via `pathwayAction: "generate"` on the `<grid_update>` JSON contract, which `lib/adoption-conversation.ts` picks up to call the separate `pathway-draft` mode itself (no button); (4) an open-ended loop where every later turn is either a chat-driven revision (`pathwayAction: "revise"`, whole-document regeneration, including automatically folding in any newly uploaded document), a chat-driven publish (`pathwayAction: "publish"`), or just conversation. Each generation is stored as a new version and surfaces in chat as a client-constructed message (never model-authored) with the real Section 2 gap list and a persistent `<pathway_doc/>` card (`lib/pathway-gaps.ts`, `components/ChatPanel.tsx`) that reopens the stored document in `PathwayDocumentPane.tsx` — a read-only preview + version picker + "Publish" button, no in-pane editing. Publishing (from the pane or from chat) is genuinely self-serve — no separate admin approval step (see `app/api/pathway-submissions/push/route.ts`).
- **Admin** — unchanged: `/admin` for role assignment/signup approval, plus a "Pathway Submissions" panel for oversight (list all submissions regardless of who owns them, mark reviewed, or publish on a contributor's behalf via the older `app/api/admin/pathway-submissions/publish/` route — kept alongside the contributor self-serve path, not replaced by it).

**Testing-environment auth changes who actually reaches "pending."** Since sign-in no longer requires admin approval (see "Auth, approval, and roles" below), a brand-new account is granted both `adopter` and `pathway_contributor` automatically at creation — so the "awaiting approval" screen in `app/(app)/layout.tsx` still exists in code but rarely fires in practice. An admin can still hand-adjust a user's roles afterward in `/admin` without it being silently re-granted on their next login.

## The Analyse flow

There used to be four separately-scripted Explorer intents (browse/validate/troubleshoot/guidance), auto-detected or picked from a menu. That's gone — `lib/explorer-intents.ts`'s `ANALYSE_FLOW` (internal id `'analyse'`, still called `NAVIGATE_FLOW`/`'navigate'` in some untouched comments and stored rows from before the last rename) is the single script every Analyse conversation runs, regardless of whether the user showed up with a broad "what could AI do for me," an active project to check, or one narrow stuck question. Five steps, injected via `${intentDef.flow}` into `explorerSystemPrompt`:

1. **Gather what you can without asking for it** — read the first message (and any uploaded documents) for sector, problem, stage, role; ask exactly one question only if sector and problem are both genuinely absent, otherwise skip straight to step 2.
2. **Compare against the corpus immediately** and say plainly what's in it for the user — exact match, adjacent match (with the mismatch stated), or a plain "nothing in the corpus speaks to this yet." This comparison is also the gate for everything downstream: a generic best-practices question that never actually engages a specific pathway doesn't populate the grid and doesn't count toward the document offer.
3. **Name what matters next** — the grid updates automatically from the `<grid_update>` cells reported that turn, but only when step 2 actually engaged a pathway. Since the grid isn't shown persistently (see "What this is" above), the model is instructed to say so in one short clause whenever a cell actually changes, pointing the user to the "Grid" button — never narrating what the cell now says.
4. **Keep going on what the user actually raises** — react to new information, re-check the corpus when relevant, ask a question only when the answer would change what comes next.
5. **Offer the write-up once there's real substance** (3+ substantive exchanges) *and* only once a specific pathway has genuinely been covered and compared — never for a conversation that stayed generic. If the user asks for a document directly without that having happened, the model explains why in its own words for that conversation, rather than generating a document with nothing real in it.

Four rules are stated once, above this flow, so nothing drifts from them mid-conversation:

1. **Matching** — relevant means *same sector AND same use-case category*. Identical test everywhere.
2. **Presentation** — an *exact match* is presented directly; an *adjacent match* (asked "healthcare," corpus has "public health") is presented with the mismatch stated plainly in the same breath.
3. **Micro-innovations** — always framed as suggested choices drawn from other adoptions' lived experience, never recommendations; the user judges fit, and the Cube helps think through contextualization.
4. **Absence and facts-only** — nothing relevant is said plainly, never softened or backfilled with general knowledge; pathways and micro-innovations are *separate* absences and both get stated. Only documented facts are shared — the explanation can be simplified or expanded, the facts never change.

A fifth, added this rebuild: **external resources** (`content/resources.md` — currently just Voicera) are surfaced proactively, inline, with a short framing line and a real clickable `[label](url)` link the moment one is genuinely relevant — not held back until asked, and never forced in when it's a stretch.

`AdoptionMeta.intent` and `.flowStep` are still re-injected every turn via `currentProgressBlock`, the same mechanism as before the rebuild — `getExplorerIntent()` just ignores its input now and always returns `ANALYSE_FLOW`, kept as a parameter only so an old stored row (`intent: 'navigate'` or older) doesn't crash on reopen.

**Known stale capability:** `explorerAction: "executive-summary"` and its generation pipeline (`executiveSummarySystemPrompt`, the Executive Summary chat card/header button) still exist in code, but nothing in the current single-flow script ever sets that signal — it was specific to the old four-intent Guidance flow's step 8, which no longer exists. Treat it as dead code until/unless the Analyse flow is deliberately extended to offer a second, shorter document again.

A signed-in user with neither `adopter` nor `pathway_contributor` sees an "ask an admin" message instead of a workspace (rare now — see the testing-auth note above). Someone holding both roles gets both sidebar entries and can run either flow on different adoptions — the choice is made once, per adoption, by which entry point they started from, and is stored as `meta.flow` (`'explorer' | 'contributor'`) on that row from then on (the stored value is still literally `'explorer'`, not `'analyse'` — that's the flow-type discriminator, unrelated to the intent rename). `app/api/chat/route.ts` re-validates `flow` against the caller's actual roles server-side — the sidebar/route gating is UX only.

## The framework

Defined by the "AI Diffusion Pathway Framework" doc, transcribed into `content/framework.md` (injected into every prompt — edit that file to change behavior, no code change):

- **Four dimensions**: Persona, Solution, Institution, Ecosystem — each with lettered sub-categories (4/5/7/6 respectively), each sub-category weighted **Primary / Secondary / Dormant** per stage.
- **Four stages**: Explore, Define, Pilot, Scale — each with "done when…" markers.
- **Five unit types** for corpus knowledge: Strategic Decision, Tactical Decision, Failure and Fix, Playbook, Toolkit Asset — every unit carries a condition tag (applies when / fails when).
- **30/70 thesis**: Persona+Solution = building the right thing; Institution+Ecosystem = the larger adoption work.

`lib/dimensions.ts` holds only the structural shape (codes, names, sub-categories, weights, stage list, density types, brand colors) — the substantive question bank lives in `content/framework.md`. `content/pathway-generation-prompt.md` is the contributor-side prompt for generating new pathway documents from raw material (not used at runtime).

Two hard rules from the framework that bind runtime behavior: pathway documents' **Source Trace appendix is contributor-only** — never surfaced in any adopter-facing response; and the framework itself is never referenced as a process ("the framework," sub-category codes, densities, unit-type labels) in user-facing prose, though the four dimension and four stage names are public 100 Pathways vocabulary and fine to use naturally.

## Tech stack

- Next.js 16 (App Router), React 19, Tailwind CSS v4
- Anthropic API via `/api/chat` route handler (`claude-sonnet-4-6`), streamed
- Supabase (Postgres + Auth) for roles and all persistence. Sign-in itself is a **testing-environment shortcut** (see "Auth, approval, and roles" below): `/login` takes only a name and email, no password — `app/api/auth/testing-login/route.ts` creates or finds the matching Supabase Auth user behind a deterministic per-email password (HMAC'd server-side, never shown to the user) and signs them in for real, so every RLS policy downstream is unaffected.
- Client-side document/image extraction: `pdfjs-dist`, `mammoth`, `xlsx` (SheetJS CDN build), `jszip`
- PDF export via `jspdf`; line diffing (the Contributor push view) via `diff`
- Theme: 100 Pathways brand tokens (navy `#1b1b42`, coral `#ff6543`, yellow `#feda09`, blue `#0099ff`, paper `#faf9f6`, ink `#363538`) with Inter / DM Sans / PT Serif / Geist Mono — copied verbatim from the Diffusion Library web app, which pulled them from the live site. All in `app/globals.css` as `@theme` tokens (`bg-paper`, `text-navy`, `text-coral`, `glow-input`, etc.).

## Wiki / corpus loading

The pathway corpus is committed into this repo at `content/wiki/pathways/` (`lib/wiki-loader.ts`), so it deploys on Vercel with no extra step — `WIKI_PATH` env var can still override the path (e.g. a different checkout in local dev) but nothing requires it. `loadWikiContext()` reads `pathways/index.md`, parses the relative `(slug.md)` links, and loads all pathway pages linked from it (6 currently — Bhili, MahaVISTAAR, Voice AI for Inclusion, African Voice AI, Blue Dots, Voice AI Adoption Barriers, all rebuilt from raw interview/transcript material rather than the earlier synthesized corpus; whole corpus + framework is fine at this size, revisit with retrieval when it grows). A file can sit in `content/wiki/pathways/` unlinked from the index — `ai-assisted-job-matching.md` currently does — and it will never load into the prompt or the app at all; only what `index.md` actually links is real. `loadFrameworkContent()` reads `content/framework.md`, and `loadPathwayGenerationPrompt()` reads `content/pathway-generation-prompt.md` (used at runtime now too, by the `pathway-draft` mode). All reads go through one `readSource()` function so a future S3 move is a single swap.

Each of the 6 current pathway docs was written (or, for African Voice AI, rewritten once a fuller source document arrived) directly from raw source material — interview transcripts, Otter recordings, RFP/spec PDFs, GTM decks — into the full Sections 0–6 + Source Trace-appendix structure `content/pathway-generation-prompt.md` specifies: numbered, individually-tagged units (Strategic Decision / Tactical Decision / Failure and Fix / Playbook / Toolkit Asset), a Section 2 coverage grid, toolkit table, and retrieval guide. This is a deliberate departure from an earlier corpus generation that reclassified prior syntheses rather than going back to primary material — the Source Trace appendix on each doc records exactly which source files were read and what each one covered, so the provenance is auditable rather than asserted. `lib/wiki-content.ts` serves these for on-demand browsing at `/wiki` (`app/(app)/wiki/`), separately from the prompt-injection path — it strips the Source Trace appendix before display (contributor-only, same rule as adopter-facing chat) and strips frontmatter. `components/WikiMarkdown.tsx` renders it (a richer markdown subset than `lib/adoption-plan-markdown.ts`'s parser — adds pipe-table support, since pathway docs lean on tables).

The old `wiki_cache`/`pathway_cache` Supabase tables and the GitHub-raw fetching path are no longer used (tables still exist in the DB, inert).

## Project structure

```
/app
  layout.tsx                ← fonts (Inter/DM Sans/PT Serif/Geist Mono), metadata
  globals.css                ← 100 Pathways theme tokens + animations (fade-in-up, bounce-dot, glow-input)
  login/page.tsx              ← testing-environment sign-in: name + email only, no password (see Auth section)
  navigate/page.tsx            ← pure redirect to /analyse, kept for old links (see "What this is")
  api/auth/testing-login/route.ts ← creates-or-signs-in the Supabase Auth user behind the name+email form
  admin/page.tsx               ← user approval + role management (see Auth section)
  api/chat/route.ts            ← modes: companion (flow: explorer|contributor) | analysis-doc | executive-summary (code exists, unreachable — see "The Analyse flow") | plan-document | extract-insights | pathway-draft
  api/admin/pathway-submissions/review/route.ts ← admin marks a submission reviewed
  api/admin/pathway-submissions/publish/route.ts ← admin publishes/updates a submission on a contributor's behalf
  api/pathway-submissions/push/route.ts ← CONTRIBUTOR self-serve push straight to published_pathways
  explore/page.tsx              ← the public Library (no login required — see proxy.ts) — NOT the Analyse entry point, despite the name; "Explore" in the sidebar links here
  analyse/page.tsx               ← the actual Analyse (formerly Navigate, formerly Strengthen) entry point — chat opens directly, no menu; internal component is still `StrengthenWorkspace.tsx`
  contribute/                     ← Contributor entry point (its own route, outside the (app) group, same public-tiered-gating pattern as explore/analyse)
  (app)/
    layout.tsx                  ← SiteHeader + approval gate (hasAnyRole, rarely fires now) + Sidebar; only gates /adoptions, /wiki, /admin
    page.tsx                     ← unconditionally redirects to /explore (the Library) — no role branching left here
    adoptions/page.tsx               ← grid of the user's saved adoptions (?open=<id> deep link)
    wiki/page.tsx                     ← on-demand corpus browsing: pathway index by category
    wiki/[slug]/page.tsx                ← one pathway page, Source Trace appendix stripped
proxy.ts                    ← auth middleware (public: /login, /explore, /analyse, /contribute, /navigate (redirect only), /api/chat, /api/wiki-pathways, /api/auth/testing-login)
/content
  framework.md               ← THE framework (question bank, weights, unit types) — prompt-injected
  pathway-generation-prompt.md ← generation rules + output structure — prompt-injected by `pathway-draft` too now
  resources.md                  ← external tools/repos (currently just Voicera) — surfaced proactively inline by the Analyse flow, never with contributor attribution
  wiki/pathways/*.md              ← the corpus itself, committed into the repo (see Wiki section above) — only files linked from index.md actually load
/lib
  explorer-intents.ts        ← THE single Analyse flow (ANALYSE_FLOW): opening line, numbered 5-step flow, totalSteps — shared by prompt and UI (see "The Analyse flow")
  dimensions.ts              ← structural shape: 4 dimensions, sub-categories, weights, GridState, DIMENSION_COLORS (real table colors — there is no chip-status helper, despite what an earlier version of this doc claimed)
  system-prompts.ts           ← explorerSystemPrompt (single-flow now), contributorSystemPrompt, analysisDocSystemPrompt, executiveSummarySystemPrompt (orphaned, see above), planDocumentSystemPrompt, documentInsightSystemPrompt, pathwayDraftSystemPrompt
  grid-update.ts                ← parseGridUpdate/stripGridUpdate — split out so app/api/chat/route.ts (server) can import it without pulling in adoption-conversation.ts's React hooks
  adoption-conversation.ts     ← useAdoptionConversation hook: AdoptionMeta.flow/.intent, lazy row creation (dedup'd via creatingRef), attachments, extractInsightsForAttachment, explorerDoc (Analysis Document)
  pathway-submission-versions.ts ← upsertPathwaySubmission (one draft per design_id), version list/insert, getPublishedInfoBySubmission (live slug + content, for the pane's Draft/Published status)
  adoptions-cache.ts            ← 60s TTL cache for the adoptions list
  design-documents.ts            ← versioned Analysis Doc / Plan Document storage + content-hash caching
  wiki-loader.ts                  ← in-repo corpus reads for prompts, merged with published_pathways (see above); also loadResourcesContent()
  wiki-content.ts                   ← in-repo corpus reads for on-demand /wiki browsing, merged with published_pathways (Source-Trace-stripped)
  extract-text.ts                    ← client-side text extraction from uploads
  adoption-plan-markdown.ts           ← markdown-subset parser shared by modal + PDF (no tables)
  adoption-plan-pdf.ts                 ← jsPDF export
  roles.ts                              ← hasRole/hasAnyRole/isAdmin
  supabase/{client,server,admin}.ts      ← Supabase client factories (admin = service-role, used by testing-login too)
  logger.ts                               ← fire-and-forget Google Sheets logging
/components
  SiteHeader.tsx            ← "← Back | 100 Pathways / Adoption Companion" (matches Diffusion Library)
  Sidebar.tsx                 ← nav (Explore / Analyse / Contribute / Admin — each role-gated) + recent list; mobile drawer
  AdoptionWorkspace.tsx        ← the whole experience: welcome screen → conversation header (title/sector-geo-stage/summary, no chips) + chat + a "Grid" button opening the coverage-grid modal + docs
  HeatmapGrid.tsx                ← the real 4×4 dimension×stage table, opened from AdoptionWorkspace's "Grid" button/modal — not persistent, not chips, not hover-triggered
  ChatPanel.tsx                  ← conversation panel; parseChatInline renders **bold**, *italic*, and `[label](url)` / bare-URL links
  AttachmentsPanel.tsx            ← file staging panel (desktop side-hover tab / mobile sheet) — unchanged by the grid rework; Analyse's composer also has its own paperclip icon
  AdoptionPlanModal.tsx            ← generated-document modal with PDF download (Analyse's Analysis Document; version picker unused there)
  PathwayDocumentPane.tsx              ← Contributor's read-only doc pane: preview, version picker, "Publish" — no in-pane editing, revisions are chat-only
  WikiMarkdown.tsx                    ← markdown renderer with pipe-table support, used by /wiki and the draft modal
  AdminDashboard.tsx                    ← role checkboxes + reject
  AdminPathwaysPanel.tsx                  ← admin pathway deletion
  PathwaySubmissionsPanel.tsx              ← admin list of all submissions, expand + mark reviewed/publish
  SignOutButton.tsx
```

## The `/api/chat` route handler

Receives `{ messages, mode, grid?, meta?, versionNumber?, designId?, flow? }`. Modes:

- `companion` — the conversation. `flow` (`'explorer' | 'contributor'`) picks `explorerSystemPrompt` or `contributorSystemPrompt`, re-validated server-side against the caller's actual role (`hasRole`) regardless of what the UI sent. Every response ends with a `<grid_update>` JSON block: `{ cells: {...changed cells only}, meta: {...}, pathwaysReferenced: [...], flowStep: N }`. `meta.stage` is only ever filled from the user's own statement. `flowStep` is the model's own report of which numbered step of its flow it's on (4 for Contributor; 5 for Analyse — see lib/explorer-intents.ts) — persisted as `AdoptionMeta.flowStep` and sent back in on every subsequent call as `grid`/`meta`, since the `<grid_update>` block is stripped before a message is stored and so never survives in replayed history; `currentProgressBlock()` in `lib/system-prompts.ts` re-injects it each turn as the model's one source of truth for "where am I," rather than asking it to re-infer position from prose. Client merges cells and strips the block for display. Every companion-mode call also inserts the user's last message into `adoption_queries`, tagged with `pathwaysReferenced` as `pathway_slugs` (fire-and-forget) — recorded material for future cross-adoption insight gathering, not surfaced anywhere yet.
- `analysis-doc` — full standing document: coverage-grid section in density notation, per-dimension narrative, Questions and Decisions to Consider, Related Pathway Experience, Suggested Choices from Other Adoptions, Open Threads. Descriptive, never prescriptive; anything unsettled is framed as a question or decision, never a deficiency. This is the Analyse flow's one deliverable, triggered by `explorerAction: "analysis"` on step 5 — and only once step 5 has actually gated on real pathway coverage, per this rebuild.
- `executive-summary` — code and storage (`plan` doc_type) still exist, but nothing in the current single-flow script ever sets `explorerAction: "executive-summary"` anymore; it was the old four-intent Guidance flow's secondary document. Treat as dead unless the Analyse flow is deliberately extended to offer it again.
- `plan-document` — 4-section executive doc (Project Summary / Key Gaps ≤10 / Key Recommendations ≤5, each grounded in a named pathway / Next Steps ≤5, only user-surfaced actions). Title: `<name> Plan Doc v<N>`.
- `extract-insights` — silent, one-shot pass over a single uploaded document, called immediately on upload (before any conversation) from `extractInsightsForAttachment` in `lib/adoption-conversation.ts`. Returns only a `<grid_update>` block; seeds the grid the moment a file lands rather than waiting for the first chat turn.
- `pathway-draft` — drafts (or revises, given a trailing revision instruction) the current conversation as a candidate pathway document, in the exact Sections 0–6 + Source-Trace-appendix structure the real corpus uses (`content/pathway-generation-prompt.md` injected as the spec). Triggered automatically by `lib/adoption-conversation.ts` off the companion's `pathwayAction` signal (Contributor flow only) — no button; never publishes itself — that's the pane's "Publish" button or a chat-driven publish request, both via `/api/pathway-submissions/push`.

All modes require an approved account (`hasAnyRole`) — 403 otherwise. Max tokens: 8192 companion, 1024 extract-insights, 4096 analysis/executive-summary/plan doc, 6144 pathway-draft.

## The two flows' posture (lib/system-prompts.ts)

Both flows share the same grounding discipline — never fabricate, always trace to a named pathway with its condition tag, never surface a Source Trace appendix, never dump framework jargon — but differ in how directive they are, by design:

**Analyse** (`explorerSystemPrompt`, named for its original "Explorer" role — the function itself was never renamed) keeps its consultant posture — think with the user, earn recommendations, calibrate confidence to evidence — running the single `ANALYSE_FLOW` script for every conversation (see "The Analyse flow" above) rather than a menu of intents. It never sets an agenda outside that flow, never assigns a stage the user hasn't confirmed, and — per this rebuild — never touches the grid or edges toward a document offer on a turn that stayed generic.

**Contributor** (`contributorSystemPrompt`) is more of a guided pipeline, with its own stage-confirmation step (no text shared with Explorer, whose "react to what they shared" opening would break this flow's no-judgment rule). The remap into the four-dimension framework (step 3) is deliberately invisible — no document is generated or shown at that point, it's just the prompt's own grid-tracking continuing. Step 4 (same message as step 3) pairs what's well-established with the open gaps, leading with what's working. Step 5 offers an explicit choice — skip the gaps and generate the wiki page now, or go through them one by one — and only once the user actually chooses to generate does the real `pathway-draft` document get produced and opened for conversational revision. Genuine tangents get answered before returning to the current checkpoint either way — guided, not rigid.

Style for both: simple English, 4-sentence hard cap plus at most one clarifying question, genuine energy, varied phrasing.

## Auth, approval, and roles

**This is a testing environment, and sign-in reflects that deliberately.** `/login` asks only for a name and email — no password, no email confirmation, no admin-approval wait. `app/api/auth/testing-login/route.ts` derives a deterministic password from the email (HMAC'd with `SUPABASE_SERVICE_ROLE_KEY`, which only the server ever sees) and either creates a new Supabase Auth user with it or signs back into the existing one — either way, a real session gets set via the request-scoped SSR client, so every RLS policy and `hasRole`/`hasAnyRole` check downstream keeps working exactly as if a normal password login had happened. A brand-new email is granted both `adopter` and `pathway_contributor` immediately (once, at creation only — an admin can still hand-adjust a returning user's roles afterward without this silently re-granting them). `proxy.ts`'s public-path allowlist includes `/api/auth/testing-login` itself, since it's how an anonymous visitor gets their first session at all.

The pre-existing machinery this replaced is still real underneath: zero rows in `user_roles` is still "pending" in principle, and `app/(app)/layout.tsx` still shows an awaiting-approval screen for that case — it just essentially never fires anymore, since every new account gets roles at creation. `/admin` (env `ADMIN_EMAILS` fallback OR the `admin` role) still lists users with per-role checkboxes and destructive Reject, for hand-adjusting anyone.

**Role semantics are still real**: `adopter` gates the Analyse flow (`/analyse`, and any adoption whose `meta.flow === 'explorer'` — that stored value is unrelated to the intent rename, see "The Analyse flow"), `pathway_contributor` gates the Contributor flow (`/contribute`, self-serve push to the wiki). Any role still grants baseline access past the approval gate (`hasAnyRole`) — analysis/plan documents and `/wiki` browsing aren't flow-specific — but starting or continuing either named flow requires the matching role, checked both in the UI (`Sidebar.tsx` and each route's own page) and re-validated server-side in `app/api/chat/route.ts`.

## Supabase tables

- **`designs`** — one row per adoption: `meta` (now includes `flow: 'explorer' | 'contributor' | ''`, fixed at creation), `grid_state` (renamed from `cube_state` in migration 0008, which also cleared pre-revamp test rows), `messages` jsonb. Lazy creation on first send **or** first uploaded document (whichever happens first — `extract-insights` needs a row to seed).
- **`design_documents`** — the Analyse flow's generated documents, content-hash cached (a regeneration with an unchanged conversation is served from the stored row, no model call). Rows are append-only for schema reasons, but only the latest per `(design_id, doc_type)` is ever read back — `analysis` is the Analysis Document (the only one the current flow actually reaches); `plan` exists for the orphaned Executive Summary / plan-document modes but nothing in the live flow triggers them.
- **`pathway_submissions`** (migration 0009; `design_id` made unique in migration 0013 so the app can upsert "the one draft for this adoption") — the Contributor's draft: `design_id`, `content` (denormalized pointer to the latest version), `status` (`pending_review`/`reviewed`/`published`). Owner can insert/view/update their own (the update policy is what lets the contributor's own session push, not just the service-role client).
- **`pathway_submission_versions`** (migration 0013) — append-only version history per submission: `version_number`, `content`, `commit_message`. Inserted on every draft generation and every conversational revision — this is what backs the version-picker dropdown in `PathwayDocumentPane` and the `<pathway_doc/>` chat card's "current version" (see `lib/pathway-gaps.ts` for how the gap list shown in chat is parsed straight from a version's own Section 2).
- **`adoption_queries`** (migrations 0010, 0011) — every companion-mode user message, insert-only, tagged with `pathway_slugs` (parsed from that turn's `<grid_update>.pathwaysReferenced` — which pathways the response actually drew on) for future cross-adoption insight gathering. Nothing reads this yet.
- **`published_pathways`** (migration 0012; `commit_message` column added in 0013) — publicly readable (RLS `using (true)`) so any approved user can see them at `/wiki`, and `loadWikiContext()` merges them into the companion's grounding corpus too. Two ways in: the Contributor's own "Push to Wiki" (`app/api/pathway-submissions/push/`, upserts by `source_submission_id` so re-pushing keeps the same slug/URL) or an admin publishing on their behalf (`app/api/admin/pathway-submissions/publish/`). Slugified from the adoption's name, checked for collisions against both the static files and this table. No git commit or redeploy needed — this is why the corpus is DB-backed for community content while the current 6 curated pathways stay as static files.
- **`user_roles`** — `(user_id, role)` grants: general_user | adopter | pathway_contributor | admin. `adopter`/`pathway_contributor` now have real behavioral meaning (see "Roles and flows" above), not just baseline access.
- Inert leftovers: `pathway_cache`, `wiki_cache`, `pending_signups` (nothing reads or writes them).

Migrations 0008 through 0013 must be run in the Supabase SQL Editor for the app to work post-revamp.

## Environment variables

```
ANTHROPIC_API_KEY=your_key_here
WIKI_PATH=/absolute/path/to/a/wiki/checkout   # optional; defaults to content/wiki/ in this repo
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only, /admin actions
ADMIN_EMAILS=a@x.com,b@y.com         # permanent admin fallback
GOOGLE_SHEET_ID=...                  # optional logging
GOOGLE_SERVICE_ACCOUNT_JSON={...}    # optional logging
```

`GITHUB_WIKI_BASE_URL`/`NEXT_PUBLIC_GITHUB_WIKI_BASE_URL` and the `SES_SMTP_*`/`EMAIL_FROM_ADDRESS`/`APP_URL` sets are no longer read by any active code path.

## Out of scope / not yet built

- Cross-user insights UI ("what did others ask about a pathway like mine") — `adoption_queries` now records the raw material for this, but nothing reads or surfaces it yet
- Any moderation/undo on a Contributor's self-serve push — once pushed, it's live; an admin can overwrite via the admin publish route but there's no "unpublish" or approval gate in front of the contributor's own push
- A user with neither `adopter` nor `pathway_contributor` has no workspace at all (just the "ask an admin" message) — there's no read-only/general_user experience beyond `/wiki` and `/adoptions`
- Legacy binary Office formats (.doc, .ppt) for uploads
