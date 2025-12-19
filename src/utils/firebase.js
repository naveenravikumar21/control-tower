import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp, query, where, orderBy, limit } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAIuY4yQWR9oZujMvTGdiNqZeo4zzW9Cj4",
  authDomain: "gen-lang-client-0046318495.firebaseapp.com",
  projectId: "gen-lang-client-0046318495",
  storageBucket: "gen-lang-client-0046318495.firebasestorage.app",
  messagingSenderId: "282900830200",
  appId: "1:282900830200:web:96725193e4cb673de4a80d",
  measurementId: "G-MTHRPE9F67"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// App ID for Firestore path
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Get collection reference
export const getCollectionRef = (collectionName) => {
  return collection(db, `artifacts/${appId}/public/data/${collectionName}`);
};

// Get document reference
export const getDocRef = (collectionName, docId) => {
  return doc(db, `artifacts/${appId}/public/data/${collectionName}`, docId);
};

// Firestore operations
export const addDocument = async (collectionName, data) => {
  const ref = getCollectionRef(collectionName);
  return addDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
};

export const updateDocument = async (collectionName, docId, data) => {
  const ref = getDocRef(collectionName, docId);
  return updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
};

export const deleteDocument = async (collectionName, docId) => {
  const ref = getDocRef(collectionName, docId);
  return deleteDoc(ref);
};

// Re-export Firebase functions for direct use in pages
export {
  onSnapshot,
  onAuthStateChanged,
  signInAnonymously,
  serverTimestamp,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit
};
