import AsyncStorage from '@react-native-async-storage/async-storage';

export const getNotificationSettings = async () => {
  try {
    const settings = await AsyncStorage.getItem('notificationSettings');
    return settings ? JSON.parse(settings) : true; // Varsayılan olarak açık
  } catch (error) {
    console.error('Bildirim ayarları alınırken hata:', error);
    return true;
  }
};

export const setNotificationSettings = async (enabled) => {
  try {
    await AsyncStorage.setItem('notificationSettings', JSON.stringify(enabled));
    return true;
  } catch (error) {
    console.error('Bildirim ayarları kaydedilirken hata:', error);
    return false;
  }
};

export const shouldSendNotification = async () => {
  return await getNotificationSettings();
}; 