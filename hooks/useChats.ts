import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  where, 
  getDocs, 
  getDoc,
  doc,
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { SUPPORT_USER_ID } from './useUsers';

export interface Chat {
  id: string;
  from: string;
  date: string;
  img: string;
  msg: string;
  read: boolean;
  unreadCount: number;
}

export const useChats = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load and listen to chats
  useEffect(() => {
    if (!auth.currentUser) {
      console.log('useChats: No current user, skipping chat fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Get chats where current user is a participant
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', auth.currentUser.uid),
        orderBy('lastMessageAt', 'desc')
      );

      console.log('useChats: Setting up listener for chats');
      const unsubscribe = onSnapshot(q, (querySnapshot: any) => {
        console.log(`useChats: Got ${querySnapshot.docs.length} chats`);
        const fetchedChats: Chat[] = querySnapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            from: data.name,
            date: data.lastMessageAt?.toDate().toISOString() || new Date().toISOString(),
            img: data.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(data.name || 'User'),
            msg: data.lastMessage || '',
            read: data.read || false,
            unreadCount: data.unreadCount || 0
          };
        });
        setChats(fetchedChats);
        setLoading(false);
      }, (err: any) => {
        console.error('useChats: Error fetching chats:', err);
        setError(err.message);
        setLoading(false);
      });

      return () => {
        console.log('useChats: Unsubscribing from chat listener');
        unsubscribe();
      };
    } catch (err: any) {
      console.error('useChats: Error setting up chat listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // Create a new chat
  const createChat = async (userId: string, initialMessage: string) => {
    try {
      console.log(`useChats: Creating chat with user ${userId}`);
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('You must be logged in');

      // Get user details
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const userName = userData.name || 'Unknown User';
      const userAvatar = userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}`;
      
      console.log(`useChats: Found user ${userName} with avatar ${userAvatar}`);

      // Check if chat already exists
      const existingChatQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', currentUser.uid),
        where('otherUserId', '==', userId)
      );
      
      const existingChats = await getDocs(existingChatQuery);
      if (!existingChats.empty) {
        console.log('useChats: Chat already exists, returning existing chat');
        return existingChats.docs[0].id;
      }

      // Create new chat
      console.log('useChats: Creating new chat document');
      const chatRef = await addDoc(collection(db, 'chats'), {
        name: userName,
        avatar: userAvatar,
        lastMessage: initialMessage,
        lastMessageAt: serverTimestamp(),
        read: false,
        unreadCount: 1,
        participants: [currentUser.uid, userId],
        otherUserId: userId,
        createdAt: serverTimestamp()
      });

      // Add initial message
      console.log(`useChats: Adding initial message to chat ${chatRef.id}`);
      await addDoc(collection(db, 'chats', chatRef.id, 'messages'), {
        text: initialMessage,
        createdAt: serverTimestamp(),
        user: {
          _id: currentUser.uid,
          name: currentUser.displayName || 'User',
          avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}`
        }
      });

      console.log(`useChats: Chat created successfully with ID ${chatRef.id}`);
      return chatRef.id;
    } catch (err: any) {
      console.error('useChats: Error creating chat:', err);
      setError(err.message);
      throw err;
    }
  };

  // Create a test chat with the support user
  const createTestChat = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('You must be logged in');
      
      // First ensure support user exists in Firebase
      const supportUserRef = doc(db, 'users', SUPPORT_USER_ID);
      const supportUserDoc = await getDoc(supportUserRef);
      
      // Set support user data
      const supportUserData = {
        name: 'VChat Support',
        email: 'support@vchat.com',
        avatar: 'https://ui-avatars.com/api/?name=VChat+Support&background=5856d6&color=fff',
        status: 'Available',
        updatedAt: serverTimestamp()
      };
      
      // Create or update support user
      if (!supportUserDoc.exists()) {
        console.log('useChats: Creating support user');
        await setDoc(supportUserRef, {
          ...supportUserData,
          createdAt: serverTimestamp()
        });
      } else if (!supportUserDoc.data().avatar || !supportUserDoc.data().email) {
        console.log('useChats: Updating support user data');
        await setDoc(supportUserRef, supportUserData, { merge: true });
      }
      
      // Check if chat with support user already exists
      console.log('useChats: Checking if support chat exists');
      const existingChatQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', currentUser.uid),
        where('otherUserId', '==', SUPPORT_USER_ID)
      );
      
      const existingChats = await getDocs(existingChatQuery);
      if (!existingChats.empty) {
        console.log('useChats: Support chat already exists, returning existing chat');
        return existingChats.docs[0].id;
      }
      
      // Create welcome message
      const welcomeMessage = "Welcome to VChat! I'm your support assistant. How can I help you today?";
      
      // Create new chat with support user
      console.log('useChats: Creating new support chat');
      const chatRef = await addDoc(collection(db, 'chats'), {
        name: supportUserData.name,
        avatar: supportUserData.avatar,
        lastMessage: welcomeMessage,
        lastMessageAt: serverTimestamp(),
        read: false,
        unreadCount: 1,
        participants: [currentUser.uid, SUPPORT_USER_ID],
        otherUserId: SUPPORT_USER_ID,
        createdAt: serverTimestamp()
      });

      // Add welcome message from support
      console.log(`useChats: Adding welcome message to chat ${chatRef.id}`);
      await addDoc(collection(db, 'chats', chatRef.id, 'messages'), {
        text: welcomeMessage,
        createdAt: serverTimestamp(),
        user: {
          _id: SUPPORT_USER_ID,
          name: supportUserData.name,
          avatar: supportUserData.avatar
        }
      });

      console.log(`useChats: Support chat created with ID ${chatRef.id}`);
      return chatRef.id;
    } catch (err: any) {
      console.error('useChats: Error creating support chat:', err);
      setError(err.message);
      return null;
    }
  };

  return { chats, createChat, createTestChat, loading, error };
};

export default useChats; 