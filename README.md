# BhumiSetu: Land Record Consistency & Review Assistant

Evidence-first land record review: lines up **synthetic** Bangladesh land records (dalil, khatian, mutation), shows where explicitly linked records differ, and lets a human reviewer keep notes.

> **Uses synthetic records. Not official verification or legal advice.** It uses no real citizen data, no government scraping, and gives no ownership, fraud, or legal verdicts.

## Unresolved dependency-security issues (read first)

`npm audit` (npm 10.9.1, checked 2026-10-15) reports **8 vulnerabilities: 2 critical, 5 high, 1 moderate**. They are **not resolved**. All are in `devDependencies`; `npm audit --omit=dev` reports 0, but dev-only does not mean harmless, so do not run the tests or ESLint on untrusted code or configuration.

| Package (installed) | Severity | Chain | Status |
|---|---|---|---|
| `vitest` 3.2.7 (direct) | critical | via `tinypool` 1.1.1 (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr) | Fixed in Vitest 4.1.11+. Upgrade **failed** (see below). |
| `@vitest/mocker` 3.2.7 | moderate | GHSA-82fw-gwwq-j7x9 | Same Vitest upgrade. |
| `eslint-config-next` 16.4.1 (direct), `@next/eslint-plugin-next`, `fast-glob`, `micromatch`, `braces` 3.0.3 | high | `braces` GHSA-vfj7-8cjw-p6xm | No patched `braces` release existed when checked. The `npm audit fix --force` suggestion is a downgrade to `eslint-config-next@14`, which is not compatible, so it was not run. |

**Failed Vitest upgrade:** `npm install --save-dev vitest@4.1.11` crashed under npm 10.9.1 with `Cannot read properties of null (reading 'edgesOut')` (an npm arborist peer-resolution crash). It was not retried and peer checks were not bypassed. Package files were left unchanged.

**Untested next step:** the npm bundled with this Node (11.19.1) is shadowed by a global npm 10.9.1. Running `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install --save-dev vitest@4.1.11` would use it. This has **not** been tried.

## What is implemented

- **Home and navigation:** home page with a computed example preview, "Try interactive sandbox" and "Browse demo cases" links, site nav, a custom 404, and the synthetic-data disclaimer on every page. Case tabs are linkable (for example `/cases/DEMO-CASE-002#sandbox`) and work with browser back and forward.
- **Three synthetic cases, nine source records** (`data/cases.ts`), all hand-written and fictional.
- **Case detail pages** (`/cases/DEMO-CASE-00N`), with Overview, Source records, Timeline, and Sandbox tabs:
  - **Missing-link check:** related record IDs that are not in the case are reported as "Evidence incomplete" (a completeness check, not a verdict).
  - **Source-record comparison table:** records side by side with values exactly as stored.
  - **Document evidence timeline:** records ordered by their stated document date, with links for explicit related-record IDs. No dates or transfer events are invented.
  - **Source-record cards** (link targets for findings).
  - **Dag-reference comparison:** the only comparison rule (`DAG_REFERENCE_MISMATCH`). It compares only records the data explicitly declares as the same parcel (`comparisonScope.sameParcelRecordIds`), with matching mouza ID and survey context. Findings show evidence record links, original and normalized values, explanation, assumptions, and the limitation "a record difference, not proof of fraud or invalid ownership". Counts, skipped comparisons, and data-validation issues (for example duplicate record IDs) are shown.
  - **Human review:** per finding, a "Needs review" / "Reviewed" label with notes and timestamped history, kept in the browser's `localStorage`. A label never removes or resolves the finding. A reset action asks for confirmation.
- **What-if sandbox:** edit dag references in a temporary in-memory copy of a case and rerun the same comparison engine on every eligible linked pair. Inputs are validated (non-empty, at most 100 characters), results are marked stale after any later edit, and Reset restores the original values. Simulation only: source records, saved notes, and storage are never changed, and reviewer notes are not attached to simulated findings.
- **Synthetic JSON import** (`/import`): validate one synthetic case file in the browser, preview it, and open it in a temporary imported-case workspace that reuses the same comparison, missing-link, and timeline code. Reviewer notes and the sandbox are not available for imported cases. See the schema below.
- **Review report export** (`/cases/DEMO-CASE-00N/report` and `/import/case/report`): an "Export review report" action on built-in and imported case pages generates a snapshot, previews it, and offers "Download report JSON" and "Print report" (browser print dialog; choose "Save as PDF" there). See the section below.
- **Tests:** Vitest unit and render tests for the comparison rule, missing links, timeline, review-storage validation, the what-if sandbox, the import validator, the report snapshot and its view, and the UI sections.

