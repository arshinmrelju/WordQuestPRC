/**
 * WORD QUEST — Firebase Firestore Integration Service
 * Configured for project: wordquestprc
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    deleteDoc, 
    query, 
    orderBy, 
    limit, 
    onSnapshot,
    setDoc,
    getDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAD6Fxs22nbzFhm__70CPpRpcpQLEbT2Q",
  authDomain: "wordquestprc.firebaseapp.com",
  projectId: "wordquestprc",
  storageBucket: "wordquestprc.firebasestorage.app",
  messagingSenderId: "613220919561",
  appId: "1:613220919561:web:c2a98ce61f1e9488a60bd8",
  measurementId: "G-RW0WJNB5LY"
};

// Initialize Firebase App & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Save Score Record to Firestore Leaderboard
 * @param {Object} scoreData { name, department, year, score, difficulty }
 */
export async function saveScoreToFirestore(scoreData) {
    try {
        const docRef = await addDoc(collection(db, "leaderboard"), {
            name: scoreData.name || "Player",
            department: scoreData.department || "",
            year: scoreData.year || "",
            difficulty: scoreData.difficulty || "medium",
            score: scoreData.score || 0,
            timestamp: serverTimestamp(),
            date: new Date().toLocaleDateString()
        });
        console.log("Score saved to Firestore with ID:", docRef.id);
        return docRef.id;
    } catch (e) {
        console.warn("Firestore save score error (falling back to LocalStorage):", e);
        return null;
    }
}

/**
 * Subscribe to Live Firestore Leaderboard Updates
 * @param {Function} callback Callback with list of leaderboard objects
 */
export function subscribeToLeaderboard(callback) {
    try {
        const q = query(collection(db, "leaderboard"), orderBy("score", "desc"), limit(100));
        return onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            callback(list);
        }, (error) => {
            console.warn("Firestore leaderboard snapshot error:", error);
        });
    } catch (e) {
        console.warn("Firestore subscription error:", e);
    }
}

/**
 * Delete a Score Record from Firestore
 * @param {String} docId Document ID to delete
 */
export async function deleteScoreFromFirestore(docId) {
    if (!docId) return;
    try {
        await deleteDoc(doc(db, "leaderboard", docId));
        console.log("Document deleted from Firestore:", docId);
    } catch (e) {
        console.warn("Firestore delete document error:", e);
    }
}

/**
 * Save Custom Word Bank to Firestore
 * @param {Array} words Array of string words
 */
export async function saveWordBankToFirestore(words) {
    try {
        await setDoc(doc(db, "system_config", "word_bank"), {
            words: words,
            updatedAt: serverTimestamp()
        });
        console.log("Word bank updated in Firestore.");
    } catch (e) {
        console.warn("Firestore word bank save error:", e);
    }
}

/**
 * Get Custom Word Bank from Firestore
 */
export async function getWordBankFromFirestore() {
    try {
        const docSnap = await getDoc(doc(db, "system_config", "word_bank"));
        if (docSnap.exists() && docSnap.data().words) {
            return docSnap.data().words;
        }
    } catch (e) {
        console.warn("Firestore word bank fetch error:", e);
    }
    return null;
}

// Make available globally for non-module scripts if needed
window.WordQuestFirebase = {
    app,
    db,
    saveScoreToFirestore,
    subscribeToLeaderboard,
    deleteScoreFromFirestore,
    saveWordBankToFirestore,
    getWordBankFromFirestore
};
