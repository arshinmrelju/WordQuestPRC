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

const globalConfig = (typeof window !== 'undefined' && window.WORD_QUEST_CONFIG)
    ? window.WORD_QUEST_CONFIG
    : {};
const firebaseConfig = globalConfig.firebase || {};

if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_FIREBASE_API_KEY_HERE") {
    console.error(
        "[Word Quest] Firebase config is missing. " +
        "Copy firebase-config.example.js to firebase-config.js " +
        "and fill in your Firebase project credentials."
    );
}

const app = firebaseConfig.apiKey && firebaseConfig.projectId
    ? initializeApp(firebaseConfig)
    : null;
const db = app ? getFirestore(app) : null;

// ============================================================================
// FIRESTORE USAGE TRACKER & TELEMETRY SYSTEM
// ============================================================================
const STORAGE_KEY_USAGE_HISTORY = 'wordQuest_firestoreUsageHistory';
const STORAGE_KEY_USAGE_DAILY   = 'wordQuest_firestoreUsageDaily';
const MAX_HISTORY_EVENTS        = 1000;

// Daily limits for Firebase Spark (Free Tier) plan
export const SPARK_PLAN_LIMITS = {
    readsPerDay: 50000,
    writesPerDay: 20000,
    deletesPerDay: 20000,
    storageBytes: 1073741824 // 1 GB
};

class UsageTracker {
    constructor() {
        this.listeners = new Set();
        this.activeListenersCount = 0;
        this.channel = null;
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                this.channel = new BroadcastChannel('wordquest_firestore_usage');
                this.channel.onmessage = (event) => {
                    if (event && event.data && event.data.type === 'NEW_USAGE_EVENT') {
                        this._notifyListeners(event.data.payload);
                    } else if (event && event.data && event.data.type === 'USAGE_CLEARED') {
                        this._notifyListeners({ type: 'CLEARED' });
                    }
                };
            }
        } catch (e) {}

        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (e) => {
                if (e.key === STORAGE_KEY_USAGE_HISTORY || e.key === STORAGE_KEY_USAGE_DAILY) {
                    this._notifyListeners({ type: 'STORAGE_UPDATE' });
                }
            });
        }
    }

    _getOrigin() {
        if (typeof window === 'undefined' || !window.location) return 'Client';
        const path = (window.location.pathname || '').toLowerCase();
        if (path.includes('admin.html')) return 'Admin Panel';
        if (path.includes('game.html')) return 'Game Client';
        return 'Registration';
    }

    _getTodayKey() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    track({
        type = 'READ', // 'READ' | 'WRITE' | 'DELETE' | 'SNAPSHOT'
        collection = 'unknown',
        docId = '—',
        operation = 'unknown',
        origin = null,
        docCount = 1,
        durationMs = 0,
        status = 'SUCCESS',
        error = null,
        details = null
    }) {
        const now = new Date();
        const resolvedOrigin = origin || this._getOrigin();
        const eventId = 'op_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateFormatted = now.toLocaleDateString();

        const logEntry = {
            id: eventId,
            timestamp: now.getTime(),
            timeStr: timeFormatted,
            dateStr: dateFormatted,
            type: type.toUpperCase(),
            collection,
            docId: typeof docId === 'string' ? docId : JSON.stringify(docId),
            operation,
            origin: resolvedOrigin,
            docCount: Math.max(1, Number(docCount) || 1),
            durationMs: Math.max(1, Math.round(durationMs || 0)),
            status: status.toUpperCase(),
            error: error ? (error.message || String(error)) : null,
            details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null
        };

        // 1. Update Daily Aggregation
        this._updateDailyStats(logEntry);

        // 2. Update History in localStorage
        try {
            const rawHistory = localStorage.getItem(STORAGE_KEY_USAGE_HISTORY);
            const history = rawHistory ? JSON.parse(rawHistory) : [];
            history.unshift(logEntry);
            if (history.length > MAX_HISTORY_EVENTS) {
                history.length = MAX_HISTORY_EVENTS;
            }
            localStorage.setItem(STORAGE_KEY_USAGE_HISTORY, JSON.stringify(history));
        } catch (e) {
            console.warn('[UsageTracker] Failed saving history to localStorage:', e);
        }

        // 3. Broadcast to other tabs
        if (this.channel) {
            try {
                this.channel.postMessage({ type: 'NEW_USAGE_EVENT', payload: logEntry });
            } catch (e) {}
        }

        // 4. Notify local listeners
        this._notifyListeners(logEntry);

        return logEntry;
    }

    _updateDailyStats(entry) {
        try {
            const todayKey = this._getTodayKey();
            const rawDaily = localStorage.getItem(STORAGE_KEY_USAGE_DAILY);
            const dailyData = rawDaily ? JSON.parse(rawDaily) : {};
            if (!dailyData[todayKey]) {
                dailyData[todayKey] = {
                    date: todayKey,
                    reads: 0,
                    writes: 0,
                    deletes: 0,
                    snapshots: 0,
                    totalOps: 0,
                    errors: 0,
                    byCollection: {}
                };
            }
            const day = dailyData[todayKey];
            const count = entry.docCount || 1;
            if (entry.type === 'READ' || entry.type === 'SNAPSHOT') {
                day.reads += count;
                if (entry.type === 'SNAPSHOT') day.snapshots += 1;
            } else if (entry.type === 'WRITE') {
                day.writes += count;
            } else if (entry.type === 'DELETE') {
                day.deletes += count;
            }

            day.totalOps += 1;
            if (entry.status === 'ERROR') day.errors += 1;

            // by collection
            const col = entry.collection || 'other';
            if (!day.byCollection[col]) {
                day.byCollection[col] = { reads: 0, writes: 0, deletes: 0, total: 0 };
            }
            if (entry.type === 'READ' || entry.type === 'SNAPSHOT') day.byCollection[col].reads += count;
            else if (entry.type === 'WRITE') day.byCollection[col].writes += count;
            else if (entry.type === 'DELETE') day.byCollection[col].deletes += count;
            day.byCollection[col].total += 1;

            localStorage.setItem(STORAGE_KEY_USAGE_DAILY, JSON.stringify(dailyData));
        } catch (e) {
            console.warn('[UsageTracker] Daily stats update error:', e);
        }
    }

    getHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_USAGE_HISTORY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    getDailyStats(dateStr) {
        const key = dateStr || this._getTodayKey();
        try {
            const raw = localStorage.getItem(STORAGE_KEY_USAGE_DAILY);
            const data = raw ? JSON.parse(raw) : {};
            return data[key] || {
                date: key,
                reads: 0,
                writes: 0,
                deletes: 0,
                snapshots: 0,
                totalOps: 0,
                errors: 0,
                byCollection: {}
            };
        } catch (e) {
            return {
                date: key,
                reads: 0,
                writes: 0,
                deletes: 0,
                snapshots: 0,
                totalOps: 0,
                errors: 0,
                byCollection: {}
            };
        }
    }

    getAllTimeStats() {
        const history = this.getHistory();
        let reads = 0, writes = 0, deletes = 0, snapshots = 0, errors = 0;
        const byCollection = {};

        history.forEach(item => {
            const count = item.docCount || 1;
            if (item.type === 'READ' || item.type === 'SNAPSHOT') {
                reads += count;
                if (item.type === 'SNAPSHOT') snapshots++;
            } else if (item.type === 'WRITE') {
                writes += count;
            } else if (item.type === 'DELETE') {
                deletes += count;
            }
            if (item.status === 'ERROR') errors++;

            const col = item.collection || 'other';
            if (!byCollection[col]) byCollection[col] = { reads: 0, writes: 0, deletes: 0, total: 0 };
            if (item.type === 'READ' || item.type === 'SNAPSHOT') byCollection[col].reads += count;
            else if (item.type === 'WRITE') byCollection[col].writes += count;
            else if (item.type === 'DELETE') byCollection[col].deletes += count;
            byCollection[col].total += 1;
        });

        return {
            totalOps: history.length,
            reads,
            writes,
            deletes,
            snapshots,
            errors,
            byCollection
        };
    }

    clearHistory() {
        try {
            localStorage.removeItem(STORAGE_KEY_USAGE_HISTORY);
            localStorage.removeItem(STORAGE_KEY_USAGE_DAILY);
        } catch (e) {}
        if (this.channel) {
            try { this.channel.postMessage({ type: 'USAGE_CLEARED' }); } catch (e) {}
        }
        this._notifyListeners({ type: 'CLEARED' });
    }

    subscribe(callback) {
        if (typeof callback !== 'function') return () => {};
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    _notifyListeners(data) {
        this.listeners.forEach(cb => {
            try { cb(data); } catch (e) { console.error(e); }
        });
    }

    registerActiveListener() {
        this.activeListenersCount++;
    }

    unregisterActiveListener() {
        this.activeListenersCount = Math.max(0, this.activeListenersCount - 1);
    }

    getActiveListenersCount() {
        return this.activeListenersCount;
    }
}

