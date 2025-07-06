import { AuthState, User } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useHistoryStore } from "./history-store";

// Danh sách người dùng giả lập
const mockUsers = [
  {
    id: "1",
    email: "NNT@gmail.com",
    password: "30042003",
    name: "NNT",
  },
  {
    id: "2",
    email: "NNT2@gmail.com",
    password: "30042003",
    name: "NNT2",
  },
];

// Tạo store cho trạng thái xác thực
// Sử dụng Zustand để quản lý trạng thái xác thực
export const useAuthStore = create<AuthState>()(
  persist(
    // Tạo store cho trạng thái xác thực
    (set, get) => ({
      // Hàm khởi tạo store
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Đăng nhập người dùng
      // Hàm này sẽ được gọi khi người dùng nhấn nút đăng nhập
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("http://192.168.48.142:8000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          if (!response.ok) {
            throw new Error("Email hoặc mật khẩu sai. Vui lòng nhập lại");
          }
          const data = await response.json();
          const accessToken = data.access_token;
          // Gọi API lấy profile
          const profileRes = await fetch("http://192.168.48.142:8000/profile", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const profile = await profileRes.json();
          set({
            user: {
              id: get().user?.id,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
              birthdate: profile.birthdate,
              profileImage: profile.profileImage,
            },
            isAuthenticated: true,
            isLoading: false,
            accessToken: accessToken,
          });
          router.replace("/(tabs)");
        } catch (error: any) {
          set({
            error: error.message || "Đăng nhập không thành công",
            isLoading: false,
          });
        }
      },

      // Đăng ký người dùng mới
      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("http://192.168.48.142:8000/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.detail || "Đăng ký không thành công");
          }
          // Đăng ký xong thì đăng nhập luôn để lấy access_token và profile
          const loginRes = await fetch("http://192.168.48.142:8000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const loginData = await loginRes.json();
          const accessToken = loginData.access_token;
          const profileRes = await fetch("http://192.168.48.142:8000/profile", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const profile = await profileRes.json();
          set({
            user: {
              id: get().user?.id,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
              birthdate: profile.birthdate,
              profileImage: profile.profileImage,
            },
            isAuthenticated: true,
            isLoading: false,
            accessToken: accessToken,
          });
          router.replace("/(tabs)");
        } catch (error: any) {
          set({
            error: error.message || "Đăng ký không thành công",
            isLoading: false,
          });
        }
      },

      // Đăng xuất người dùng
      // Hàm này sẽ được gọi khi người dùng nhấn nút đăng xuất
      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
        });
        useHistoryStore.getState().clearHistory(); // Xóa lịch sử cũ
        router.replace("/login");
      },

      // Cập nhật thông tin người dùng
      // Hàm này sẽ được gọi khi người dùng muốn cập nhật thông tin cá nhân
      updateProfile: async (userData: Partial<User>) => {
        set({ isLoading: true, error: null });
        try {
          const accessToken = get().accessToken;
          if (!accessToken) {
            throw new Error("Bạn cần đăng nhập để thực hiện chức năng này");
          }
          let response;
          if (
            userData.profileImage &&
            typeof userData.profileImage !== "string"
          ) {
            // Nếu là file (object), gửi form-data
            const formData = new FormData();
            if (userData.name) formData.append("name", userData.name);
            if (userData.phone) formData.append("phone", userData.phone);
            if (userData.birthdate)
              formData.append("birthdate", userData.birthdate);
            // Sửa đoạn này để tương thích React Native
            const image: any = userData.profileImage;
            formData.append("profileImage", {
              uri: image.uri,
              name: image.fileName || image.name || "avatar.jpg",
              type: image.type || "image/jpeg",
            } as any);
            response = await fetch("http://192.168.48.142:8000/update-profile", {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              body: formData,
            });
          } else {
            // Gửi JSON như cũ
            response = await fetch("http://192.168.48.142:8000/update-profile", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify(userData),
            });
          }
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.detail || "Cập nhật hồ sơ không thành công");
          }
          const profileRes = await fetch("http://192.168.48.142:8000/profile", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const profile = await profileRes.json();
          set({
            user: {
              id: get().user?.id || "",
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
              birthdate: profile.birthdate,
              profileImage: profile.profileImage,
            },
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || "Cập nhật hồ sơ không thành công",
            isLoading: false,
          });
        }
      },
    }),
    {
      // Tên cho bộ lưu trữ được duy trì
      name: "auth-storage", // Tên của bộ lưu trữ được duy trì

      // Sử dụng AsyncStorage để lưu trữ dữ liệu
      storage: createJSONStorage(() => AsyncStorage), // Sử dụng AsyncStorage để lưu trữ dữ liệu
    }
  )
);
