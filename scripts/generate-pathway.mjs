#!/usr/bin/env node
// Standalone pathway-generation script — automates the same process used by
// hand this session to build the current corpus: read raw source material
// (interview transcripts, PDFs, decks, docs), apply this repo's own
// generation spec (content/framework.md + content/pathway-generation-prompt.md),
// and write a finished Sections 0-6 + Source Trace pathway document to
// content/wiki/pathways/.
//
// Deliberately plain Node + the Anthropic SDK — no Claude Code / agentic
// harness dependency, so this runs anywhere with an API key: another Claude
// session, a CI job, a teammate's laptop.
//
// PDFs are sent to the API as native document content blocks (base64), the
// same way Claude reads a PDF directly — this handles both text-layer PDFs
// and scanned/image-only ones (Otter-style transcripts, RFP scans) without
// needing separate OCR. .docx is converted to text via mammoth first, since
// the API has no native docx support. Images (.png/.jpg/.jpeg/.webp) are
// sent as image content blocks. Audio (.mp3/.wav/...) cannot be read by the
// API directly — the script skips it with a warning; transcribe it first
// (Otter, Whisper, etc.) and point the script at the transcript instead.
//
// USAGE
//
//   Fresh pathway, from a folder of raw material:
//     ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-pathway.mjs \
//       --sources ./raw/some-pathway-folder \
//       --slug some-pathway-slug \
//       [--title "Human-Readable Title"] \
//       [--sector "Agriculture"] \
//       [--contributor "Org Name / Programme Name"] \
//       [--stage "Pilot"]
//
//   Revise an existing pathway with newer/additional material (this is
//   exactly what updated african-voice-ai.md this session):
//     node scripts/generate-pathway.mjs \
//       --revise content/wiki/pathways/some-pathway.md \
//       --sources ./raw/some-pathway-folder/new-material \
//       [--note "This fuller PDF supersedes the earlier draft source"]
//
//   Useful flags either way:
//     --out <dir>        output directory (default: content/wiki/pathways)
//     --model <id>        Anthropic model id (default: claude-sonnet-5)
//     --max-tokens <n>     generation ceiling (default: 16000 — these documents run long)
//     --recursive          walk --sources subdirectories too (default: on)
//     --update-index        insert a line into pathways/index.md automatically
//     --dry-run              print the generated document to stdout, write nothing
//
// This is a single-pass, best-effort automation, not a replacement for
// judgment — review the output the same way a Contributor's own draft gets
// reviewed before publishing. It's the mechanical half of the process; the
// half that decides which of several conflicting sources is authoritative,
// or which 8 units are the strongest, is still worth a careful read after.

import { readFile, readdir, writeFile, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TEXT_EXTENSIONS = new Set(['.txt', '.md']);
const DOCX_EXTENSIONS = new Set(['.docx']);
const PDF_EXTENSIONS = new Set(['.pdf']);
const IMAGE_EXTENSIONS = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
]);
const UNSUPPORTED_HINT = new Set(['.mp3', '.wav', '.m4a', '.mp4', '.mov', '.doc', '.ppt', '.pptx']);

