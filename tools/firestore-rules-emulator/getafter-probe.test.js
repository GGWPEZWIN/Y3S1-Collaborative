/**
 * Minimal emulator regression for skip-only getAfter(parent session).
 *
 * Seed an owned active session + lock, then write a skip child without
 * updating that session. Firebase projected-state docs say getAfter of an
 * unmodified existing document matches get. These probes separate that
 * from emulator deny messages that say "evaluation error".
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
  Timestamp,
} from "firebase/firestore";

const PROJECT_ID = "demo-module2-rules";
const ALICE = "alice";
const SESSION_ID = "session-probe";
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:18080";
const [host, portString] = emulatorHost.split(":");
const port = Number(portString || "18080");
const SESSION = "/databases/$(database)/documents/tripSessions/$(sessionId)";

function childMatch(probeId, expression) {
  return `
      match /p_${probeId}/{segmentId} {
        allow create: if ${expression};
        allow get: if true;
        allow list, update, delete: if false;
      }`;
}

const PROBE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tripSessions/{sessionId} {
      allow read, write: if true;
      ${childMatch("existsAfter", `existsAfter(${SESSION})`)}
      ${childMatch("getAfterZero", `getAfter(${SESSION}).data.currentSegmentIndex == 0`)}
      ${childMatch("getAfterNotNull", `getAfter(${SESSION}) != null`)}
      ${childMatch("getAfterIsNull", `getAfter(${SESSION}) == null`)}
      ${childMatch("getAfterZeroAndFalse", `getAfter(${SESSION}).data.currentSegmentIndex == 0 && false`)}
      ${childMatch("requestIndexEqOne", `request.resource.data.segmentIndex == 1`)}
      ${childMatch("existsAfterAndPlusOne", `existsAfter(${SESSION}) && getAfter(${SESSION}).data.currentSegmentIndex == request.resource.data.segmentIndex + 1`)}
      ${childMatch("afterSessionAdvancedFixed", `
        existsAfter(${SESSION})
        && getAfter(${SESSION}).data.currentSegmentIndex == request.resource.data.segmentIndex + 1
        && getAfter(${SESSION}).data.status == "active"
        && getAfter(${SESSION}).data.userId == request.auth.uid
        && getAfter(${SESSION}).data.itineraryId == request.resource.data.itineraryId
        && getAfter(${SESSION}).data.completedAt == null
      `)}
      ${childMatch("getAfterEqOne", `getAfter(${SESSION}).data.currentSegmentIndex == 1`)}
    }
    match /activeTripLocks/{lockId} {
      allow read, write: if true;
    }
  }
}
`;

let testEnv;

function aliceDb() {
  return testEnv.authenticatedContext(ALICE).firestore();
}

function classifyDeny(error) {
  const message = String(error?.message || error || "");
  return {
    outcome: message.includes("evaluation error")
      ? "evaluation-error"
      : error.code === "permission-denied"
        ? "denied"
        : "other-error",
    message,
    code: error.code,
  };
}

async function seedSessionAndLock() {
  const now = Timestamp.now();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "tripSessions", SESSION_ID), {
      userId: ALICE,
      itineraryId: "itin-probe",
      itineraryTitle: "Test trip",
      status: "active",
      currentSegmentIndex: 0,
      totalSegments: 2,
      startedAt: now,
      updatedAt: now,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      version: 1,
    });
    await setDoc(doc(db, "activeTripLocks", ALICE), {
      userId: ALICE,
      sessionId: SESSION_ID,
      itineraryId: "itin-probe",
      itineraryTitle: "Test trip",
      status: "active",
      startedAt: now,
      updatedAt: now,
    });
  });
}

function skipOnlyPayload() {
  return {
    userId: ALICE,
    itineraryId: "itin-probe",
    sessionId: SESSION_ID,
    segmentId: "segment-0",
    segmentIndex: 0,
    destinationId: "d0",
    destinationName: "Penang",
    outcome: "skipped",
    reason: "user_confirmed",
    skippedAt: Timestamp.now(),
    version: 1,
  };
}

async function assertSeededSessionExists() {
  const sessionSnap = await getDoc(doc(aliceDb(), "tripSessions", SESSION_ID));
  assert.equal(sessionSnap.exists(), true, "seeded session must exist at tripSessions/" + SESSION_ID);
  assert.equal(sessionSnap.data().currentSegmentIndex, 0);
  return sessionSnap;
}

async function runProbe(probeId) {
  await assertSeededSessionExists();
  try {
    await setDoc(
      doc(aliceDb(), "tripSessions", SESSION_ID, `p_${probeId}`, "segment-0"),
      skipOnlyPayload()
    );
    return { outcome: "allowed", message: "" };
  } catch (error) {
    return classifyDeny(error);
  }
}

function logProbe(name, result) {
  console.log(`${name}: ${result.outcome}`);
  if (result.message) console.log(result.message);
}

before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("FIRESTORE_EMULATOR_HOST is not set.");
  }
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host,
      port,
      rules: PROBE_RULES,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedSessionAndLock();
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

test("seeded session exists at the exact path", async () => {
  const snap = await assertSeededSessionExists();
  assert.equal(snap.ref.path, `tripSessions/${SESSION_ID}`);
});

test("existsAfter(session) allows skip-only", async () => {
  const result = await runProbe("existsAfter");
  logProbe("existsAfter", result);
  assert.equal(result.outcome, "allowed", result.message);
});

test("getAfter(session) index 0 allows skip-only", async () => {
  const result = await runProbe("getAfterZero");
  logProbe("getAfterZero", result);
  assert.equal(result.outcome, "allowed", result.message);
});

test("getAfter(session) != null allows skip-only", async () => {
  const result = await runProbe("getAfterNotNull");
  logProbe("getAfterNotNull", result);
  assert.equal(result.outcome, "allowed", result.message);
});

test("getAfter(session) == null is denied; record evaluation error separately", async () => {
  const result = await runProbe("getAfterIsNull");
  logProbe("getAfterIsNull", result);
  assert.equal(result.code, "permission-denied", result.message);
  assert.notEqual(result.outcome, "allowed", result.message);
});

test("getAfter index == 0 && false is a clean deny", async () => {
  const result = await runProbe("getAfterZeroAndFalse");
  logProbe("getAfterZeroAndFalse", result);
  assert.equal(result.outcome, "denied", result.message);
});

test("request segmentIndex == 1 is a clean deny", async () => {
  const result = await runProbe("requestIndexEqOne");
  logProbe("requestIndexEqOne", result);
  assert.equal(result.outcome, "denied", result.message);
});

test("unchanged index fails existsAfter && +1; evaluation error is not the +1 proof", async () => {
  const result = await runProbe("existsAfterAndPlusOne");
  logProbe("existsAfterAndPlusOne", result);
  assert.equal(result.code, "permission-denied", result.message);
  assert.notEqual(result.outcome, "allowed", result.message);
});

test("existsAfter pairing helper denies skip-only", async () => {
  const result = await runProbe("afterSessionAdvancedFixed");
  logProbe("afterSessionAdvancedFixed", result);
  assert.equal(result.code, "permission-denied", result.message);
  assert.notEqual(result.outcome, "allowed", result.message);
});

test("getAfter index == 1 is denied when the session is unchanged", async () => {
  const result = await runProbe("getAfterEqOne");
  logProbe("getAfterEqOne", result);
  assert.equal(result.code, "permission-denied", result.message);
  assert.notEqual(result.outcome, "allowed", result.message);
});

test("atomic session +1 makes getAfter index == 1 allow", async () => {
  await assertSeededSessionExists();
  const db = aliceDb();
  const sessionRef = doc(db, "tripSessions", SESSION_ID);
  const skipRef = doc(db, "tripSessions", SESSION_ID, "p_getAfterEqOne", "segment-0");
  await runTransaction(db, async (transaction) => {
    transaction.update(sessionRef, { currentSegmentIndex: 1 });
    transaction.set(skipRef, skipOnlyPayload());
  });
  const sessionSnap = await getDoc(sessionRef);
  const skipSnap = await getDoc(skipRef);
  assert.equal(sessionSnap.data().currentSegmentIndex, 1);
  assert.equal(skipSnap.exists(), true);
});
