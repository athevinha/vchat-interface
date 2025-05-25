import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';

const Page = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 90 : 0;
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, error } = useAuth();

  const openLink = () => {
    Linking.openURL('https://galaxies.dev');
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!isLogin && !name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        router.replace('/(tabs)/chats');
      } else {
        await signUp(email, password, name);
        router.replace('/(tabs)/chats');
      }
    } catch (err: unknown) {
      const error = err as Error;
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={{ flex: 1 }}
      behavior="padding">
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loading]}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ fontSize: 18, padding: 10 }}>{isLogin ? 'Signing in...' : 'Creating account...'}</Text>
        </View>
      )}

      <View style={styles.container}>
        <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
        <Text style={styles.description}>
          {isLogin ? 'Sign in to continue' : 'Create a new account to get started'}
        </Text>

        <View style={styles.form}>
          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}
          
          <TextInput
            style={styles.input}
            placeholder="Your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity
            style={[styles.button, (email !== '' && password !== '') ? styles.enabled : null]}
            onPress={handleAuth}>
            <Text style={[styles.buttonText, (email !== '' && password !== '') ? styles.enabledText : null]}>
              {isLogin ? 'Sign In' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchModeButton}>
            <Text style={styles.switchModeText}>
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legal}>
          You must be{' '}
          <Text style={styles.link} onPress={openLink}>
            at least 16 years old
          </Text>{' '}
          to register. Learn how VChat works with the{' '}
          <Text style={styles.link} onPress={openLink}>
            Meta Companies
          </Text>
          .
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 60,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 20,
  },
  form: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    backgroundColor: Colors.background,
    width: '100%',
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  legal: {
    fontSize: 12,
    textAlign: 'center',
    color: '#000',
    marginTop: 20,
  },
  link: {
    color: Colors.primary,
  },
  button: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  enabled: {
    backgroundColor: Colors.primary,
  },
  enabledText: {
    color: '#fff',
  },
  buttonText: {
    color: Colors.gray,
    fontSize: 18,
    fontWeight: '500',
  },
  switchModeButton: {
    alignItems: 'center',
    marginTop: 15,
    padding: 5,
  },
  switchModeText: {
    color: Colors.primary,
    fontSize: 14,
  },
  loading: {
    zIndex: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Page;
