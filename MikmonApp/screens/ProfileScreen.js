import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendTestNotification } from '../utils/notificationService';

export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    loadUserData();
    loadNotificationSettings();
  }, []);

  const loadUserData = () => {
    if (auth.currentUser) {
      setUserEmail(auth.currentUser.email || 'Kullanıcı');
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      if (settings) {
        setNotificationsEnabled(JSON.parse(settings));
      }
    } catch (error) {
      console.error('Bildirim ayarları yüklenirken hata:', error);
    }
  };

  const toggleNotifications = async (value) => {
    try {
      setNotificationsEnabled(value);
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(value));
      
      if (value) {
        Alert.alert('Bildirimler Açıldı', 'Artık bildirim alacaksınız.');
      } else {
        Alert.alert('Bildirimler Kapatıldı', 'Artık bildirim almayacaksınız.');
      }
    } catch (error) {
      console.error('Bildirim ayarları kaydedilirken hata:', error);
      Alert.alert('Hata', 'Bildirim ayarları kaydedilemedi.');
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
      Alert.alert('Test Bildirimi', 'Test bildirimi gönderildi!');
    } catch (error) {
      Alert.alert('Hata', 'Test bildirimi gönderilemedi.');
    }
  };

  const handleUpdate = () => {
    Alert.alert(
      'Güncelleme',
      'Uygulamanın en son sürümünü indirmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'İndir',
          onPress: () => {
            const apkUrl = 'https://mikmon.tr/MikmonApp/MikmonApp.apk';
            Linking.openURL(apkUrl).catch((err) => {
              Alert.alert('Hata', 'Güncelleme dosyası açılamadı. Lütfen tekrar deneyin.');
            });
          }
        }
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error('Çıkış yapılırken hata:', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profil</Text>
        </View>

        <View style={styles.content}>
          {/* Kullanıcı Bilgileri */}
          <View style={styles.userSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userEmail.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userName}>{userEmail.split('@')[0]}</Text>
            <Text style={styles.userEmail}>{userEmail}</Text>
          </View>

          {/* Ayarlar */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Ayarlar</Text>
            
            {/* Bildirim Ayarları */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Bildirimler</Text>
                <Text style={styles.settingDescription}>
                  {notificationsEnabled ? 'Bildirimler açık' : 'Bildirimler kapalı'}
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#767577', true: '#2196F3' }}
                thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>

            {/* Test Bildirimi */}
            <TouchableOpacity style={styles.settingItem} onPress={handleTestNotification}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Test Bildirimi</Text>
                <Text style={styles.settingDescription}>Test bildirimi gönder</Text>
              </View>
              <View style={styles.updateIcon}>
                <Text style={styles.updateIconText}>🔔</Text>
              </View>
            </TouchableOpacity>

            {/* Uygulama Bilgileri */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Uygulama Versiyonu</Text>
                <Text style={styles.settingDescription}>1.0.0</Text>
              </View>
            </View>

            {/* Güncelleme Seçeneği */}
            <TouchableOpacity style={styles.settingItem} onPress={handleUpdate}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Güncelleme</Text>
                <Text style={styles.settingDescription}>En son sürümü indir</Text>
              </View>
              <View style={styles.updateIcon}>
                <Text style={styles.updateIconText}>⬇</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Çıkış Yap Butonu */}
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  settingsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  updateIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateIconText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  signOutButton: {
    backgroundColor: '#f44336',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 