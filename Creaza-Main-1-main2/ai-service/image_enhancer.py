import cv2
from cv2 import dnn_superres
import os
import numpy as np
from typing import Tuple

def can_use_cuda():
    """Return True if the current OpenCV build supports CUDA DNN target."""
    try:
        build_info = cv2.getBuildInformation()
        if "CUDA" in build_info:
            after = build_info.split("CUDA", 1)[1]
            first_line = after.splitlines()[0]
            return "YES" in first_line
    except Exception:
        pass
    return False

def enhance_image_4x(image: np.ndarray, original_size: Tuple[int, int]) -> np.ndarray:
    """Enhance image 4x using exact original code logic"""
    MODEL_PATH = r'C:\Users\nilab\PycharmProjects\PythonProject1\LapSRN_x4.pb'
    MODEL_NAME = 'lapsrn'
    SCALE = 4
    
    if not os.path.isfile(MODEL_PATH):
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
    
    # Create SR object
    sr = dnn_superres.DnnSuperResImpl_create()
    
    # Load model
    try:
        sr.readModel(MODEL_PATH)
    except cv2.error as e:
        raise Exception(f"Failed to read model: {e}")
    
    # Set model and scale
    sr.setModel(MODEL_NAME, SCALE)
    
    # Set CUDA backend if available
    if can_use_cuda():
        try:
            sr.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
            sr.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA)
            print("✅ Using GPU (CUDA) for upscaling.")
        except Exception:
            sr.setPreferableBackend(cv2.dnn.DNN_BACKEND_DEFAULT)
            sr.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
            print("⚠️ CUDA detected but not usable by this OpenCV build. Falling back to CPU.")
    else:
        sr.setPreferableBackend(cv2.dnn.DNN_BACKEND_DEFAULT)
        sr.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        print("⚠️ OpenCV not built with CUDA support. Using CPU.")
    
    # Memory check - resize if too large
    h, w = image.shape[:2]
    if w > 400 or h > 400:
        scale_factor = min(400 / w, 400 / h)
        new_w, new_h = int(w * scale_factor), int(h * scale_factor)
        image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    
    # Upscale
    try:
        print("⏳ Upscaling... (may take a few seconds on CPU)")
        upscaled = sr.upsample(image)
        print("✅ Upscaling finished.")
    except cv2.error as e:
        raise Exception(f"Upscaling failed: {e}")
    
    # Resize to original dimensions
    result = cv2.resize(upscaled, original_size, interpolation=cv2.INTER_LANCZOS4)
    
    return result

def enhance_image_api(image_data: bytes, target_width: int, target_height: int, scale: int = 4) -> bytes:
    """API function - only 4x enhancement available"""
    if len(image_data) > 5 * 1024 * 1024:  # 5MB limit
        raise Exception("Image too large")
    
    nparr = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    result = enhance_image_4x(image, (target_width, target_height))
    
    _, buffer = cv2.imencode('.png', result)
    return buffer.tobytes()