import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, SectionList } from 'react-native';
import Colors from '@/constants/Colors';
import { defaultStyles } from '@/constants/Styles';
import { useEffect, useState } from 'react';
import useChats from '@/hooks/useChats';
import useUsers from '@/hooks/useUsers';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@/hooks/useUsers';

const Page = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { createChat, loading: chatLoading } = useChats();
  const { 
    users, 
    recommendedUsers, 
    searchUsers, 
    refreshRecommendedUsers,
    loading: usersLoading, 
    error: userError, 
    createTestUser 
  } = useUsers();
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  console.log('NewChat rendered, users:', users.length, 'recommended:', recommendedUsers.length, 'error:', userError);

  // Handle search query changes
  useEffect(() => {
    searchUsers(searchQuery);
  }, [searchQuery]);

  // Log errors from hooks
  useEffect(() => {
    if (userError) {
      console.error('User error:', userError);
      setError(userError);
    }
  }, [userError]);

  // Create test users if none available
  useEffect(() => {
    if (!usersLoading && users.length === 0) {
      console.log('No users found, creating test users');
      createTestUser();
    }
  }, [usersLoading, users.length]);

  // Refresh recommended users
  const handleRefreshRecommended = async () => {
    setRefreshing(true);
    await refreshRecommendedUsers();
    setRefreshing(false);
  };

  const handleUserPress = (user: User) => {
    console.log('User selected:', user.name);
    setSelectedUser(user);
  };

  const handleStartChat = async () => {
    console.log('Starting chat with:', selectedUser?.name);
    
    if (!selectedUser) {
      Alert.alert('Error', 'Please select a user');
      return;
    }
    
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      setError(null);
      // Add timeout for better user experience
      setTimeout(async () => {
        try {
          const chatId = await createChat(selectedUser.id, message);
          console.log('Chat created with ID:', chatId);
          
          if (chatId) {
            router.push(`/(tabs)/chats/${chatId}`);
          } else {
            throw new Error('Failed to create chat - no chat ID returned');
          }
        } catch (err: any) {
          console.error('Chat creation error:', err.message);
          setError(err.message);
          Alert.alert('Error', `Failed to create chat: ${err.message}`);
        }
      }, 500);
    } catch (err: any) {
      console.error('Chat creation error:', err.message);
      setError(err.message);
      Alert.alert('Error', `Failed to create chat: ${err.message}`);
    }
  };

  // Try to create chat with test user if nothing works
  const handleFallbackChat = () => {
    setError(null);
    createTestUser();
    
    // Use timeout to ensure test users are loaded
    setTimeout(() => {
      if (users.length > 0) {
        setSelectedUser(users[0]);
        setMessage("Hi there! This is a test message.");
      }
    }, 500);
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      onPress={() => handleUserPress(item)}
      style={styles.userTouchable}
    >
      <View style={styles.listItemContainer}>
        <Image 
          source={{ uri: item.avatar }} 
          style={styles.listItemImage} 
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
      </View>
      <View style={[defaultStyles.separator, { marginLeft: 60 }]} />
    </TouchableOpacity>
  );

  // Display any errors at the top of the screen
  const renderError = () => {
    if (!error) return null;
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={() => setError(null)}>
          <Ionicons name="close-circle" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  // Create sections for the contacts list
  const sections = searchQuery 
    ? [{ title: 'Search Results', data: users }]
    : [
        { title: 'Recommended', data: recommendedUsers },
        { title: 'All Contacts', data: users }
      ];

  return (
    <View style={styles.container}>
      {renderError()}
      {selectedUser ? (
        <View style={styles.messageContainer}>
          <View style={styles.contactHeader}>
            <Image 
              source={{ uri: selectedUser.avatar }} 
              style={styles.selectedUserImage}
            />
            <Text style={styles.contactName}>{selectedUser.name}</Text>
            <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.backButton}>
              <Ionicons name="close-circle" size={24} color={Colors.gray} />
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.messageInput}
            placeholder="Type your first message..."
            value={message}
            onChangeText={setMessage}
            multiline
            autoFocus
          />
          
          <TouchableOpacity 
            style={[styles.sendButton, !message.trim() && styles.disabledButton]} 
            onPress={handleStartChat}
            disabled={!message.trim() || chatLoading}
          >
            {chatLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Start Chat</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.gray} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={Colors.gray} />
              </TouchableOpacity>
            )}
          </View>

          {usersLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading users...</Text>
            </View>
          ) : users.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={50} color={Colors.lightGray} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No users found' : 'No users available'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try a different search term' : 'Invite friends to use VChat!'}
              </Text>
              <TouchableOpacity 
                style={styles.fallbackButton}
                onPress={handleFallbackChat}
              >
                <Text style={styles.fallbackButtonText}>Try with test user</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <SectionList
              sections={sections}
              renderItem={renderUserItem}
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{title}</Text>
                  {title === 'Recommended' && (
                    <TouchableOpacity 
                      onPress={handleRefreshRecommended}
                      disabled={refreshing}
                      style={styles.refreshButton}
                    >
                      {refreshing ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <Ionicons name="refresh" size={16} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
              keyExtractor={(item) => item.id}
              stickySectionHeadersEnabled={false}
              contentContainerStyle={styles.usersList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 110,
    backgroundColor: Colors.background,
  },
  errorContainer: {
    backgroundColor: '#f44336',
    padding: 10,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    flex: 1,
    marginRight: 10,
  },
  searchContainer: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  usersList: {
    paddingBottom: 50,
  },
  userTouchable: {
    backgroundColor: '#fff',
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  listItemImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  userEmail: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: Colors.gray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  fallbackButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  fallbackButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  messageContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedUserImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 15,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  backButton: {
    padding: 5,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    flexDirection: 'row',
    height: 50,
  },
  disabledButton: {
    backgroundColor: Colors.lightGray,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: Colors.background,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray,
  },
  refreshButton: {
    padding: 5,
  },
});

export default Page;
