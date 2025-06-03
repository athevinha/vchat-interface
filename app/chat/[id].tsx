import { View, Text, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList, Modal, Dimensions, ImageBackground } from 'react-native';
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
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInDown, 
  SlideOutDown,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  createdAt: any;
  userId: string;
  userName: string;
  type?: 'text' | 'emoji' | 'sticker';
  stickerUrl?: string;
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

// Emoji categories
const emojiCategories = [
  { id: 'recent', icon: 'time-outline', label: 'Recent' },
  { id: 'smileys', icon: 'happy-outline', label: 'Smileys & Emotion' },
  { id: 'animals', icon: 'paw-outline', label: 'Animals & Nature' },
  { id: 'food', icon: 'restaurant-outline', label: 'Food & Drink' },
  { id: 'activities', icon: 'football-outline', label: 'Activities' },
  { id: 'travel', icon: 'airplane-outline', label: 'Travel & Places' },
  { id: 'objects', icon: 'bulb-outline', label: 'Objects' },
  { id: 'symbols', icon: 'heart-outline', label: 'Symbols' },
  { id: 'flags', icon: 'flag-outline', label: 'Flags' },
];

// Sample emojis for each category
const emojis: { [key: string]: string[] } = {
  recent: ['😊', '❤️', '👍'],
  smileys: ['😀', '😂', '😍', '😊', '😢'],
  animals: ['🐶', '🐱', '🐼'],
  food: ['🍎', '🍕', '🍔'],
  activities: ['⚽️', '🏀', '🎮'],
  travel: ['✈️', '🚗', '🏖️'],
  objects: ['⌚️', '📱', '💡'],
  symbols: ['❤️', '✨', '✅'],
  flags: ['🇺🇸', '🇨🇦', '🇬🇧'],
};

