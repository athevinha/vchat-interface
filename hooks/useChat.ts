import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { IMessage } from 'react-native-gifted-chat';

interface ChatMessage {
  _id: string;
  text: string;
  createdAt: Date;
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  image?: string;
  replyTo?: string;
}

export const useChat = (chatId: string) => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load and listen to messages
  useEffect(() => {
    if (!chatId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log(`useChat: Loading messages for chat ${chatId}`);
      
      const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        console.log(`useChat: Got ${querySnapshot.docs.length} messages`);
        const fetchedMessages: IMessage[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Convert Firestore timestamp to Date
          const createdAt = data.createdAt ? 
            (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : 
            new Date();
          
          fetchedMessages.push({
            _id: doc.id,
            text: data.text || '',
            createdAt,
            user: {
              _id: data.userId || data.user?._id || '',
              name: data.userName || data.user?.name || 'Unknown',
              avatar: data.userAvatar || data.user?.avatar || undefined
            },
            image: data.image
          });
        });
        
        setMessages(fetchedMessages);
        setLoading(false);
      }, (err) => {
        console.error('useChat: Error fetching messages:', err);
        setError(err.message);
        setLoading(false);
      });

      return () => {
        console.log('useChat: Unsubscribing from messages listener');
        unsubscribe();
      };
    } catch (err: any) {
      console.error('useChat: Error setting up messages listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [chatId]);

  // Send a message
  const sendMessage = async (message: IMessage) => {
    if (!chatId || !auth.currentUser) {
      console.error('useChat: Cannot send message - missing chatId or user');
      return;
    }
    
    try {
      const { text, image } = message;
      console.log(`useChat: Sending message to chat ${chatId}`);
      
      // Add message to Firestore
      const messageRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text,
        createdAt: serverTimestamp(),
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'You',
        userAvatar: auth.currentUser.photoURL,
        image
      });
      
      console.log(`useChat: Message sent with ID ${messageRef.id}`);
      
      // Update the last message in the chat document
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('useChat: Chat document updated with last message');
    } catch (err: any) {
      console.error('useChat: Error sending message:', err);
      setError(err.message);
      throw err;
    }
  };

  return { messages, sendMessage, loading, error };
};

export default useChat; 