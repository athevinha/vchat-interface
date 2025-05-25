import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  limit,
  getDocs,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status?: string;
  createdAt?: any; // Using any for the timestamp to avoid type issues
}

// Default support user ID (constant)
export const SUPPORT_USER_ID = 'vchat-support-user';

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create default support user if it doesn't exist
  const createSupportUser = async () => {
    try {
      console.log('Checking if support user exists...');
      const supportUserRef = doc(db, 'users', SUPPORT_USER_ID);
      const supportUserDoc = await getDoc(supportUserRef);
      
      if (!supportUserDoc.exists()) {
        console.log('Creating VChat Support user in database...');
        await setDoc(supportUserRef, {
          name: 'VChat Support',
          email: 'support@vchat.com',
          avatar: 'https://ui-avatars.com/api/?name=VChat+Support&background=5856d6&color=fff',
          createdAt: serverTimestamp(),
          status: 'Available'
        });
        console.log('Support user created successfully');
      } else {
        console.log('Support user already exists');
        // Ensure the support user has the correct data
        const supportData = supportUserDoc.data();
        if (!supportData.avatar || !supportData.email) {
          console.log('Updating support user with complete information');
          await setDoc(supportUserRef, {
            name: 'VChat Support',
            email: 'support@vchat.com',
            avatar: 'https://ui-avatars.com/api/?name=VChat+Support&background=5856d6&color=fff',
            updatedAt: serverTimestamp(),
            status: 'Available'
          }, { merge: true });
        }
      }
      
      // Return support user data for immediate use
      return {
        id: SUPPORT_USER_ID,
        name: 'VChat Support',
        email: 'support@vchat.com',
        avatar: 'https://ui-avatars.com/api/?name=VChat+Support&background=5856d6&color=fff',
        status: 'Available'
      };
    } catch (err) {
      console.error('Error creating support user:', err);
      return null;
    }
  };

  // Load all users from Firestore - no filtering to ensure all accounts are visible
  const loadAllUsers = async () => {
    try {
      console.log('Loading ALL users from Firestore');
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('name'), limit(50));
      const querySnapshot = await getDocs(q);
      
      const fetchedUsers: User[] = querySnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unknown User',
          email: data.email || '',
          avatar: data.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(data.name || 'User'),
          status: data.status || 'Available',
          createdAt: data.createdAt
        };
      });
      
      console.log(`Loaded ${fetchedUsers.length} users from Firestore`);
      console.log(fetchedUsers);
      // Add support user if not present
      if (!fetchedUsers.some(user => user.id === SUPPORT_USER_ID)) {
        const supportUser = await createSupportUser();
        if (supportUser) {
          fetchedUsers.push(supportUser);
        }
      }
      
      // Don't filter out current user - we want to see all users
      return fetchedUsers;
    } catch (err) {
      console.error('Error loading all users:', err);
      return [];
    }
  };

  // Load users
  useEffect(() => {
    console.log('useUsers hook: Loading users');
    
    // Always load test users immediately to ensure UI shows something
    createTestUser();
    
    // Create the support user in the database (async)
    createSupportUser().then(supportUser => {
      if (supportUser) {
        console.log('Support user ready:', supportUser.name);
      }
    });
    
    // If not logged in, just use test users
    if (!auth.currentUser) {
      console.log('useUsers hook: No current user, using test users only');
      setLoading(false);
      return;
    }

    // Load all users immediately
    loadAllUsers().then(allUsers => {
      if (allUsers.length > 0) {
        setUsers(allUsers);
        setFilteredUsers(allUsers);
        getRecommendedUsers(allUsers);
        setLoading(false);
      }
    });

    try {
      setLoading(true);
      // Modified query to fetch ALL users, not just current user's contacts
      const q = query(
        collection(db, 'users'),
        orderBy('name'),
        limit(50) // Increased limit to get more users
      );

      console.log('useUsers hook: Setting up Firestore listener');
      const unsubscribe = onSnapshot(
        q, 
        (querySnapshot: any) => {
          console.log(`useUsers hook: Got ${querySnapshot.docs.length} users from Firestore`);
          const fetchedUsers: User[] = querySnapshot.docs
            .map((doc: any) => {
              const data = doc.data();
              return {
                id: doc.id,
                name: data.name || 'Unknown User',
                email: data.email || '',
                avatar: data.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(data.name || 'User'),
                status: data.status || 'Available',
                createdAt: data.createdAt
              };
            });
            // Remove filter to see all users including current user
            // .filter((user: any) => user.id !== auth.currentUser?.uid);
          
          console.log(`useUsers hook: Found ${fetchedUsers.length} users in Firestore`);
          
          if (fetchedUsers.length === 0) {
            // No users found, ensure we have test users
            console.log('useUsers hook: No users found, ensuring test users are loaded');
          } else {
            // Merge with test users to ensure we always have some users
            const testUsers = createTestUserData();
            const mergedUsers = [...fetchedUsers];
            
            // Make sure support user is included
            if (!mergedUsers.some(user => user.id === SUPPORT_USER_ID)) {
              mergedUsers.push(testUsers[0]); // Add support user
            }
            
            setUsers(mergedUsers);
            setFilteredUsers(mergedUsers);
            
            // Get recommended users (random selection)
            getRecommendedUsers(mergedUsers);
          }
          
          setLoading(false);
        },
        (err: any) => {
          console.error('useUsers hook: Firestore error:', err);
          setError(`Failed to fetch users: ${err.message}`);
          setLoading(false);
        }
      );

      return () => {
        console.log('useUsers hook: Unsubscribing from Firestore');
        unsubscribe();
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error('useUsers hook: Error setting up listener:', error);
      setError(`Error setting up user listener: ${error.message}`);
      setLoading(false);
    }
  }, []);

  // Get recommended users (randomly selected)
  const getRecommendedUsers = (allUsers: User[]) => {
    if (!allUsers || allUsers.length === 0) return;
    
    // Copy array to avoid modifying original
    const usersCopy = [...allUsers];
    
    // Make sure support user is always first in recommendations
    const supportUserIndex = usersCopy.findIndex(user => user.id === SUPPORT_USER_ID);
    let supportUser = null;
    
    if (supportUserIndex >= 0) {
      // Remove support user from array to add it first
      supportUser = usersCopy.splice(supportUserIndex, 1)[0];
    }
    
    // Shuffle the remaining users randomly
    for (let i = usersCopy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [usersCopy[i], usersCopy[j]] = [usersCopy[j], usersCopy[i]];
    }
    
    // Create recommended users array with support user first
    const recommended = supportUser 
      ? [supportUser, ...usersCopy.slice(0, 2)] // Support + 2 random users
      : usersCopy.slice(0, 3); // Just 3 random users
    
    setRecommendedUsers(recommended);
  };

  // Create test user data (for use in multiple places)
  const createTestUserData = (): User[] => {
    return [
      {
        id: SUPPORT_USER_ID,
        name: 'VChat Support',
        email: 'support@vchat.com',
        avatar: 'https://ui-avatars.com/api/?name=VChat+Support&background=5856d6&color=fff',
        status: 'Available'
      },
      {
        id: 'test-user-id-2',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://ui-avatars.com/api/?name=John+Doe',
        status: 'Available'
      },
      {
        id: 'test-user-id-3',
        name: 'Jane Smith',
        email: 'jane@example.com',
        avatar: 'https://ui-avatars.com/api/?name=Jane+Smith',
        status: 'Available'
      }
    ];
  };

  // Fetch recommended users on demand
  const refreshRecommendedUsers = async () => {
    try {
      // Get users from database or use test users
      const usersData = users.length > 0 ? users : createTestUserData();
      
      // Get recommended users (randomly)
      getRecommendedUsers(usersData);
      return recommendedUsers;
    } catch (err) {
      console.error('Error fetching recommended users:', err);
      return [];
    }
  };

  // Search users
  const searchUsers = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const filtered = users.filter(
      (user) => 
        user.name.toLowerCase().includes(term) || 
        user.email.toLowerCase().includes(term)
    );
    
    console.log(`useUsers hook: Filtered ${users.length} users to ${filtered.length} matches for "${term}"`);
    setFilteredUsers(filtered);
  };

  // Create a local test user if no users are available (for development/testing)
  const createTestUser = () => {
    console.log('useUsers hook: Creating test users');
    const testUsers = createTestUserData();
    setUsers(testUsers);
    setFilteredUsers(testUsers);
    setRecommendedUsers(testUsers);
  };

  return { 
    users: filteredUsers, 
    recommendedUsers,
    searchUsers, 
    refreshRecommendedUsers,
    loading, 
    error,
    createTestUser 
  };
};

export default useUsers; 