// Sticker data with categories
const stickers: { [key: string]: { id: string; url: string }[] } = {
  animals: [
    { id: '1', url: 'https://cdn-icons-png.flaticon.com/512/742/742751.png' },
    { id: '2', url: 'https://cdn-icons-png.flaticon.com/512/742/742920.png' },
    { id: '3', url: 'https://cdn-icons-png.flaticon.com/512/742/742922.png' },
  ],
  emotions: [
    { id: '4', url: 'https://cdn-icons-png.flaticon.com/512/742/742923.png' },
    { id: '5', url: 'https://cdn-icons-png.flaticon.com/512/742/742924.png' },
    { id: '6', url: 'https://cdn-icons-png.flaticon.com/512/742/742925.png' },
  ],
  food: [
    { id: '7', url: 'https://cdn-icons-png.flaticon.com/512/742/742926.png' },
    { id: '8', url: 'https://cdn-icons-png.flaticon.com/512/742/742927.png' },
    { id: '9', url: 'https://cdn-icons-png.flaticon.com/512/742/742928.png' },
  ],
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [otherUser, setOtherUser] = useState<ChatParticipant | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState('recent');
  const [selectedStickerCategory, setSelectedStickerCategory] = useState('animals');
  const emojiScale = useSharedValue(1);
  const stickerScale = useSharedValue(1);

  const emojiAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  const stickerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stickerScale.value }],
  }));

  const handleEmojiPress = (emoji: string) => {
    emojiScale.value = withSpring(1.2, {}, () => {
      emojiScale.value = withSpring(1);
    });
    onEmojiSelected(emoji);
  };

  const handleStickerPress = (stickerUrl: string) => {
    stickerScale.value = withSpring(1.2, {}, () => {
      stickerScale.value = withSpring(1);
    });
    onStickerSelected(stickerUrl);
  };

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
            } else if (data.participantIds.length === 1 && data.participantIds[0] === currentUserId) {
              // Handle case where user is in a chat with themselves (e.g., saved messages)
               setOtherUser({ displayName: 'Saved Messages', photoURL: '' });
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

    const unsubscribe = onSnapshot(q, (querySnapshot: any) => {
      const messagesData: Message[] = [];
      querySnapshot.forEach((doc: any) => {
        const data = doc.data();
        messagesData.push({
          id: doc.id,
          text: data.text || '',
          createdAt: data.createdAt,
          userId: data.userId || '',
          userName: data.userName || 'Unknown',
          type: data.type || 'text',
          stickerUrl: data.stickerUrl || undefined,
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
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'You',
        type: 'text'
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const onEmojiSelected = async (emoji: string) => {
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'chats', id as string, 'messages'), {
        text: emoji,
        createdAt: serverTimestamp(),
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'You',
        type: 'emoji'
      });
      
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending emoji:', error);
    }
  };

  const onStickerSelected = async (stickerUrl: string) => {
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'chats', id as string, 'messages'), {
        text: '',
        createdAt: serverTimestamp(),
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'You',
        type: 'sticker',
        stickerUrl
      });
      
      setShowStickerPicker(false);
    } catch (error) {
      console.error('Error sending sticker:', error);
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
      <ImageBackground 
        source={{ uri: 'https://i.pinimg.com/originals/8f/d1/24/8fd1242c2a749574a019ed2afefb5731.jpg' }} // Replace with your background image URL
        style={styles.container}
        imageStyle={styles.backgroundImage}
      >
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
                {!isCurrentUser && otherUser?.photoURL && (
                  <Image
                    source={{ uri: otherUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.displayName || 'User')}` }}
                    style={styles.avatar}
                  />
                )}
                <View style={[
                  styles.messageBubble,
                  isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
                ]}>
                  {item.type === 'sticker' && item.stickerUrl && (
                    <Image
                      source={{ uri: item.stickerUrl }}
                      style={styles.sticker}
                      resizeMode="contain"
                    />
                  )}
                  {item.type === 'emoji' && (
                    <Text style={styles.emojiText}>{item.text}</Text>
                  )}
                  {item.type === 'text' && item.text && (
                    <Text style={[
                      styles.messageText,
                      isCurrentUser ? styles.currentUserText : styles.otherUserText
                    ]}>
                      {item.text}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.messagesContainer}
        />
        
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => setShowEmojiPicker(true)}
          >
            <Ionicons name="happy-outline" size={24} color={Colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => setShowStickerPicker(true)}
          >
            <Ionicons name="images-outline" size={24} color={Colors.gray} />
          </TouchableOpacity>
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
              color={newMessage.trim() ? Colors.primary : Colors.gray}
            />
          </TouchableOpacity>
        </View>

        <Modal
          visible={showEmojiPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEmojiPicker(false)}
        >
          <Animated.View 
            entering={SlideInDown} 
            exiting={SlideOutDown}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Emojis</Text>
                <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                  <Ionicons name="close" size={24} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.categoryContainer}>
                <FlatList
                  data={emojiCategories}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.categoryButton,
                        selectedEmojiCategory === item.id && styles.selectedCategory
                      ]}
                      onPress={() => setSelectedEmojiCategory(item.id)}
                    >
                      <Ionicons 
                        name={item.icon as any} 
                        size={24} 
                        color={selectedEmojiCategory === item.id ? Colors.primary : Colors.gray} 
                      />
                    </TouchableOpacity>
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 10 }}
                />
              </View>

              <View style={styles.emojiGridContainer}>
                <FlatList
                  data={emojis[selectedEmojiCategory]}
                  keyExtractor={(_, index) => index.toString()}
                  renderItem={({ item, index }) => (
                    <Animated.View
                      entering={FadeIn.delay(index * 10)}
                      style={styles.emojiButtonContainer}
                    >
                      <TouchableOpacity
                        style={styles.emojiButton}
                        onPress={() => handleEmojiPress(item)}
                      >
                        <Text style={styles.emojiText}>{item}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                  numColumns={8}
                  key={selectedEmojiCategory} // Important for re-rendering on category change
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ padding: 10 }}
                />
              </View>
            </View>
          </Animated.View>
        </Modal>

        <Modal
          visible={showStickerPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowStickerPicker(false)}
        >
          <Animated.View 
            entering={SlideInDown} 
            exiting={SlideOutDown}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Stickers</Text>
                <TouchableOpacity onPress={() => setShowStickerPicker(false)}>
                  <Ionicons name="close" size={24} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.categoryContainer}>
                <FlatList
                  data={Object.keys(stickers)}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.categoryButton,
                        selectedStickerCategory === item && styles.selectedCategory
                      ]}
                      onPress={() => setSelectedStickerCategory(item)}
                    >
                      <Text style={[
                        styles.categoryText,
                        selectedStickerCategory === item && styles.selectedCategoryText
                      ]}>
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 10 }}
                />
              </View>

              <View style={styles.stickerGridContainer}>
                <FlatList
                  data={stickers[selectedStickerCategory]}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => (
                    <Animated.View
                      entering={FadeIn.delay(index * 10)}
                      style={styles.stickerItem}
                    >
                      <TouchableOpacity
                        style={styles.stickerItemButton}
                        onPress={() => handleStickerPress(item.url)}
                      >
                        <Image
                          source={{ uri: item.url }}
                          style={styles.stickerPreview}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                  numColumns={3}
                  key={selectedStickerCategory} // Important for re-rendering on category change
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ padding: 10 }}
                />
              </View>
            </View>
          </Animated.View>
        </Modal>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    resizeMode: 'repeat', // Or 'cover', 'stretch'
    opacity: 0.1, // Adjust opacity to make it subtle like WhatsApp
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    paddingHorizontal: 10,
    paddingVertical: 20, // Added vertical padding
  },
  messageContainer: {
    marginVertical: 2, // Reduced vertical margin slightly
    flexDirection: 'row',
  },
  currentUserMessage: {
    justifyContent: 'flex-end',
  },
  otherUserMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    borderRadius: 15, // Slightly less rounded corners
    paddingHorizontal: 12, // Adjusted padding
    paddingVertical: 8, // Adjusted padding
    maxWidth: '80%',
    minHeight: 30, // Minimum height for small messages
    justifyContent: 'center', // Center content vertically
  },
  currentUserBubble: {
    backgroundColor: Colors.primary, // Primary color for current user
    marginLeft: 40,
    alignSelf: 'flex-end', // Align bubble to the right
  },
  otherUserBubble: {
    backgroundColor: '#fff', // White background for other user
    marginRight: 40,
    alignSelf: 'flex-start', // Align bubble to the left
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
    marginBottom: 5, // Align avatar to the bottom of the message
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Align items to the bottom
    paddingHorizontal: 10,
    paddingVertical: 8, // Adjusted vertical padding
    backgroundColor: Colors.background, // Use background color
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.lightGray, // Lighter background for input
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10, // Adjusted vertical padding
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    padding: 10,
    justifyContent: 'center', // Center icon vertically
  },
  attachButton: {
    padding: 10,
    justifyContent: 'center', // Center icon vertically
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
    overflow: 'hidden', // Ensure content stays within bounds
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    marginRight: 10,
    justifyContent: 'center', // Center icon/text vertically
    alignItems: 'center', // Center icon/text horizontally
  },
  selectedCategory: {
    backgroundColor: Colors.primary + '20',
  },
  categoryText: {
    fontSize: 14,
    color: Colors.gray,
  },
  selectedCategoryText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  emojiGridContainer: {
    flex: 1, // Allow emoji grid to take available space
  },
  emojiButtonContainer: {
    width: width / 8, // Fixed width based on columns
    height: width / 8, // Keep aspect ratio
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButton: {
    width: '100%', // Make button fill container
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 28, // Increased emoji size
  },
  stickerGridContainer: {
    flex: 1, // Allow sticker grid to take available space
  },
  stickerItem: {
    width: width / 3, // Fixed width based on columns
    height: width / 3, // Keep aspect ratio
    padding: 5,
  },
  stickerItemButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickerPreview: {
    width: '100%',
    height: '100%',
  },
  sticker: {
    width: 120, // Slightly larger stickers in chat
    height: 120,
  },
}); 