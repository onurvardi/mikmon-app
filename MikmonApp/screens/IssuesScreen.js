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

export default function IssuesScreen() {
  const [issues, setIssues] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  
  // Form state
  const [reason, setReason] = useState('');
  const [pppoe, setPppoe] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const issuesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setIssues(issuesData);
    } catch (error) {
      console.error('Arızalar yüklenirken hata:', error);
      Alert.alert('Hata', 'Arızalar yüklenemedi');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIssues();
    setRefreshing(false);
  };

  const addIssue = async () => {
    if (!reason || !pppoe || !address || !phone) {
      Alert.alert('Hata', 'Tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const newIssue = {
        reason,
        pppoe,
        address,
        phone,
        status: 'active',
        createdBy: auth.currentUser?.email?.split('@')[0] || 'unknown',
        createdAt: serverTimestamp(),
        resolvedBy: null,
        resolvedAt: null,
      };

      const docRef = await addDoc(collection(db, 'issues'), newIssue);
      
      // Expo Push Notification gönder
      try {
        await sendPushNotification(
          'Yeni Arıza Eklendi',
          `${auth.currentUser?.email?.split('@')[0] || 'Kullanıcı'} tarafından yeni arıza eklendi: ${reason}`,
          { type: 'new_issue', issueId: docRef.id }
        );
      } catch (error) {
        console.log('Bildirim gönderilemedi:', error);
      }
      
      // Form'u temizle
      setReason('');
      setPppoe('');
      setAddress('');
      setPhone('');
      setModalVisible(false);
      
      // Listeyi yenile
      await loadIssues();
      
      Alert.alert('Başarılı', 'Arıza başarıyla eklendi');
    } catch (error) {
      console.error('Arıza eklenirken hata:', error);
      Alert.alert('Hata', 'Arıza eklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const resolveIssue = async (issueId) => {
    Alert.alert(
      'Arıza Çöz',
      'Bu arızayı çözüldü olarak işaretlemek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çözüldü',
          onPress: async () => {
            try {
              const issueRef = doc(db, 'issues', issueId);
              const issueDoc = await getDocs(query(collection(db, 'issues'), doc(db, 'issues', issueId)));
              const issueData = issueDoc.docs[0]?.data();
              
              await updateDoc(issueRef, {
                status: 'resolved',
                resolvedBy: auth.currentUser?.email?.split('@')[0] || 'unknown',
                resolvedAt: serverTimestamp(),
              });
              
              // Expo Push Notification gönder
              try {
                await sendPushNotification(
                  'Arıza Çözüldü',
                  `${auth.currentUser?.email?.split('@')[0] || 'Kullanıcı'} tarafından arıza çözüldü: ${issueData?.reason || 'Arıza'}`,
                  { type: 'issue_resolved', issueId: issueId }
                );
              } catch (error) {
                console.log('Bildirim gönderilemedi:', error);
              }
              
              await loadIssues();
              Alert.alert('Başarılı', 'Arıza çözüldü olarak işaretlendi');
            } catch (error) {
              console.error('Arıza güncellenirken hata:', error);
              Alert.alert('Hata', 'Arıza güncellenemedi');
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
      return `${diffInDays} gündür çözülmedi`;
    } else if (diffInHours > 0) {
      return `${diffInHours} saattir çözülmedi`;
    } else {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes} dakikadır çözülmedi`;
    }
  };

  const getResolutionTime = (createdAt, resolvedAt) => {
    if (!createdAt || !resolvedAt || !createdAt.toDate || !resolvedAt.toDate) return '';

    const created = createdAt.toDate();
    const resolved = resolvedAt.toDate();
    const diffInMs = resolved - created;
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
        <Text style={styles.swipeActionText}>Çözüldü</Text>
      </TouchableOpacity>
    );
  };

  const renderIssue = ({ item }) => (
    <Swipeable
      renderRightActions={(progress, dragX) =>
        item.status !== 'resolved' ? renderRightActions(progress, dragX, () => resolveIssue(item.id)) : null
      }
    >
      <TouchableOpacity
        style={[
          styles.issueItem,
          item.status === 'resolved' && styles.resolvedIssue
        ]}
        onPress={() => toggleExpanded(item.id)}
      >
        <View style={styles.issueHeader}>
          <Text style={styles.issueTitle}>{item.reason}</Text>
          {item.status !== 'resolved' && (
            <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
          )}
        </View>
        
        <Text style={styles.issueDetail}>PPPoE: {item.pppoe}</Text>
        <Text style={styles.issueDetail}>Adres: {item.address}</Text>
        <Text style={styles.issueDetail}>Telefon: {item.phone}</Text>
        
        {expandedItems.has(item.id) && (
          <View style={styles.expandedInfo}>
            <Text style={styles.issueMeta}>
              Ekleyen: {item.createdBy} | {item.createdAt?.toDate?.()?.toLocaleString('tr-TR') || 'Tarih yok'}
            </Text>
            {item.resolvedBy && (
              <Text style={styles.issueMeta}>
                Çözen: {item.resolvedBy} | {item.resolvedAt?.toDate?.()?.toLocaleString('tr-TR') || 'Tarih yok'}
              </Text>
            )}
            {item.resolvedAt && (
              <Text style={styles.issueMeta}>
                Çözüm Süresi: {getResolutionTime(item.createdAt, item.resolvedAt)}
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
          <Text style={styles.headerTitle}>Arızalar</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={issues}
          renderItem={renderIssue}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Henüz arıza bulunmuyor</Text>
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
              <Text style={styles.modalTitle}>Yeni Arıza Ekle</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Arıza Sebebi"
                value={reason}
                onChangeText={setReason}
              />
              
              <TextInput
                style={styles.input}
                placeholder="PPPoE Adı"
                value={pppoe}
                onChangeText={setPppoe}
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
                placeholder="Telefon"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
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
                  onPress={addIssue}
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
  issueItem: {
    backgroundColor: 'white',
    margin: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resolvedIssue: {
    borderLeftColor: '#4CAF50',
    opacity: 0.8,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  timeAgo: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: 'bold',
  },
  issueDetail: {
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
  issueMeta: {
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
    width: 100,
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