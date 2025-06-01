import { View, Text, ScrollView, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import ChatRow, { ChatRowProps } from '@/components/ChatRow';
import { defaultStyles } from '@/constants/Styles';
import useChats from '@/hooks/useChats';
import Colors from '@/constants/Colors';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth, db } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, onSnapshot, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

const Page = () => {
  const { chats, loading, error, createTestChat } = useChats();
  const [creating, setCreating] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [userChats, setUserChats] = useState<ChatRowProps[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);

  // Load all chats for the current user
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participantIds', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const chatsList: ChatRowProps[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const chatData = doc.data();
        // Find the other participant
        const otherUserId = chatData.participantIds.find((pid: string) => pid !== currentUser.uid);
        const otherUserInfo = otherUserId ? chatData.participantInfo[otherUserId] : null;
        // Format timestamp or use current date as fallback
        const timestamp = chatData.lastMessageAt || chatData.createdAt || new Date();
        const dateString = timestamp.toDate ? timestamp.toDate().toISOString() : new Date().toISOString();
        console.log(otherUserInfo?.photoURL)
        chatsList.push({
          id: doc.id,
          from: otherUserInfo?.displayName || 'Unknown User',
          img: otherUserInfo?.photoURL || `https://avatars.githubusercontent.com/u/${171532562 + Math.floor(Math.random() * 1000)}`,
          msg: chatData.lastMessage?.text || 'Start chatting',
          date: dateString,
          read: true,
          unreadCount: 0
        });
      });
      
      // Sort chats by most recent message
      chatsList.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
      
      setUserChats(chatsList);
      setLoadingChats(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-create test chat if none exist
  useEffect(() => {
    if (!loading && chats.length === 0 && !creating) {
      createWelcomeChat();
    }
  }, [loading, chats.length]);

  // Function to create a welcome chat
  const createWelcomeChat = async () => {
    try {
      setCreating(true);
      console.log('Creating welcome chat...');
      const chatId = await createTestChat();
      
      if (chatId) {
        console.log(`Welcome chat created with ID: ${chatId}`);
        // Chat list will update automatically via listener
      }
    } catch (error) {
      console.error('Failed to create welcome chat:', error);
    } finally {
      setCreating(false);
    }
  };

  // Register a test user account
  const registerTestUser = async () => {
    try {
      setRegistering(true);
      
      // Generate random email to avoid conflicts
      const randomNum = Math.floor(Math.random() * 10000);
      const email = `test${randomNum}@example.com`;
      const password = 'password123';
      const displayName = `Test User ${randomNum}`;
      
      // Create user in Firebase Auth
      console.log(`Registering test user: ${email}`);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile
      await updateProfile(userCredential.user, {
        displayName
      });
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: displayName,
        email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`,
        createdAt: serverTimestamp(),
        status: 'Available'
      });
      
      Alert.alert('Success', `Registered and logged in as ${displayName}`);
      
    } catch (error: unknown) {
      console.error('Error registering test user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to register test user';
      Alert.alert('Error', errorMessage);
    } finally {
      setRegistering(false);
    }
  };

  if (loadingChats || creating) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 10, color: Colors.gray }}>
          {creating ? 'Creating your first chat...' : 'Loading chats...'}
        </Text>
      </View>
    );
  }

  if (userChats.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="chatbubble-outline" size={80} color={Colors.lightGray} />
        <Text style={{ fontSize: 18, fontWeight: '500', marginTop: 20 }}>No chats yet</Text>
        <Text style={{ fontSize: 16, color: Colors.gray, marginTop: 10, textAlign: 'center', paddingHorizontal: 20 }}>
          Start a new conversation or try creating a test chat
        </Text>
        
        <View style={{ flexDirection: 'row', marginTop: 30, flexWrap: 'wrap', justifyContent: 'center' }}>
          <TouchableOpacity 
            style={{
              backgroundColor: Colors.primary,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 20,
              margin: 10,
              flexDirection: 'row',
              alignItems: 'center'
            }}
            onPress={() => router.push('/(modals)/new-chat')}
          >
            <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 5 }} />
            <Text style={{ color: '#fff', fontWeight: '500' }}>New Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{
              backgroundColor: Colors.lightGray,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 20,
              margin: 10,
              flexDirection: 'row',
              alignItems: 'center'
            }}
            onPress={createWelcomeChat}
          >
            <Ionicons name="help-circle-outline" size={20} color={Colors.gray} style={{ marginRight: 5 }} />
            <Text style={{ color: Colors.gray, fontWeight: '500' }}>Test Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{
              backgroundColor: '#4caf50',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 20,
              margin: 10,
              flexDirection: 'row',
              alignItems: 'center'
            }}
            onPress={registerTestUser}
            disabled={registering}
          >
            {registering ? (
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 5 }} />
            ) : (
              <Ionicons name="person-add" size={20} color="#fff" style={{ marginRight: 5 }} />
            )}
            <Text style={{ color: '#fff', fontWeight: '500' }}>Register Test User</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 40, flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={userChats}
        renderItem={({ item }) => <ChatRow {...item} />}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => (
          <View style={[defaultStyles.separator, { marginLeft: 90 }]} />
        )}
        scrollEnabled={false}
      />
    </ScrollView>
  );
};
export default Page;
