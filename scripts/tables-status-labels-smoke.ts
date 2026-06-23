import {
  TABLES_ASSIGNMENT_STATUS_LABELS,
  getAssignmentStatusLabel,
} from "../src/lib/client/tablesStatusLabels";

const zhExpected = {
  registered: "已注册",
  queued: "排队中",
  seated: "已入座",
  playing: "对局中",
  disconnected: "已断线",
} as const;

for (const [status, expected] of Object.entries(zhExpected)) {
  const actual = TABLES_ASSIGNMENT_STATUS_LABELS.zh[status as keyof typeof zhExpected];
  if (actual !== expected) {
    throw new Error(`Unexpected zh label for ${status}: ${JSON.stringify({ actual, expected })}`);
  }

  const viaHelper = getAssignmentStatusLabel(status, TABLES_ASSIGNMENT_STATUS_LABELS.zh);
  if (viaHelper !== expected) {
    throw new Error(
      `getAssignmentStatusLabel zh mismatch for ${status}: ${JSON.stringify({ viaHelper, expected })}`,
    );
  }
}

const enExpected = {
  registered: "Registered",
  queued: "Queued",
  seated: "Seated",
  playing: "Playing",
  disconnected: "Disconnected",
} as const;

for (const [status, expected] of Object.entries(enExpected)) {
  const actual = TABLES_ASSIGNMENT_STATUS_LABELS.en[status as keyof typeof enExpected];
  if (actual !== expected) {
    throw new Error(`Unexpected en label for ${status}: ${JSON.stringify({ actual, expected })}`);
  }

  const viaHelper = getAssignmentStatusLabel(status, TABLES_ASSIGNMENT_STATUS_LABELS.en);
  if (viaHelper !== expected) {
    throw new Error(
      `getAssignmentStatusLabel en mismatch for ${status}: ${JSON.stringify({ viaHelper, expected })}`,
    );
  }
}

const unknownStatus = "migrating";
const fallback = getAssignmentStatusLabel(unknownStatus, TABLES_ASSIGNMENT_STATUS_LABELS.en);
if (fallback !== unknownStatus) {
  throw new Error(`Expected unknown status fallback: ${JSON.stringify({ fallback, unknownStatus })}`);
}

if (getAssignmentStatusLabel("queued", TABLES_ASSIGNMENT_STATUS_LABELS.en) !== "Queued") {
  throw new Error("Expected Queued label for lowercase queued status");
}

if (getAssignmentStatusLabel("", TABLES_ASSIGNMENT_STATUS_LABELS.en) !== "") {
  throw new Error("Expected empty string for empty status input");
}

if (getAssignmentStatusLabel("   ", TABLES_ASSIGNMENT_STATUS_LABELS.en) !== "   ") {
  throw new Error("Expected whitespace-only input to be returned unchanged");
}

if (getAssignmentStatusLabel("Queued", TABLES_ASSIGNMENT_STATUS_LABELS.en) !== "Queued") {
  throw new Error("Expected Queued label for mixed-case input");
}

if (getAssignmentStatusLabel(" queued ", TABLES_ASSIGNMENT_STATUS_LABELS.en) !== "Queued") {
  throw new Error("Expected Queued label for padded lowercase input");
}

if (getAssignmentStatusLabel(" QUEUED ", TABLES_ASSIGNMENT_STATUS_LABELS.en) !== "Queued") {
  throw new Error("Expected Queued label for padded uppercase input");
}

if (getAssignmentStatusLabel(" queued ", TABLES_ASSIGNMENT_STATUS_LABELS.zh) !== "排队中") {
  throw new Error("Expected 排队中 label for padded lowercase zh input");
}

if (
  getAssignmentStatusLabel("  MIGRATING  ", TABLES_ASSIGNMENT_STATUS_LABELS.en) !==
  "  MIGRATING  "
) {
  throw new Error("Expected unknown status fallback to preserve original input");
}

// getAssignmentStatusLabel only accepts status + labels; virtual kind is handled in page UI, not here.
const virtualKindStatusLabel = getAssignmentStatusLabel("virtual", TABLES_ASSIGNMENT_STATUS_LABELS.en);
if (virtualKindStatusLabel !== "virtual") {
  throw new Error(`Helper must not interpret kind as status: ${JSON.stringify({ virtualKindStatusLabel })}`);
}

console.log("Tables status labels smoke test passed.");
