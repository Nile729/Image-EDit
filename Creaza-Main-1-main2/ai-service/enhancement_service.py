import io
import base64
import numpy as np
from PIL import Image
import os

try:
    import cv2
    from cv2 import dnn_superres
except ImportError:
    cv2 = None
    dnn_superres = None

# Global variables
lapsrn_model_loaded = False

def check_lapsrn_model():
    """Check if LapSRN model is available and loadable"""
    global lapsrn_model_loaded
    
    if cv2 is None or dnn_superres is None:
        print("❌ OpenCV or dnn_superres not available - image enhancement disabled")
        return False
    
    model_path = "LapSRN_x4.pb"
    
    # Check if model file exists
    if not os.path.exists(model_path):
        print(f"❌ LapSRN model not found at: {model_path}")
        return False
    
    try:
        # Try to load the model
        sr = dnn_superres.DnnSuperResImpl_create()
        sr.readModel(model_path)
        sr.setModel('lapsrn', 4)
        
        # Test with a small dummy image
        test_img = np.zeros((32, 32, 3), dtype=np.uint8)
        sr.setPreferableBackend(cv2.dnn.DNN_BACKEND_DEFAULT)
        sr.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        
        # Try a small upsampling test
        _ = sr.upsample(test_img)
        
        lapsrn_model_loaded = True
        print("✅ LapSRN model loaded and tested successfully")
        return True
        
    except Exception as e:
        print(f"❌ Failed to load LapSRN model: {str(e)}")
        return False

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

def enhance_image_lapsrn(image_data: bytes) -> bytes:
    """Enhance image using LapSRN model with exact original logic"""
    MODEL_PATH = "LapSRN_x4.pb"
    MODEL_NAME = 'lapsrn'
    SCALE = 4
    
    if not os.path.isfile(MODEL_PATH):
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
    
    # Decode image
    nparr = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        raise Exception("Could not read image")
    
    print(f"🖼️ Original image: {image.shape[1]}x{image.shape[0]} pixels")
    
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
            print("⚠️ CUDA detected but not usable. Falling back to CPU.")
    else:
        sr.setPreferableBackend(cv2.dnn.DNN_BACKEND_DEFAULT)
        sr.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        print("⚠️ Using CPU for upscaling.")
    
    # Memory safety - resize if too large
    h, w = image.shape[:2]
    if w > 400 or h > 400:
        scale_factor = min(400 / w, 400 / h)
        new_w, new_h = int(w * scale_factor), int(h * scale_factor)
        image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
        print(f"🔄 Resized for processing: {new_w}x{new_h}")
    
    # Upscale using LapSRN
    try:
        print("⏳ Upscaling... (may take a few seconds on CPU)")
        upscaled = sr.upsample(image)
        print(f"✅ Upscaling finished: {upscaled.shape[1]}x{upscaled.shape[0]}")
    except cv2.error as e:
        raise Exception(f"Upscaling failed: {e}")
    
    # Encode to bytes
    _, buffer = cv2.imencode('.png', upscaled)
    return buffer.tobytes()

def fit_window_cv2(img, max_width=1600, max_height=900):
    """Resize image to fit inside a window while preserving aspect ratio"""
    h, w = img.shape[:2]
    if w <= max_width and h <= max_height:
        return img
    scale = min(max_width / w, max_height / h)
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

async def enhance_image(file):
    """Enhance image using LapSRN 4x super-resolution"""
    try:
        print(f"📸 Enhancement request received for file: {file.filename}")
        contents = await file.read()
        print(f"📏 File size: {len(contents)} bytes")
        
        if len(contents) > 5 * 1024 * 1024:
            return {"error": "Image file too large (max 5MB)", "status_code": 413}
        
        # Check if required libraries are available
        if cv2 is None or dnn_superres is None:
            return {"error": "OpenCV with dnn_superres not available", "status_code": 503}
        
        # Check if LapSRN model is available
        if not lapsrn_model_loaded:
            return {"error": "LapSRN model not available", "status_code": 503}
        
        # Validate image format
        try:
            test_img = Image.open(io.BytesIO(contents))
            test_img.verify()
        except Exception:
            return {"error": "Invalid image format", "status_code": 400}
        
        # Use LapSRN for enhancement
        enhanced_bytes = enhance_image_lapsrn(contents)
        
        # Convert to base64
        img_str = base64.b64encode(enhanced_bytes).decode()
        print(f"📤 Base64 encoded, length: {len(img_str)} chars")
        
        return {
            "success": True,
            "image": f"data:image/png;base64,{img_str}",
            "message": "Image enhanced 4x using LapSRN super-resolution"
        }
        
    except Exception as e:
        print(f"❌ Enhancement error: {str(e)}")
        return {"error": f"Enhancement failed: {str(e)}", "status_code": 500}

def get_enhancement_status():
    """Get enhancement model status"""
    return {
        "lapsrn_model": {
            "loaded": lapsrn_model_loaded,
            "path": "LapSRN_x4.pb",
            "exists": os.path.exists("LapSRN_x4.pb")
        }
    }