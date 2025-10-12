import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMcamJBRGraXkVAY6bJ74JWRuGhhBJQPo",
  authDomain: "sistemadegestao-915ff.firebaseapp.com",
  projectId: "sistemadegestao-915ff",
  storageBucket: "sistemadegestao-915ff.firebasestorage.app",
  messagingSenderId: "244734501885",
  appId: "1:244734501885:web:215cd89250d06f5f7d2f94",
  measurementId: "G-W207VXTC54"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };