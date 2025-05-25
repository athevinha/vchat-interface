import { View, Text, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { db, auth } from '@/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { Image } from 'react-native';

interface Message {
  id: string;
  text: string;
  createdAt: any;
  userId: string;
  userName: string;
}

interface ChatParticipant {
  displayName: string;
  photoURL: string;
}

interface ChatData {
  participantIds: string[];
  participantInfo: {
    [key: string]: ChatParticipant;
  };
  lastMessage: {
    text: string;
    createdAt: any;
    senderId: string;
  };
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [otherUser, setOtherUser] = useState<ChatParticipant | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    const fetchChatData = async () => {
      try {
        const chatDocRef = doc(db, 'chats', id as string);
        const chatDocSnap = await getDoc(chatDocRef);
        
        if (chatDocSnap.exists()) {
          const data = chatDocSnap.data() as ChatData;
          setChatData(data);
          
          // Find the other participant
          const currentUserId = auth.currentUser?.uid;
          if (currentUserId) {
            const otherUserId = data.participantIds.find(pid => pid !== currentUserId);
            if (otherUserId) {
              setOtherUser(data.participantInfo[otherUserId]);
            }
          }
        } else {
          console.log('Chat not found');
          router.back();
        }
      } catch (error) {
        console.error('Error fetching chat:', error);
      }
    };

    fetchChatData();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, 'chats', id as string, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData: Message[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messagesData.push({
          id: doc.id,
          text: data.text || '',
          createdAt: data.createdAt,
          userId: data.userId || '',
          userName: data.userName || 'Unknown'
        });
      });
      
      setMessages(messagesData);
      setLoading(false);
      
      // Scroll to bottom on new messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'chats', id as string, 'messages'), {
        text: newMessage,
        createdAt: serverTimestamp(),
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'You'
      });

      // Update the last message in the chat document
      const chatDocRef = doc(db, 'chats', id as string);
      await getDoc(chatDocRef); // Just to make sure the document exists
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: otherUser?.displayName || 'Chat',
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: '#fff',
        }}
      />
      
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isCurrentUser = item.userId === auth.currentUser?.uid;
            
            return (
              <View style={[
                styles.messageContainer,
                isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
              ]}>
                {!isCurrentUser && (
                  <Image
                    source={{ uri: otherUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.displayName || 'User')}` }}
                    style={styles.avatar}
                  />
                )}
                <View style={[
                  styles.messageBubble,
                  isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
                ]}>
                  <Text style={[
                    styles.messageText,
                    isCurrentUser ? styles.currentUserText : styles.otherUserText
                  ]}>
                    {item.text}
                  </Text>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.messagesContainer}
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons
              name="send"
              size={24}
              color={newMessage.trim() ? Colors.primary : '#ccc'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    padding: 10,
    paddingBottom: 20,
  },
  messageContainer: {
    marginVertical: 5,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currentUserMessage: {
    justifyContent: 'flex-end',
  },
  otherUserMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  currentUserBubble: {
    backgroundColor: Colors.primary,
    marginLeft: 40,
  },
  otherUserBubble: {
    backgroundColor: '#fff',
    marginRight: 10,
  },
  messageText: {
    fontSize: 16,
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#000',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    padding: 10,
  },
}); 