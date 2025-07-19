import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, getDocs, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function LocationTrackingScreen() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [currentUserLocation, setCurrentUserLocation] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [mapHtml, setMapHtml] = useState('');
  const [appState, setAppState] = useState(AppState.currentState);
  const [selectedUser, setSelectedUser] = useState(null);
  const webViewRef = useRef(null);
  const locationIntervalRef = useRef(null);

  useEffect(() => {
    initializeLocationTracking();
    
    // App state değişikliklerini dinle
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('App State değişti:', nextAppState);
      setAppState(nextAppState);
      
      if (nextAppState === 'active') {
        // Uygulama aktif olduğunda hemen konum güncelle
        console.log('Uygulama aktif - konum güncelleniyor');
        updateLocationIfNeeded();
      } else if (nextAppState === 'background') {
        // Uygulama arka planda - konum takibini devam ettir
        console.log('Uygulama arka planda - konum takibi devam ediyor');
        // Arka planda da konum güncellemesi devam eder
      }
    });

    // Otomatik konum güncelleme başlat
    startLocationTracking();

    return () => {
      subscription?.remove();
      stopLocationTracking();
    };
  }, []);

  useEffect(() => {
    if (users.length > 0 && currentUserLocation) {
      generateMapHtml();
    }
  }, [users, currentUserLocation, selectedUser]);

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Bilinmiyor';
    
    const now = new Date();
    const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} saniye önce`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} dakika önce`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} saat önce`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} gün önce`;
    }
  };

  const generateMapHtml = () => {
    const markers = users.map(user => {
      const color = user.userEmail === auth.currentUser?.email ? '#2196F3' : '#FF9800';
      const timeAgo = formatTimeAgo(user.lastLocationUpdate);
      const isSelected = selectedUser && selectedUser.userEmail === user.userEmail;
      const borderColor = isSelected ? '#FF5722' : 'white';
      const borderWidth = isSelected ? 3 : 2;
      
      return `
        L.marker([${user.latitude}, ${user.longitude}], {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: '<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: ${borderWidth}px solid ${borderColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(map)
        .bindPopup('<b>${user.userName}</b><br>Son güncelleme: ${timeAgo}');
      `;
    }).join('');

    // Seçili kullanıcı varsa haritayı o konuma odakla
    const centerLat = selectedUser ? selectedUser.latitude : currentUserLocation.coords.latitude;
    const centerLng = selectedUser ? selectedUser.longitude : currentUserLocation.coords.longitude;
    const zoom = selectedUser ? 15 : 13;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${centerLat}, ${centerLng}], ${zoom});
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
          
          ${markers}
          
          // Kullanıcının konumunu göster
          L.marker([${currentUserLocation.coords.latitude}, ${currentUserLocation.coords.longitude}], {
            icon: L.divIcon({
              className: 'custom-div-icon',
              html: '<div style="background-color: #2196F3; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          }).addTo(map)
          .bindPopup('<b>Sizin Konumunuz</b>');
        </script>
      </body>
      </html>
    `;
    
    setMapHtml(html);
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    // Haritayı yeniden oluştur
    setTimeout(() => {
      generateMapHtml();
    }, 100);
  };

  const clearSelection = () => {
    setSelectedUser(null);
    // Haritayı yeniden oluştur
    setTimeout(() => {
      generateMapHtml();
    }, 100);
  };

  const startLocationTracking = () => {
    console.log('Konum takibi başlatıldı - 2 dakikada bir güncelleme');
    
    // İlk konum güncellemesi
    updateLocationIfNeeded();
    
    // 2 dakikada bir konum güncelle (120 saniye)
    locationIntervalRef.current = setInterval(() => {
      console.log('Otomatik konum güncelleme - App State:', appState);
      updateLocationIfNeeded();
    }, 120000); // 2 dakika
  };

  const stopLocationTracking = () => {
    if (locationIntervalRef.current) {
      console.log('Konum takibi durduruldu');
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  const updateLocationIfNeeded = async () => {
    try {
      if (!auth.currentUser) {
        console.log('Kullanıcı girişi yok - konum güncellenmedi');
        return;
      }

      console.log('Konum alınıyor... App State:', appState);
      
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000, // 15 saniye timeout
        maximumAge: 60000, // 1 dakika
      });
      
      setCurrentUserLocation(currentLocation);
      await updateUserLocation(currentLocation);
      console.log('Konum başarıyla güncellendi:', {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        appState: appState
      });
    } catch (error) {
      console.log('Konum güncelleme hatası:', error.message);
      // Hata durumunda bile interval devam etsin
    }
  };

  const initializeLocationTracking = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setDebugInfo('Başlatılıyor...');
      
      // Firebase bağlantısını kontrol et
      if (!auth.currentUser) {
        setErrorMsg('Kullanıcı girişi yapılmamış. Lütfen tekrar giriş yapın.');
        setLoading(false);
        return;
      }
      
      setDebugInfo('Kullanıcı kontrolü tamamlandı');
      
      // Kullanıcı kaydını oluştur veya güncelle
      await createOrUpdateUser();
      setDebugInfo('Kullanıcı kaydı oluşturuldu');
      
      // Konum servislerinin aktif olup olmadığını kontrol et
      try {
        const isLocationEnabled = await Location.hasServicesEnabledAsync();
        if (!isLocationEnabled) {
          setErrorMsg('Konum servisleri kapalı. Lütfen konum servislerini açın.');
          setLoading(false);
          return;
        }
        setDebugInfo('Konum servisleri aktif');
      } catch (locationServiceError) {
        console.log('Konum servisi kontrolü hatası:', locationServiceError);
        // Devam et, bu kritik değil
      }
      
      // Önce temel konum izni iste
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Konum izni reddedildi. Ayarlardan konum iznini etkinleştirin.');
          setLoading(false);
          return;
        }
        setDebugInfo('Temel konum izni verildi');
      } catch (permissionError) {
        console.log('Konum izni hatası:', permissionError);
        setErrorMsg('Konum izni alınamadı. Lütfen tekrar deneyin.');
        setLoading(false);
        return;
      }

      // Arka plan konum izni iste
      try {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus === 'granted') {
          setDebugInfo('Arka plan konum izni verildi');
        } else {
          setDebugInfo('Arka plan konum izni verilmedi (devam ediliyor)');
          // Arka plan izni olmasa da devam et
        }
      } catch (backgroundPermissionError) {
        console.log('Arka plan konum izni hatası:', backgroundPermissionError);
        setDebugInfo('Arka plan konum izni hatası (devam ediliyor)');
        // Arka plan izni hatası kritik değil, devam et
      }

      // Mevcut konumu al (timeout süresini artır)
      setDebugInfo('Konum alınıyor...');
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 30000, // 30 saniye
        maximumAge: 60000,
      });
      
      setCurrentUserLocation(currentLocation);
      setDebugInfo('Konum alındı');
      
      // Konumu Firebase'e kaydet (hata durumunda devam et)
      try {
        await updateUserLocation(currentLocation);
        setDebugInfo('Firebase konum kaydedildi');
      } catch (firebaseError) {
        console.log('Firebase konum kaydetme hatası:', firebaseError);
        setDebugInfo('Firebase hatası (devam ediliyor)');
        // Firebase hatası kritik değil, devam et
      }
      
      // Kullanıcı konumlarını dinle
      try {
        subscribeToUsersLocations();
        setDebugInfo('Kullanıcı dinleme başlatıldı');
      } catch (subscribeError) {
        console.log('Kullanıcı dinleme hatası:', subscribeError);
        setDebugInfo('Kullanıcı dinleme hatası (devam ediliyor)');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Konum takibi başlatılırken hata:', error);
      setDebugInfo(`Hata: ${error.message}`);
      
      // Hata türüne göre mesaj ver
      if (error.code === 'LOCATION_TIMEOUT') {
        setErrorMsg('Konum alınırken zaman aşımı. Lütfen tekrar deneyin.');
      } else if (error.code === 'LOCATION_UNAVAILABLE') {
        setErrorMsg('Konum servisi mevcut değil. Lütfen konum servislerini kontrol edin.');
      } else {
        setErrorMsg(`Konum alınamadı: ${error.message}`);
      }
      
      setLoading(false);
    }
  };

  const createOrUpdateUser = async () => {
    try {
      const userEmail = auth.currentUser?.email;
      if (!userEmail) {
        console.log('Kullanıcı girişi yok');
        return;
      }

      const userData = {
        userEmail: userEmail,
        userName: userEmail.split('@')[0],
        isOnline: true,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      // Kullanıcı kaydını oluştur veya güncelle
      const userRef = doc(db, 'users', userEmail);
      await setDoc(userRef, userData, { merge: true });
      
      console.log('Kullanıcı kaydı oluşturuldu/güncellendi:', userData);
    } catch (error) {
      console.error('Kullanıcı kaydı oluşturulurken hata:', error);
      throw error;
    }
  };

  const updateUserLocation = async (location) => {
    try {
      const userEmail = auth.currentUser?.email;
      if (!userEmail) {
        console.log('Kullanıcı girişi yok');
        return;
      }

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        lastLocationUpdate: serverTimestamp(),
        isOnline: true,
        lastSeen: serverTimestamp(),
      };

      // Kullanıcının konumunu users koleksiyonuna kaydet
      const userRef = doc(db, 'users', userEmail);
      await updateDoc(userRef, locationData, { merge: true });
      
      console.log('Kullanıcı konumu güncellendi:', locationData);
    } catch (error) {
      console.error('Kullanıcı konumu güncellenirken hata:', error);
      throw error; // Hatayı yukarı fırlat
    }
  };

  const subscribeToUsersLocations = () => {
    try {
      const unsubscribe = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          const usersData = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            // Sadece konum bilgisi olan ve online olan kullanıcıları göster
            if (data.latitude && data.longitude && data.isOnline) {
              usersData.push({
                id: doc.id,
                ...data,
              });
            }
          });
          setUsers(usersData);
          console.log('Kullanıcı konumları güncellendi:', usersData.length);
        },
        (error) => {
          console.error('Kullanıcı konumları dinlenirken hata:', error);
          // Firebase hatası kritik değil, sadece log
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Kullanıcı konumları abone olurken hata:', error);
      // Firebase hatası kritik değil, sadece log
    }
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Personeller Nerede?</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Konum alınıyor...</Text>
            <Text style={styles.debugText}>{debugInfo}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Personeller Nerede?</Text>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <Text style={styles.debugText}>{debugInfo}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={initializeLocationTracking}>
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Personeller Nerede?</Text>
          <Text style={styles.headerSubtitle}>
            {users.length} kullanıcı aktif • 2 dakikada bir güncelleniyor
          </Text>
        </View>

        <View style={styles.content}>
          {mapHtml ? (
            <WebView
              ref={webViewRef}
              source={{ html: mapHtml }}
              style={styles.map}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent);
              }}
            />
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>Harita yükleniyor...</Text>
            </View>
          )}

          {/* Aktif Personel Listesi */}
          <View style={styles.userListContainer}>
            <View style={styles.userListHeader}>
              <Text style={styles.userListTitle}>Aktif Personeller</Text>
              {selectedUser && (
                <TouchableOpacity onPress={clearSelection} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Temizle</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.userList} horizontal showsHorizontalScrollIndicator={false}>
              {users.map((user, index) => {
                const isCurrentUser = user.userEmail === auth.currentUser?.email;
                const isSelected = selectedUser && selectedUser.userEmail === user.userEmail;
                const timeAgo = formatTimeAgo(user.lastLocationUpdate);
                
                return (
                  <TouchableOpacity
                    key={user.id || index}
                    style={[
                      styles.userItem,
                      isCurrentUser && styles.currentUserItem,
                      isSelected && styles.selectedUserItem
                    ]}
                    onPress={() => handleUserSelect(user)}
                  >
                    <View style={[
                      styles.userAvatar,
                      isCurrentUser && styles.currentUserAvatar,
                      isSelected && styles.selectedUserAvatar
                    ]}>
                      <Text style={styles.userAvatarText}>
                        {user.userName ? user.userName.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                    <Text style={[
                      styles.userName,
                      isCurrentUser && styles.currentUserName,
                      isSelected && styles.selectedUserName
                    ]}>
                      {isCurrentUser ? 'Siz' : user.userName}
                    </Text>
                    <Text style={styles.userTime}>{timeAgo}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
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
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#666',
  },
  userListContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 10,
  },
  userListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  userListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userList: {
    paddingHorizontal: 15,
  },
  userItem: {
    alignItems: 'center',
    marginRight: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    minWidth: 80,
  },
  currentUserItem: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  selectedUserItem: {
    backgroundColor: '#fff3e0',
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  currentUserAvatar: {
    backgroundColor: '#2196F3',
  },
  selectedUserAvatar: {
    backgroundColor: '#FF5722',
  },
  userAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  currentUserName: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  selectedUserName: {
    color: '#FF5722',
    fontWeight: 'bold',
  },
  userTime: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  debugText: {
    marginTop: 5,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 