import { db, auth } from "./config";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import Tesseract from "tesseract.js";

// Helper: Convert File to Base64 Data URL (stored directly in Firestore without paid Storage)
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);

    // Safeguard for Firestore's 1MB document size limit
    if (file.size > 800 * 1024) {
      return reject(
        new Error(
          "File size exceeds 800KB. Cloud Firestore limits documents to 1MB. Please compress the file or choose a smaller image."
        )
      );
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// 1. Submit or update hotel certification application
export async function submitHotelApplication(formData, electricityBillFile, waterBillFile) {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be logged in.");

  let fraudCheckPassed = true;
  let fraudReason = "Passed automated checks";

  // --- Fraud Check (File Size Heuristic + OCR Scan) ---
  if (electricityBillFile) {
    if (electricityBillFile.size < 40 * 1024) {
      fraudCheckPassed = false;
      fraudReason = "Suspicious bill: Image file size is too small or low-resolution (< 40KB).";
    } else {
      try {
        const ocrResult = await Tesseract.recognize(electricityBillFile, "eng");
        const cleanText = (ocrResult?.data?.text || "").replace(/,/g, "");
        const targetUsage = String(formData.electricityUsage || "").trim();

        if (targetUsage && !cleanText.includes(targetUsage)) {
          fraudCheckPassed = false;
          fraudReason = `Discrepancy: Entered usage (${targetUsage} kWh) was not detected on uploaded bill.`;
        }
      } catch (err) {
        console.warn("OCR check warning:", err);
      }
    }
  }

  // Convert files to Base64 Data URLs
  let electricityBillUrl = null;
  let waterBillUrl = null;

  if (electricityBillFile) {
    electricityBillUrl = await fileToBase64(electricityBillFile);
  }
  if (waterBillFile) {
    waterBillUrl = await fileToBase64(waterBillFile);
  }

  const initialStatus = fraudCheckPassed ? "Pending Review" : "Flagged";

  // Set default certification expiration (1 year from now)
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const applicationData = {
    userId: user.uid,
    hotelName: formData.hotelName || "",
    address: formData.address || "",
    state: formData.state || "",
    rooms: Number(formData.rooms || formData.roomCount) || 0,
    contactEmail: formData.contactEmail || user.email || "",
    waterUsage: Number(formData.waterUsage) || 0,
    electricityUsage: Number(formData.electricityUsage) || 0,
    sustainabilityInitiatives: formData.sustainabilityInitiatives || "",
    status: initialStatus, // "Pending Review" | "Approved" | "Flagged" | "Rejected"
    fraudFlags: {
      hasSuspicion: !fraudCheckPassed,
      reason: fraudReason,
    },
    certificationTier: null, // No tier until Admin approves
    electricityBillUrl: electricityBillUrl || null,
    waterBillUrl: waterBillUrl || null,
    expiryDate: oneYearFromNow.toISOString(),
    violationsCount: 0,
    spotCheck: {
      required: !fraudCheckPassed,
      documentType: !fraudCheckPassed ? "Electricity Bill + Meter Photo" : "",
      status: !fraudCheckPassed ? "Pending" : "None",
    },
    updatedAt: serverTimestamp(),
  };

  // Write directly to the "hotel_applications" collection using user UID
  await setDoc(doc(db, "hotel_applications", user.uid), applicationData, { merge: true });

  // Update user doc flag
  await updateDoc(doc(db, "users", user.uid), {
    hasCompletedApplication: true,
  });

  return { status: initialStatus, reason: fraudReason };
}

// 2. Real-time listener for the hotel partner's dashboard
export function listenToHotelApplication(userId, callback) {
  const docRef = doc(db, "hotel_applications", userId);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    } else {
      callback(null);
    }
  });
}

// 3. Admin: Fetch all hotel applications
export async function getAllHotelApplications() {
  const snap = await getDocs(collection(db, "hotel_applications"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// 4. Admin: Update hotel application status and fields flexibly
export async function updateHotelStatus(hotelDocId, updateData) {
  const payload = typeof updateData === "object" ? updateData : { status: updateData };
  await updateDoc(doc(db, "hotel_applications", hotelDocId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

// 5. Submit Spot-Check or Renewal Evidence directly into Firestore via Base64
export async function uploadSpotCheckEvidence(userId, file, auditType = "spot_check") {
  if (!file) throw new Error("No file provided");

  // 1. Convert file to Base64 string
  const fileUrl = await fileToBase64(file);

  // 2. Add an entry to the hotel's audit subcollection
  const auditRef = collection(db, "hotel_applications", userId, "audits");
  await addDoc(auditRef, {
    type: auditType,
    fileName: file.name,
    fileUrl,
    uploadedAt: serverTimestamp(),
    status: "Submitted",
  });

  // 3. Update the main hotel application document
  await updateDoc(doc(db, "hotel_applications", userId), {
    "spotCheck.status": "Submitted",
    "spotCheck.submittedFileName": file.name,
    "spotCheck.submittedFileUrl": fileUrl,
    "spotCheck.submittedAt": serverTimestamp(),
  });

  return fileUrl;
}