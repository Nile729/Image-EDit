from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import io
import base64
from PIL import Image
import numpy as np
import os
import pickle
import requests
try:
    import cv2
    from cv2 import dnn_superres
except ImportError:
    cv2 = None
    dnn_superres = None
try:
    from rembg import remove
except ImportError:
    remove = None
try:
    from tensorflow.keras.models import load_model
    from tensorflow.keras.preprocessing.image import img_to_array
    from tensorflow.keras.applications.vgg16 import preprocess_input
    from tensorflow.keras.applications import VGG16
    import tensorflow as tf
except ImportError:
    load_model = None
    VGG16 = None
    tf = None

app = FastAPI(title="Image Editor AI Service", version="1.0.0")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Global variables
HF_API_KEYS = [
    "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"
]
current_key_index = 0
HF_MODEL = "black-forest-labs/FLUX.1-schnell"
HF_API_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"
caption_model = None
tokenizer = None
feature_extractor = None
lapsrn_model_loaded = False

# Load caption model and tokenizer
def load_caption_model():
    global caption_model, tokenizer, feature_extractor
    try:
        if load_model is not None and VGG16 is not None:
            caption_model = load_model("C:\\Users\\nilab\\PycharmProjects\\PythonProject1\\model.h5")
            with open("C:\\Users\\nilab\\PycharmProjects\\PythonProject1\\tokenizer.pkl", 'rb') as f:
                tokenizer = pickle.load(f)
            
            # Load VGG16 feature extractor
            vgg_model = VGG16(weights='imagenet', include_top=True)
            feature_extractor = tf.keras.Model(inputs=vgg_model.input, outputs=vgg_model.get_layer('fc2').output)
            
            print("Caption model, tokenizer, and feature extractor loaded successfully")
        else:
            print("TensorFlow not available - caption feature disabled")
    except Exception as e:
        print(f"Failed to load caption model: {e}")

def preprocess_image_for_caption(img):
    """Preprocess image for caption model"""
    try:
        img = img.resize((224, 224))
        img_array = np.array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = preprocess_input(img_array)
        return img_array
    except Exception as e:
        print(f"Error preprocessing image: {str(e)}")
        return None

def extract_features(img_array, feature_extractor):
    """Extract features using VGG16"""
    try:
        features = feature_extractor.predict(img_array)
        return features
    except Exception as e:
        print(f"Error extracting features: {str(e)}")
        return None

def create_initial_sequence():
    """Create initial sequence with start token"""
    return np.array([[1]])

def generate_caption(image_features, max_length=20):
    """Generate caption from image features"""
    try:
        sequence = create_initial_sequence()
        caption = []
        
        for _ in range(max_length):
            prediction = caption_model.predict([image_features, sequence])
            predicted_id = np.argmax(prediction[0]) if len(prediction.shape) == 2 else np.argmax(prediction)
            
            # Get the word from tokenizer
            word = tokenizer.index_word.get(predicted_id, '<unk>')
            
            if word == "endseq":
                break  # Stop generation when "endseq" is predicted
            
            caption.append(word)
            sequence = np.append(sequence, [[predicted_id]], axis=1)
        
        # Clean up caption
        final_caption = " ".join(caption).replace("startseq", "").strip().title()
        return final_caption
        
    except Exception as e:
        print(f"Error generating caption: {str(e)}")
        return "Unable to generate caption"

def get_next_api_key():
    """Rotate to next API key"""
    global current_key_index
    current_key_index = (current_key_index + 1) % len(HF_API_KEYS)
    return HF_API_KEYS[current_key_index]

def get_current_api_key():
    """Get current API key"""
    return HF_API_KEYS[current_key_index]

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

class TextToImageRequest(BaseModel):
    prompt: str
    width: int = 512
    height: int = 512
    num_inference_steps: int = 50
    guidance_scale: float = 12.0

class ChatRequest(BaseModel):
    message: str

@app.get("/")
async def root():
    return {"message": "Image Editor AI Service", "status": "running"}

