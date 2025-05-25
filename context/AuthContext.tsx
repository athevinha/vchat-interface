import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  error: null
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser: any) => {
      setUser(authUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user profile with display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name
        });
        
        // Create a user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name,
          email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
          createdAt: serverTimestamp(),
          status: 'Available'
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Update user's last login
      if (userCredential.user) {
        const userDoc = doc(db, 'users', userCredential.user.uid);
        const userSnapshot = await getDoc(userDoc);
        
        // If user document doesn't exist, create it
        if (!userSnapshot.exists()) {
          await setDoc(userDoc, {
            name: userCredential.user.displayName || 'User',
            email: userCredential.user.email,
            avatar: userCredential.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userCredential.user.displayName || 'User')}`,
            createdAt: serverTimestamp(),
            status: 'Available'
          });
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
      throw err;
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    error
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 