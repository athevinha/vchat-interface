import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import { TouchableOpacity, View, Text, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';

const Layout = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [otherUser, setOtherUser] = useState<any>(null);

  useEffect(() => {
    const fetchOtherUser = async () => {
      if (!id || !auth.currentUser) return;
      
      try {
        // Get chat document
        const chatDoc = await getDoc(doc(db, 'chats', id as string));
        if (!chatDoc.exists()) return;
        
        const chatData = chatDoc.data();
        
        // Find other user
        const otherUserId = chatData.participantIds.find((pid: string) => pid !== auth.currentUser?.uid);
        if (!otherUserId) return;
        
        // Get other user info
        const userDoc = await getDoc(doc(db, 'users', otherUserId));
        console.log(userDoc.data())
        setOtherUser(userDoc.data());
      } catch (error) {
        console.error('Error fetching other user:', error);
      }
    };
    
    fetchOtherUser();
  }, [id]);

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Chats',
          headerLargeTitle: true,
          headerTransparent: true,
          headerBlurEffect: 'regular',
          headerLeft: () => (
            <TouchableOpacity>
              <Ionicons
                name="ellipsis-horizontal-circle-outline"
                color={Colors.primary}
                size={30}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 30 }}>
              <TouchableOpacity>
                <Ionicons name="camera-outline" color={Colors.primary} size={30} />
              </TouchableOpacity>
              {/* <Link href="/(modals)/new-chat" asChild>
                <TouchableOpacity>
                  <Ionicons name="add-circle" color={Colors.primary} size={30} />
                </TouchableOpacity>
              </Link> */}
            </View>
          ),
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerSearchBarOptions: {
            placeholder: 'Search',
          },
        }}
      />

      <Stack.Screen
        name="[id]"
        options={{
          title: '',
          headerBackTitleVisible: false,
          headerTitle: () => (
            <View
              style={{
                flexDirection: 'row',
                width: 220,
                alignItems: 'center',
                gap: 10,
                paddingBottom: 4,
              }}>
              <Image
                source={{
                  uri: otherUser?.avatar || `https://avatars.githubusercontent.com/u/${171532562 + Math.floor(Math.random() * 1000)}`,
                }}
                style={{ width: 40, height: 40, borderRadius: 50 }}
              />
              <Text style={{ fontSize: 16, fontWeight: '500' }}>{otherUser?.name || 'User'}</Text>
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 30 }}>
              <TouchableOpacity>
                <Ionicons name="videocam-outline" color={Colors.primary} size={30} />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons name="call-outline" color={Colors.primary} size={30} />
              </TouchableOpacity>
            </View>
          ),
          headerStyle: {
            backgroundColor: Colors.background,
          },
        }}
      />
    </Stack>
  );
};
export default Layout;
