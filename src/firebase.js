import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrfNyjhOhAqi6xdK8COzR0gzE6VkWTezc",
  authDomain: "ymca-workout.firebaseapp.com",
  projectId: "ymca-workout",
  storageBucket: "ymca-workout.firebasestorage.app",
  messagingSenderId: "628072363819",
  appId: "1:628072363819:web:e747b5890458dcf464b76e",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