export const firestoreUsageTracker = new UsageTracker();

/**
 * Perform a test Ping to measure round-trip Firestore read & write latency
 */
export async function testFirestorePing() {
    if (!db) {
        firestoreUsageTracker.track({
            type: 'READ',
            collection: 'system_config',
            docId: 'ping_test',
            operation: 'testFirestorePing',
            docCount: 1,
            durationMs: 0,
            status: 'ERROR',
            error: 'Firestore is not initialized.'
        });
        return { success: false, error: 'Firestore is not initialized.' };
    }
    const t0 = performance.now();
    try {
        const pingRef = doc(db, "system_config", "ping_test");
        await setDoc(pingRef, {
            pingAt: serverTimestamp(),
            clientTime: Date.now()
        }, { merge: true });
        const writeLatency = performance.now() - t0;
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'system_config',
            docId: 'ping_test',
            operation: 'testFirestorePing (Write)',
            docCount: 1,
            durationMs: writeLatency,
            status: 'SUCCESS'
        });

        const t1 = performance.now();
        const snap = await getDoc(pingRef);
        const readLatency = performance.now() - t1;
        firestoreUsageTracker.track({
            type: 'READ',
            collection: 'system_config',
            docId: 'ping_test',
            operation: 'testFirestorePing (Read)',
            docCount: 1,
            durationMs: readLatency,
            status: 'SUCCESS',
            details: snap.exists() ? 'Doc exists' : 'Doc not found'
        });

        return {
            success: true,
            totalLatency: Math.round(performance.now() - t0),
            writeLatency: Math.round(writeLatency),
            readLatency: Math.round(readLatency)
        };
    } catch (err) {
        const errLatency = performance.now() - t0;
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'system_config',
            docId: 'ping_test',
            operation: 'testFirestorePing',
            docCount: 1,
            durationMs: errLatency,
            status: 'ERROR',
            error: err
        });
        return { success: false, error: err.message || String(err) };
    }
}

/**
 * Save Score Record to Firestore Leaderboard using individual player tag doc ID (rollNumber|department|year)
 * @param {Object} scoreData { id, name, department, year, rollNumber, score, difficulty, cumulativeScore }
 */
export async function saveScoreToFirestore(scoreData) {
    const t0 = performance.now();
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
                firestoreUsageTracker.track({
                    type: 'READ',
                    collection: 'leaderboard',
                    docId: `rollNumber==${rollNumber}`,
                    operation: 'saveScoreToFirestore (Legacy Cleanup Check)',
                    docCount: legacySnap.size || 1,
                    durationMs: performance.now() - t0,
                    status: 'SUCCESS'
                });
                legacySnap.forEach(async (dSnap) => {
                    if (dSnap.id !== docId) {
                        const td = performance.now();
                        await deleteDoc(doc(db, "leaderboard", dSnap.id)).catch(() => {});
                        firestoreUsageTracker.track({
                            type: 'DELETE',
                            collection: 'leaderboard',
                            docId: dSnap.id,
                            operation: 'saveScoreToFirestore (Legacy Cleanup Delete)',
                            docCount: 1,
                            durationMs: performance.now() - td,
                            status: 'SUCCESS'
                        });
                    }
                });
            } catch (e) { /* noop */ }
        }

        const tWrite = performance.now();
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

        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'leaderboard',
            docId,
            operation: 'saveScoreToFirestore',
            docCount: 1,
            durationMs: performance.now() - tWrite,
            status: 'SUCCESS',
            details: { score: scoreData.score, cumulativeScore: scoreData.cumulativeScore }
        });

        console.log("Score saved to Firestore leaderboard with ID:", docId);
        return docId;
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'leaderboard',
            docId: scoreData ? scoreData.rollNumber : 'unknown',
            operation: 'saveScoreToFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Firestore save score error:", e);
        return null;
    }
}

/**
 * Subscribe to Live Firestore Leaderboard Updates
 * @param {Function} callback Callback with list of leaderboard objects
 */
