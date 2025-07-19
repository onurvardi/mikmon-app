import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Hata', 'Kullanıcı adı ve şifre gerekli');
      return;
    }

    setLoading(true);
    try {
      // Kullanıcı adını direkt email olarak kullan
      const email = username.includes('@') ? username : `${username}@mikmon.com`;
      console.log('Giriş denemesi:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Giriş başarılı:', userCredential.user.email);
    } catch (error) {
      console.error('Giriş hatası detayı:', error.code, error.message);
      
      let errorMessage = 'Giriş yapılamadı';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Kullanıcı bulunamadı. Firebase Console\'da kullanıcı oluşturun.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Şifre hatalı';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz email formatı';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Kullanıcı adı veya şifre hatalı';
      }
      
      Alert.alert('Giriş Hatası', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>M</Text>
      </View>
      
      <Text style={styles.title}>Mikmon App</Text>
      
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Kullanıcı Adı"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 80,
    color: 'white',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 100,
    height: 100,
    borderRadius: 50,
    textAlign: 'center',
    lineHeight: 100,
  },
  title: {
    fontSize: 24,
    color: 'white',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: 'bold',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 