import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAU0WgjsPvnEHboSvGJp0RH4hR3YNdURKg",
    authDomain: "justai-c92a6.firebaseapp.com",
    projectId: "justai-c92a6",
    storageBucket: "justai-c92a6.firebasestorage.app",
    messagingSenderId: "605893343508",
    appId: "1:605893343508:web:ef37642dd032c1381cea01"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();