export function subscribeToLeaderboard(callback) {
    firestoreUsageTracker.registerActiveListener();
    let isInitial = true;
    try {
        const q = query(collection(db, "leaderboard"), orderBy("score", "desc"), limit(100));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });

            const docCount = isInitial ? (snapshot.size || 1) : Math.max(1, snapshot.docChanges().length);
            firestoreUsageTracker.track({
                type: 'SNAPSHOT',
                collection: 'leaderboard',
                docId: 'leaderboard (Query limit: 100)',
                operation: isInitial ? 'subscribeToLeaderboard (Initial Load)' : 'subscribeToLeaderboard (Real-Time Update)',
                docCount,
                durationMs: 15,
                status: 'SUCCESS',
                details: { totalLoaded: list.length }
            });
            isInitial = false;

            callback(list);
        }, (error) => {
            firestoreUsageTracker.track({
                type: 'SNAPSHOT',
                collection: 'leaderboard',
                docId: 'leaderboard',
                operation: 'subscribeToLeaderboard',
                docCount: 1,
                status: 'ERROR',
                error
            });
            console.warn("Firestore leaderboard snapshot error:", error);
        });

        return () => {
            firestoreUsageTracker.unregisterActiveListener();
            if (typeof unsub === 'function') unsub();
        };
    } catch (e) {
        firestoreUsageTracker.unregisterActiveListener();
        console.warn("Firestore subscription error:", e);
        return () => {};
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
    const t0 = performance.now();
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
                firestoreUsageTracker.track({
                    type: 'READ',
                    collection: 'cumulativeScores',
                    docId: `rollNumber==${rollNumber}`,
                    operation: 'saveCumulativeScoreToFirestore (Legacy Check)',
                    docCount: legacySnap.size || 1,
                    durationMs: performance.now() - t0,
                    status: 'SUCCESS'
                });
                legacySnap.forEach(async (dSnap) => {
                    if (dSnap.id !== docId) {
                        const td = performance.now();
                        await deleteDoc(doc(db, "cumulativeScores", dSnap.id)).catch(() => {});
                        firestoreUsageTracker.track({
                            type: 'DELETE',
                            collection: 'cumulativeScores',
                            docId: dSnap.id,
                            operation: 'saveCumulativeScoreToFirestore (Legacy Delete)',
                            docCount: 1,
                            durationMs: performance.now() - td,
                            status: 'SUCCESS'
                        });
                    }
                });
            } catch (e) { /* noop */ }
        }

        const tWrite = performance.now();
        const docRef = doc(db, "cumulativeScores", docId);
        await setDoc(docRef, {
            name: data.name || "Player",
            rollNumber: data.rollNumber || "",
            department: data.department || "",
            year: data.year || "",
            cumulativeScore: data.cumulativeScore || 0,
            updatedAt: serverTimestamp()
        }, { merge: true });

        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'cumulativeScores',
            docId,
            operation: 'saveCumulativeScoreToFirestore',
            docCount: 1,
            durationMs: performance.now() - tWrite,
            status: 'SUCCESS',
            details: { cumulativeScore: data.cumulativeScore }
        });

        console.log("Cumulative score saved to Firestore for ID:", docId, "Score:", data.cumulativeScore);
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'cumulativeScores',
            docId: data ? data.rollNumber : 'unknown',
            operation: 'saveCumulativeScoreToFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Firestore cumulative score save error:", e);
    }
}

/**
 * Read the player's true cumulative score from the cumulativeScores collection
 * (the authoritative running total across all devices), or 0 if not found.
 * @param {string} rollNumber
 * @param {string} department
 * @param {string} year
 */
export async function getCumulativeScoreFromFirestore(rollNumber, department, year) {
    if (!rollNumber || !department || !year) return 0;
    const t0 = performance.now();
    const docId = `${rollNumber}|${department}|${year}`;
    try {
        const docRef = doc(db, "cumulativeScores", docId);
        const snap = await getDoc(docRef);
        firestoreUsageTracker.track({
            type: 'READ',
            collection: 'cumulativeScores',
            docId,
            operation: 'getCumulativeScoreFromFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS'
        });
        if (snap.exists()) {
            const d = snap.data();
            return Number(d.cumulativeScore) || 0;
        }
        return 0;
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'READ',
            collection: 'cumulativeScores',
            docId,
            operation: 'getCumulativeScoreFromFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Firestore getCumulativeScore error:", e);
        return 0;
    }
}

/**
 * Save Custom Word Bank to Firestore
 * @param {Array} words Array of string words
 */
export async function saveWordBankToFirestore(words) {
    const t0 = performance.now();
    try {
        await setDoc(doc(db, "system_config", "word_bank"), {
            words: words,
            updatedAt: serverTimestamp()
        });
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'system_config',
            docId: 'word_bank',
            operation: 'saveWordBankToFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS',
            details: { count: Array.isArray(words) ? words.length : 0 }
        });
        console.log("Word bank updated in Firestore.");
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'system_config',
            docId: 'word_bank',
            operation: 'saveWordBankToFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Firestore word bank save error:", e);
    }
}

/**
 * Get Custom Word Bank from Firestore
 */
export async function getWordBankFromFirestore() {
    const t0 = performance.now();
    try {
        const docSnap = await getDoc(doc(db, "system_config", "word_bank"));
        firestoreUsageTracker.track({
            type: 'READ',
            collection: 'system_config',
            docId: 'word_bank',
            operation: 'getWordBankFromFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS'
        });
        if (docSnap.exists() && docSnap.data().words) {
            return docSnap.data().words;
        }
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'READ',
            collection: 'system_config',
            docId: 'word_bank',
            operation: 'getWordBankFromFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
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
    const t0 = performance.now();
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
            firestoreUsageTracker.track({
                type: 'READ',
                collection: 'players',
                docId: `rollNumber==${rollNumber}`,
                operation: 'registerPlayer (Legacy Check)',
                docCount: legacySnap.size || 1,
                durationMs: performance.now() - t0,
                status: 'SUCCESS'
            });
            legacySnap.forEach(async (dSnap) => {
                if (dSnap.id !== docId) {
                    const td = performance.now();
                    await deleteDoc(doc(db, "players", dSnap.id)).catch(() => {});
                    firestoreUsageTracker.track({
                        type: 'DELETE',
                        collection: 'players',
                        docId: dSnap.id,
                        operation: 'registerPlayer (Legacy Cleanup)',
                        docCount: 1,
                        durationMs: performance.now() - td,
                        status: 'SUCCESS'
                    });
                }
            });
        } catch (e) { /* noop */ }
    }

    const tWrite = performance.now();
    const docRef = doc(db, "players", docId);
    try {
        await setDoc(docRef, {
            name:        playerData.name        || "Player",
            phoneNumber: playerData.phoneNumber || "",
            department:  department             || "",
            year:        year                   || "",
            rollNumber:  rollNumber             || "",
            active:      false,
            registeredAt: serverTimestamp()
        }, { merge: true });

        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'players',
            docId,
            operation: 'registerPlayer',
            docCount: 1,
            durationMs: performance.now() - tWrite,
            status: 'SUCCESS',
            details: { name: playerData.name, rollNumber }
        });

        console.log("Player registered with ID:", docId);
        return docId;
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'players',
            docId,
            operation: 'registerPlayer',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
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
    const t0 = performance.now();
    try {
        const q = query(
            collection(db, "players"),
            where("rollNumber",  "==", rollNumber),
            where("department",  "==", department),
            where("year",        "==", year),
            limit(1)
        );
        const snap = await getDocs(q);
        firestoreUsageTracker.track({
            type: 'READ',
            collection: 'players',
            docId: `lookup:${rollNumber}|${department}|${year}`,
            operation: 'getPlayerByRollNumber',
            docCount: snap.size || 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS'
        });
        if (!snap.empty) {
            const d = snap.docs[0];
            return { id: d.id, ...d.data() };
        }
        return null;
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'READ',
            collection: 'players',
            docId: `lookup:${rollNumber}`,
            operation: 'getPlayerByRollNumber',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Firestore getPlayerByRollNumber error:", e);
        return null;
    }
}

