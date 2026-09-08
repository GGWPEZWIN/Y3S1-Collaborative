import { db, auth } from "./config";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

// 1. Register Hotel Property Account
export async function registerHotelAccount({ hotelName, location, email, password }) {
  // Create user in Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Save metadata and role into Firestore "users" collection
  const usersRef = collection(db, "users");
  await addDoc(usersRef, {
    uid: user.uid,
    hotelName,
    location,
    email,
    role: "hotel",
    createdAt: serverTimestamp(),
  });

  return user;
}

// 2. Submit Certification Application Form
export async function submitCertificationApplication(formData) {
  const applicationsRef = collection(db, "hotel_applications");
  
  const docRef = await addDoc(applicationsRef, {
    ...formData,
    status: "Pending", // Default review status
    submittedAt: serverTimestamp(),
  });

  return docRef.id;
}

// 3. Get Applications for the Logged-in Hotel
export async function getHotelApplications(email) {
  const q = query(collection(db, "hotel_applications"), where("contactEmail", "==", email));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}