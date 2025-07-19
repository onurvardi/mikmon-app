import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function QualityScreen({ navigation }) {
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [webViewUrl, setWebViewUrl] = useState(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = useRef(null);

  useEffect(() => {
    const backAction = () => {
      if (selectedMenu && canGoBack) {
        // WebView'da geri git
        webViewRef.current?.goBack();
        return true;
      } else if (selectedMenu) {
        // Kalite menüsüne geri dön
        setSelectedMenu(null);
        setWebViewUrl(null);
        setCanGoBack(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedMenu, canGoBack]);

  const handleMenuPress = (menu, url) => {
    setSelectedMenu(menu);
    setWebViewUrl(url);
    setCanGoBack(false);
  };

  const handleBackPress = () => {
    if (selectedMenu && canGoBack) {
      // WebView'da geri git
      webViewRef.current?.goBack();
    } else if (selectedMenu) {
      // Kalite menüsüne geri dön
      setSelectedMenu(null);
      setWebViewUrl(null);
      setCanGoBack(false);
    } else {
      navigation.goBack();
    }
  };

  const renderWebView = () => (
    <WebView
      ref={webViewRef}
      source={{ uri: webViewUrl }}
      style={styles.webView}
      startInLoadingState={true}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      onNavigationStateChange={(navState) => {
        // WebView'da geri gitme durumunu kontrol et
        setCanGoBack(navState.canGoBack);
      }}
      onShouldStartLoadWithRequest={(request) => {
        // Harici linkleri tarayıcıda aç
        if (request.url !== webViewUrl && !request.url.startsWith('https://mikmon.tr')) {
          return false;
        }
        return true;
      }}
    />
  );

  const renderMainMenu = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Her Gün Yapılacaklar */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => handleMenuPress('Her Gün Yapılacaklar', 'https://mikmon.tr/MikmonApp/kalite/1.html')}
        >
          <Text style={styles.buttonIcon}>📅</Text>
          <Text style={styles.buttonTitle}>Her Gün Yapılacaklar</Text>
          <Text style={styles.buttonDescription}>
            Günlük rutin işlemler ve kontrol listesi
          </Text>
        </TouchableOpacity>

        {/* Kaliteyi Arttırmak İçin Öneriler */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => handleMenuPress('Kaliteyi Arttırmak İçin Öneriler', 'https://mikmon.tr/MikmonApp/kalite/2.html')}
        >
          <Text style={styles.buttonIcon}>📈</Text>
          <Text style={styles.buttonTitle}>Kaliteyi Arttırmak İçin Öneriler</Text>
          <Text style={styles.buttonDescription}>
            Hizmet kalitesini artırmak için öneriler ve ipuçları
          </Text>
        </TouchableOpacity>

        {/* Yeni Abone Gelirse Yapılacaklar */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => handleMenuPress('Yeni Abone Gelirse Yapılacaklar', 'https://mikmon.tr/MikmonApp/kalite/3.html')}
        >
          <Text style={styles.buttonIcon}>🆕</Text>
          <Text style={styles.buttonTitle}>Yeni Abone Gelirse Yapılacaklar</Text>
          <Text style={styles.buttonDescription}>
            Yeni abone işlemleri ve prosedürleri
          </Text>
        </TouchableOpacity>

        {/* Arıza Bildirilirse Yapılacaklar */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => handleMenuPress('Arıza Bildirilirse Yapılacaklar', 'https://mikmon.tr/MikmonApp/kalite/4.html')}
        >
          <Text style={styles.buttonIcon}>🔧</Text>
          <Text style={styles.buttonTitle}>Arıza Bildirilirse Yapılacaklar</Text>
          <Text style={styles.buttonDescription}>
            Arıza bildirimi alındığında yapılacak işlemler
          </Text>
        </TouchableOpacity>

        {/* İptal İstenirse Yapılacaklar */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => handleMenuPress('İptal İstenirse Yapılacaklar', 'https://mikmon.tr/MikmonApp/kalite/5.html')}
        >
          <Text style={styles.buttonIcon}>❌</Text>
          <Text style={styles.buttonTitle}>İptal İstenirse Yapılacaklar</Text>
          <Text style={styles.buttonDescription}>
            Hizmet iptali durumunda yapılacak işlemler
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selectedMenu || 'Kalite Kontrol'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {webViewUrl ? renderWebView() : renderMainMenu()}
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  webView: {
    flex: 1,
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
  buttonIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  buttonDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 