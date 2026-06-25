// ============================================================
// ملف: src/hooks/useCamera.js
// ✅ Fix: dynamic imports عشان الـ build على Web ميكسرش
// ============================================================

export async function requestCameraPermission() {
  try {
    const { Camera } = await import("@capacitor/camera");
    const permission = await Camera.requestPermissions({ permissions: ["camera"] });
    return permission.camera === "granted";
  } catch (err) {
    // Web fallback - مش Capacitor
    return true;
  }
}

export async function openCamera() {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    alert("يرجى السماح بالوصول للكاميرا من إعدادات الهاتف");
    return null;
  }
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
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

export async function scanBarcode() {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    alert("يرجى السماح بالوصول للكاميرا");
    return null;
  }
  return null;
}
