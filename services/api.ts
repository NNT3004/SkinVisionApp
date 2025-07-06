import { Platform } from "react-native";

// Định nghĩa base URL cho API
const API_BASE_URL = Platform.select({
  android: "http://192.168.48.142:8000", // IP của máy tính
  ios: "http://127.0.0.1:8000", // iOS simulator
  default: "http://localhost:8000", // Web
});

// Interface cho kết quả phân tích
interface Prediction {
  class: number;
  probability: number;
}

interface AnalysisResult {
  predictions: Prediction[];
}

// Hàm tạo timeout promise
const timeoutPromise = (ms: number) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Request timeout"));
    }, ms);
  });
};

// Hàm kiểm tra kết nối API
export const checkApiConnection = async (): Promise<boolean> => {
  try {
    console.log("Platform:", Platform.OS);
    console.log("API Base URL:", API_BASE_URL);
    console.log("Checking API connection to:", `${API_BASE_URL}/health`);

    // Sử dụng Promise.race để tạo timeout
    const response = (await Promise.race([
      fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }).then(async (res) => {
        console.log("Raw response:", res);
        console.log("Response status:", res.status);
        console.log("Response headers:", JSON.stringify(res.headers));
        return res;
      }),
      timeoutPromise(5000), // 5 giây timeout
    ])) as Response;

    console.log("API health check response:", response.status);
    return response.ok;
  } catch (error) {
    console.error("API connection check failed:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      // Thêm thông tin debug
      if (error.message === "Request timeout") {
        console.error("Connection timeout. Please check:");
        console.error("1. API server is running");
        console.error("2. Correct IP address:", API_BASE_URL);
        console.error("3. No firewall blocking port 8000");
        console.error("4. Device and server are on the same network");
      }
    }
    return false;
  }
};

// Hàm gọi API phân tích ảnh
export const analyzeImage = async (
  imageUri: string,
  base64?: string
): Promise<AnalysisResult> => {
  try {
    console.log("Attempting to connect to API at:", API_BASE_URL);

    // Kiểm tra kết nối API trước
    const isApiConnected = await checkApiConnection();
    if (!isApiConnected) {
      throw new Error(
        "Không thể kết nối đến server. Vui lòng kiểm tra:\n1. Server đang chạy\n2. IP address chính xác\n3. Không có firewall chặn kết nối"
      );
    }

    const formData = new FormData();

    // Nếu có base64, sử dụng nó để giảm kích thước
    if (base64) {
      formData.append("file", {
        uri: `data:image/jpeg;base64,${base64}`,
        type: "image/jpeg",
        name: "photo.jpg",
      } as any);
    } else {
      formData.append("file", {
        uri: imageUri,
        type: "image/jpeg",
        name: "photo.jpg",
      } as any);
    }

    console.log("Sending image to API...");

    // Sử dụng Promise.race để tạo timeout
    const response = (await Promise.race([
      fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      }),
      timeoutPromise(60000), // 60 giây timeout
    ])) as Response;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    console.log("API response received:", data);
    return data;
  } catch (error) {
    console.error("Error analyzing image:", error);
    if (error instanceof Error) {
      if (error.message === "Request timeout") {
        throw new Error(
          "Yêu cầu xử lý ảnh quá lâu. Vui lòng thử lại với ảnh có kích thước nhỏ hơn."
        );
      }
      throw error;
    }
    throw new Error("Có lỗi xảy ra khi xử lý ảnh. Vui lòng thử lại.");
  }
};
