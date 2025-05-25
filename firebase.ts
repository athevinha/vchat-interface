import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, initializeAuth, inMemoryPersistence } from 'firebase/auth';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCPYG6OiiIp2I5Rm-_GZRWixQzRfXbJSlA",
  authDomain: "skrt-32d5a.firebaseapp.com",
  projectId: "skrt-32d5a",
  storageBucket: "skrt-32d5a.appspot.com",
  messagingSenderId: "922888609628",
  appId: "1:922888609628:ios:1009c79be96ad182bf2b99"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent cache (modern approach)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Initialize Auth with appropriate persistence
// Note: For better persistence, install @react-native-async-storage/async-storage
// and use getReactNativePersistence with it
const auth = Platform.OS === 'web' 
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: inMemoryPersistence  // In-memory persistence (session only)
    });

export { db, auth }; 