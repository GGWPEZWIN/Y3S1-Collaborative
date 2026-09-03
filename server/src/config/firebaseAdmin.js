import { cert, getApps, initializeApp } from "firebase-admin/app";

/**
 * Initializes Firebase Admin once from FIREBASE_SERVICE_ACCOUNT.
 * Does not read or write Firestore.
 */
export function initFirebaseAdmin() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (raw == null || String(raw).trim() === "") {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not set. Check your .env file."
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
  }

  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
}
