# BhumiSetu

### Evidence-First Land Record Review

**[ Live Website](https://bhumi-setu-orpin.vercel.app/)** | **Connecting Records. Revealing Evidence.**

BhumiSetu is a modern workspace for land record review, evidence inspection, consistency analysis, and structured review workflows.

The platform helps reviewers compare linked land records, inspect supporting evidence, identify record inconsistencies, and document review decisions in a transparent and traceable manner.

---

## Overview

Land record review often involves comparing multiple related documents, such as:

- **Dalil (Deed)**
- **Khatian**
- **Mutation Records**

Identifying inconsistencies across these records can be difficult when evidence is scattered, incomplete, or missing.

BhumiSetu provides a unified workspace where linked records can be inspected, compared, reviewed, and exported as structured reports.

## Key Features

### 1. Record Comparison

Compares explicitly linked land records and identifies inconsistencies between comparable records.

Current comparison capabilities include:

- Dag reference comparison
- Missing evidence detection

### 2. Evidence-Based Findings

Every finding includes relevant context to help reviewers understand why an inconsistency was identified.

Findings can reference:

- Source record IDs
- Original values
- Comparison context
- Supporting evidence

This evidence-first approach avoids unexplained warnings and supports transparent human review.

### 3. Document Evidence Timeline

Displays related records in chronological order, helping reviewers understand document relationships and the context of a review.

### 4. Interactive Sandbox

Allows users to experiment with temporary working copies of records and rerun comparisons without modifying the original records.

Features include:

- Safe experimentation with temporary data
- Preservation of original records
- Recalculation of findings using the comparison logic
- Reset support

### 5. Structured Review Workflow

Provides tools for organizing and documenting the review process.

Reviewers can:

- Add review notes
- Mark findings for review
- Maintain review history
- Track review decisions

Review notes are stored locally in the browser.

### 6. Synthetic JSON Import

Allows users to import a validated review dataset in JSON format.

Validation includes:

- Schema validation
- Required field validation
- Duplicate ID detection
- Data type validation
- Record consistency checks

Imported datasets are processed locally in the browser.

### 7. Review Report Export

Generates structured review reports to support documentation and further analysis.

Reports can include:

- Findings
- Evidence references
- Review notes
- Comparison statistics
- Review context

Available export formats:

- JSON
- Print-friendly view

---

## How It Works

```text
Review Dataset
      |
      v
Data Validation
      |
      v
Record Comparison
      |
      v
Evidence Review
      |
      v
Human Review
      |
      v
Report Export
```

---

## Current Comparison Rules

### Rule 1: Dag Reference Mismatch

Identifies differences in Dag references between explicitly linked and comparable records.

**Example:**

```text
Dalil:     518
Mutation:  581
```

**Expected result:**

```text
Finding Generated: Dag Reference Mismatch
```

The finding highlights the difference for human review. It does not independently determine legal ownership or establish fraud.

### Rule 2: Missing Evidence

Detects references to records that are not available in the provided dataset.

**Example:**

```text
Record A ---> Record X

Record X: Not Found
```

**Expected result:**

```text
Finding Generated: Evidence Incomplete
```

The reviewer can inspect the missing reference and determine whether additional evidence is required.

---

## Reference Test Cases

| Test Case | Input Condition | Expected Outcome |
|---|---|---|
| Consistent Records | Comparable records have matching Dag references | No mismatch found |
| Dag Reference Difference | Comparable records have different Dag references | Dag mismatch detected |
| Missing Supporting Reference | A referenced record is absent from the dataset | Evidence incomplete |

---

## Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Validation and Business Logic

- TypeScript
- Runtime validation

### Testing

- Vitest

### Storage

- Browser Local Storage for review notes
- In-memory session state for working data

---

## Project Structure

```text
BhumiSetu/
├── app/
├── components/
├── lib/
├── brand/
├── docs/
├── public/
├── tests/
├── package.json
└── README.md
```

*Note: This structure represents the documented project layout. Actual files may vary.*

---

## Getting Started

Follow these steps to run BhumiSetu locally.

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
```

Replace `<repository-url>` with your actual Git repository URL.

### 2. Navigate to the Project Directory

```bash
cd BhumiSetu
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Development Server

```bash
npm run dev
```

Open the following URL in your browser:

```text
http://localhost:3000
```

### 5. Run Tests

```bash
npm test
```

### 6. Run Type Checking

```bash
npx tsc --noEmit
```

### 7. Create a Production Build

```bash
npm run build
```

**BhumiSetu**

*Evidence-First Land Record Review*

**Connecting Records. Revealing Evidence.**