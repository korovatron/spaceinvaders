// Firestore access for the leaderboard. Exposes window.leaderboardService, or leaves it
// undefined if the SDK can't be loaded (e.g. offline) so the game carries on without it.
const FIREBASE_VERSION = "12.19.0";
const firebaseConfig = {
    apiKey: "AIzaSyDM_NT46rky5kXatw0gSVwyA2v5ykcEc8Y",
    authDomain: "spaceinvaders-589ea.firebaseapp.com",
    projectId: "spaceinvaders-589ea",
    storageBucket: "spaceinvaders-589ea.firebasestorage.app",
    messagingSenderId: "1073648093629",
    appId: "1:1073648093629:web:41c25dc3d56bb64f51ead4"
};

try {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
    const [{ initializeApp }, firestore] = await Promise.all([
        import(base + "firebase-app.js"),
        import(base + "firebase-firestore.js")
    ]);
    const { getFirestore, collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } = firestore;

    const db = getFirestore(initializeApp(firebaseConfig));
    const scores = collection(db, "scores");

    window.leaderboardService = {
        async fetchTop(count) {
            const snapshot = await getDocs(query(scores, orderBy("score", "desc"), limit(count)));
            return snapshot.docs.map(doc => {
                const { name, score, wave, createdAt } = doc.data();
                // createdAt can be null for an instant after submit, before the server timestamp resolves
                return { name, score, wave, createdAt: createdAt ? createdAt.toDate() : null };
            });
        },
        async submit({ name, score, wave }) {
            await addDoc(scores, { name, score, wave, createdAt: serverTimestamp() });
        }
    };
} catch (err) {
    console.warn("Leaderboard unavailable:", err);
}

window.leaderboardReady = true;
window.dispatchEvent(new Event("leaderboard-ready"));
