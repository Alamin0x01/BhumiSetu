export const DOCUMENT_TYPES = ["dalil", "khatian", "mutation"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const AREA_UNITS = ["decimal", "acre"] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

export type ComparisonScope = {
  /** Related record IDs explicitly declared to describe the same parcel; never inferred. */
  sameParcelRecordIds: readonly string[];
};

export type SourceRecord = {
  id: string;
  documentType: DocumentType;
  documentReference: string;
  /** ISO date, YYYY-MM-DD. */
  documentDate: string;
  mouzaId: string;
  surveyContext: string;
  /** Kept as a string because real dag references can contain separators. */
  dagReference: string;
  /** Decimal string, never a float. */
  area: { value: string; unit: AreaUnit };
  partyIds: readonly string[];
  relatedRecordIds: readonly string[];
  comparisonScope: ComparisonScope;
};

export type DemoCase = {
  id: string;
  title: string;
  description: string;
  records: readonly SourceRecord[];
};

// Seeded scenarios only; descriptions are not computed findings.
// DEMO-REC-003-03 is referenced by DEMO-REC-003-02 but deliberately absent from the case.
export const demoCases: readonly DemoCase[] = [
  {
    id: "DEMO-CASE-001",
    title: "Comparable reference records",
    description:
      "A seeded scenario with dalil, khatian, and mutation records prepared for side-by-side comparison.",
    records: [
      {
        id: "DEMO-REC-001-01",
        documentType: "khatian",
        documentReference: "SYN-KHT-0001",
        documentDate: "2015-01-15",
        mouzaId: "MZ-SYN-0101",
        surveyContext: "Synthetic RS survey, sheet 3",
        dagReference: "412",
        area: { value: "12.50", unit: "decimal" },
        partyIds: ["PARTY-SYN-001"],
        relatedRecordIds: [],
        comparisonScope: { sameParcelRecordIds: [] },
      },
      {
        id: "DEMO-REC-001-02",
        documentType: "dalil",
        documentReference: "SYN-DLL-0001",
        documentDate: "2019-03-12",
        mouzaId: "MZ-SYN-0101",
        surveyContext: "Synthetic RS survey, sheet 3",
        dagReference: "412",
        area: { value: "12.50", unit: "decimal" },
        partyIds: ["PARTY-SYN-001", "PARTY-SYN-002"],
        relatedRecordIds: ["DEMO-REC-001-01"],
        comparisonScope: { sameParcelRecordIds: ["DEMO-REC-001-01"] },
      },
      {
        id: "DEMO-REC-001-03",
        documentType: "mutation",
        documentReference: "SYN-MUT-0001",
        documentDate: "2019-06-20",
        mouzaId: "MZ-SYN-0101",
        surveyContext: "Synthetic RS survey, sheet 3",
        dagReference: "412",
        area: { value: "12.50", unit: "decimal" },
        partyIds: ["PARTY-SYN-002"],
        relatedRecordIds: ["DEMO-REC-001-02"],
        comparisonScope: { sameParcelRecordIds: ["DEMO-REC-001-02"] },
      },
    ],
  },
  {
    id: "DEMO-CASE-002",
    title: "Dag-reference difference",
    description:
      "A seeded scenario where the dag reference is written differently across the records.",
    records: [
      {
        id: "DEMO-REC-002-01",
        documentType: "khatian",
        documentReference: "SYN-KHT-0002",
        documentDate: "2014-02-10",
        mouzaId: "MZ-SYN-0102",
        surveyContext: "Synthetic RS survey, sheet 7",
        dagReference: "518",
        area: { value: "8.00", unit: "decimal" },
        partyIds: ["PARTY-SYN-003"],
        relatedRecordIds: [],
        comparisonScope: { sameParcelRecordIds: [] },
      },
      {
        id: "DEMO-REC-002-02",
        documentType: "dalil",
        documentReference: "SYN-DLL-0002",
        documentDate: "2018-05-22",
        mouzaId: "MZ-SYN-0102",
        surveyContext: "Synthetic RS survey, sheet 7",
        dagReference: "518",
        area: { value: "8.00", unit: "decimal" },
        partyIds: ["PARTY-SYN-003", "PARTY-SYN-004"],
        relatedRecordIds: ["DEMO-REC-002-01"],
        comparisonScope: { sameParcelRecordIds: ["DEMO-REC-002-01"] },
      },
      {
        id: "DEMO-REC-002-03",
        documentType: "mutation",
        documentReference: "SYN-MUT-0002",
        documentDate: "2018-08-30",
        mouzaId: "MZ-SYN-0102",
        surveyContext: "Synthetic RS survey, sheet 7",
        dagReference: "581",
        area: { value: "8.00", unit: "decimal" },
        partyIds: ["PARTY-SYN-004"],
        relatedRecordIds: ["DEMO-REC-002-02"],
        comparisonScope: { sameParcelRecordIds: ["DEMO-REC-002-02"] },
      },
      {
        id: "DEMO-REC-002-04",
        documentType: "khatian",
        documentReference: "SYN-KHT-0003",
        documentDate: "2019-01-14",
        mouzaId: "MZ-SYN-0102",
        surveyContext: "Synthetic RS survey, sheet 7",
        dagReference: "581",
        area: { value: "8.00", unit: "decimal" },
        partyIds: ["PARTY-SYN-004"],
        relatedRecordIds: ["DEMO-REC-002-03"],
        comparisonScope: { sameParcelRecordIds: ["DEMO-REC-002-03"] },
      },
    ],
  },
  {
    id: "DEMO-CASE-003",
    title: "Missing transfer evidence",
    description:
      "A seeded scenario where the record set has no supporting document for one transfer step.",
    records: [
      {
        id: "DEMO-REC-003-01",
        documentType: "khatian",
        documentReference: "SYN-KHT-0004",
        documentDate: "2012-04-03",
        mouzaId: "MZ-SYN-0103",
        surveyContext: "Synthetic SA survey, sheet 2",
        dagReference: "207",
        area: { value: "5.50", unit: "decimal" },
        partyIds: ["PARTY-SYN-005"],
        relatedRecordIds: [],
        comparisonScope: { sameParcelRecordIds: [] },
      },
      {
        id: "DEMO-REC-003-02",
        documentType: "mutation",
        documentReference: "SYN-MUT-0003",
        documentDate: "2020-09-18",
        mouzaId: "MZ-SYN-0103",
        surveyContext: "Synthetic SA survey, sheet 2",
        dagReference: "207",
        area: { value: "5.50", unit: "decimal" },
        partyIds: ["PARTY-SYN-006"],
        relatedRecordIds: ["DEMO-REC-003-01", "DEMO-REC-003-03"],
        comparisonScope: {
          sameParcelRecordIds: ["DEMO-REC-003-01", "DEMO-REC-003-03"],
        },
      },
    ],
  },
];