/**
 * Mark the player's document as active (game started) with level and score tracking
 * Reads the player's Firestore doc ID from localStorage.
 * @param {Object} levelData Optional { level, levelTitle, score, cumulativeScore }
 */
export async function registerActiveGame(levelData = {}) {
    const playerId = localStorage.getItem('wordQuest_playerFirestoreId');
    if (!playerId) return null;
    const t0 = performance.now();
    try {
        const payload = {
            active: true,
            gameStartedAt: serverTimestamp(),
            lastActiveAt: serverTimestamp()
        };
        if (levelData && typeof levelData.level === 'number') {
            payload.currentLevel = levelData.level;
            payload.levelTitle = levelData.levelTitle || 'Novice';
            payload.score = levelData.score || 0;
            payload.cumulativeScore = levelData.cumulativeScore || 0;
        }
        await updateDoc(doc(db, "players", playerId), payload);
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'players',
            docId: playerId,
            operation: 'registerActiveGame',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS',
            details: levelData
        });
        console.log("Player marked active:", playerId, levelData);
        return playerId;
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'players',
            docId: playerId,
            operation: 'registerActiveGame',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Failed to mark player active:", e);
        return null;
    }
}

/**
 * Update the player's level progress in Firestore in real-time
 * @param {Object} levelData { level, levelTitle, score, cumulativeScore }
 */
export async function updatePlayerLevelInFirestore(levelData = {}) {
    const playerId = localStorage.getItem('wordQuest_playerFirestoreId');
    if (!playerId) return null;
    const t0 = performance.now();
    try {
        const { level = 1, levelTitle = 'Novice', score = 0, cumulativeScore = 0 } = levelData;
        await updateDoc(doc(db, "players", playerId), {
            active: true,
            currentLevel: level,
            levelTitle: levelTitle,
            score: score,
            cumulativeScore: cumulativeScore,
            lastActiveAt: serverTimestamp()
        });
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'players',
            docId: playerId,
            operation: 'updatePlayerLevelInFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS',
            details: { level, score, cumulativeScore }
        });
        console.log("Updated player level in Firestore:", playerId, "Lvl:", level, levelTitle);
        return playerId;
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'players',
            docId: playerId,
            operation: 'updatePlayerLevelInFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Failed to update player level in Firestore:", e);
        return null;
    }
}

/**
 * Sync the player's active 2D grid matrix, target words, and found words to Firestore for live spectating
 * @param {Object} gridData { grid, words, placed, foundWords, gridSize, remainingSeconds, score, level, levelTitle, bankedCumulative }
 */
export async function syncLiveGridToFirestore(gridData = {}) {
    const playerId = localStorage.getItem('wordQuest_playerFirestoreId');
    if (!playerId || !gridData) return null;
    const t0 = performance.now();
    try {
        const { grid, words, placed, foundWords, gridSize, remainingSeconds, score, level, levelTitle, bankedCumulative } = gridData;
        const gridRows = Array.isArray(grid)
            ? grid.map(row => (Array.isArray(row) ? row.join('') : String(row ?? '')))
            : [];
        await updateDoc(doc(db, "players", playerId), {
            liveState: {
                grid: gridRows,
                words: words || [],
                placed: placed || {},
                foundWords: foundWords || [],
                gridSize: gridSize || 12,
                remainingSeconds: typeof remainingSeconds === 'number' ? remainingSeconds : null,
                score: score || 0,
                level: level || 1,
                levelTitle: levelTitle || 'Novice',
                bankedCumulative: typeof bankedCumulative === 'number' ? bankedCumulative : null,
                updatedAt: serverTimestamp()
            }
        });
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'players',
            docId: playerId,
            operation: 'syncLiveGridToFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS',
            details: { foundWordsCount: (foundWords || []).length, score }
        });
        console.log("Live grid synced to Firestore for player:", playerId);
        return playerId;
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'players',
            docId: playerId,
            operation: 'syncLiveGridToFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Failed to sync live grid to Firestore:", e);
        return null;
    }
}

/**
 * Subscribe to a specific live player's Firestore document (for real-time spectator mode)
 * @param {string} playerId 
 * @param {Function} callback 
 */
export function subscribeToPlayerLiveGrid(playerId, callback) {
    if (!playerId) return () => {};
    firestoreUsageTracker.registerActiveListener();
    try {
        const unsub = onSnapshot(doc(db, "players", playerId), (docSnap) => {
            firestoreUsageTracker.track({
                type: 'SNAPSHOT',
                collection: 'players',
                docId: playerId,
                operation: 'subscribeToPlayerLiveGrid',
                docCount: 1,
                durationMs: 12,
                status: 'SUCCESS'
            });
            if (docSnap.exists()) {
                callback({ id: docSnap.id, ...docSnap.data() });
            }
        }, (error) => {
            firestoreUsageTracker.track({
                type: 'SNAPSHOT',
                collection: 'players',
                docId: playerId,
                operation: 'subscribeToPlayerLiveGrid',
                docCount: 1,
                status: 'ERROR',
                error
            });
            console.warn("Spectator snapshot error for player:", playerId, error);
        });

        return () => {
            firestoreUsageTracker.unregisterActiveListener();
            if (typeof unsub === 'function') unsub();
        };
    } catch (e) {
        firestoreUsageTracker.unregisterActiveListener();
        console.warn("subscribeToPlayerLiveGrid error:", e);
        return () => {};
    }
}

