import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB0Ureg1Githu5Nivu94aiyeUY_RkOnIz8",
  authDomain: "borcdefteri-f3420.firebaseapp.com",
  databaseURL:
    "https://borcdefteri-f3420-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "borcdefteri-f3420",
  storageBucket: "borcdefteri-f3420.firebasestorage.app",
  messagingSenderId: "285044576744",
  appId: "1:285044576744:web:afe7313b7e3d1b3eac945d",
  measurementId: "G-H7DKSCZYYZ",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
