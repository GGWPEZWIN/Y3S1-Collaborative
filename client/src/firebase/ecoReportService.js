import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "./config";

const MODULE2_REPORT_SOURCE = "module2_finish_trip";

export const ECO_REPORT_ERROR = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  NOT_FOUND: "REPORT_NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_MODULE2_REPORT: "NOT_MODULE2_REPORT",
  UNAVAILABLE: "UNAVAILABLE",
};

export class EcoReportError extends Error {
  constructor(code) {
    super(code);
    this.name = "EcoReportError";
    this.code = code;
  }
}

function getLoggedInUser() {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        if (user) resolve(user);
        else reject(new EcoReportError(ECO_REPORT_ERROR.AUTH_REQUIRED));
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}

function reportDocRef(tripId) {
  return doc(
    db,
    "travelHistory",
    tripId,
    "ecoReport",
    "report"
  );
}

function mapEcoReportFailure(error) {
  if (error instanceof EcoReportError) return error;

  const code = typeof error?.code === "string" ? error.code : "";
  if (code === "permission-denied" || code === "unauthenticated") {
    return new EcoReportError(ECO_REPORT_ERROR.UNAUTHORIZED);
  }

  return new EcoReportError(ECO_REPORT_ERROR.UNAVAILABLE);
}

export async function getEcoReport(tripId) {
  try {
    const firebaseUser = await getLoggedInUser();
    const id = typeof tripId === "string" ? tripId.trim() : "";

    if (!id) {
      throw new EcoReportError(ECO_REPORT_ERROR.NOT_FOUND);
    }

    const snapshot = await getDoc(reportDocRef(id));
    if (!snapshot.exists()) return null;

    const data = snapshot.data();

    if (data.userId && data.userId !== firebaseUser.uid) {
      throw new EcoReportError(ECO_REPORT_ERROR.UNAUTHORIZED);
    }

    if (data.source && data.source !== MODULE2_REPORT_SOURCE) {
      throw new EcoReportError(ECO_REPORT_ERROR.NOT_MODULE2_REPORT);
    }

    return {
      id: snapshot.id,
      ...data,
    };
  } catch (error) {
    throw mapEcoReportFailure(error);
  }
}

// Reports are created only by Module 2 Finish Trip.
export async function getOrCreateEcoReport(tripId) {
  return getEcoReport(tripId);
}

export async function publishEcoReport(tripId) {
  try {
    const firebaseUser = await getLoggedInUser();
    const id = typeof tripId === "string" ? tripId.trim() : "";

    if (!id) {
      throw new EcoReportError(ECO_REPORT_ERROR.NOT_FOUND);
    }

    return await runTransaction(db, async (transaction) => {
      const reportRef = reportDocRef(id);
      const snapshot = await transaction.get(reportRef);

      if (!snapshot.exists()) {
        throw new EcoReportError(ECO_REPORT_ERROR.NOT_FOUND);
      }

      const data = snapshot.data();

      if (data.userId !== firebaseUser.uid) {
        throw new EcoReportError(ECO_REPORT_ERROR.UNAUTHORIZED);
      }

      if (data.source !== MODULE2_REPORT_SOURCE) {
        throw new EcoReportError(ECO_REPORT_ERROR.NOT_MODULE2_REPORT);
      }

      if (data.visibility === "public") {
        return {
          id: snapshot.id,
          ...data,
          alreadyPublic: true,
        };
      }

      const now = serverTimestamp();

      transaction.update(reportRef, {
        visibility: "public",
        publishedAt: now,
        updatedAt: now,
      });

      return {
        id: snapshot.id,
        ...data,
        visibility: "public",
        publishedAt: now,
        updatedAt: now,
        alreadyPublic: false,
      };
    });
  } catch (error) {
    throw mapEcoReportFailure(error);
  }
}
