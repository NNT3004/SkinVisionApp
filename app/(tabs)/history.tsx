import { EmptyState } from '@/components/EmtyState';
import { ScanHistoryCard } from '@/components/ScanHistoryCard';
import { colors } from '@/constants/Colors';
import { useAuthStore } from '@/store/auth-store';
import { useHistoryStore } from '@/store/history-store';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { History } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const { scans, fetchHistory, isLoading } = useHistoryStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchHistory();
  }, []);

  // Không cần lọc theo userId nữa, vì scans đã là lịch sử của user hiện tại
  const userScans = [...scans].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Lịch sử chẩn đoán</Text>
        <Text style={styles.subtitle}>
          Xem kết quả phân tích da trước đây
        </Text>
      </View>

      <FlatList
        data={userScans}
        keyExtractor={item => item._id || item.id}
        renderItem={({ item }) => (
          <ScanHistoryCard
            scan={item}
            onPress={() => router.push(`/scan-result/${item._id || item.id}`)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          userScans.length === 0 && styles.emptyListContent
        ]}
        ListEmptyComponent={
          <EmptyState
            icon={<History size={40} color={colors.primary} />}
            title="Chưa có lịch sử quét"
            description="Kết quả phân tích da của bạn sẽ hiển thị tại đây sau khi bạn quét da."
            buttonTitle="Quét ngay"
            onButtonPress={() => router.push('/')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
  },
});