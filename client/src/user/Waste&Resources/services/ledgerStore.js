import {
  collection,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { buildHistory } from "./historyService";

/* ==================================================================
   LEDGER PERSISTENCE  (F3)  —  Cloud Firestore
   ------------------------------------------------------------------
   Layout:  users/{uid}/wasteLogs/{logId}

   One document per log rather than one array document per user. The
   1 MiB per-document ceiling would otherwise be reached quickly, since
   CV scans embed a JPEG, and a subcollection lets Firestore order and
   page the rows server-side.
   ================================================================== */

const LOGS = "wasteLogs";

function logsCollection(uid) {
  return collection(db, "users", uid, LOGS);
}

/** Strips `id` — it is the document id, not part of the body. */
function toDocumentBody(entry) {
  const body = { ...entry };
  delete body.id;
  return body;
}

/**
 * Live subscription. Firestore pushes an update on every local write
 * (latency compensation) and on every remote change, so the UI does not
 * need its own optimistic-update path.
 *
 * Ordered by `iso` only — a single-field sort needs no composite index.
 * Same-day entries are tie-broken client-side on `createdAt`.
 *
 * @returns {Function} unsubscribe
 */
export function subscribeToLedger(uid, onData, onError) {
  const q = query(logsCollection(uid), orderBy("iso", "desc"));

  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => {
        if (a.iso !== b.iso) return a.iso < b.iso ? 1 : -1;
        return (b.createdAtMs || 0) - (a.createdAtMs || 0);
      });
      onData(rows);
    },
    onError
  );
}

/** Writes one log. Returns the generated document id. */
export async function saveLog(uid, entry) {
  const ref = doc(logsCollection(uid));
  await setDoc(ref, {
    ...toDocumentBody(entry),
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(), // available immediately, unlike serverTimestamp
  });
  return ref.id;
}

/**
 * Applies a user correction to an existing log.
 *
 * The first edit snapshots the pre-edit figures into `original`. For a CV
 * scan that preserves the model's estimate alongside the user's correction —
 * the (predicted, actual) pair needed to evaluate and retrain the mass
 * regressor. Later edits do not overwrite that snapshot.
 *
 * @param {string} uid
 * @param {string} logId
 * @param {object} patch    fields the user changed
 * @param {object} current  the log as it stands, for the snapshot
 */
export async function updateLog(uid, logId, patch, current) {
  const body = {
    ...patch,
    editedAt: serverTimestamp(),
    editedAtMs: Date.now(),
  };

  if (!current.original) {
    body.original = {
      foodWaste: Number(current.foodWaste) || 0,
      plastic: Number(current.plastic) || 0,
      water: Number(current.water) || 0,
      disposables: Number(current.disposables) || 0,
    };
  }

  await updateDoc(doc(logsCollection(uid), logId), body);
}

export async function deleteLog(uid, logId) {
  await deleteDoc(doc(logsCollection(uid), logId));
}

/**
 * Writes the generated demo history so the monthly and annual reports
 * have something to consolidate. For walkthroughs only — never call
 * this on a real account.
 */
export async function seedLedger(uid) {
  const rows = buildHistory();
  const chunkSize = 500; // Firestore caps a batch at 500 operations

  for (let i = 0; i < rows.length; i += chunkSize) {
    const batch = writeBatch(db);
    rows.slice(i, i + chunkSize).forEach((row) => {
      batch.set(doc(logsCollection(uid)), {
        ...toDocumentBody(row),
        createdAtMs: Date.now(),
      });
    });
    await batch.commit();
  }

  return rows.length;
}
