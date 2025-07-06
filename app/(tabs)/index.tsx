import { DiseaseCard } from '@/components/DiseaseCard';
import { colors } from '@/constants/Colors';
import { diseases } from '@/constants/diseases';
import { analyzeImage, checkApiConnection } from '@/services/api';
import { useAuthStore } from '@/store/auth-store';
import { useHistoryStore } from '@/store/history-store';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Camera, Info, Upload } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { addScan } = useHistoryStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(true);

  // Kiểm tra kết nối API khi component mount
  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    const connected = await checkApiConnection();
    setIsApiConnected(connected);
  };

  // Request camera permissions
  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Yêu cầu quyền truy cập',
          'Ứng dụng cần quyền truy cập camera để chụp ảnh phục vụ phân tích da.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    }
    return true;
  };

  // Take a photo with the camera
  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        processImage(result.assets[0].uri, result.assets[0].base64 || undefined);
      }
    } catch (error) {
      console.error('Lỗi khi chụp ảnh:', error);
      Alert.alert('Lỗi', 'Chụp ảnh không thành công. Vui lòng thử lại.');
    }
  };

  // Pick an image from the gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        processImage(result.assets[0].uri, result.assets[0].base64 || undefined);
      }
    } catch (error) {
      console.error('Lỗi khi chọn ảnh:', error);
      Alert.alert('Lỗi', 'Chọn ảnh không thành công. Vui lòng thử lại.');
    }
  };

  // Process the selected image
  const processImage = async (imageUri: string, base64?: string) => {
    if (!user) return;
    if (!isApiConnected) {
      Alert.alert(
        'Lỗi kết nối',
        'Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối mạng và đảm bảo server đang chạy.',
        [
          { text: 'Thử lại', onPress: checkApiStatus },
          { text: 'Đóng', style: 'cancel' }
        ]
      );
      return;
    }

    setIsProcessing(true);

    try {
      const result = await analyzeImage(imageUri, base64);
      if (result.detail) {
        Alert.alert('Thông báo', result.detail);
        return;
      }
      const results = result.predictions.map(prediction => {
        const disease = diseases[prediction.class];
        return {
          id: disease.id,
          name: disease.name,
          probability: prediction.probability,
        };
      });

      // Add to history and get the new scan's ID
      const newScanId = await addScan({
        userId: user.id,
        imageUri,
        diseases: results,
      });

      // Navigate to result screen with the new ID
      if (newScanId) {
        router.push(`/scan-result/${newScanId}`);
      } else {
        // Fallback in case ID is not returned, navigate to history
        Alert.alert("Thông báo", "Đã lưu kết quả vào lịch sử.");
        router.push('/(tabs)/history');
      }
    } catch (error) {
      console.error('Lỗi khi xử lý ảnh:', error);
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Phân tích ảnh không thành công. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get time of day for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <Image
            source={{
              uri: user?.profileImage || 'https://cdn.glitch.global/3eee690f-0227-4039-b9ce-c71a3d4aa83c/istockphoto-1337144146-612x612.jpg?v=1750309273056'
            }}
            style={styles.profileImage}
          />
        </View>

        <View style={styles.scanSection}>
          <Text style={styles.sectionTitle}>Phân tích da</Text>
          <Text style={styles.sectionDescription}>
            Chụp ảnh hoặc tải lên một bức ảnh để phân tích tình trạng da của bạn
          </Text>

          {!isApiConnected && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối mạng.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={checkApiStatus}
              >
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.scanOptions}>
            <TouchableOpacity
              style={styles.scanOption}
              onPress={takePhoto}
              disabled={isProcessing}
            >
              <View style={styles.scanOptionIcon}>
                <Camera size={28} color={colors.primary} />
              </View>
              <Text style={styles.scanOptionText}>Chụp ảnh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scanOption}
              onPress={pickImage}
              disabled={isProcessing}
            >
              <View style={styles.scanOptionIcon}>
                <Upload size={28} color={colors.primary} />
              </View>
              <Text style={styles.scanOptionText}>Tải ảnh lên</Text>
            </TouchableOpacity>
          </View>

          {isProcessing && (
            <View style={styles.processingContainer}>
              <Text style={styles.processingText}>Đang phân tích ảnh...</Text>
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Info size={20} color={colors.primary} />
            <Text style={styles.infoTitle}>Bạn có biết?</Text>
          </View>
          <Text style={styles.infoText}>
            Kiểm tra da thường xuyên giúp phát hiện các vấn đề về da sớm,
            làm cho việc điều trị trở nên dễ dàng hơn. Hãy nhớ tham khảo ý kiến bác sĩ da liễu
            để có chẩn đoán chuyên môn.
          </Text>
        </View>


        <View style={styles.commonSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Các vấn đề da thường gặp</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/disease')}
            >
              <Text style={styles.viewAllText}>Xem tất cả</Text>
              <ArrowRight size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {diseases.slice(0, 3).map(disease => (
            <DiseaseCard
              key={disease.id}
              disease={disease}
              onPress={() => router.push(`/disease/${disease.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  scanSection: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  scanOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  scanOption: {
    flex: 1,
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  scanOptionIcon: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scanOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  processingContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  commonSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: 'red',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});