import { useAuthStore } from "@/store/auth-store";
import { HistoryState } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      scans: [],
      isLoading: false,
      error: null,

      // Thêm một lượt quét mới vào danh sách
      addScan: async (scanData) => {
        const accessToken = useAuthStore.getState().accessToken;
        const user = useAuthStore.getState().user;
        if (!accessToken || !user) throw new Error("Bạn cần đăng nhập");

        const payload = {
          imageUri: scanData.imageUri,
          diseases: scanData.diseases,
          notes: scanData.notes,
          date: new Date().toISOString(),
        };

        const response = await fetch("http://192.168.48.142:8000/scan-history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Không lưu được lịch sử quét");
        }

        const newScan = await response.json();

        // Thêm lượt quét mới vào đầu danh sách local
        set((state) => ({
          scans: [newScan, ...state.scans],
        }));

        return newScan._id; // Trả về ID của lượt quét mới
      },

      // Xóa một lượt quét dựa trên ID
      deleteScan: async (id) => {
        const accessToken = useAuthStore.getState().accessToken;
        if (!accessToken) throw new Error("Bạn cần đăng nhập");
        await fetch(`http://192.168.48.142:8000/scan-history/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        await get().fetchHistory();
      },

      // Cập nhật ghi chú cho một lượt quét
      updateScanNotes: (id, notes) => {
        set((state) => ({
          scans: state.scans.map(
            (scan) => (scan.id === id ? { ...scan, notes } : scan) // Nếu ID khớp, cập nhật ghi chú
          ),
        }));
      },

      clearHistory: () => set({ scans: [] }),

      fetchHistory: async () => {
        set({ isLoading: true, error: null });
        try {
          const accessToken = useAuthStore.getState().accessToken;
          if (!accessToken) throw new Error("Bạn cần đăng nhập");
          const response = await fetch(
            "http://192.168.48.142:8000/scan-history",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          if (!response.ok) {
            throw new Error("Không lấy được lịch sử quét");
          }
          const data = await response.json();
          set({ scans: data, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },
    }),
    {
      name: "history-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
