// ============================================================
// ملف: src/hooks/useCamera.js
// يحل مشكلة: عدم الوصول للكاميرا في Android
// ============================================================
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

// ✅ طلب إذن الكاميرا صح
export async function requestCameraPermission() {
  try {
    const permission = await Camera.requestPermissions({ permissions: ["camera"] });
    return permission.camera === "granted";
  } catch (err) {
    console.error("Camera permission error:", err);
    return false;
  }
}

// ✅ فتح الكاميرا لمسح الباركود أو التصوير
export async function openCamera() {
  // أطلب الإذن أولاً
  const hasPermission = await requestCameraPermission();

  if (!hasPermission) {
    alert("يرجى السماح بالوصول للكاميرا من إعدادات الهاتف");
    return null;
  }

  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });
    return photo.dataUrl;
  } catch (err) {
    if (err.message?.includes("cancelled")) return null;
    console.error("Camera error:", err);
    return null;
  }
}

// ✅ للاستخدام في مسح الباركود
// استخدم مكتبة: @capacitor-mlkit/barcode-scanning
// npm install @capacitor-mlkit/barcode-scanning
export async function scanBarcode() {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    alert("يرجى السماح بالوصول للكاميرا");
    return null;
  }

  // المسح يتم في الـ component بعد إضافة المكتبة
  // مثال:
  // import { BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
  // const { barcodes } = await BarcodeScanner.scan();
  // return barcodes[0]?.rawValue;

  return null;
}
