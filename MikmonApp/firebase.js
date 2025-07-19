import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCaJPARdEn3b1ZbfpQCbD2-R_kFdgAOt_M",
  authDomain: "mikmon-app.firebaseapp.com",
  projectId: "mikmon-app",
  storageBucket: "mikmon-app.firebasestorage.app",
  messagingSenderId: "571684463774",
  appId: "1:571684463774:web:8bbf4bb1ef055ed123c78f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);

export default app; 