@app.get("/model-status")
async def model_status():
    """Check status of all AI models"""
    return {
        "lapsrn_model": {
            "loaded": lapsrn_model_loaded,
            "path": "LapSRN_x4.pb",
            "exists": os.path.exists("LapSRN_x4.pb")
        },
        "caption_model": {
            "loaded": caption_model is not None,
            "path": "C:\\Users\\nilab\\PycharmProjects\\PythonProject1\\model.h5",
            "exists": os.path.exists("C:\\Users\\nilab\\PycharmProjects\\PythonProject1\\model.h5")
        },
        "tokenizer": {
            "loaded": tokenizer is not None,
            "path": "C:\\Users\\nilab\\PycharmProjects\\PythonProject1\\tokenizer.pkl",
            "exists": os.path.exists("C:\\Users\\nilab\\PycharmProjects\\PythonProject1\\tokenizer.pkl")
        },
        "feature_extractor": {
            "loaded": feature_extractor is not None
        },
        "opencv_available": cv2 is not None,
        "rembg_available": remove is not None
    }

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    """Chat with AI assistant using DeepHermes model"""
    print(f"Received chat request: {request.message}")
    
    try:
        api_key = "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"
        model = "nousresearch/deephermes-3-llama-3-8b-preview:free"
        
        system_prompt = """You are an AI assistant specialized in image editing and digital art. You help users with:

- Image editing techniques and best practices
- Tool usage guidance (brush, eraser, filters, layers, etc.)
- Color theory and composition advice
- Layer management and blending modes
- Filter effects and when to use them
- Workflow optimization tips
- Creative suggestions for image enhancement

Keep responses concise, practical, and focused on image editing. Provide step-by-step guidance when needed."""
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ],
            "max_tokens": 500,
            "temperature": 0.7
        }
        
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            if "choices" in data and len(data["choices"]) > 0:
                content = data["choices"][0]["message"]["content"]
                return {
                    "success": True,
                    "message": content
                }
        
        # Fallback response
        return {
            "success": True,
            "message": "I'm your image editing assistant! How can I help you with layers, filters, tools, or creative techniques?"
        }
        
    except Exception as e:
        print(f"Chat error: {str(e)}")
        return {
            "success": True,
            "message": "I'm here to help with image editing! Ask me about tools, techniques, or creative ideas."
        }

@app.post("/generate-caption")
async def generate_image_caption(file: UploadFile = File(...)):
    """Generate caption for uploaded image"""
    if caption_model is None or feature_extractor is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Caption model not available")
    
    try:
        # Read and process image
        image_data = await file.read()
        image_file = Image.open(io.BytesIO(image_data)).convert("RGB")
        
        # Preprocess image
        processed_img = preprocess_image_for_caption(image_file)
        if processed_img is None:
            raise HTTPException(status_code=500, detail="Failed to preprocess image")
        
        # Extract features
        image_features = extract_features(processed_img, feature_extractor)
        if image_features is None:
            raise HTTPException(status_code=500, detail="Failed to extract image features")
        
        # Generate caption
        caption = generate_caption(image_features)
        caption = caption.replace("startseq", "").replace("endseq", "").strip()
        
        # Format caption: first letter capital, rest lowercase, add full stop
        if caption and caption != "Unable to generate caption":
            caption = caption[0].upper() + caption[1:].lower() + ".".title()
        
        return {
            "success": True,
            "caption": caption
        }
        
    except Exception as e:
        print(f"Caption generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate caption: {str(e)}")

@app.post("/remove-background")
async def remove_background_endpoint(file: UploadFile = File(...)):
    """Remove background from uploaded image using rembg"""
    try:
        if remove is None:
            raise HTTPException(status_code=500, detail="rembg library not available")
        
        # Read and process the uploaded image
        contents = await file.read()
        input_image = Image.open(io.BytesIO(contents))
        
        # Remove the background using rembg
        output_image = remove(input_image)
        
        # Convert result to base64
        img_buffer = io.BytesIO()
        output_image.save(img_buffer, format='PNG')
        img_str = base64.b64encode(img_buffer.getvalue()).decode()
        
        return {
            "success": True,
            "image": f"data:image/png;base64,{img_str}",
            "message": "Background removed successfully"
        }
        
    except Exception as e:
        print(f"Background removal error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Background removal failed: {str(e)}")

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

