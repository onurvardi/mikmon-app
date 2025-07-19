import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Firebase import
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';

// Expo Push Notifications import
import { registerForPushNotificationsAsync, saveTokenToFirebase } from './utils/notificationService';

// Screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import IssuesScreen from './screens/IssuesScreen';
import ApplicationsScreen from './screens/ApplicationsScreen';
import QualityScreen from './screens/QualityScreen';
import InfoScreen from './screens/InfoScreen';
import TechnicalScreen from './screens/TechnicalScreen';
import ProfileScreen from './screens/ProfileScreen';
import LocationTrackingScreen from './screens/LocationTrackingScreen';
import CancellationsScreen from './screens/CancellationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bildirim ayarları
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
          tabBarLabel: 'Ana Sayfa'
        }}
      />
      <Tab.Screen 
        name="Issues" 
        component={IssuesScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔧</Text>,
          tabBarLabel: 'Arızalar'
        }}
      />
      <Tab.Screen 
        name="Applications" 
        component={ApplicationsScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
          tabBarLabel: 'Başvurular'
        }}
      />
      <Tab.Screen 
        name="Quality" 
        component={QualityScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
          tabBarLabel: 'Kalite'
        }}
      />
      <Tab.Screen 
        name="Info" 
        component={InfoScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>ℹ️</Text>,
          tabBarLabel: 'Bilgi'
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Push notification token'ı al
    const getToken = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          setExpoPushToken(token);
          console.log('Expo Push Token alındı:', token);
        }
      } catch (error) {
        console.error('Token alınırken hata:', error);
      }
    };

    getToken();

    // Bildirim dinleyicileri
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Bildirim alındı:', notification);
      Alert.alert(
        'Bildirim',
        notification.request.content.body,
        [{ text: 'Tamam', onPress: () => console.log('Bildirim kapatıldı') }]
      );
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Bildirime tıklandı:', response);
      // Bildirime tıklandığında yapılacak işlemler
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  useEffect(() => {
    // Auth state değişikliklerini dinle
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Kullanıcı giriş yaptığında token'ı Firebase'e kaydet
      if (user && expoPushToken) {
        console.log('Kullanıcı giriş yaptı, token kaydediliyor...');
        await saveTokenToFirebase(expoPushToken, user.email);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [expoPushToken]);

  // Token değiştiğinde kullanıcı varsa tekrar kaydet
  useEffect(() => {
    if (user && expoPushToken) {
      console.log('Token değişti, yeniden kaydediliyor...');
      saveTokenToFirebase(expoPushToken, user.email);
    }
  }, [expoPushToken, user]);

  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.container}>
            <Text>Yükleniyor...</Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
              <>
                <Stack.Screen name="Main" component={TabNavigator} />
                <Stack.Screen name="LocationTracking" component={LocationTrackingScreen} />
                <Stack.Screen name="Cancellations" component={CancellationsScreen} />
                <Stack.Screen name="Technical" component={TechnicalScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
              </>
            ) : (
              <Stack.Screen name="Login" component={LoginScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
