import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, FlatList, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

interface Post {
  id: string;
  content: string;
  userId: string;
  username: string;
  userAvatar?: string;
  likes: string[];
  comments: Comment[];
  createdAt: any;
}

interface Comment {
  id: string;
  content: string;
  userId: string;
  username: string;
  createdAt: any;
}

// Helper function to format time ago
const timeAgo = (timestamp: any) => {
  if (!timestamp) return '';

  const now = new Date();
  let date: Date;
  
  try {
    // Handle Firestore timestamp
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      // Handle ISO string
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      // Handle Date object
      date = timestamp;
    } else {
      return '';
    }
  } catch (error) {
    console.error('Error parsing timestamp:', error);
    return '';
  }

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";

  return Math.floor(seconds) + "s ago";
};

const Page = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentTexts, setCommentTexts] = useState<{ [key: string]: string }>({});
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const postData: Post[] = [];
      snapshot.forEach((doc: DocumentData) => {
        postData.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPosts(postData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePost = async () => {
    if (!newPost.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'posts'), {
        content: newPost,
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Anonymous',
        userAvatar: auth.currentUser.photoURL,
        likes: [],
        comments: [],
        createdAt: serverTimestamp(),
      });
      setNewPost('');
    } catch (error) {
      console.error('Error posting:', error);
    }
  };

  const handleLike = async (postId: string) => {
    if (!auth.currentUser) return;
    
    const postRef = doc(db, 'posts', postId);
    const post = posts.find(p => p.id === postId);
    
    if (post?.likes.includes(auth.currentUser.uid)) {
      await updateDoc(postRef, {
        likes: arrayRemove(auth.currentUser.uid)
      });
    } else {
      await updateDoc(postRef, {
        likes: arrayUnion(auth.currentUser.uid)
      });
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!auth.currentUser || !commentTexts[postId]?.trim()) return;

    try {
      const postRef = doc(db, 'posts', postId);
      const newComment = {
        id: Date.now().toString(),
        content: commentTexts[postId],
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Anonymous',
        createdAt: new Date().toISOString(),
      };

      await updateDoc(postRef, {
        comments: arrayUnion(newComment)
      });

      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const renderComment = (comment: Comment) => (
    <View key={comment.id} style={styles.commentContainer}>
      <Text style={styles.commentUsername}>{comment.username}</Text>
      <Text style={styles.commentContent}>{comment.content}</Text>
      <Text style={styles.commentTimestamp}>
        {comment.createdAt ? timeAgo(comment.createdAt) : ''}
      </Text>
    </View>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <Image
          source={{ uri: item.userAvatar || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
        <View style={styles.postHeaderText}>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.timestamp}>
            {item.createdAt ? timeAgo(item.createdAt) : ''}
          </Text>
        </View>
      </View>
      
      <Text style={styles.postContent}>{item.content}</Text>
      
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(item.id)}
        >
          <Ionicons
            name={item.likes.includes(auth.currentUser?.uid || '') ? 'heart' : 'heart-outline'}
            size={20}
            color={item.likes.includes(auth.currentUser?.uid || '') ? '#ff4d4d' : '#666'}
          />
          <Text style={styles.actionText}>{item.likes.length}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => toggleComments(item.id)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{item.comments.length}</Text>
        </TouchableOpacity>
      </View>

      {expandedComments[item.id] && (
        <View style={styles.commentsSection}>
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              value={commentTexts[item.id] || ''}
              onChangeText={(text) => setCommentTexts(prev => ({ ...prev, [item.id]: text }))}
              multiline
            />
            <TouchableOpacity
              style={[styles.commentButton, !commentTexts[item.id]?.trim() && styles.commentButtonDisabled]}
              onPress={() => handleAddComment(item.id)}
              disabled={!commentTexts[item.id]?.trim()}
            >
              <Text style={styles.commentButtonText}>Post</Text>
            </TouchableOpacity>
          </View>

          {item.comments.map(renderComment)}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.createPostContainer}>
        <TextInput
          style={styles.input}
          placeholder="What's happening?"
          value={newPost}
          onChangeText={setNewPost}
          multiline
        />
        <TouchableOpacity
          style={[styles.postButton, !newPost.trim() && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={!newPost.trim()}
        >
          <Text style={styles.postButtonText}>Post</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        style={styles.feed}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  createPostContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    padding: 10,
    marginBottom: 10,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  postButton: {
    backgroundColor: '#1DA1F2',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#ccc',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  feed: {
    flex: 1,
  },
  postContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  postHeaderText: {
    flex: 1,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 10,
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    marginLeft: 5,
    color: '#666',
  },
  commentsSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  commentInputContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    padding: 8,
    marginRight: 10,
    maxHeight: 100,
  },
  commentButton: {
    backgroundColor: '#1DA1F2',
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    minWidth: 60,
  },
  commentButtonDisabled: {
    backgroundColor: '#ccc',
  },
  commentButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  commentContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  commentUsername: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  commentContent: {
    fontSize: 14,
    marginBottom: 4,
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#666',
  },
});

export default Page;