function parseArgs(argv) {
  const args = { recursive: true, out: 'content/wiki/pathways', model: 'claude-sonnet-5', maxTokens: 16000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--sources': args.sources = next(); break;
      case '--slug': args.slug = next(); break;
      case '--title': args.title = next(); break;
      case '--sector': args.sector = next(); break;
      case '--contributor': args.contributor = next(); break;
      case '--stage': args.stage = next(); break;
      case '--revise': args.revise = next(); break;
      case '--note': args.note = next(); break;
      case '--out': args.out = next(); break;
      case '--model': args.model = next(); break;
      case '--max-tokens': args.maxTokens = parseInt(next(), 10); break;
      case '--recursive': args.recursive = true; break;
      case '--no-recursive': args.recursive = false; break;
      case '--update-index': args.updateIndex = true; break;
      case '--dry-run': args.dryRun = true; break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        console.error(`Unrecognised argument: ${a}`);
        process.exit(1);
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Usage:
  Fresh pathway:
    node scripts/generate-pathway.mjs --sources <dir> --slug <slug> [--title ...] [--sector ...] [--contributor ...] [--stage ...]

  Revise an existing pathway:
    node scripts/generate-pathway.mjs --revise <path/to/existing.md> --sources <dir-of-new-material> [--note "..."]

  Common flags:
    --out <dir>            output directory, default content/wiki/pathways
    --model <id>             Anthropic model id, default claude-sonnet-5
    --max-tokens <n>          default 16000
    --no-recursive             don't walk subdirectories of --sources
    --update-index               insert a line into pathways/index.md
    --dry-run                     print to stdout instead of writing a file
`);
}

async function loadEnvLocal() {
  if (process.env.ANTHROPIC_API_KEY) return;
  try {
    const text = await readFile(path.join(ROOT, '.env.local'), 'utf-8');
    for (const line of text.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // No .env.local — fine, the caller may have set the env var directly.
  }
}

async function walk(dir, recursive) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) files.push(...(await walk(full, recursive)));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function collectSourceFiles(sourcesArg, recursive) {
  const st = await stat(sourcesArg).catch(() => null);
  if (!st) throw new Error(`--sources path not found: ${sourcesArg}`);
  if (st.isFile()) return [sourcesArg];
  return walk(sourcesArg, recursive);
}

// Converts every collected source file into Anthropic message content
// blocks — text is inlined with a clear file-boundary header (mirroring how
// this session's own reading process kept each source separately
// attributable for the Source Trace appendix); PDFs and images go in as
// native document/image blocks so Claude reads them exactly as it would in
// an interactive session, scanned pages included.
async function buildSourceBlocks(files) {
  const blocks = [];
  const manifest = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file);
    try {
      if (TEXT_EXTENSIONS.has(ext)) {
        const text = await readFile(file, 'utf-8');
        blocks.push({ type: 'text', text: `\n\n===== SOURCE FILE: ${base} =====\n\n${text}` });
        manifest.push({ file: base, kind: 'text' });
      } else if (DOCX_EXTENSIONS.has(ext)) {
        const buf = await readFile(file);
        const { value: text } = await mammoth.extractRawText({ buffer: buf });
        blocks.push({ type: 'text', text: `\n\n===== SOURCE FILE: ${base} (converted from .docx) =====\n\n${text}` });
        manifest.push({ file: base, kind: 'docx→text' });
      } else if (PDF_EXTENSIONS.has(ext)) {
        const buf = await readFile(file);
        blocks.push({ type: 'text', text: `\n\n===== SOURCE FILE: ${base} (PDF, attached below) =====` });
        blocks.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') },
        });
        manifest.push({ file: base, kind: 'pdf (native)' });
      } else if (IMAGE_EXTENSIONS.has(ext)) {
        const buf = await readFile(file);
        blocks.push({ type: 'text', text: `\n\n===== SOURCE FILE: ${base} (image, attached below) =====` });
        blocks.push({
          type: 'image',
          source: { type: 'base64', media_type: IMAGE_EXTENSIONS.get(ext), data: buf.toString('base64') },
        });
        manifest.push({ file: base, kind: 'image (native)' });
      } else if (UNSUPPORTED_HINT.has(ext)) {
        console.warn(`Skipping ${base}: ${ext} can't be read directly (audio/legacy Office format) — transcribe or convert it first.`);
        manifest.push({ file: base, kind: 'SKIPPED — unsupported format' });
      } else {
        console.warn(`Skipping ${base}: unrecognised extension ${ext || '(none)'}`);
        manifest.push({ file: base, kind: 'SKIPPED — unrecognised extension' });
      }
    } catch (err) {
      console.warn(`Skipping ${base}: failed to read (${err.message})`);
      manifest.push({ file: base, kind: `SKIPPED — read error: ${err.message}` });
    }
  }
  return { blocks, manifest };
}

