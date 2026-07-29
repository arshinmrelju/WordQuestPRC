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
    where,
    limit, 
    onSnapshot,
    setDoc,
    getDoc,
    updateDoc,
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
            rollNumber: scoreData.rollNumber || "",
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

/**
 * Register a new player in the Firestore 'players' collection.
 * Returns the document ID of the newly created record.
 * @param {{ name, department, year, rollNumber }} playerData
 */
export async function registerPlayer(playerData) {
    try {
        const docRef = await addDoc(collection(db, "players"), {
            name:        playerData.name       || "Player",
            department:  playerData.department || "",
            year:        playerData.year       || "",
            rollNumber:  playerData.rollNumber || "",
            registeredAt: serverTimestamp()
        });
        console.log("Player registered with ID:", docRef.id);
        return docRef.id;
    } catch (e) {
        console.warn("Firestore registerPlayer error:", e);
        return null;
    }
}

/**
 * Look up an already-registered player by roll number + department + year.
 * Returns the player data object, or null if not found.
 * @param {string} rollNumber
 * @param {string} department
 * @param {string} year
 */
export async function getPlayerByRollNumber(rollNumber, department, year) {
    try {
        const q = query(
            collection(db, "players"),
            where("rollNumber",  "==", rollNumber),
            where("department",  "==", department),
            where("year",        "==", year),
            limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            const d = snap.docs[0];
            return { id: d.id, ...d.data() };
        }
        return null;
    } catch (e) {
        console.warn("Firestore getPlayerByRollNumber error:", e);
        return null;
    }
}

/**
 * Mark the player's document as active (game started)
 * Reads the player's Firestore doc ID from localStorage.
 */
export async function registerActiveGame() {
    const playerId = localStorage.getItem('wordQuest_playerFirestoreId');
    if (!playerId) return null;
    try {
        await updateDoc(doc(db, "players", playerId), {
            active: true,
            gameStartedAt: serverTimestamp()
        });
        console.log("Player marked active:", playerId);
        return playerId;
    } catch (e) {
        console.warn("Failed to mark player active:", e);
        return null;
    }
}

/**
 * Mark the player's document as inactive (game finished or left)
 */
export async function unregisterActiveGame() {
    const playerId = localStorage.getItem('wordQuest_playerFirestoreId');
    if (!playerId) return;
    try {
        await updateDoc(doc(db, "players", playerId), {
            active: false,
            gameStartedAt: null
        });
        console.log("Player marked inactive:", playerId);
    } catch (e) {
        console.warn("Failed to mark player inactive:", e);
    }
}

/**
 * Subscribe to the count of active players
 * @param {Function} callback Called with the live count (number)
 */
export function subscribeToActiveGameCount(callback) {
    try {
        const q = query(collection(db, "players"), where("active", "==", true));
        return onSnapshot(q, (snapshot) => {
            callback(snapshot.size);
        }, (error) => {
            console.warn("Active players snapshot error:", error);
        });
    } catch (e) {
        console.warn("subscribeToActiveGameCount error:", e);
    }
}

/**
 * Subscribe to Live Registered Players Updates
 * @param {Function} callback Callback with list of player objects
 */
export function subscribeToPlayers(callback) {
    try {
        const q = query(collection(db, "players"), limit(200));
        return onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                let regDate = data.registeredAt && data.registeredAt.toDate ? data.registeredAt.toDate().toLocaleDateString() : (new Date().toLocaleDateString());
                list.push({ id: docSnap.id, ...data, dateDisplay: regDate });
            });
            callback(list);
        }, (error) => {
            console.warn("Firestore players snapshot error:", error);
        });
    } catch (e) {
        console.warn("Firestore players subscription error:", e);
    }
}

/**
 * Delete a Player Registration Record from Firestore
 * @param {String} docId Document ID to delete
 */
export async function deletePlayerFromFirestore(docId) {
    if (!docId) return;
    try {
        await deleteDoc(doc(db, "players", docId));
        console.log("Player document deleted from Firestore:", docId);
    } catch (e) {
        console.warn("Firestore delete player error:", e);
    }
}

// Make available globally for non-module scripts if needed
window.WordQuestFirebase = {
    app,
    db,
    saveScoreToFirestore,
    subscribeToLeaderboard,
    deleteScoreFromFirestore,
    saveWordBankToFirestore,
    getWordBankFromFirestore,
    registerPlayer,
    getPlayerByRollNumber,
    subscribeToPlayers,
    deletePlayerFromFirestore,
    registerActiveGame,
    unregisterActiveGame,
    subscribeToActiveGameCount
};

