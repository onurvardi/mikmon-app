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

export default function CancellationsScreen() {
  const [cancellations, setCancellations] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state
  const [reason, setReason] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    loadCancellations();
  }, []);

  const loadCancellations = async () => {
    try {
      const q = query(collection(db, 'cancellations'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const cancellationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCancellations(cancellationsData);
    } catch (error) {
      console.error('İptal edenler yüklenirken hata:', error);
      Alert.alert('Hata', 'İptal edenler yüklenemedi');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCancellations();
    setRefreshing(false);
  };

  const addCancellation = async () => {
    if (!reason || !customerName || !phone || !address) {
      Alert.alert('Hata', 'Tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const newCancellation = {
        reason,
        customerName,
        phone,
        address,
        status: 'active',
        createdBy: auth.currentUser?.email?.split('@')[0] || 'unknown',
        createdAt: serverTimestamp(),
        persuadedBy: null,
        persuadedAt: null,
      };

      const docRef = await addDoc(collection(db, 'cancellations'), newCancellation);
      
      // Expo Push Notification gönder
      try {
        await sendPushNotification(
          'Yeni İptal Eden Eklendi',
          `${auth.currentUser?.email?.split('@')[0] || 'Kullanıcı'} tarafından yeni iptal eden eklendi: ${customerName}`,
          { type: 'new_cancellation', cancellationId: docRef.id }
        );
      } catch (error) {
        console.log('Bildirim gönderilemedi:', error);
      }
      
      // Form'u temizle
      setReason('');
      setCustomerName('');
      setPhone('');
      setAddress('');
      setModalVisible(false);
      
      // Listeyi yenile
      await loadCancellations();
      
      Alert.alert('Başarılı', 'İptal eden başarıyla eklendi');
    } catch (error) {
      console.error('İptal eden eklenirken hata:', error);
      Alert.alert('Hata', 'İptal eden eklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const persuadeCustomer = async (cancellationId) => {
    Alert.alert(
      'İkna Edildi',
      'Bu müşteriyi ikna ettiğinizi işaretlemek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'İkna Edildi',
          onPress: async () => {
            try {
              const cancellationRef = doc(db, 'cancellations', cancellationId);
              const cancellationDoc = await getDocs(query(collection(db, 'cancellations'), doc(db, 'cancellations', cancellationId)));
              const cancellationData = cancellationDoc.docs[0]?.data();
              
              await updateDoc(cancellationRef, {
                status: 'persuaded',
                persuadedBy: auth.currentUser?.email?.split('@')[0] || 'unknown',
                persuadedAt: serverTimestamp(),
              });
              
              // Expo Push Notification gönder
              try {
                await sendPushNotification(
                  'Müşteri İkna Edildi',
                  `${auth.currentUser?.email?.split('@')[0] || 'Kullanıcı'} tarafından müşteri ikna edildi: ${cancellationData?.customerName || 'Müşteri'}`,
                  { type: 'customer_persuaded', cancellationId: cancellationId }
                );
              } catch (error) {
                console.log('Bildirim gönderilemedi:', error);
              }
              
              await loadCancellations();
              Alert.alert('Başarılı', 'Müşteri ikna edildi olarak işaretlendi');
            } catch (error) {
              console.error('İptal eden güncellenirken hata:', error);
              Alert.alert('Hata', 'İptal eden güncellenemedi');
            }
          }
        }
      ]
    );
  };

  const renderRightActions = (progress, dragX, onPress) => {
    return (
      <TouchableOpacity style={styles.swipeAction} onPress={onPress}>
        <Text style={styles.swipeActionText}>İkna Edildi</Text>
      </TouchableOpacity>
    );
  };

  const renderCancellation = ({ item }) => (
    <Swipeable
      renderRightActions={(progress, dragX) =>
        item.status !== 'persuaded' ? renderRightActions(progress, dragX, () => persuadeCustomer(item.id)) : null
      }
    >
      <TouchableOpacity
        style={[
          styles.cancellationItem,
          item.status === 'persuaded' && styles.persuadedCancellation
        ]}
        disabled={item.status === 'persuaded'}
      >
        <Text style={styles.cancellationTitle}>{item.customerName}</Text>
        <Text style={styles.cancellationDetail}>Sebep: {item.reason}</Text>
        <Text style={styles.cancellationDetail}>Telefon: {item.phone}</Text>
        <Text style={styles.cancellationDetail}>Adres: {item.address}</Text>
        <Text style={styles.cancellationMeta}>
          Ekleyen: {item.createdBy} | {item.createdAt?.toDate?.()?.toLocaleString('tr-TR') || 'Tarih yok'}
        </Text>
        {item.persuadedBy && (
          <Text style={styles.cancellationMeta}>
            İkna Eden: {item.persuadedBy} | {item.persuadedAt?.toDate?.()?.toLocaleString('tr-TR') || 'Tarih yok'}
          </Text>
        )}
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>İptal Edenler</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={cancellations}
          renderItem={renderCancellation}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Henüz iptal eden bulunmuyor</Text>
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
              <Text style={styles.modalTitle}>Yeni İptal Eden Ekle</Text>
              
              <TextInput
                style={styles.input}
                placeholder="İptal Sebebi"
                value={reason}
                onChangeText={setReason}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Müşteri Adı"
                value={customerName}
                onChangeText={setCustomerName}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Telefon No"
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
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.buttonDisabled]}
                  onPress={addCancellation}
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
    backgroundColor: '#f44336',
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
  cancellationItem: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  persuadedCancellation: {
    borderLeftColor: '#4CAF50',
    opacity: 0.8,
  },
  cancellationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  cancellationDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cancellationMeta: {
    fontSize: 12,
    color: '#999',
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
    backgroundColor: '#f44336',
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