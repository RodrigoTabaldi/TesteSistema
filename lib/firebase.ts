import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAbsIHLDsjH0FDcW-kMon49Oix2Dn6phX0",
  authDomain: "kronos-17d21.firebaseapp.com",
  projectId: "kronos-17d21",
  storageBucket: "kronos-17d21.firebasestorage.app",
  messagingSenderId: "122122498788",
  appId: "1:122122498788:web:c4f1edee0e6e77935d32f1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