/**
 * Mark the player's document as inactive (game finished or left)
 */
export async function unregisterActiveGame() {
    const playerId = localStorage.getItem('wordQuest_playerFirestoreId');
    if (!playerId) return;
    const t0 = performance.now();
    try {
        await updateDoc(doc(db, "players", playerId), {
            active: false,
            liveState: null
        });
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'players',
            docId: playerId,
            operation: 'unregisterActiveGame',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS'
        });
        console.log("Player marked inactive:", playerId);
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'players',
            docId: playerId,
            operation: 'unregisterActiveGame',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Failed to mark player inactive:", e);
    }
}

/**
 * Subscribe to the count of players actively playing in game.html
 * @param {Function} callback Called with the live count (number)
 */
const LIVE_STALE_MS = 25000;

function firestoreTimestampToMillis(ts) {
    if (!ts) return null;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') return Date.parse(ts);
    return null;
}

function isLiveDocFresh(data) {
    const liveState = data && data.liveState;
    if (!liveState) return false;
    const stamp = firestoreTimestampToMillis(liveState.updatedAt) || firestoreTimestampToMillis(data.lastActiveAt);
    return stamp !== null && (Date.now() - stamp) < LIVE_STALE_MS;
}

export function subscribeToActiveGameCount(callback) {
    firestoreUsageTracker.registerActiveListener();
    let isInitial = true;
    try {
        const q = query(collection(db, "players"), where("active", "==", true));
        const unsub = onSnapshot(q, (snapshot) => {
            const liveInGame = snapshot.docs.filter(d => {
                const data = d.data();
                return data.liveState && Array.isArray(data.liveState.grid) && data.liveState.grid.length > 0 && isLiveDocFresh(data);
            });

            firestoreUsageTracker.track({
                type: 'SNAPSHOT',
                collection: 'players',
                docId: 'players (active==true)',
                operation: isInitial ? 'subscribeToActiveGameCount (Initial)' : 'subscribeToActiveGameCount (Update)',
                docCount: isInitial ? (snapshot.size || 1) : Math.max(1, snapshot.docChanges().length),
                durationMs: 14,
                status: 'SUCCESS',
                details: { activeInGame: liveInGame.length }
            });
            isInitial = false;

            callback(liveInGame.length);
        }, (error) => {
            firestoreUsageTracker.track({
                type: 'SNAPSHOT',
                collection: 'players',
                docId: 'players (active==true)',
                operation: 'subscribeToActiveGameCount',
                docCount: 1,
                status: 'ERROR',
                error
            });
            console.warn("Active players snapshot error:", error);
        });

        return () => {
            firestoreUsageTracker.unregisterActiveListener();
            if (typeof unsub === 'function') unsub();
        };
    } catch (e) {
        firestoreUsageTracker.unregisterActiveListener();
        console.warn("subscribeToActiveGameCount error:", e);
        return () => {};
    }
}

/**
 * Automatically flip stale live-player docs to inactive AND record the round as aborted.
 * @returns {Promise<number>} Number of docs cleaned up
 */
export async function cleanupStaleLivePlayers() {
    let cleaned = 0;
    const ABORT_STALE_MS = 90000;
    const t0 = performance.now();
    try {
        const q = query(collection(db, "players"), where("active", "==", true), limit(500));
        const snap = await getDocs(q);
        firestoreUsageTracker.track({
            type: 'READ',
            collection: 'players',
            docId: 'players (active==true, stale check)',
            operation: 'cleanupStaleLivePlayers (Fetch)',
            docCount: snap.size || 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS'
        });

        const batch = [];
        snap.docs.forEach(d => {
            const data = d.data();
            if (!(data.liveState && Array.isArray(data.liveState.grid) && data.liveState.grid.length > 0)) return;
            const stamp = firestoreTimestampToMillis(data.liveState.updatedAt) || firestoreTimestampToMillis(data.lastActiveAt);
            if (stamp === null || (Date.now() - stamp) < ABORT_STALE_MS) return;

            const live = data.liveState || {};
            const wordsFound = Array.isArray(live.foundWords) ? live.foundWords.length : 0;
            const totalWords = Array.isArray(live.words) ? live.words.length : 0;
            let banked = Number(live.bankedCumulative);
            const knowsBanked = Number.isFinite(banked) && banked >= 0;
            if (!knowsBanked) banked = 0;

            batch.push(updateDoc(doc(db, "players", d.id), {
                active: false,
                liveState: null,
                score: 0,
                cumulativeScore: knowsBanked ? banked : 0
            }));
            const leaderboardId = (data.rollNumber && data.department && data.year)
                ? `${data.rollNumber}|${data.department}|${data.year}`
                : (data.rollNumber || 'anonymous');
            if (knowsBanked && leaderboardId) {
                const leaderboardRef = doc(db, "leaderboard", leaderboardId);
                batch.push(setDoc(leaderboardRef, {
                    name:            data.name        || "Player",
                    rollNumber:      data.rollNumber  || "",
                    department:      data.department  || "",
                    year:            data.year         || "",
                    score:           0,
                    cumulativeScore: banked,
                    timestamp:       serverTimestamp(),
                    date:            new Date().toLocaleDateString()
                }, { merge: true }));
                const cumulativeRef = doc(db, "cumulativeScores", leaderboardId);
                batch.push(setDoc(cumulativeRef, {
                    name:            data.name        || "Player",
                    rollNumber:      data.rollNumber  || "",
                    department:      data.department  || "",
                    year:            data.year         || "",
                    cumulativeScore: banked,
                    updatedAt:       serverTimestamp()
                }, { merge: true }));
            } else if (leaderboardId) {
                batch.push(deleteDoc(doc(db, "leaderboard", leaderboardId)).catch(() => {}));
                batch.push(deleteDoc(doc(db, "cumulativeScores", leaderboardId)).catch(() => {}));
            }
            batch.push(addDoc(collection(db, "playSessions"), {
                name:            data.name        || "Player",
                rollNumber:      data.rollNumber  || "",
                department:      data.department  || "",
                year:            data.year        || "",
                level:           Number(data.currentLevel) || 1,
                levelTitle:      data.levelTitle  || "Novice",
                score:           0,
                cumulativeScore: banked,
                wordsFound,
                totalWords,
                timePlayedSecs:  0,
                result:          'left',
                endedAt:         serverTimestamp(),
                date:            new Date().toLocaleDateString()
            }));
            cleaned++;
        });

        if (batch.length > 0) {
            const tBatch = performance.now();
            await Promise.allSettled(batch);
            firestoreUsageTracker.track({
                type: 'WRITE',
                collection: 'players',
                docId: `${cleaned} stale sessions`,
                operation: 'cleanupStaleLivePlayers (Batch Clean)',
                docCount: batch.length,
                durationMs: performance.now() - tBatch,
                status: 'SUCCESS',
                details: { abortedDocs: cleaned }
            });
        }
        if (cleaned > 0) console.log("Cleaned & aborted stale live players:", cleaned);
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'players',
            docId: 'stale-cleanup',
            operation: 'cleanupStaleLivePlayers',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("cleanupStaleLivePlayers error:", e);
    }
    return cleaned;
}

