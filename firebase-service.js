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
 * Save Score Record to Firestore Leaderboard using individual player tag doc ID (rollNumber|department|year)
 * @param {Object} scoreData { id, name, department, year, rollNumber, score, difficulty, cumulativeScore }
 */
export async function saveScoreToFirestore(scoreData) {
    try {
        const { rollNumber, department, year, id } = scoreData;
        let docId = `${rollNumber}|${department}|${year}`;
        if (!rollNumber || !department || !year) {
            docId = id || rollNumber || 'anonymous';
        }

        // Clean up any legacy auto-generated ID leaderboard docs for this player
        if (rollNumber) {
            try {
                const legacyQuery = query(
                    collection(db, "leaderboard"),
                    where("rollNumber", "==", rollNumber)
                );
                const legacySnap = await getDocs(legacyQuery);
                legacySnap.forEach(async (dSnap) => {
                    if (dSnap.id !== docId) {
                        await deleteDoc(doc(db, "leaderboard", dSnap.id)).catch(() => {});
                    }
                });
            } catch (e) { /* noop */ }
        }

        const docRef = doc(db, "leaderboard", docId);
        await setDoc(docRef, {
            name: scoreData.name || "Player",
            rollNumber: scoreData.rollNumber || "",
            department: scoreData.department || "",
            year: scoreData.year || "",
            difficulty: scoreData.difficulty || "medium",
            score: scoreData.score || 0,
            cumulativeScore: scoreData.cumulativeScore || 0,
            timestamp: serverTimestamp(),
            date: new Date().toLocaleDateString()
        }, { merge: true });
        console.log("Score saved to Firestore leaderboard with ID:", docId);
        return docId;
    } catch (e) {
        console.warn("Firestore save score error:", e);
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

export async function deleteScoreFromFirestore(target) {
    return await deletePlayerFromFirestore(target);
}

/**
 * Save or update cumulative player score to Firestore using individual player tag doc ID (rollNumber|department|year)
 * @param {Object} data { id, rollNumber, name, department, year, cumulativeScore }
 */
export async function saveCumulativeScoreToFirestore(data) {
    try {
        const { rollNumber, department, year, id } = data;
        let docId = `${rollNumber}|${department}|${year}`;
        if (!rollNumber || !department || !year) {
            docId = id || rollNumber || 'anonymous';
        }

        // Purge any legacy auto-generated ID docs in cumulativeScores for this roll number
        if (rollNumber) {
            try {
                const legacyQuery = query(
                    collection(db, "cumulativeScores"),
                    where("rollNumber", "==", rollNumber)
                );
                const legacySnap = await getDocs(legacyQuery);
                legacySnap.forEach(async (dSnap) => {
                    if (dSnap.id !== docId) {
                        await deleteDoc(doc(db, "cumulativeScores", dSnap.id)).catch(() => {});
                    }
                });
            } catch (e) { /* noop */ }
        }

        const docRef = doc(db, "cumulativeScores", docId);
        await setDoc(docRef, {
            name: data.name || "Player",
            rollNumber: data.rollNumber || "",
            department: data.department || "",
            year: data.year || "",
            cumulativeScore: data.cumulativeScore || 0,
            updatedAt: serverTimestamp()
        }, { merge: true });
        console.log("Cumulative score saved to Firestore for ID:", docId, "Score:", data.cumulativeScore);
    } catch (e) {
        console.warn("Firestore cumulative score save error:", e);
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
    const { rollNumber, department, year } = playerData;
    let docId = `${rollNumber}|${department}|${year}`;
    if (!rollNumber || !department || !year) {
        docId = playerData.id || rollNumber || 'anonymous';
    }

    // Purge any legacy auto-generated ID player docs for this roll number
    if (rollNumber) {
        try {
            const legacyQuery = query(
                collection(db, "players"),
                where("rollNumber", "==", rollNumber)
            );
            const legacySnap = await getDocs(legacyQuery);
            legacySnap.forEach(async (dSnap) => {
                if (dSnap.id !== docId) {
                    await deleteDoc(doc(db, "players", dSnap.id)).catch(() => {});
                }
            });
        } catch (e) { /* noop */ }
    }

    const docRef = doc(db, "players", docId);
    try {
        await setDoc(docRef, {
            name:        playerData.name        || "Player",
            phoneNumber: playerData.phoneNumber || "",
            department:  department             || "",
            year:        year                   || "",
            rollNumber:  rollNumber             || "",
            registeredAt: serverTimestamp()
        }, { merge: true });
        console.log("Player registered with ID:", docId);
        return docId;
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
 * Delete a Player Registration and ALL associated records by docId and/or player info
 * @param {String|Object} target docId string or player object { id, rollNumber, department, year }
 */
export async function deletePlayerFromFirestore(target) {
    if (!target) return false;
    let docId = typeof target === 'string' ? target : (target.id || '');
    let rollNumber = typeof target === 'object' ? (target.rollNumber || '') : '';
    let department = typeof target === 'object' ? (target.department || '') : '';
    let year       = typeof target === 'object' ? (target.year || '') : '';

    if (docId && docId.includes('|')) {
        const parts = docId.split('|');
        if (!rollNumber) rollNumber = parts[0];
        if (!department) department = parts[1];
        if (!year)       year       = parts[2];
    }

    try {
        const collections = ["players", "leaderboard", "cumulativeScores"];
        
        // 1. Delete by direct docId
        if (docId) {
            for (const col of collections) {
                await deleteDoc(doc(db, col, docId)).catch(() => {});
            }
        }

        // 2. Delete by constructed composite ID if rollNumber/dept/year exist
        if (rollNumber && department && year) {
            const compId = `${rollNumber}|${department}|${year}`;
            for (const col of collections) {
                await deleteDoc(doc(db, col, compId)).catch(() => {});
            }
        }

        // 3. Query & delete any matching documents by rollNumber across all collections
        if (rollNumber) {
            for (const col of collections) {
                try {
                    const q = query(collection(db, col), where("rollNumber", "==", rollNumber));
                    const snap = await getDocs(q);
                    const deletes = [];
                    snap.forEach(d => deletes.push(deleteDoc(d.ref)));
                    await Promise.all(deletes);
                } catch (e) {}
            }
        }

        console.log("Player completely deleted across Firestore collections for:", docId || rollNumber);
        return true;
    } catch (e) {
        console.warn("Firestore delete player error:", e);
        return false;
    }
}

/**
 * Delete ALL Player, Leaderboard, and Cumulative Score records from Firestore
 */
export async function clearAllDataFromFirestore() {
    try {
        const collectionsToClear = ["players", "leaderboard", "cumulativeScores"];
        for (const colName of collectionsToClear) {
            const snap = await getDocs(collection(db, colName));
            const promises = snap.docs.map(d => deleteDoc(d.ref));
            await Promise.all(promises);
        }
        console.log("All Firestore player & leaderboard data successfully cleared.");
        return true;
    } catch (e) {
        console.warn("Firestore clearAllData error:", e);
        return false;
    }
}


/**
 * Set Game Active state in Firestore
 * @param {boolean} isActive
 */
export async function setGameStateInFirestore(isActive) {
    try {
        await setDoc(doc(db, "system_config", "game_control"), {
            isGameActive: isActive,
            updatedAt: serverTimestamp()
        }, { merge: true });
        console.log("Game active state updated in Firestore:", isActive);
        return true;
    } catch (e) {
        console.warn("Firestore setGameState error:", e);
        return false;
    }
}

/**
 * Get current Game Active state from Firestore
 */
export async function getGameStateFromFirestore() {
    try {
        const docSnap = await getDoc(doc(db, "system_config", "game_control"));
        if (docSnap.exists() && typeof docSnap.data().isGameActive === 'boolean') {
            return docSnap.data().isGameActive;
        }
    } catch (e) {
        console.warn("Firestore getGameState error:", e);
    }
    return true; // Default active if document not present
}

/**
 * Subscribe to real-time Game Active state updates
 * @param {Function} callback Called with boolean (isActive)
 */
export function subscribeToGameState(callback) {
    try {
        return onSnapshot(doc(db, "system_config", "game_control"), (docSnap) => {
            if (docSnap.exists() && typeof docSnap.data().isGameActive === 'boolean') {
                callback(docSnap.data().isGameActive);
            } else {
                callback(true); // Default active
            }
        }, (error) => {
            console.warn("Game state snapshot error:", error);
            callback(true);
        });
    } catch (e) {
        console.warn("subscribeToGameState error:", e);
        callback(true);
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
    subscribeToActiveGameCount,
    saveCumulativeScoreToFirestore,
    setGameStateInFirestore,
    getGameStateFromFirestore,
    subscribeToGameState,
    clearAllDataFromFirestore
};

