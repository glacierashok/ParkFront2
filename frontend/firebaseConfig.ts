import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB2wuV2rhIrOXe5qC1iImWhkqXFOytsG1o",
  authDomain: "parkwalkjog-3a136.firebaseapp.com",
  projectId: "parkwalkjog-3a136",
  storageBucket: "parkwalkjog-3a136.firebasestorage.app",
  messagingSenderId: "316967925006",
  appId: "1:316967925006:web:49b15b6926e90e14d0935f",
  measurementId: "G-2SD3LFDVDK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
