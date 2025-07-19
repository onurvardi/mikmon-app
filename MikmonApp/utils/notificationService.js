import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { collection, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Bildirim ayarları
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Expo Push Token'ı kaydet
export const registerForPushNotificationsAsync = async () => {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Bildirim izni verilmedi!');
      return;
    }
    
    try {
      // Expo Push Token al - Expo project ID ile
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: '4df8897a-7991-4118-ac03-0be3fa5753b4', // EAS project ID
      })).data;
      console.log('Expo Push Token alındı:', token);
    } catch (error) {
      console.error('Token alınırken hata:', error);
      // Project ID olmadan tekrar dene
      try {
        token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Expo Push Token alındı (project ID olmadan):', token);
      } catch (error2) {
        console.error('Token alınamadı:', error2);
        return null;
      }
    }
  } else {
    console.log('Fiziksel cihaz gerekli');
  }

  return token;
};

// Token'ı Firebase'e kaydet
export const saveTokenToFirebase = async (token, userEmail) => {
  try {
    // Önce aynı kullanıcının eski token'ını bul
    const existingTokens = await getDocs(collection(db, 'pushTokens'));
    const userToken = existingTokens.docs.find(doc => doc.data().userEmail === userEmail);
    
    if (userToken) {
      await updateDoc(doc(db, 'pushTokens', userToken.id), {
        token: token,
        updatedAt: new Date(),
      });
      console.log('Token güncellendi:', token);
    } else {
      const tokenData = {
        token: token,
        userEmail: userEmail,
        platform: Platform.OS,
        createdAt: new Date(),
      };
      await addDoc(collection(db, 'pushTokens'), tokenData);
      console.log('Token Firebase\'e kaydedildi:', token);
    }
  } catch (error) {
    console.error('Token kaydedilirken hata:', error);
  }
};

// Tüm token'ları al
export const getAllTokens = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'pushTokens'));
    const tokens = querySnapshot.docs.map(doc => doc.data());
    console.log('Firebase\'den alınan token sayısı:', tokens.length);
    return tokens;
  } catch (error) {
    console.error('Token\'lar alınırken hata:', error);
    return [];
  }
};

// Bildirim gönder (Expo Push API kullanarak)
export const sendPushNotification = async (title, message, data = {}) => {
  try {
    const tokens = await getAllTokens();
    
    if (tokens.length === 0) {
      console.log('Gönderilecek token bulunamadı');
      return;
    }

    console.log('Gönderilecek token sayısı:', tokens.length);

    const messages = tokens.map(tokenData => ({
      to: tokenData.token,
      sound: 'default',
      title: title,
      body: message,
      data: data,
      priority: 'high',
      channelId: 'default',
    }));

    console.log('Gönderilecek mesajlar:', messages);

    // Expo Push API'ye gönder
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('Bildirim gönderildi:', result);
    
    // Hata kontrolü
    if (result.errors && result.errors.length > 0) {
      console.error('Bildirim gönderme hataları:', result.errors);
    }
    
    return result;
  } catch (error) {
    console.error('Bildirim gönderme hatası:', error);
  }
};

// Test bildirimi gönder
export const sendTestNotification = async () => {
  return await sendPushNotification(
    'Test Bildirimi',
    'Bu bir test bildirimidir!',
    { type: 'test' }
  );
}; 