/**
 * Subscribe to Live Registered Players Updates
 * @param {Function} callback Callback with list of player objects
 */
export function subscribeToPlayers(callback) {
    firestoreUsageTracker.registerActiveListener();
    let isInitial = true;
    try {
        const q = query(collection(db, "players"), limit(200));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                let regDate = data.registeredAt && data.registeredAt.toDate ? data.registeredAt.toDate().toLocaleDateString() : (new Date().toLocaleDateString());
                list.push({ id: docSnap.id, ...data, dateDisplay: regDate });
            });

            const docCount = isInitial ? (snapshot.size || 1) : Math.max(1, snapshot.docChanges().length);
            firestoreUsageTracker.track({
                type: 'SNAPSHOT',
                collection: 'players',
                docId: 'players (limit 200)',
                operation: isInitial ? 'subscribeToPlayers (Initial)' : 'subscribeToPlayers (Real-Time Update)',
                docCount,
                durationMs: 16,
                status: 'SUCCESS',
                details: { totalLoaded: list.length }
            });
            isInitial = false;

            callback(list);
        }, (error) => {
            firestoreUsageTracker.track({
                type: 'SNAPSHOT',
                collection: 'players',
                docId: 'players',
                operation: 'subscribeToPlayers',
                docCount: 1,
                status: 'ERROR',
                error
            });
            console.warn("Firestore players snapshot error:", error);
        });

        return () => {
            firestoreUsageTracker.unregisterActiveListener();
            if (typeof unsub === 'function') unsub();
        };
    } catch (e) {
        firestoreUsageTracker.unregisterActiveListener();
        console.warn("Firestore players subscription error:", e);
        return () => {};
    }
}

/**
 * Delete a Player Registration and ALL associated records by docId and/or player info
 * @param {String|Object} target docId string or player object { id, rollNumber, department, year }
 */
export async function deletePlayerFromFirestore(target) {
    if (!target) return false;
    const t0 = performance.now();
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
        let deletedDocsCount = 0;
        
        // 1. Delete by direct docId
        if (docId) {
            for (const col of collections) {
                await deleteDoc(doc(db, col, docId)).catch(() => {});
                deletedDocsCount++;
            }
        }

        // 2. Delete by constructed composite ID if rollNumber/dept/year exist
        if (rollNumber && department && year) {
            const compId = `${rollNumber}|${department}|${year}`;
            if (compId !== docId) {
                for (const col of collections) {
                    await deleteDoc(doc(db, col, compId)).catch(() => {});
                    deletedDocsCount++;
                }
            }
        }

        // 3. Query & delete any matching documents by rollNumber across all collections
        if (rollNumber) {
            for (const col of collections) {
                try {
                    const q = query(collection(db, col), where("rollNumber", "==", rollNumber));
                    const snap = await getDocs(q);
                    const deletes = [];
                    snap.forEach(d => {
                        deletes.push(deleteDoc(d.ref));
                        deletedDocsCount++;
                    });
                    await Promise.all(deletes);
                } catch (e) {}
            }
        }

        // 4. Delete any recorded play sessions for this player
        if (rollNumber) {
            try {
                const sDeletes = await deletePlaySessionsForPlayer(rollNumber);
                deletedDocsCount += sDeletes;
            } catch (e) {
                console.warn("Firestore delete playSessions error:", e);
            }
        }

        firestoreUsageTracker.track({
            type: 'DELETE',
            collection: 'players',
            docId: docId || rollNumber,
            operation: 'deletePlayerFromFirestore',
            docCount: Math.max(1, deletedDocsCount),
            durationMs: performance.now() - t0,
            status: 'SUCCESS',
            details: { rollNumber, deletedDocsCount }
        });

        console.log("Player completely deleted across Firestore collections for:", docId || rollNumber);
        return true;
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'DELETE',
            collection: 'players',
            docId: docId || rollNumber,
            operation: 'deletePlayerFromFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Firestore delete player error:", e);
        return false;
    }
}

/**
 * Delete ALL Player, Leaderboard, and Cumulative Score records from Firestore
 */
export async function clearAllDataFromFirestore() {
    const t0 = performance.now();
    try {
        const collectionsToClear = ["players", "leaderboard", "cumulativeScores", "playSessions"];
        let totalCleared = 0;
        for (const colName of collectionsToClear) {
            const snap = await getDocs(collection(db, colName));
            firestoreUsageTracker.track({
                type: 'READ',
                collection: colName,
                docId: 'all',
                operation: 'clearAllDataFromFirestore (Scan)',
                docCount: snap.size || 1,
                durationMs: performance.now() - t0,
                status: 'SUCCESS'
            });
            const promises = snap.docs.map(d => deleteDoc(d.ref));
            totalCleared += snap.size;
            await Promise.all(promises);
        }

        firestoreUsageTracker.track({
            type: 'DELETE',
            collection: 'all',
            docId: 'all collections',
            operation: 'clearAllDataFromFirestore',
            docCount: Math.max(1, totalCleared),
            durationMs: performance.now() - t0,
            status: 'SUCCESS',
            details: { totalCleared }
        });

        console.log("All Firestore player & leaderboard data successfully cleared.");
        return true;
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'DELETE',
            collection: 'all',
            docId: 'all',
            operation: 'clearAllDataFromFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Firestore clearAllData error:", e);
        return false;
    }
}

/**
 * Set Game Active state in Firestore
 * @param {boolean} isActive
 */
export async function setGameStateInFirestore(isActive) {
    const t0 = performance.now();
    try {
        localStorage.setItem('wordQuest_isGameActive', JSON.stringify(isActive));
    } catch (e) {}
    try {
        await setDoc(doc(db, "system_config", "game_control"), {
            isGameActive: isActive,
            updatedAt: serverTimestamp()
        }, { merge: true });
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'system_config',
            docId: 'game_control',
            operation: 'setGameStateInFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS',
            details: { isGameActive: isActive }
        });
        console.log("Game active state updated in Firestore:", isActive);
        return true;
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'system_config',
            docId: 'game_control',
            operation: 'setGameStateInFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Firestore setGameState error:", e);
        return false;
    }
}

/**
 * Get current Game Active state from Firestore
 */
export async function getGameStateFromFirestore() {
    const t0 = performance.now();
    try {
        const docSnap = await getDoc(doc(db, "system_config", "game_control"));
        firestoreUsageTracker.track({
            type: 'READ',
            collection: 'system_config',
            docId: 'game_control',
            operation: 'getGameStateFromFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS'
        });
        if (docSnap.exists() && typeof docSnap.data().isGameActive === 'boolean') {
            const isActive = docSnap.data().isGameActive;
            try { localStorage.setItem('wordQuest_isGameActive', JSON.stringify(isActive)); } catch(e){}
            return isActive;
        }
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'READ',
            collection: 'system_config',
            docId: 'game_control',
            operation: 'getGameStateFromFirestore',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Firestore getGameState error:", e);
    }
    // Check localStorage fallback
    try {
        const localVal = localStorage.getItem('wordQuest_isGameActive');
        if (localVal !== null) return JSON.parse(localVal);
    } catch (e) {}
    return true; // Default active if document not present
}

/**
 * Subscribe to real-time Game Active state updates
 * @param {Function} callback Called with boolean (isActive)
 */
export function subscribeToGameState(callback) {
    firestoreUsageTracker.registerActiveListener();
    try {
        const localVal = localStorage.getItem('wordQuest_isGameActive');
        if (localVal !== null && JSON.parse(localVal) === false) {
            callback(false);
        }
    } catch (e) {}

    let isInitial = true;
    try {
        const unsub = onSnapshot(doc(db, "system_config", "game_control"), (docSnap) => {
            firestoreUsageTracker.track({
                type: 'SNAPSHOT',
                collection: 'system_config',
                docId: 'game_control',
                operation: isInitial ? 'subscribeToGameState (Initial)' : 'subscribeToGameState (Real-Time Update)',
                docCount: 1,
                durationMs: 10,
                status: 'SUCCESS'
            });
            isInitial = false;

            if (docSnap.exists() && typeof docSnap.data().isGameActive === 'boolean') {
                const isActive = docSnap.data().isGameActive;
                try { localStorage.setItem('wordQuest_isGameActive', JSON.stringify(isActive)); } catch(e){}
                callback(isActive);
            } else {
                callback(true);
            }
        }, (error) => {
            firestoreUsageTracker.track({
                type: 'SNAPSHOT',
                collection: 'system_config',
                docId: 'game_control',
                operation: 'subscribeToGameState',
                docCount: 1,
                status: 'ERROR',
                error
            });
            console.warn("Game state snapshot error:", error);
            try {
                const localVal = localStorage.getItem('wordQuest_isGameActive');
                if (localVal !== null) { callback(JSON.parse(localVal)); return; }
            } catch (e) {}
            callback(true);
        });

        return () => {
            firestoreUsageTracker.unregisterActiveListener();
            if (typeof unsub === 'function') unsub();
        };
    } catch (e) {
        firestoreUsageTracker.unregisterActiveListener();
        console.warn("subscribeToGameState error:", e);
        try {
            const localVal = localStorage.getItem('wordQuest_isGameActive');
            if (localVal !== null) { callback(JSON.parse(localVal)); return; }
        } catch (e) {}
        callback(true);
        return () => {};
    }
}

/**
 * Send a message from the Admin to a single live player.
 * Uses a dedicated `player_messages/{playerId}` doc so messages never collide
 * with the heavily-updated player doc (liveState / heartbeat).
 * @param {string} playerId Firestore player doc id
 * @param {string} text Message body
 */
export async function sendMessageToPlayer(playerId, text) {
    if (!playerId || !text) return false;
    const t0 = performance.now();
    try {
        await setDoc(doc(db, "player_messages", playerId), {
            text: text,
            from: "Admin",
            sentAt: serverTimestamp(),
            read: false
        }, { merge: true });
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'player_messages',
            docId: playerId,
            operation: 'sendMessageToPlayer',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS',
            details: { textLength: text.length }
        });
        console.log("Message sent to player:", playerId);
        return true;
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'player_messages',
            docId: playerId,
            operation: 'sendMessageToPlayer',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Firestore sendMessageToPlayer error:", e);
        return false;
    }
}

/**
 * Broadcast a message from the Admin to a list of live players.
 * @param {string[]} playerIds Array of Firestore player doc ids
 * @param {string} text Message body
 */
export async function broadcastMessageToLivePlayers(playerIds, text) {
    if (!Array.isArray(playerIds) || playerIds.length === 0 || !text) return 0;
    let sent = 0;
    const results = playerIds.map((id) =>
        sendMessageToPlayer(id, text).then((ok) => { if (ok) sent++; })
    );
    await Promise.allSettled(results);
    console.log("Broadcast message sent to", sent, "players");
    return sent;
}

/**
 * Subscribe to the player's admin-message doc in real time.
 * @param {string} playerId Firestore player doc id
 * @param {Function} callback Called with the message object ({ text, sentAt, read }) or null when cleared
 */
export function subscribeToPlayerMessages(playerId, callback) {
    if (!playerId) return () => {};
    firestoreUsageTracker.registerActiveListener();
    try {
        const unsub = onSnapshot(doc(db, "player_messages", playerId), (docSnap) => {
            firestoreUsageTracker.track({
                type: 'SNAPSHOT',
                collection: 'player_messages',
                docId: playerId,
                operation: 'subscribeToPlayerMessages',
                docCount: 1,
                durationMs: 12,
                status: 'SUCCESS'
            });
            if (docSnap.exists()) {
                callback({ id: docSnap.id, ...docSnap.data() });
            } else {
                callback(null);
            }
        }, (error) => {
            firestoreUsageTracker.track({
                type: 'SNAPSHOT',
                collection: 'player_messages',
                docId: playerId,
                operation: 'subscribeToPlayerMessages',
                docCount: 1,
                status: 'ERROR',
                error
            });
            console.warn("Message snapshot error for player:", playerId, error);
        });

        return () => {
            firestoreUsageTracker.unregisterActiveListener();
            if (typeof unsub === 'function') unsub();
        };
    } catch (e) {
        firestoreUsageTracker.unregisterActiveListener();
        console.warn("subscribeToPlayerMessages error:", e);
        return () => {};
    }
}

/**
 * Record a completed/abandoned play session to the `playSessions` collection.
 * @param {Object} session { name, rollNumber, department, year, level, levelTitle, score, cumulativeScore, wordsFound, totalWords, timePlayedSecs, result }
 */
export async function recordPlaySession(session = {}) {
    const { rollNumber, department, year } = session;
    if (!rollNumber && !session.id) return null;
    const t0 = performance.now();
    try {
        const docRef = await addDoc(collection(db, "playSessions"), {
            name:           session.name           || "Player",
            rollNumber:     rollNumber            || "",
            department:     department            || "",
            year:           year                  || "",
            level:          Number(session.level) || 1,
            levelTitle:     session.levelTitle    || "Novice",
            score:          Number(session.score) || 0,
            cumulativeScore:Number(session.cumulativeScore) || 0,
            wordsFound:     Number(session.wordsFound)     || 0,
            totalWords:     Number(session.totalWords)     || 0,
            timePlayedSecs: Math.max(0, Number(session.timePlayedSecs) || 0),
            result:         session.result        || 'left',
            endedAt:        serverTimestamp(),
            date:           new Date().toLocaleDateString()
        });
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'playSessions',
            docId: docRef.id,
            operation: 'recordPlaySession',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS',
            details: { rollNumber, result: session.result, score: session.score }
        });
        console.log("Play session recorded:", docRef.id, rollNumber, session.result);
        return docRef.id;
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'WRITE',
            collection: 'playSessions',
            docId: rollNumber || 'unknown',
            operation: 'recordPlaySession',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Firestore recordPlaySession error:", e);
        return null;
    }
}

/**
 * Subscribe to Live Play Session records (for the admin play-history modal).
 * @param {Function} callback Called with list of session objects
 */
export function subscribeToPlaySessions(callback) {
    firestoreUsageTracker.registerActiveListener();
    let isInitial = true;
    try {
        const q = query(collection(db, "playSessions"), orderBy("endedAt", "desc"), limit(1500));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                list.push({
                    id: docSnap.id,
                    timePlayedSecs: Number(data.timePlayedSecs) || 0,
                    endedAt: data.endedAt,
                    ...data
                });
            });

            const docCount = isInitial ? (snapshot.size || 1) : Math.max(1, snapshot.docChanges().length);
            firestoreUsageTracker.track({
                type: 'SNAPSHOT',
                collection: 'playSessions',
                docId: 'playSessions (limit 1500)',
                operation: isInitial ? 'subscribeToPlaySessions (Initial)' : 'subscribeToPlaySessions (Real-Time Update)',
                docCount,
                durationMs: 18,
                status: 'SUCCESS',
                details: { totalLoaded: list.length }
            });
            isInitial = false;

            callback(list);
        }, (error) => {
            firestoreUsageTracker.track({
                type: 'SNAPSHOT',
                collection: 'playSessions',
                docId: 'playSessions',
                operation: 'subscribeToPlaySessions',
                docCount: 1,
                status: 'ERROR',
                error
            });
            console.warn("Firestore playSessions snapshot error:", error);
        });

        return () => {
            firestoreUsageTracker.unregisterActiveListener();
            if (typeof unsub === 'function') unsub();
        };
    } catch (e) {
        firestoreUsageTracker.unregisterActiveListener();
        console.warn("Firestore subscribeToPlaySessions error:", e);
        return () => {};
    }
}

/**
 * Delete all play session records for a player (used when a registration is deleted).
 * @param {string} rollNumber
 */
export async function deletePlaySessionsForPlayer(rollNumber) {
    if (!rollNumber) return 0;
    const t0 = performance.now();
    try {
        const q = query(collection(db, "playSessions"), where("rollNumber", "==", rollNumber));
        const snap = await getDocs(q);
        firestoreUsageTracker.track({
            type: 'READ',
            collection: 'playSessions',
            docId: `rollNumber==${rollNumber}`,
            operation: 'deletePlaySessionsForPlayer (Scan)',
            docCount: snap.size || 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS'
        });
        const deletes = [];
        snap.forEach(d => deletes.push(deleteDoc(d.ref)));
        await Promise.allSettled(deletes);

        firestoreUsageTracker.track({
            type: 'DELETE',
            collection: 'playSessions',
            docId: `rollNumber==${rollNumber}`,
            operation: 'deletePlaySessionsForPlayer',
            docCount: Math.max(1, deletes.length),
            durationMs: performance.now() - t0,
            status: 'SUCCESS',
            details: { rollNumber, deletedSessions: deletes.length }
        });

        return deletes.length;
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'DELETE',
            collection: 'playSessions',
            docId: `rollNumber==${rollNumber}`,
            operation: 'deletePlaySessionsForPlayer',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Firestore deletePlaySessionsForPlayer error:", e);
        return 0;
    }
}

/**
 * Acknowledge and clear the admin message for a player so a future
 * message is detected fresh (overwrite semantics).
 * @param {string} playerId Firestore player doc id
 */
export async function acknowledgePlayerMessage(playerId) {
    if (!playerId) return;
    const t0 = performance.now();
    try {
        await deleteDoc(doc(db, "player_messages", playerId));
        firestoreUsageTracker.track({
            type: 'DELETE',
            collection: 'player_messages',
            docId: playerId,
            operation: 'acknowledgePlayerMessage',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'SUCCESS'
        });
        console.log("Player message acknowledged & cleared:", playerId);
    } catch (e) {
        firestoreUsageTracker.track({
            type: 'DELETE',
            collection: 'player_messages',
            docId: playerId,
            operation: 'acknowledgePlayerMessage',
            docCount: 1,
            durationMs: performance.now() - t0,
            status: 'ERROR',
            error: e
        });
        console.warn("Firestore acknowledgePlayerMessage error:", e);
    }
}

// Make available globally for non-module scripts if needed
window.WordQuestFirebase = {
    app,
    db,
    usageTracker: firestoreUsageTracker,
    SPARK_PLAN_LIMITS,
    testFirestorePing,
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
    updatePlayerLevelInFirestore,
    syncLiveGridToFirestore,
    subscribeToPlayerLiveGrid,
    unregisterActiveGame,
    subscribeToActiveGameCount,
    cleanupStaleLivePlayers,
    saveCumulativeScoreToFirestore,
    getCumulativeScoreFromFirestore,
    setGameStateInFirestore,
    getGameStateFromFirestore,
    subscribeToGameState,
    sendMessageToPlayer,
    broadcastMessageToLivePlayers,
    subscribeToPlayerMessages,
    acknowledgePlayerMessage,
    recordPlaySession,
    subscribeToPlaySessions,
    deletePlaySessionsForPlayer,
    clearAllDataFromFirestore
};
