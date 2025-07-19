import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { shouldSendNotification } from '../utils/notificationSettings';
import { sendPushNotification } from '../utils/notificationService';

export default function ApplicationsScreen() {
  const [applications, setApplications] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [service, setService] = useState('');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const q = query(collection(db, 'applications'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const applicationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setApplications(applicationsData);
    } catch (error) {
      console.error('Başvurular yüklenirken hata:', error);
      Alert.alert('Hata', 'Başvurular yüklenemedi');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  const addApplication = async () => {
    if (!name || !phone || !address || !service) {
      Alert.alert('Hata', 'Tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const newApplication = {
        name,
        phone,
        address,
        service,
        status: 'active',
        createdBy: auth.currentUser?.email?.split('@')[0] || 'unknown',
        createdAt: serverTimestamp(),
        completedBy: null,
        completedAt: null,
      };

      const docRef = await addDoc(collection(db, 'applications'), newApplication);
      
      // Expo Push Notification gönder
      try {
        await sendPushNotification(
          'Yeni Başvuru Eklendi',
          `${auth.currentUser?.email?.split('@')[0] || 'Kullanıcı'} tarafından yeni başvuru eklendi: ${name}`,
          { type: 'new_application', applicationId: docRef.id }
        );
      } catch (error) {
        console.log('Bildirim gönderilemedi:', error);
      }
      
      // Form'u temizle
      setName('');
      setPhone('');
      setAddress('');
      setService('');
      setModalVisible(false);
      
      // Listeyi yenile
      await loadApplications();
      
      Alert.alert('Başarılı', 'Başvuru başarıyla eklendi');
    } catch (error) {
      console.error('Başvuru eklenirken hata:', error);
      Alert.alert('Hata', 'Başvuru eklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const completeApplication = async (applicationId) => {
    Alert.alert(
      'Başvuru Tamamla',
      'Bu başvuruyu tamamlandı olarak işaretlemek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Tamamlandı',
          onPress: async () => {
            try {
              const applicationRef = doc(db, 'applications', applicationId);
              const applicationDoc = await getDocs(query(collection(db, 'applications'), doc(db, 'applications', applicationId)));
              const applicationData = applicationDoc.docs[0]?.data();
              
              await updateDoc(applicationRef, {
                status: 'completed',
                completedBy: auth.currentUser?.email?.split('@')[0] || 'unknown',
                completedAt: serverTimestamp(),
              });
              
              // Expo Push Notification gönder
              try {
                await sendPushNotification(
                  'Başvuru Tamamlandı',
                  `${auth.currentUser?.email?.split('@')[0] || 'Kullanıcı'} tarafından başvuru tamamlandı: ${applicationData?.name || 'Başvuru'}`,
                  { type: 'application_completed', applicationId: applicationId }
                );
              } catch (error) {
                console.log('Bildirim gönderilemedi:', error);
              }
              
              await loadApplications();
              Alert.alert('Başarılı', 'Başvuru tamamlandı olarak işaretlendi');
            } catch (error) {
              console.error('Başvuru güncellenirken hata:', error);
              Alert.alert('Hata', 'Başvuru güncellenemedi');
            }
          }
        }
      ]
    );
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return '';
    
    const now = new Date();
    const created = timestamp.toDate();
    const diffInMs = now - created;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} gündür tamamlanmadı`;
    } else if (diffInHours > 0) {
      return `${diffInHours} saattir tamamlanmadı`;
    } else {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes} dakikadır tamamlanmadı`;
    }
  };

  const getCompletionTime = (createdAt, completedAt) => {
    if (!createdAt || !completedAt || !createdAt.toDate || !completedAt.toDate) {
      return 'Süre yok';
    }
    const created = createdAt.toDate();
    const completed = completedAt.toDate();
    const diffInMs = completed - created;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} dakika`;
    } else {
      const diffInHours = Math.floor(diffInMinutes / 60);
      return `${diffInHours} saat`;
    }
  };

  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const renderRightActions = (progress, dragX, onPress) => {
    return (
      <TouchableOpacity style={styles.swipeAction} onPress={onPress}>
        <Text style={styles.swipeActionText}>Tamamlandı</Text>
      </TouchableOpacity>
    );
  };

  const renderApplication = ({ item }) => (
    <Swipeable
      renderRightActions={(progress, dragX) =>
        item.status !== 'completed' ? renderRightActions(progress, dragX, () => completeApplication(item.id)) : null
      }
    >
      <TouchableOpacity
        style={[
          styles.applicationItem,
          item.status === 'completed' && styles.completedApplication
        ]}
        onPress={() => toggleExpanded(item.id)}
      >
        <View style={styles.applicationHeader}>
          <Text style={styles.applicationTitle}>{item.name}</Text>
          {item.status !== 'completed' && (
            <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
          )}
        </View>
        
        <Text style={styles.applicationDetail}>Hizmet: {item.service}</Text>
        <Text style={styles.applicationDetail}>Telefon: {item.phone}</Text>
        <Text style={styles.applicationDetail}>Adres: {item.address}</Text>
        
        {expandedItems.has(item.id) && (
          <View style={styles.expandedInfo}>
            <Text style={styles.applicationMeta}>
              Ekleyen: {item.createdBy} | {item.createdAt?.toDate?.()?.toLocaleString('tr-TR') || 'Tarih yok'}
            </Text>
            {item.completedBy && (
              <Text style={styles.applicationMeta}>
                Tamamlayan: {item.completedBy} | {item.completedAt?.toDate?.()?.toLocaleString('tr-TR') || 'Tarih yok'}
              </Text>
            )}
            {item.completedAt && (
              <Text style={styles.applicationMeta}>
                Tamamlama Süresi: {getCompletionTime(item.createdAt, item.completedAt)}
              </Text>
            )}
          </View>
        )}
        
        {!expandedItems.has(item.id) && (
          <Text style={styles.tapHint}>Detaylar için dokun</Text>
        )}
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Başvurular</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={applications}
          renderItem={renderApplication}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Henüz başvuru bulunmuyor</Text>
          }
        />

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Yeni Başvuru Ekle</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Müşteri Adı"
                value={name}
                onChangeText={setName}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Telefon"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Adres"
                value={address}
                onChangeText={setAddress}
                multiline
              />
              
              <TextInput
                style={styles.input}
                placeholder="İstenen Hizmet"
                value={service}
                onChangeText={setService}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.buttonDisabled]}
                  onPress={addApplication}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Ekleniyor...' : 'Ekle'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    backgroundColor: '#2196F3',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  applicationItem: {
    backgroundColor: 'white',
    margin: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedApplication: {
    borderLeftColor: '#4CAF50',
    opacity: 0.8,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  applicationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  timeAgo: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  applicationDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  expandedInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  applicationMeta: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  tapHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#666',
    padding: 10,
    borderRadius: 4,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 4,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  swipeAction: {
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,
    height: '90%',
    marginVertical: 5,
    borderRadius: 8,
  },
  swipeActionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 