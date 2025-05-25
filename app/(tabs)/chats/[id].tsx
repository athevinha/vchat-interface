import ChatMessageBox from '@/components/ChatMessageBox';
import ReplyMessageBar from '@/components/ReplyMessageBar';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ImageBackground, StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import {
  GiftedChat,
  Bubble,
  InputToolbar,
  Send,
  SystemMessage,
  IMessage,
} from 'react-native-gifted-chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useChat from '@/hooks/useChat';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';

const Page = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [chatData, setChatData] = useState<any>(null);

  const [replyMessage, setReplyMessage] = useState<IMessage | null>(null);
  const swipeableRowRef = useRef<Swipeable | null>(null);

  // Fetch chat data
  useEffect(() => {
    const fetchChatData = async () => {
      try {
        if (!id) return;
        
        const chatDocRef = doc(db, 'chats', id);
        const chatDocSnap = await getDoc(chatDocRef);
        
        if (chatDocSnap.exists()) {
          const data = chatDocSnap.data();
          setChatData(data);
        } else {
          console.error('Chat not found');
        }
      } catch (error) {
        console.error('Error fetching chat:', error);
      }
    };

    fetchChatData();
  }, [id]);

  // Load messages
  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, 'chats', id, 'messages'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData: IMessage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Convert Firestore timestamp to Date
        const createdAt = data.createdAt ? 
          (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : 
          new Date();
        
        messagesData.push({
          _id: doc.id,
          text: data.text || '',
          createdAt,
          user: {
            _id: data.userId || '',
            name: data.userName || 'Unknown',
            avatar: data.userAvatar
          }
        });
      });
      
      setMessages(messagesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    if (newMessages.length === 0 || !user) return;
    
    try {
      const message = newMessages[0];
      
      // Add message to Firestore
      await addDoc(collection(db, 'chats', id, 'messages'), {
        text: message.text,
        createdAt: serverTimestamp(),
        userId: user.uid,
        userName: user.displayName || 'You',
        userAvatar: user.photoURL
      });
      
      // Update last message in chat document
      await updateDoc(doc(db, 'chats', id), {
        lastMessage: {
          text: message.text,
          createdAt: serverTimestamp(),
          senderId: user.uid
        },
        updatedAt: serverTimestamp()
      });
      
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }, [id, user]);

  const renderInputToolbar = (props: any) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={{ backgroundColor: Colors.background }}
        renderActions={() => (
          <View style={{ height: 44, justifyContent: 'center', alignItems: 'center', left: 5 }}>
            <Ionicons name="add" color={Colors.primary} size={28} />
          </View>
        )}
      />
    );
  };

  const updateRowRef = useCallback(
    (ref: any) => {
      if (
        ref &&
        replyMessage &&
        ref.props.children.props.currentMessage?._id === replyMessage._id
      ) {
        swipeableRowRef.current = ref;
      }
    },
    [replyMessage]
  );

  useEffect(() => {
    if (replyMessage && swipeableRowRef.current) {
      swipeableRowRef.current.close();
      swipeableRowRef.current = null;
    }
  }, [replyMessage]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Get other user's name for the chat title
  const getOtherUserName = () => {
    if (!chatData || !user) return 'Chat';
    
    const otherUserId = chatData.participantIds?.find((pid: string) => pid !== user.uid);
    if (!otherUserId) return 'Chat';
    
    return chatData.participantInfo?.[otherUserId]?.displayName || 'User';
  };

  return (
    <ImageBackground
      source={require('@/assets/images/pattern.png')}
      style={{
        flex: 1,
        backgroundColor: Colors.background,
        marginBottom: insets.bottom,
      }}>
      <GiftedChat
        messages={messages}
        onSend={onSend}
        onInputTextChanged={setText}
        user={{
          _id: user?.uid || '1',
          name: user?.displayName || 'User',
          avatar: user?.photoURL || undefined
        }}
        renderSystemMessage={(props) => (
          <SystemMessage {...props} textStyle={{ color: Colors.gray }} />
        )}
        bottomOffset={insets.bottom}
        renderAvatar={null}
        maxComposerHeight={100}
        textInputProps={styles.composer}
        renderBubble={(props) => {
          return (
            <Bubble
              {...props}
              textStyle={{
                right: {
                  color: '#000',
                },
              }}
              wrapperStyle={{
                left: {
                  backgroundColor: '#fff',
                },
                right: {
                  backgroundColor: Colors.lightGreen,
                },
              }}
            />
          );
        }}
        renderSend={(props) => (
          <View
            style={{
              height: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              paddingHorizontal: 14,
            }}>
            {text === '' && (
              <>
                <Ionicons name="camera-outline" color={Colors.primary} size={28} />
                <Ionicons name="mic-outline" color={Colors.primary} size={28} />
              </>
            )}
            {text !== '' && (
              <Send
                {...props}
                containerStyle={{
                  justifyContent: 'center',
                }}>
                <Ionicons name="send" color={Colors.primary} size={28} />
              </Send>
            )}
          </View>
        )}
        renderInputToolbar={renderInputToolbar}
        renderChatFooter={() => (
          <ReplyMessageBar clearReply={() => setReplyMessage(null)} message={replyMessage} />
        )}
        onLongPress={(context, message) => setReplyMessage(message)}
        renderMessage={(props) => (
          <ChatMessageBox
            {...props}
            setReplyOnSwipeOpen={setReplyMessage}
            updateRowRef={updateRowRef}
          />
        )}
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  composer: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    paddingHorizontal: 10,
    paddingTop: 8,
    fontSize: 16,
    marginVertical: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background
  }
});

export default Page;
