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

// 1. Submit or update hotel certification application (Supporting 3-month records / 6 files)
export async function submitHotelApplication(formData, elecFiles = {}, waterFiles = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be logged in.");

  let fraudCheckPassed = true;
  let fraudReason = "Passed automated checks";

  // --- Fraud Check using Month 1 Electricity Bill ---
  const primaryElecFile = elecFiles.m1_file || elecFiles; // backwards compatibility if passed as a single file
  if (primaryElecFile && typeof primaryElecFile.size === "number") {
    if (primaryElecFile.size < 40 * 1024) {
      fraudCheckPassed = false;
      fraudReason = "Suspicious bill: Image file size is too small or low-resolution (< 40KB).";
    } else {
      try {
        const ocrResult = await Tesseract.recognize(primaryElecFile, "eng");
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

  // Convert all 6 monthly files to Base64 Data URLs
  const elecM1Url = elecFiles.m1_file ? await fileToBase64(elecFiles.m1_file) : (typeof elecFiles.size === "number" ? await fileToBase64(elecFiles) : null);
  const elecM2Url = elecFiles.m2_file ? await fileToBase64(elecFiles.m2_file) : null;
  const elecM3Url = elecFiles.m3_file ? await fileToBase64(elecFiles.m3_file) : null;

  const waterM1Url = waterFiles.m1_file ? await fileToBase64(waterFiles.m1_file) : (waterFiles.name ? await fileToBase64(waterFiles) : null);
  const waterM2Url = waterFiles.m2_file ? await fileToBase64(waterFiles.m2_file) : null;
  const waterM3Url = waterFiles.m3_file ? await fileToBase64(waterFiles.m3_file) : null;

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
    status: initialStatus,
    fraudFlags: {
      hasSuspicion: !fraudCheckPassed,
      reason: fraudReason,
    },
    certificationTier: null,
    
    // Store individual URLs so AdminReview can render all 6 files explicitly
    electricityBillUrl: elecM1Url || null,
    waterBillUrl: waterM1Url || null,
    
    electricityBillM1Url: elecM1Url || null,
    electricityBillM2Url: elecM2Url || null,
    electricityBillM3Url: elecM3Url || null,
    waterBillM1Url: waterM1Url || null,
    waterBillM2Url: waterM2Url || null,
    waterBillM3Url: waterM3Url || null,

    threeMonthRecords: formData.threeMonthRecords || {},
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