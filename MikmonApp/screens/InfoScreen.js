import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';

export default function InfoScreen({ navigation }) {
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [currentPdfUrl, setCurrentPdfUrl] = useState('');
  const [currentPdfTitle, setCurrentPdfTitle] = useState('');
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [contractsModalVisible, setContractsModalVisible] = useState(false);

  const handleButtonPress = (title) => {
    if (title === 'Personeller Nerede?') {
      navigation.navigate('LocationTracking');
    } else if (title === 'İptal Edenler') {
      navigation.navigate('Cancellations');
    } else {
      Alert.alert(
        'Yakında',
        `${title} özelliği yakında eklenecek.`,
        [{ text: 'Tamam', style: 'default' }]
      );
    }
  };

  const openPdf = (url, title) => {
    setCurrentPdfUrl(url);
    setCurrentPdfTitle(title);
    setPdfModalVisible(true);
    setShowDownloadOptions(false);
  };

  const openInBrowser = async (url, title) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Hata', 'Bu link açılamıyor.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Link açılırken hata oluştu.');
    }
  };

  const openContractsModal = () => {
    setContractsModalVisible(true);
  };

  const closeContractsModal = () => {
    setContractsModalVisible(false);
  };

  const closePdf = () => {
    setPdfModalVisible(false);
    setCurrentPdfUrl('');
    setCurrentPdfTitle('');
    setShowDownloadOptions(false);
  };

  const handleDownload = async () => {
    try {
      setShowDownloadOptions(false);
      
      // Dosya adını oluştur
      const fileName = `${currentPdfTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // İndirme işlemini başlat
      const downloadResumable = FileSystem.createDownloadResumable(
        currentPdfUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log(`Download progress: ${progress * 100}%`);
        }
      );
      
      Alert.alert(
        'PDF İndiriliyor',
        `${currentPdfTitle} dosyası indiriliyor...`,
        [{ text: 'Tamam', style: 'default' }]
      );
      
      const { uri } = await downloadResumable.downloadAsync();
      
      Alert.alert(
        'Başarılı!',
        `${currentPdfTitle} dosyası başarıyla indirildi.\nDosya konumu: ${uri}`,
        [{ text: 'Tamam', style: 'default' }]
      );
      
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert(
        'Hata',
        'PDF indirilirken hata oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam', style: 'default' }]
      );
    }
  };

  const showDownloadModal = () => {
    setShowDownloadOptions(true);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bilgi</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Profil Butonu */}
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.buttonIcon}>👤</Text>
              <Text style={styles.buttonTitle}>Profil</Text>
              <Text style={styles.buttonDescription}>
                Kullanıcı profili ve ayarlar
              </Text>
            </TouchableOpacity>

            {/* Personeller Nerede? Butonu */}
            <TouchableOpacity
              style={[styles.button, styles.activeButton]}
              onPress={() => handleButtonPress('Personeller Nerede?')}
            >
              <Text style={styles.buttonIcon}>📍</Text>
              <Text style={styles.buttonTitle}>Personeller Nerede?</Text>
              <Text style={styles.buttonDescription}>
                Personellerin canlı konum takibi
              </Text>
            </TouchableOpacity>

            {/* İptal Edenler Butonu */}
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleButtonPress('İptal Edenler')}
            >
              <Text style={styles.buttonIcon}>❌</Text>
              <Text style={styles.buttonTitle}>İptal Edenler</Text>
              <Text style={styles.buttonDescription}>
                İptal eden müşteriler ve ikna durumları
              </Text>
            </TouchableOpacity>

            {/* Haritalar Butonu */}
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleButtonPress('Haritalar')}
            >
              <Text style={styles.buttonIcon}>🗺️</Text>
              <Text style={styles.buttonTitle}>Haritalar</Text>
              <Text style={styles.buttonDescription}>
                Hizmet bölgeleri ve kapsama alanları
              </Text>
            </TouchableOpacity>

            {/* Sözleşmeler Butonu */}
            <TouchableOpacity
              style={styles.button}
              onPress={openContractsModal}
            >
              <Text style={styles.buttonIcon}>📄</Text>
              <Text style={styles.buttonTitle}>Sözleşmeler</Text>
              <Text style={styles.buttonDescription}>
                Hizmet sözleşmeleri ve belgeler
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* PDF Modal */}
        <Modal
          visible={pdfModalVisible}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{currentPdfTitle}</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.downloadButton} onPress={showDownloadModal}>
                  <Text style={styles.downloadButtonText}>📥</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeButton} onPress={closePdf}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            <WebView
              source={{ uri: currentPdfUrl }}
              style={styles.pdfViewer}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              onShouldStartLoadWithRequest={(request) => {
                // PDF dosyalarını önizleme modunda göster
                if (request.url.endsWith('.pdf')) {
                  return true;
                }
                return true;
              }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('PDF loading error: ', nativeEvent);
                Alert.alert('Hata', 'PDF yüklenirken hata oluştu.');
              }}
            />
          </View>
        </Modal>

        {/* Download Options Modal */}
        <Modal
          visible={showDownloadOptions}
          animationType="fade"
          transparent={true}
        >
          <View style={styles.downloadModalOverlay}>
            <View style={styles.downloadModalContent}>
              <Text style={styles.downloadModalTitle}>PDF İndirme</Text>
              <Text style={styles.downloadModalDescription}>
                {currentPdfTitle} dosyasını indirmek istiyor musunuz?
              </Text>
              <View style={styles.downloadModalButtons}>
                <TouchableOpacity 
                  style={[styles.downloadModalButton, styles.cancelButton]} 
                  onPress={() => setShowDownloadOptions(false)}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.downloadModalButton, styles.confirmButton]} 
                  onPress={handleDownload}
                >
                  <Text style={styles.confirmButtonText}>İndir</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Contracts Modal */}
        <Modal
          visible={contractsModalVisible}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sözleşmeler</Text>
              <TouchableOpacity style={styles.closeButton} onPress={closeContractsModal}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <View style={styles.contractsContent}>
                {/* Ana Sözleşme */}
                <TouchableOpacity
                  style={styles.contractButton}
                  onPress={() => openInBrowser('https://mikmon.tr/MikmonApp/sozlesme.pdf', 'Ana Sözleşme')}
                >
                  <Text style={styles.contractButtonIcon}>📄</Text>
                  <Text style={styles.contractButtonTitle}>Ana Sözleşme</Text>
                  <Text style={styles.contractButtonDescription}>
                    Hizmet sözleşmesi ve şartlar
                  </Text>
                </TouchableOpacity>

                {/* İptal Dilekçesi */}
                <TouchableOpacity
                  style={styles.contractButton}
                  onPress={() => openInBrowser('https://mikmon.tr/MikmonApp/iptal.pdf', 'İptal Dilekçesi')}
                >
                  <Text style={styles.contractButtonIcon}>📝</Text>
                  <Text style={styles.contractButtonTitle}>İptal Dilekçesi</Text>
                  <Text style={styles.contractButtonDescription}>
                    Hizmet iptal dilekçesi formu
                  </Text>
                </TouchableOpacity>

                {/* Çanak Protokolü */}
                <TouchableOpacity
                  style={styles.contractButton}
                  onPress={() => openInBrowser('https://mikmon.tr/MikmonApp/protokol.pdf', 'Çanak Protokolü')}
                >
                  <Text style={styles.contractButtonIcon}>📋</Text>
                  <Text style={styles.contractButtonTitle}>Çanak Protokolü</Text>
                  <Text style={styles.contractButtonDescription}>
                    Çanak kurulum protokolü ve standartları
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  button: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  buttonIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  downloadButtonText: {
    fontSize: 18,
    color: '#2196F3',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  pdfViewer: {
    flex: 1,
  },
  downloadModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  downloadModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  downloadModalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  downloadModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  downloadModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
  },
  contractsContent: {
    padding: 20,
  },
  contractButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  contractButtonIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  contractButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  contractButtonDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 