## Synthetic JSON import

`/import` has a "Download sample JSON" button (the built-in Case 2 fixture written in this schema), a file input for one `.json` file, and a "Validate file" action. "Open imported case" is enabled only after validation passes and opens `/import/case`. The file is read with the browser's File API; the app makes no upload or network request for it. The imported case is held in memory only: reloading the page clears it, and it never replaces the built-in cases or touches saved reviewer notes.

### Schema (version `"1"`)

```json
{
  "schemaVersion": "1",
  "synthetic": true,
  "case": {
    "id": "DEMO-CASE-002",
    "title": "...",
    "description": "...",
    "records": [
      {
        "id": "DEMO-REC-002-01",
        "documentType": "khatian",
        "documentReference": "SYN-KHT-0002",
        "documentDate": "2014-02-10",
        "mouzaId": "MZ-SYN-0102",
        "surveyContext": "Synthetic RS survey, sheet 7",
        "dagReference": "518",
        "area": { "value": "8.00", "unit": "decimal" },
        "partyIds": ["PARTY-SYN-003"],
        "relatedRecordIds": [],
        "comparisonScope": { "sameParcelRecordIds": [] }
      }
    ]
  }
}
```

The `case` and record fields are exactly the `DemoCase` and `SourceRecord` types in `data/cases.ts`. The validator's field lists are type-checked against those types (`satisfies`), so adding or removing a field there fails the build until the validator is updated; the value rules in the table are written out explicitly.

| Field | Rule |
|---|---|
| `schemaVersion` | The string `"1"` (the only supported version). |
| `synthetic` | Exactly `true`. |
| `case` | Exactly one object, not a list. `id` and `title` are required; `title` and `description` are non-empty text (up to 500 characters); `id` is an identifier. |
| `case.records` | An array of 1 to 50 records. Record IDs must be unique. |
| `id`, `documentReference`, `mouzaId`, party and related IDs | Non-empty strings, at most 100 characters. |
| `documentType` | `dalil`, `khatian`, or `mutation`. |
| `documentDate` | A real calendar date written `YYYY-MM-DD`. |
| `dagReference` | A non-empty string, at most 100 characters, kept exactly as written (leading zeros, punctuation, whitespace, Bangla digits). |
| `surveyContext` | Text up to 500 characters; may be empty (the comparison then reports the pair as incomplete). |
| `area` | `{ "value": "12.50", "unit": "decimal" }`: `value` is a decimal string, `unit` is `decimal` or `acre`. |
| `partyIds` | Up to 20 identifiers. |
| `relatedRecordIds` | Up to 20 identifiers. A target that is not in the case is accepted and reported as "Evidence incomplete". |
| `comparisonScope.sameParcelRecordIds` | Up to 20 identifiers, each of which must also appear in `relatedRecordIds`. Same-parcel links are never inferred. |

Other limits: the file must be a `.json` file of at most 256 KiB. Unknown fields are rejected, types are never coerced, and nothing is repaired or merged. The keys `__proto__`, `prototype`, and `constructor` are rejected anywhere in the file before any application object is built, and application objects are constructed field by field. Errors show the field path, for example `case.records[2].dagReference: expected a non-empty string.` Imported text is rendered as plain text.

## Review report export

"Export review report" (on every built-in case page and on the imported-case page) opens a report page. "Generate report preview" builds **one immutable snapshot** of the case in this browser; the on-screen preview, the downloaded JSON, and the print view are all produced from that same snapshot. "Refresh snapshot" builds a new one (for example after saving a note). Nothing is uploaded and no request is made; the JSON file is created in the browser and saved with the browser's own download.

**Report JSON fields** (`reportSchemaVersion` `"1"`): `generatedAt` (UTC ISO), `generatedAtLocal`, `timeZone`, `utcOffset`; `application` (`name` and `packageVersion` taken from `package.json`; no ruleset version is included because the repository defines none); `case` (id, title, description, `origin` `built-in` or `imported`, record count); `syntheticData` (declaration and limitations); `scope` (the two checks that exist, and what is not checked); `counts` (source records, linked pairs compared, skipped or incomplete, validation issues, dag-reference findings, evidence-incomplete); `sourceRecords` (original records with their stable IDs and values exactly as stored); `dagComparison` (findings with evidence IDs, original and normalized values, assumptions, and limitation; skipped comparisons; validation issues); `missingLinks`; `reviewNotes`.

