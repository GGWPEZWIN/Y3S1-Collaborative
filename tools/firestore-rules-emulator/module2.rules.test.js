/**
 * Isolated Firestore rules checks for Module 2 skip / arrival / finish.
 * Uses the Firestore Emulator with project ID demo-module2-rules.
 * Authenticated client SDK writes exercise rules. Admin is used only to seed.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

const ROOT = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = resolve(ROOT, "../../firestore.rules");
const PROJECT_ID = "demo-module2-rules";
const ALICE = "alice";
const BOB = "bob";

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:18080";
const [host, portString] = emulatorHost.split(":");
const port = Number(portString || "18080");

let testEnv;

function aliceDb() {
  return testEnv.authenticatedContext(ALICE).firestore();
}

function bobDb() {
  return testEnv.authenticatedContext(BOB).firestore();
}

function anonDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function destinationsFor(totalSegments) {
  const all = [
    { destinationId: "d0", name: "Penang" },
    { destinationId: "d1", name: "Cameron Highlands" },
    { destinationId: "d2", name: "Kuala Lumpur" },
  ];
  return all.slice(0, totalSegments);
}

function itineraryDoc(uid, itineraryId, totalSegments, extras = {}) {
  return {
    userId: uid,
    title: "Test trip",
    module1Complete: true,
    module2Complete: false,
    status: "Planned",
    isCompleted: false,
    ecoScore: 89,
    startLocation: { name: "Airport" },
    destinations: destinationsFor(totalSegments),
    ...extras,
  };
}

function sessionDoc(uid, itineraryId, { currentSegmentIndex = 0, totalSegments = 2, extras = {} } = {}) {
  const now = Timestamp.now();
  return {
    userId: uid,
    itineraryId,
    itineraryTitle: "Test trip",
    status: "active",
    currentSegmentIndex,
    totalSegments,
    startedAt: now,
    updatedAt: now,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    version: 1,
    ...extras,
  };
}

function lockDoc(uid, sessionId, itineraryId) {
  const now = Timestamp.now();
  return {
    userId: uid,
    sessionId,
    itineraryId,
    itineraryTitle: "Test trip",
    status: "active",
    startedAt: now,
    updatedAt: now,
  };
}

async function seed(writer) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await writer(context.firestore());
  });
}

async function seedItinerary(uid, itineraryId, totalSegments = 2, extras = {}) {
  await seed(async (db) => {
    await setDoc(doc(db, "itineraries", itineraryId), itineraryDoc(uid, itineraryId, totalSegments, extras));
  });
}

async function seedActiveTrip({
  uid = ALICE,
  itineraryId = "itin-1",
  sessionId = "session-1",
  currentSegmentIndex = 0,
  totalSegments = 2,
  itineraryExtras = {},
  sessionExtras = {},
} = {}) {
  await seed(async (db) => {
    await setDoc(
      doc(db, "itineraries", itineraryId),
      itineraryDoc(uid, itineraryId, totalSegments, itineraryExtras)
    );
    await setDoc(
      doc(db, "tripSessions", sessionId),
      sessionDoc(uid, itineraryId, { currentSegmentIndex, totalSegments, extras: sessionExtras })
    );
    await setDoc(doc(db, "activeTripLocks", uid), lockDoc(uid, sessionId, itineraryId));
  });
}

function skipPayload({ uid, itineraryId, sessionId, index, destinationId, destinationName }) {
  return {
    userId: uid,
    itineraryId,
    sessionId,
    segmentId: `segment-${index}`,
    segmentIndex: index,
    destinationId,
    destinationName,
    outcome: "skipped",
    reason: "user_confirmed",
    skippedAt: serverTimestamp(),
    version: 1,
  };
}

function completionPayload({
  uid,
  itineraryId,
  sessionId,
  index,
  originName,
  destinationName,
  ecoScore = 80,
  carbon = 0.5,
}) {
  return {
    userId: uid,
    itineraryId,
    sessionId,
    segmentId: `segment-${index}`,
    segmentIndex: index,
    originName,
    destinationName,
    travelMode: "WALK",
    distanceMeters: 1000,
    durationSeconds: 600,
    carbonKgCo2e: carbon,
    prototypeEcoScore: ecoScore,
    rankingScore: 90,
    source: "google_routes",
    carbonVersion: "prototype-uk-ghg-2026-v1",
    completedAt: serverTimestamp(),
    version: 1,
  };
}

function skipRefs(db, sessionId, index) {
  return {
    sessionRef: doc(db, "tripSessions", sessionId),
    skipRef: doc(db, "tripSessions", sessionId, "skippedSegments", `segment-${index}`),
    completeRef: doc(db, "tripSessions", sessionId, "completedSegments", `segment-${index}`),
    lockRef: doc(db, "activeTripLocks", ALICE),
  };
}

function commitSkip(db, { uid, itineraryId, sessionId, index, destinationId, destinationName }) {
  const { sessionRef, skipRef, completeRef, lockRef } = skipRefs(db, sessionId, index);
  return runTransaction(db, async (transaction) => {
    await transaction.get(sessionRef);
    await transaction.get(skipRef);
    await transaction.get(completeRef);
    await transaction.get(lockRef);
    transaction.set(
      skipRef,
      skipPayload({ uid, itineraryId, sessionId, index, destinationId, destinationName })
    );
    transaction.update(sessionRef, {
      currentSegmentIndex: index + 1,
      updatedAt: serverTimestamp(),
    });
  });
}

function commitComplete(db, args) {
  const { uid, itineraryId, sessionId, index } = args;
  const sessionRef = doc(db, "tripSessions", sessionId);
  const completeRef = doc(db, "tripSessions", sessionId, "completedSegments", `segment-${index}`);
  const skipRef = doc(db, "tripSessions", sessionId, "skippedSegments", `segment-${index}`);
  const lockRef = doc(db, "activeTripLocks", uid);
  return runTransaction(db, async (transaction) => {
    await transaction.get(sessionRef);
    await transaction.get(completeRef);
    await transaction.get(skipRef);
    await transaction.get(lockRef);
    transaction.set(completeRef, completionPayload(args));
    transaction.update(sessionRef, {
      currentSegmentIndex: index + 1,
      updatedAt: serverTimestamp(),
      latestCompletedSegmentId: `segment-${index}`,
    });
  });
}

function reportPayload({
  uid,
  itineraryId,
  sessionId,
  planEcoScore,
  transportationEcoScore,
  finalEcoScore,
  scoreCompleteness,
  carbonKg,
  reachedCount,
  skippedCount,
  destinationOutcomes,
  segments,
}) {
  const now = serverTimestamp();
  return {
    userId: uid,
    itineraryId,
    tripId: itineraryId,
    sessionId,
    tripName: "Test trip",
    originName: "Airport",
    destinationNames: destinationsFor(reachedCount + skippedCount).map((item) => item.name),
    startDate: null,
    endDate: null,
    location: "Airport",
    planEcoScore,
    transportationEcoScore,
    finalEcoScore,
    ecoScore: finalEcoScore,
    scoreCompleteness,
    scoreCoveragePolicy: "completed_transport_only",
    scoreFormulaVersion: "plan-transport-mean-v1",
    confirmedTransportationCarbonKg: carbonKg,
    carbonScope: "completed_segments_only",
    carbonVersion: "prototype-uk-ghg-2026-v1",
    reachedCount,
    skippedCount,
    destinationOutcomes,
    segments,
    status: "Completed",
    visibility: "private",
    publishedAt: null,
    source: "module2_finish_trip",
    version: 1,
    createdAt: now,
    updatedAt: now,
    completedAt: now,
  };
}

function historyPayload(scores) {
  const now = serverTimestamp();
  return {
    itineraryId: scores.itineraryId,
    title: "Test trip",
    name: "Test trip",
    status: "Completed",
    completed: true,
    isCompleted: true,
    planEcoScore: scores.planEcoScore,
    transportationEcoScore: scores.transportationEcoScore,
    finalEcoScore: scores.finalEcoScore,
    confirmedTransportationCarbonKg: scores.carbonKg,
    carbonScope: "completed_segments_only",
    createdAt: now,
    updatedAt: now,
    completedAt: now,
  };
}

function commitFinish(db, { uid, itineraryId, sessionId, report, scores }) {
  const sessionRef = doc(db, "tripSessions", sessionId);
  const itineraryRef = doc(db, "itineraries", itineraryId);
  const lockRef = doc(db, "activeTripLocks", uid);
  const historyRef = doc(db, "users", uid, "travelHistory", itineraryId);
  const reportRef = doc(db, "users", uid, "travelHistory", itineraryId, "ecoReport", "report");
  const now = serverTimestamp();
  return runTransaction(db, async (transaction) => {
    await transaction.get(lockRef);
    await transaction.get(sessionRef);
    await transaction.get(itineraryRef);
    await transaction.get(historyRef);
    await transaction.get(reportRef);
    const totalSnap = await transaction.get(sessionRef);
    const total = totalSnap.data().totalSegments;
    for (let index = 0; index < total; index += 1) {
      await transaction.get(doc(db, "tripSessions", sessionId, "completedSegments", `segment-${index}`));
      await transaction.get(doc(db, "tripSessions", sessionId, "skippedSegments", `segment-${index}`));
    }
    transaction.update(sessionRef, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });
    transaction.update(itineraryRef, {
      module2Complete: true,
      status: "Completed",
      isCompleted: true,
      completedAt: now,
      updatedAt: now,
    });
    transaction.set(historyRef, historyPayload({ ...scores, itineraryId }));
    transaction.set(reportRef, report);
    transaction.delete(lockRef);
  });
}

async function sessionIndex(sessionId) {
  let snap = null;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    snap = await getDoc(doc(context.firestore(), "tripSessions", sessionId));
  });
  assert.equal(Boolean(snap && snap.exists()), true, `missing session ${sessionId}`);
  return snap.data().currentSegmentIndex;
}

before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. Run via firebase emulators:exec --only firestore --project demo-module2-rules."
    );
  }
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host,
      port,
      rules: readFileSync(RULES_PATH, "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

test("Start and Cancel succeed for the owner", async () => {
  await seedItinerary(ALICE, "itin-start", 2);
  const db = aliceDb();
  const sessionRef = doc(db, "tripSessions", "session-start");
  const lockRef = doc(db, "activeTripLocks", ALICE);
  const now = serverTimestamp();

  await assertSucceeds(
    runTransaction(db, async (transaction) => {
      await transaction.get(doc(db, "itineraries", "itin-start"));
      await transaction.get(lockRef);
      transaction.set(sessionRef, {
        userId: ALICE,
        itineraryId: "itin-start",
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
      transaction.set(lockRef, {
        userId: ALICE,
        sessionId: "session-start",
        itineraryId: "itin-start",
        itineraryTitle: "Test trip",
        status: "active",
        startedAt: now,
        updatedAt: now,
      });
    })
  );

  await assertSucceeds(
    runTransaction(db, async (transaction) => {
      await transaction.get(sessionRef);
      await transaction.get(lockRef);
      transaction.update(sessionRef, {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        cancellationReason: "user_cancelled",
      });
      transaction.delete(lockRef);
    })
  );

  const sessionSnap = await assertSucceeds(getDoc(sessionRef));
  assert.equal(sessionSnap.data().status, "cancelled");
  const lockSnap = await assertSucceeds(getDoc(lockRef));
  assert.equal(lockSnap.exists(), false);
});

test("legacy completed-only progress still succeeds", async () => {
  await seedActiveTrip({ itineraryId: "itin-legacy", sessionId: "session-legacy", totalSegments: 2 });
  const db = aliceDb();
  await assertSucceeds(
    commitComplete(db, {
      uid: ALICE,
      itineraryId: "itin-legacy",
      sessionId: "session-legacy",
      index: 0,
      originName: "Airport",
      destinationName: "Penang",
      ecoScore: 100,
      carbon: 0,
    })
  );
  await assertSucceeds(
    commitComplete(db, {
      uid: ALICE,
      itineraryId: "itin-legacy",
      sessionId: "session-legacy",
      index: 1,
      originName: "Penang",
      destinationName: "Cameron Highlands",
      ecoScore: 72,
      carbon: 1.32,
    })
  );
  assert.equal(await sessionIndex("session-legacy"), 2);
  const skipSnap = await assertSucceeds(
    getDoc(doc(db, "tripSessions", "session-legacy", "skippedSegments", "segment-0"))
  );
  assert.equal(skipSnap.exists(), false);
});

test("atomic skip record plus one-step progress succeeds", async () => {
  await seedActiveTrip({ itineraryId: "itin-skip", sessionId: "session-skip" });
  const db = aliceDb();
  await assertSucceeds(
    getDoc(doc(db, "tripSessions", "session-skip", "skippedSegments", "segment-0"))
  );
  await assertSucceeds(
    commitSkip(db, {
      uid: ALICE,
      itineraryId: "itin-skip",
      sessionId: "session-skip",
      index: 0,
      destinationId: "d0",
      destinationName: "Penang",
    })
  );
  assert.equal(await sessionIndex("session-skip"), 1);
  const skipSnap = await assertSucceeds(
    getDoc(doc(db, "tripSessions", "session-skip", "skippedSegments", "segment-0"))
  );
  assert.equal(skipSnap.data().outcome, "skipped");
  assert.equal(Object.prototype.hasOwnProperty.call(skipSnap.data(), "carbonKgCo2e"), false);
});

function deniedWithoutExpressionBudget(error) {
  const text = String(error?.message || error || "");
  assert.equal(error.code, "permission-denied");
  assert.equal(
    text.includes("maximum of 1000 expressions"),
    false,
    text
  );
  assert.equal(text.includes("Unable to evaluate the expression"), false, text);
  return text;
}

function logDenyEvaluation(label, error) {
  const text = deniedWithoutExpressionBudget(error);
  if (text.includes("evaluation error")) {
    console.log(`EVALUATION_ERROR ${label}: ${text.split("\n")[0]}`);
  } else {
    console.log(`CLEAN_DENY ${label}`);
  }
  return text;
}

test("skip-only writes, progress-only writes, and index jumps fail", async () => {
  await seedActiveTrip({ itineraryId: "itin-fail", sessionId: "session-fail" });
  const db = aliceDb();
  const sessionRef = doc(db, "tripSessions", "session-fail");
  const skipRef = doc(db, "tripSessions", "session-fail", "skippedSegments", "segment-0");

  const skipOnlyError = await assertFails(
    setDoc(
      skipRef,
      skipPayload({
        uid: ALICE,
        itineraryId: "itin-fail",
        sessionId: "session-fail",
        index: 0,
        destinationId: "d0",
        destinationName: "Penang",
      })
    )
  );
  logDenyEvaluation("skip-only", skipOnlyError);

  logDenyEvaluation(
    "progress-only",
    await assertFails(
      updateDoc(sessionRef, {
        currentSegmentIndex: 1,
        updatedAt: serverTimestamp(),
      })
    )
  );

  logDenyEvaluation(
    "index-jump",
    await assertFails(
      updateDoc(sessionRef, {
        currentSegmentIndex: 2,
        updatedAt: serverTimestamp(),
      })
    )
  );

  assert.equal(await sessionIndex("session-fail"), 0);
  const skipSnap = await assertSucceeds(getDoc(skipRef));
  assert.equal(skipSnap.exists(), false);
});

test("completion and skip cannot both exist for one index", async () => {
  await seedActiveTrip({ itineraryId: "itin-conflict", sessionId: "session-conflict" });
  const db = aliceDb();
  await assertSucceeds(
    commitSkip(db, {
      uid: ALICE,
      itineraryId: "itin-conflict",
      sessionId: "session-conflict",
      index: 0,
      destinationId: "d0",
      destinationName: "Penang",
    })
  );

  await seed(async (adminDb) => {
    await updateDoc(doc(adminDb, "tripSessions", "session-conflict"), {
      currentSegmentIndex: 0,
    });
  });

  logDenyEvaluation(
    "complete-after-skip-same-index",
    await assertFails(
    commitComplete(db, {
      uid: ALICE,
      itineraryId: "itin-conflict",
      sessionId: "session-conflict",
      index: 0,
      originName: "Airport",
      destinationName: "Penang",
    })
    )
  );

  await seedActiveTrip({ itineraryId: "itin-conflict-2", sessionId: "session-conflict-2" });
  await assertSucceeds(
    commitComplete(aliceDb(), {
      uid: ALICE,
      itineraryId: "itin-conflict-2",
      sessionId: "session-conflict-2",
      index: 0,
      originName: "Airport",
      destinationName: "Penang",
    })
  );
  await seed(async (adminDb) => {
    await updateDoc(doc(adminDb, "tripSessions", "session-conflict-2"), {
      currentSegmentIndex: 0,
    });
  });
  logDenyEvaluation(
    "skip-after-complete-same-index",
    await assertFails(
    commitSkip(aliceDb(), {
      uid: ALICE,
      itineraryId: "itin-conflict-2",
      sessionId: "session-conflict-2",
      index: 0,
      destinationId: "d0",
      destinationName: "Penang",
    })
    )
  );
});

test("repeated skip or complete does not advance twice", async () => {
  await seedActiveTrip({ itineraryId: "itin-repeat", sessionId: "session-repeat" });
  const db = aliceDb();
  await assertSucceeds(
    commitSkip(db, {
      uid: ALICE,
      itineraryId: "itin-repeat",
      sessionId: "session-repeat",
      index: 0,
      destinationId: "d0",
      destinationName: "Penang",
    })
  );
  logDenyEvaluation(
    "repeat-skip",
    await assertFails(
    commitSkip(db, {
      uid: ALICE,
      itineraryId: "itin-repeat",
      sessionId: "session-repeat",
      index: 0,
      destinationId: "d0",
      destinationName: "Penang",
    })
    )
  );
  assert.equal(await sessionIndex("session-repeat"), 1);

  await seedActiveTrip({ itineraryId: "itin-repeat-c", sessionId: "session-repeat-c" });
  await assertSucceeds(
    commitComplete(aliceDb(), {
      uid: ALICE,
      itineraryId: "itin-repeat-c",
      sessionId: "session-repeat-c",
      index: 0,
      originName: "Airport",
      destinationName: "Penang",
    })
  );
  logDenyEvaluation(
    "repeat-complete",
    await assertFails(
    commitComplete(aliceDb(), {
      uid: ALICE,
      itineraryId: "itin-repeat-c",
      sessionId: "session-repeat-c",
      index: 0,
      originName: "Airport",
      destinationName: "Penang",
    })
    )
  );
  assert.equal(await sessionIndex("session-repeat-c"), 1);
});

test("completion after an earlier skipped destination succeeds", async () => {
  await seedActiveTrip({ itineraryId: "itin-after-skip", sessionId: "session-after-skip" });
  const db = aliceDb();
  await assertSucceeds(
    commitSkip(db, {
      uid: ALICE,
      itineraryId: "itin-after-skip",
      sessionId: "session-after-skip",
      index: 0,
      destinationId: "d0",
      destinationName: "Penang",
    })
  );
  await assertSucceeds(
    commitComplete(db, {
      uid: ALICE,
      itineraryId: "itin-after-skip",
      sessionId: "session-after-skip",
      index: 1,
      originName: "Airport",
      destinationName: "Cameron Highlands",
      ecoScore: 72,
      carbon: 1.32,
    })
  );
  assert.equal(await sessionIndex("session-after-skip"), 2);
});

test("wrong-owner and signed-out skip, complete, and start fail", async () => {
  await seedActiveTrip({ itineraryId: "itin-auth", sessionId: "session-auth" });
  const skipArgs = {
    uid: ALICE,
    itineraryId: "itin-auth",
    sessionId: "session-auth",
    index: 0,
    destinationId: "d0",
    destinationName: "Penang",
  };
  const other = bobDb();
  const unsigned = anonDb();
  const completeArgs = {
    uid: ALICE,
    itineraryId: "itin-auth",
    sessionId: "session-auth",
    index: 0,
    originName: "Airport",
    destinationName: "Penang",
  };

  await assertFails(commitSkip(other, skipArgs));
  await assertFails(commitSkip(unsigned, skipArgs));
  await assertFails(commitComplete(other, completeArgs));
  await assertFails(commitComplete(unsigned, completeArgs));
  await assertFails(getDoc(doc(other, "tripSessions", "session-auth")));
  await assertFails(getDoc(doc(unsigned, "tripSessions", "session-auth")));
  assert.equal(await sessionIndex("session-auth"), 0);

  await seedItinerary(ALICE, "itin-anon-start", 2);
  const now = serverTimestamp();
  await assertFails(
    runTransaction(unsigned, async (transaction) => {
      const sessionRef = doc(unsigned, "tripSessions", "session-anon");
      const lockRef = doc(unsigned, "activeTripLocks", ALICE);
      transaction.set(sessionRef, {
        userId: ALICE,
        itineraryId: "itin-anon-start",
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
      transaction.set(lockRef, {
        userId: ALICE,
        sessionId: "session-anon",
        itineraryId: "itin-anon-start",
        itineraryTitle: "Test trip",
        status: "active",
        startedAt: now,
        updatedAt: now,
      });
    })
  );
});

async function finishReadyTrip({
  sessionId,
  itineraryId,
  pattern,
}) {
  await seedActiveTrip({ itineraryId, sessionId, totalSegments: 2 });
  const db = aliceDb();
  const dest = destinationsFor(2);
  for (let index = 0; index < 2; index += 1) {
    if (pattern[index] === "skip") {
      await assertSucceeds(
        commitSkip(db, {
          uid: ALICE,
          itineraryId,
          sessionId,
          index,
          destinationId: dest[index].destinationId,
          destinationName: dest[index].name,
        })
      );
    } else {
      await assertSucceeds(
        commitComplete(db, {
          uid: ALICE,
          itineraryId,
          sessionId,
          index,
          originName: index === 0 ? "Airport" : dest[0].name,
          destinationName: dest[index].name,
          ecoScore: index === 0 ? 100 : 72,
          carbon: index === 0 ? 0 : 1.32,
        })
      );
    }
  }
}

test("Finish succeeds for completed-only, mixed, and all-skipped trips", async () => {
  await finishReadyTrip({
    sessionId: "session-finish-all",
    itineraryId: "itin-finish-all",
    pattern: ["complete", "complete"],
  });
  const allReport = reportPayload({
    uid: ALICE,
    itineraryId: "itin-finish-all",
    sessionId: "session-finish-all",
    planEcoScore: 89,
    transportationEcoScore: 86,
    finalEcoScore: 88,
    scoreCompleteness: "plan_and_transport",
    carbonKg: 1.32,
    reachedCount: 2,
    skippedCount: 0,
    destinationOutcomes: [
      { segmentIndex: 0, destinationId: "d0", destinationName: "Penang", outcome: "reached" },
      { segmentIndex: 1, destinationId: "d1", destinationName: "Cameron Highlands", outcome: "reached" },
    ],
    segments: [
      {
        segmentIndex: 0,
        originName: "Airport",
        destinationName: "Penang",
        travelMode: "WALK",
        distanceMeters: 1000,
        durationSeconds: 600,
        carbonKgCo2e: 0,
        prototypeEcoScore: 100,
      },
      {
        segmentIndex: 1,
        originName: "Penang",
        destinationName: "Cameron Highlands",
        travelMode: "WALK",
        distanceMeters: 1000,
        durationSeconds: 600,
        carbonKgCo2e: 1.32,
        prototypeEcoScore: 72,
      },
    ],
  });
  await assertSucceeds(
    commitFinish(aliceDb(), {
      uid: ALICE,
      itineraryId: "itin-finish-all",
      sessionId: "session-finish-all",
      report: allReport,
      scores: {
        planEcoScore: 89,
        transportationEcoScore: 86,
        finalEcoScore: 88,
        carbonKg: 1.32,
      },
    })
  );

  await finishReadyTrip({
    sessionId: "session-finish-mixed",
    itineraryId: "itin-finish-mixed",
    pattern: ["complete", "skip"],
  });
  const mixedReport = reportPayload({
    uid: ALICE,
    itineraryId: "itin-finish-mixed",
    sessionId: "session-finish-mixed",
    planEcoScore: 89,
    transportationEcoScore: 100,
    finalEcoScore: 90,
    scoreCompleteness: "plan_and_transport",
    carbonKg: 0,
    reachedCount: 1,
    skippedCount: 1,
    destinationOutcomes: [
      { segmentIndex: 0, destinationId: "d0", destinationName: "Penang", outcome: "reached" },
      { segmentIndex: 1, destinationId: "d1", destinationName: "Cameron Highlands", outcome: "skipped" },
    ],
    segments: [
      {
        segmentIndex: 0,
        originName: "Airport",
        destinationName: "Penang",
        travelMode: "WALK",
        distanceMeters: 1000,
        durationSeconds: 600,
        carbonKgCo2e: 0,
        prototypeEcoScore: 100,
      },
    ],
  });
  await assertSucceeds(
    commitFinish(aliceDb(), {
      uid: ALICE,
      itineraryId: "itin-finish-mixed",
      sessionId: "session-finish-mixed",
      report: mixedReport,
      scores: {
        planEcoScore: 89,
        transportationEcoScore: 100,
        finalEcoScore: 90,
        carbonKg: 0,
      },
    })
  );

  await finishReadyTrip({
    sessionId: "session-finish-skipped",
    itineraryId: "itin-finish-skipped",
    pattern: ["skip", "skip"],
  });
  const skippedReport = reportPayload({
    uid: ALICE,
    itineraryId: "itin-finish-skipped",
    sessionId: "session-finish-skipped",
    planEcoScore: 89,
    transportationEcoScore: null,
    finalEcoScore: null,
    scoreCompleteness: "no_completed_transport",
    carbonKg: null,
    reachedCount: 0,
    skippedCount: 2,
    destinationOutcomes: [
      { segmentIndex: 0, destinationId: "d0", destinationName: "Penang", outcome: "skipped" },
      { segmentIndex: 1, destinationId: "d1", destinationName: "Cameron Highlands", outcome: "skipped" },
    ],
    segments: [],
  });
  await assertSucceeds(
    commitFinish(aliceDb(), {
      uid: ALICE,
      itineraryId: "itin-finish-skipped",
      sessionId: "session-finish-skipped",
      report: skippedReport,
      scores: {
        planEcoScore: 89,
        transportationEcoScore: null,
        finalEcoScore: null,
        carbonKg: null,
      },
    })
  );

  const reportSnap = await assertSucceeds(
    getDoc(doc(aliceDb(), "users", ALICE, "travelHistory", "itin-finish-skipped", "ecoReport", "report"))
  );
  assert.equal(reportSnap.data().transportationEcoScore, null);
  assert.equal(reportSnap.data().finalEcoScore, null);
  assert.equal(reportSnap.data().confirmedTransportationCarbonKg, null);
});

test("Finish atomically completes session, itinerary, report, history, and lock", async () => {
  await finishReadyTrip({
    sessionId: "session-atomic",
    itineraryId: "itin-atomic",
    pattern: ["complete", "complete"],
  });
  const report = reportPayload({
    uid: ALICE,
    itineraryId: "itin-atomic",
    sessionId: "session-atomic",
    planEcoScore: 89,
    transportationEcoScore: 86,
    finalEcoScore: 88,
    scoreCompleteness: "plan_and_transport",
    carbonKg: 1.32,
    reachedCount: 2,
    skippedCount: 0,
    destinationOutcomes: [
      { segmentIndex: 0, destinationId: "d0", destinationName: "Penang", outcome: "reached" },
      { segmentIndex: 1, destinationId: "d1", destinationName: "Cameron Highlands", outcome: "reached" },
    ],
    segments: [
      {
        segmentIndex: 0,
        originName: "Airport",
        destinationName: "Penang",
        travelMode: "WALK",
        distanceMeters: 1000,
        durationSeconds: 600,
        carbonKgCo2e: 0,
        prototypeEcoScore: 100,
      },
      {
        segmentIndex: 1,
        originName: "Penang",
        destinationName: "Cameron Highlands",
        travelMode: "WALK",
        distanceMeters: 1000,
        durationSeconds: 600,
        carbonKgCo2e: 1.32,
        prototypeEcoScore: 72,
      },
    ],
  });
  await assertSucceeds(
    commitFinish(aliceDb(), {
      uid: ALICE,
      itineraryId: "itin-atomic",
      sessionId: "session-atomic",
      report,
      scores: {
        planEcoScore: 89,
        transportationEcoScore: 86,
        finalEcoScore: 88,
        carbonKg: 1.32,
      },
    })
  );

  const db = aliceDb();
  const sessionSnap = await assertSucceeds(getDoc(doc(db, "tripSessions", "session-atomic")));
  const itinerarySnap = await assertSucceeds(getDoc(doc(db, "itineraries", "itin-atomic")));
  const historySnap = await assertSucceeds(getDoc(doc(db, "users", ALICE, "travelHistory", "itin-atomic")));
  const reportSnap = await assertSucceeds(
    getDoc(doc(db, "users", ALICE, "travelHistory", "itin-atomic", "ecoReport", "report"))
  );
  const lockSnap = await assertSucceeds(getDoc(doc(db, "activeTripLocks", ALICE)));
  assert.equal(sessionSnap.data().status, "completed");
  assert.equal(itinerarySnap.data().module2Complete, true);
  assert.equal(itinerarySnap.data().status, "Completed");
  assert.equal(historySnap.data().status, "Completed");
  assert.equal(reportSnap.data().visibility, "private");
  assert.equal(reportSnap.data().source, "module2_finish_trip");
  assert.equal(lockSnap.exists(), false);
});

test("private reports deny other users; publish only changes allowed fields", async () => {
  await seed(async (adminDb) => {
    const now = Timestamp.now();
    await setDoc(doc(adminDb, "users", ALICE, "travelHistory", "itin-report", "ecoReport", "report"), {
      userId: ALICE,
      itineraryId: "itin-report",
      tripId: "itin-report",
      sessionId: "session-report",
      tripName: "Test trip",
      originName: "Airport",
      destinationNames: ["Penang"],
      startDate: null,
      endDate: null,
      location: "Airport",
      planEcoScore: 89,
      transportationEcoScore: 80,
      finalEcoScore: 85,
      ecoScore: 85,
      scoreCompleteness: "plan_and_transport",
      scoreCoveragePolicy: "completed_transport_only",
      scoreFormulaVersion: "plan-transport-mean-v1",
      confirmedTransportationCarbonKg: 0.5,
      carbonScope: "completed_segments_only",
      carbonVersion: "prototype-uk-ghg-2026-v1",
      reachedCount: 1,
      skippedCount: 0,
      destinationOutcomes: [
        { segmentIndex: 0, destinationId: "d0", destinationName: "Penang", outcome: "reached" },
      ],
      segments: [],
      status: "Completed",
      visibility: "private",
      publishedAt: null,
      source: "module2_finish_trip",
      version: 1,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });
  });

  const reportRef = doc(aliceDb(), "users", ALICE, "travelHistory", "itin-report", "ecoReport", "report");
  const loaded = await assertSucceeds(getDoc(reportRef));
  assert.equal(loaded.data().visibility, "private");
  await assertFails(
    getDoc(doc(bobDb(), "users", ALICE, "travelHistory", "itin-report", "ecoReport", "report"))
  );
  await assertFails(
    getDoc(doc(anonDb(), "users", ALICE, "travelHistory", "itin-report", "ecoReport", "report"))
  );

  logDenyEvaluation(
    "invalid-report-publish",
    await assertFails(
    updateDoc(reportRef, {
      visibility: "public",
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      finalEcoScore: 1,
    })
    )
  );
  await assertSucceeds(
    updateDoc(reportRef, {
      visibility: "public",
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  const published = await assertSucceeds(getDoc(reportRef));
  assert.equal(published.data().visibility, "public");
  assert.equal(published.data().finalEcoScore, 85);
  assert.notEqual(published.data().publishedAt, null);
});
