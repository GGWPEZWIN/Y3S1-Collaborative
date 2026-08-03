import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from './firebase-config.json' with { type: 'json' };

// Initialize Firebase
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

console.log("Firebase Admin initialized successfully!");

// -------------------------- Test Firebase Admin SDK -----------------------------

// 3. Test Function to Write Data
async function testFirestoreConnection() {
try {
    console.log("Attempting to write test data to Firestore...");

    // This creates a collection called 'trips' and a document called 'test_trip'
    const docRef = db.collection('trips').doc('test_trip');
    
    //Test Data to Write to Firestore
    //await docRef.set({
    //  title: "Eco Tour in Taman Negara",
    //  location: "Pahang, Malaysia",
    //  sustainableRating: 5,
    //  activities: ["Canopy Walk", "Night Jungle Trekking"],
    //  createdAt: new Date()
    //});

    console.log("SUCCESS! Document successfully written to Firestore!");
  } catch (error) {
    console.error("ERROR writing to Firestore:", error);
  }
}

testFirestoreConnection();