**Rule scope:** only `DAG_REFERENCE_MISMATCH` and the missing-link check. Ownership, authenticity, fraud, legal status, names, areas, dates, and parties are not checked, and the report says so.

**Reviewer notes in a report:**
- Built-in cases include only notes saved for that case's current findings, read through the existing storage validation (`lib/review.ts`) when the snapshot is generated. Notes for other cases or for findings that no longer exist are left out. Entries that fail validation are ignored and counted; unreadable or unavailable storage yields a report without notes and says why.
- Each finding lists its note history (label, text, timestamp) and its current label. A report states that notes are browser-local, unauthenticated, and not a tamper-proof audit trail. "Reviewed" never means resolved: every finding stays in the report (`findingRemainsReported: true`).
- Imported-case reports never read or include built-in notes.

**Not included:** What-if sandbox values. Export is disabled on the Sandbox tab ("Reports currently cover source records, not simulations."). Reports are built from the original records only.

**Files and printing:** the file name is case-specific and sanitized to `A-Z a-z 0-9 . _ -`, for example `bhumisetu-report-built-in-DEMO-CASE-002-20261015T103045Z.json`. Printing hides the site header, navigation, and buttons, repeats table headers, and keeps cards from splitting where the browser allows it. Page breaks and the PDF are produced by your browser; there is no PDF library. Imported values are rendered as text, not HTML.

**Limits:** a report is a snapshot of computed record differences, not a verdict, certificate, or audit record. It cannot prove that it was not edited after export. The JSON contains the case's records and any notes, so treat the file as sensitive if you add real notes. Synthetic data only.

## Setup

Requires Node.js 20.9 or newer (developed on v24.22.0) and npm.

```bash
npm install
npx next typegen      # generates PageProps/LayoutProps types used by the app
npm run dev           # http://localhost:3000
```

The default `next dev` also prints a Network URL, so it may listen on your LAN. To keep it on this machine only, run `npx next dev -H 127.0.0.1`. The project is not deployed anywhere.

Checks:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Demo flow

See [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for a two-minute walkthrough of the three cases. Submission text is drafted in [docs/SUBMISSION_DRAFT.md](docs/SUBMISSION_DRAFT.md).

## Scope & limitations

- **Only dag-reference comparison is implemented.** Names, areas, dates, parties, and ownership are not compared or verified.
- Comparability is never inferred. A pair is compared only if the synthetic data explicitly declares it as the same parcel.
- Normalization trims surrounding whitespace and converts Bangla digits to English digits. Leading zeros and punctuation are preserved, so `0518` and `518` are reported as different.
- Case descriptions are seeded scenarios, not computed results. The fixtures were authored to demonstrate the checks.
- **Reviewer notes are local to one browser.** They are not authenticated, not shared, can be edited or cleared by anyone using the browser, and are not a tamper-proof audit trail.
- No database, authentication, OCR, risk scores, or legal verdicts. `docs/PLAN.md` mentions Prisma, SQLite, and React Flow; this prototype does not use them.
- **The `synthetic: true` declaration in an imported file is user-provided.** It is not proof that the data contains no personal information. BhumiSetu does not anonymize data and does not detect personal information, so import synthetic data only.
- Imported cases live in memory only (cleared on reload), have no reviewer notes or sandbox, and are not saved or uploaded. The import validator checks types, sizes, and unsafe keys; it has not had a security review.
- Reports are snapshots generated in the browser. Saving to PDF depends on the browser's print dialog, and the app cannot detect whether a file was later edited. Reports cover source records only, not sandbox simulations.
- Prototype quality only. It has had no accessibility audit, security review, or user testing, and it is not production-ready.

## AI assistance disclosure

This project was built with AI assistance: GitHub Copilot in agent mode inside VS Code generated and edited the application code, tests, and documentation under human direction. The team should review all code and update this note with the exact tools and models used before submitting.

## Stack

Next.js 16.4.1 (App Router), React 19.3.0, TypeScript 5, Tailwind CSS 4, Vitest 3.2.7. Data lives in `data/cases.ts`; comparison logic is in `lib/comparison.ts`, `lib/evidence.ts`, and `lib/review.ts`; import validation is in `lib/import-schema.ts`; report snapshot building is in `lib/report.ts` (view in `components/report-view.tsx`).
# BhumiSetu
