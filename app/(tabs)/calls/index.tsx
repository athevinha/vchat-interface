import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where
} from 'firebase/firestore';
import { db, auth } from '@/firebase';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { defaultStyles } from '@/constants/Styles';

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
        querySnapshot.forEach((doc:any) => {
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

  const startCall = (userId: string, userName: string) => {
    // TODO: Implement call functionality
    console.log('Starting call with:', userName);
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
        <Text style={styles.title}>Calls</Text>
        <Text style={styles.subtitle}>All users ({users.length})</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.userRow}
            onPress={() => startCall(item.id, item.name)}
          >
            <Image 
              source={{ uri: item.avatar }} 
              style={styles.avatar} 
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userStatus}>{item.status || 'Available'}</Text>
            </View>
            <View style={styles.callButtons}>
              <TouchableOpacity 
                style={[styles.callButton, styles.videoCallButton]}
                onPress={() => startCall(item.id, item.name)}
              >
                <Ionicons name="videocam" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.callButton, styles.audioCallButton]}
                onPress={() => startCall(item.id, item.name)}
              >
                <Ionicons name="call" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
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
  callButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCallButton: {
    backgroundColor: Colors.primary,
  },
  audioCallButton: {
    backgroundColor: '#4CAF50',
  },
});

export default Page;
