import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '@/firebase';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { defaultStyles } from '@/constants/Styles';
import { router } from 'expo-router';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status?: string;
}

const Page = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '!=', currentUser.email));
        const querySnapshot = await getDocs(q);
        
        const usersData: User[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data) {
            usersData.push({
              id: doc.id,
              name: data.name || '',
              email: data.email || '',
              avatar: data.avatar || '',
              status: data.status || 'Available'
            });
          }
        });
        
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const startChat = async (userId: string, userName: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      // Check if a chat already exists
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('participantIds', 'array-contains', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      let existingChatId: string | null = null;
      
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        if (chatData && chatData.participantIds.includes(userId)) {
          existingChatId = doc.id;
        }
      });
      
      if (existingChatId) {
        // Navigate to existing chat
        router.push({
          pathname: "/chat/[id]",
          params: { id: existingChatId }
        });
      } else {
        // Create a new chat
        const newChat = await addDoc(collection(db, 'chats'), {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          participantIds: [currentUser.uid, userId],
          participantInfo: {
            [currentUser.uid]: {
              displayName: currentUser.displayName || 'You',
              photoURL: currentUser.photoURL
            },
            [userId]: {
              displayName: userName,
              photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}`
            }
          },
          lastMessage: {
            text: 'Hello',
            createdAt: serverTimestamp(),
            senderId: currentUser.uid
          }
        });
        
        // Add first message
        await addDoc(collection(db, 'chats', newChat.id, 'messages'), {
          text: 'Hello',
          createdAt: serverTimestamp(),
          userId: currentUser.uid,
          userName: currentUser.displayName || 'You'
        });
        
        router.push({
          pathname: "/chat/[id]",
          params: { id: newChat.id }
        });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <Text style={styles.subtitle}>All users ({users.length})</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.userRow}
            onPress={() => startChat(item.id, item.name)}
          >
            <Image 
              source={{ uri: item.avatar }} 
              style={styles.avatar} 
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userStatus}>{item.status || 'Available'}</Text>
            </View>
            <Ionicons name="chatbubble-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => (
          <View style={[defaultStyles.separator, { marginLeft: 70 }]} />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: Colors.gray,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray,
    marginTop: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
  },
  userStatus: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },
});

export default Page;