function buildSystemPrompt({ framework, generationPrompt, exemplar, slug, title, sector, contributor, stage, mode, existingDoc, note }) {
  const hints = [];
  if (slug) hints.push(`Filename slug: ${slug}.md — the frontmatter title should be a natural human title, not the slug itself.`);
  if (title) hints.push(`Suggested title: ${title} (use it if it fits what the source material actually describes; adjust it if the material points to something more accurate).`);
  if (sector) hints.push(`Suggested sector: ${sector}`);
  if (contributor) hints.push(`Suggested contributor line: ${contributor}`);
  if (stage) hints.push(`Suggested stage: ${stage} — but only if the source material actually supports it; if the material states or implies a different stage, use that instead and don't force the hint.`);

  const today = new Date().toISOString().slice(0, 10);

  const base = `You are generating a pathway document for the 100 Pathways corpus — the exact process this project's own contributors and maintainers use, applied here as a single batch pass over raw source material rather than an interactive conversation.

# The framework (defines dimensions, stages, unit types, insight forms)

${framework}

# The generation spec — the exact rules and output structure to follow

${generationPrompt}

# Non-negotiable discipline

- Never fabricate. Every claim traces to something actually stated in the source material provided below. Where the material doesn't answer a question the next adopter would ask, say so plainly in the Gaps section — "not documented in the source" is a correct, honest finding, not a failure to fix by inventing something plausible.
- When multiple source files describe the same pathway and disagree, or one is clearly a later/fuller version of another (check dates, completeness, whether one explicitly supersedes another), treat the more complete/more recent one as authoritative and the others as corroborating context — note this reasoning in the Source Trace appendix rather than silently picking one.
- Section 3 (Micro-Innovations) holds at most 8 tagged units total, each with a real condition tag (applies when / fails when). Prefer fewer, stronger, more distinctly-sourced units over cramming in eight weak ones — spread across the four dimensions where the material genuinely supports it, not evenly for its own sake.
- The Source Trace appendix is the document's unnumbered final section, never "Section 7," and is contributor-facing only — it must never leak into the numbered Sections 0-6 (no source-file names, contributor logistics, or interview mechanics anywhere above it).
- Output ONLY the finished markdown document — frontmatter through the Source Trace appendix. No preamble, no explanation of what you're about to do, no commentary after. The first characters of your response must be \`---\` (the frontmatter's opening fence).
- Frontmatter fields, in this exact order: type: Pathway, title, description (one sentence, specific, not generic), tags (a short array), sector, stage, timestamp: ${today}, contributor.

# Exact formatting — the generation spec above describes *what* goes in each section, not the literal markdown; match these conventions precisely, since the corpus's own renderer and downstream tooling depend on them being consistent across every document:

- Section headers are single-hash: \`# 0. Reading Guide\`, \`# 1. Pathway Identity\`, \`# 2. Effort Details\`, \`# 3. Micro-Innovations\`, \`# 4. Toolkits and Playbooks\`, \`# 6. Retrieval Guide\` (Section 5 is deliberately omitted — go straight from 4 to 6). The unnumbered final section is \`## Source Trace\` under a horizontal rule (\`---\`), preceded by the italic line \`*Contributor-only — not surfaced to adopters.*\`.
- Section 1 is a two-column markdown pipe table (\`| Field | Value |\`), not bullets — one row per field (Deployment name, Sector, Geography, Population served, Stage reached, Contributing organisation(s), Key dates, Summary, Scale/impact achieved).
- Section 2 opens with **bolded** \`Cost anchor\`, \`Build effort\`, \`Downstream adoptions\` paragraphs (not a table), then \`## The 4×4 Coverage Grid\` as its own markdown table — dimensions as rows, the four stages as columns, density shown as \`●\`/\`●●\`/\`●●●\`/\`○\` (touched/developing/dense/nothing) with the relevant unit number(s) in parentheses where a cell has one, e.g. \`●● (Unit 3)\`. Then \`## Gaps\`, a numbered list, each item ending with an italic dimension/stage tag like \`*(Solution/Pilot)*\`.
- Section 3 groups units under \`## Persona\`, \`## Solution\`, \`## Institution\`, \`## Ecosystem\` subheadings (only the dimensions that actually have units, in that order) — each unit is \`**N. Title**\` followed by a bullet list: \`- Dimension:\`, \`- Stage:\`, \`- Type:\`, then the type-specific fields (Decision/Alternative considered/Why for a Strategic or Tactical Decision; Failure/Fix/Insight for a Failure and Fix; Playbook/Note for a Playbook), then \`- Condition — applies when:\` and optionally \`- Condition — fails when:\`.
- Section 4 is a markdown table: \`| # | Asset | Type | Reuse condition |\` — \`#\` references a Section 3 unit number where the asset comes from one, or \`—\` for a general toolkit item.
- Section 6 is a list of italic quoted questions each followed by \`→ Unit N\`, one per line with a blank line between: \`*"How do I...?"* → Unit 3\`.
- The Source Trace table is \`| Source file | Covers | Notes |\` — one row per file actually provided, naming what it covered and whether it was primary or confirms-only.

# A real corpus document, to match structurally (content is unrelated — copy its formatting conventions exactly, never its subject matter, names, or figures)

${exemplar}

${hints.length ? `# Hints from whoever ran this script (use where they hold up against the actual source material, override them where the material says otherwise)\n\n${hints.join('\n')}\n` : ''}`;

  if (mode === 'revise') {
    return `${base}
# This is a revision, not a fresh document

An existing pathway document is provided below, followed by new source material. ${note ? `Context for this revision: ${note}\n\n` : ''}Produce a complete, updated replacement for the existing document — not a diff, not an addendum. Where the new source material is fuller or more authoritative than what the existing document was built from, let it take precedence and say so in the Source Trace appendix (the way a real revision would); where the existing document already reflects something the new material doesn't contradict, keep it. Do not discard real, still-accurate content from the existing version just because it isn't repeated in the new material.

# Existing document (to revise)

${existingDoc}
`;
  }

  return `${base}
# This is a fresh pathway document

No existing document — build Sections 0-6 and the Source Trace appendix entirely from the source material provided below.
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.sources && !args.revise)) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }
  if (!args.sources) {
    console.error('--sources is required (a folder or file of raw material) even in --revise mode.');
    process.exit(1);
  }
  if (!args.revise && !args.slug) {
    console.error('--slug is required for a fresh pathway (used as the output filename).');
    process.exit(1);
  }

  await loadEnvLocal();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set (checked the environment and .env.local).');
    process.exit(1);
  }

  const [framework, generationPrompt, exemplar] = await Promise.all([
    readFile(path.join(ROOT, 'content', 'framework.md'), 'utf-8'),
    readFile(path.join(ROOT, 'content', 'pathway-generation-prompt.md'), 'utf-8'),
    // A real, representative corpus document, embedded purely as a
    // formatting anchor (see buildSystemPrompt) — mahavistaar.md is a clean,
    // moderate-length example of every structural element the spec above
    // doesn't literally pin down (header levels, table vs. bullets, the
    // density-symbol notation). If this file ever moves or gets renamed,
    // point this at any other well-formed pathway doc in the corpus.
    readFile(path.join(ROOT, args.out, 'mahavistaar.md'), 'utf-8').catch(() => {
      console.warn('Could not read a formatting-exemplar pathway doc (expected content/wiki/pathways/mahavistaar.md) — continuing without one; output formatting may drift from the rest of the corpus.');
      return '';
    }),
  ]);

  let existingDoc = null;
  let slug = args.slug;
  if (args.revise) {
    existingDoc = await readFile(args.revise, 'utf-8');
    slug = slug || path.basename(args.revise, '.md');
    console.error(`Revising ${args.revise} (slug: ${slug})`);
  }

  console.error(`Reading source material from ${args.sources}...`);
  const files = await collectSourceFiles(args.sources, args.recursive);
  if (files.length === 0) {
    console.error('No files found under --sources.');
    process.exit(1);
  }
  const { blocks, manifest } = await buildSourceBlocks(files);
  console.error('Source manifest:');
  for (const m of manifest) console.error(`  ${m.kind.startsWith('SKIPPED') ? '⚠' : '✓'} ${m.file} — ${m.kind}`);
  if (blocks.length === 0) {
    console.error('No readable source content — nothing to send to the model.');
    process.exit(1);
  }

  const systemPrompt = buildSystemPrompt({
    framework,
    generationPrompt,
    exemplar,
    slug,
    title: args.title,
    sector: args.sector,
    contributor: args.contributor,
    stage: args.stage,
    mode: args.revise ? 'revise' : 'fresh',
    existingDoc,
    note: args.note,
  });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.error(`Calling ${args.model} (max_tokens ${args.maxTokens})...`);
  const response = await anthropic.messages.create({
    model: args.model,
    max_tokens: args.maxTokens,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Here is the raw source material for this pathway. Generate the document per the instructions above.' },
          ...blocks,
        ],
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  if (!text.startsWith('---')) {
    console.error('\nWarning: the model\'s response did not start with the expected frontmatter fence (---). Printing it anyway — review before using.\n');
  }

  if (args.dryRun) {
    console.log(text);
    return;
  }

  const outPath = path.join(ROOT, args.out, `${slug}.md`);
  await writeFile(outPath, text.endsWith('\n') ? text : `${text}\n`, 'utf-8');
  console.error(`\nWritten: ${outPath}`);

  if (args.updateIndex) {
    await updateIndex(path.join(ROOT, args.out, 'index.md'), text, slug);
  }

  console.error(`
Next steps (this is a single-pass automated draft, not a finished review):
  1. Read the generated document — check the Gaps section reads as honest, not padded.
  2. Check Section 3's units are the genuinely strongest ~8, not just the first 8 the model reached for.
  3. Check the Source Trace appendix accurately reflects which source was authoritative where they disagreed.
  4. If it isn't linked yet, add it to ${path.relative(ROOT, path.join(ROOT, args.out, 'index.md'))} (or pass --update-index next time).
`);
}

// Best-effort: pull the title + description out of the generated frontmatter
// and append a bullet to index.md if this slug isn't already linked there.
async function updateIndex(indexPath, generatedText, slug) {
  const titleMatch = generatedText.match(/^title:\s*(.+)$/m);
  const descMatch = generatedText.match(/^description:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : slug;
  const description = descMatch ? descMatch[1].trim().split(' — ')[0] : '';

  let index;
  try {
    index = await readFile(indexPath, 'utf-8');
  } catch {
    console.error(`Could not read ${indexPath} to update it — add the line manually:`);
    console.error(`* [${title}](${slug}.md) - ${description}`);
    return;
  }

  if (index.includes(`(${slug}.md)`)) {
    console.error(`${slug}.md is already linked in index.md — leaving it as-is.`);
    return;
  }

  const line = `* [${title}](${slug}.md) - ${description}\n`;
  await writeFile(indexPath, index.trimEnd() + '\n' + line, 'utf-8');
  console.error(`Added a line for ${slug}.md to ${indexPath} — check its placement/wording.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