@app.post("/enhance-image")
async def enhance_image(file: UploadFile = File(...)):
    """Enhance image using LapSRN 4x super-resolution"""
    
    try:
        print(f"📸 Enhancement request received for file: {file.filename}")
        contents = await file.read()
        print(f"📏 File size: {len(contents)} bytes")
        
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Image file too large (max 5MB)")
        
        # Check if required libraries are available
        if cv2 is None or dnn_superres is None:
            raise HTTPException(status_code=503, detail="OpenCV with dnn_superres not available")
        
        # Check if LapSRN model is available
        if not lapsrn_model_loaded:
            raise HTTPException(status_code=503, detail="LapSRN model not available")
        
        # Validate image format
        try:
            test_img = Image.open(io.BytesIO(contents))
            test_img.verify()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
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
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Enhancement error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")

def fit_window_cv2(img, max_width=1600, max_height=900):
    """Resize image to fit inside a window while preserving aspect ratio"""
    h, w = img.shape[:2]
    if w <= max_width and h <= max_height:
        return img
    scale = min(max_width / w, max_height / h)
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

@app.post("/text-to-image")
async def text_to_image(request: TextToImageRequest):
    """Generate image from text using Black Forest Labs FLUX.1-schnell via Hugging Face API"""
    max_retries = len(HF_API_KEYS)
    
    for attempt in range(max_retries):
        try:
            current_key = get_current_api_key()
            print(f"Generating: {request.prompt} (attempt {attempt + 1})")
            
            headers = {
                "Authorization": f"Bearer {current_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "inputs": request.prompt,
                "parameters": {
                    "width": request.width,
                    "height": request.height,
                    "num_inference_steps": request.num_inference_steps,
                    "guidance_scale": request.guidance_scale
                }
            }
            
            response = requests.post(HF_API_URL, headers=headers, json=payload)
            
            if response.status_code == 200:
                # Convert response to base64
                img_str = base64.b64encode(response.content).decode()
                
                return {
                    "success": True,
                    "image": f"data:image/png;base64,{img_str}",
                    "prompt": request.prompt,
                    "message": "Image generated successfully"
                }
            elif response.status_code in [429, 503, 401]:  # Rate limit, service unavailable, or unauthorized
                print(f"API key {current_key_index + 1} failed: {response.status_code}. Trying next key...")
                get_next_api_key()  # Switch to next key
                continue
            else:
                raise HTTPException(status_code=response.status_code, detail=f"API request failed: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed with key {current_key_index + 1}: {str(e)}")
            if attempt < max_retries - 1:
                get_next_api_key()  # Switch to next key
                continue
            else:
                raise HTTPException(status_code=500, detail=f"All API keys failed: {str(e)}")
    
    raise HTTPException(status_code=500, detail="All API keys exhausted")

if __name__ == "__main__":
    print("Starting Image Editor AI Service...")
    
    # Load caption model on startup
    load_caption_model()
    
    # Check LapSRN model on startup
    check_lapsrn_model()
    
    print(f"Loaded {len(HF_API_KEYS)} API keys for rotation")
    print("Available endpoints:")
    print("   - POST /chat (DeepHermes-3 model)")
    print("   - POST /text-to-image")
    print("   - POST /generate-caption (returns image + caption)")
    print("   - POST /remove-background (rembg background removal)")
    if lapsrn_model_loaded:
        print("   - POST /enhance-image (LapSRN 4x super-resolution)")
    else:
        print("   - POST /enhance-image (DISABLED - LapSRN model not available)")
    print("Running on http://localhost:8002")
    
    uvicorn.run(app, host="0.0.0.0", port=8002)