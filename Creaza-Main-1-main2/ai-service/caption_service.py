import io
import numpy as np
from PIL import Image
import pickle
import os

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

# Global variables
caption_model = None
tokenizer = None
feature_extractor = None

def load_caption_model():
    """Load caption model and tokenizer"""
    global caption_model, tokenizer, feature_extractor
    try:
        if load_model is not None and VGG16 is not None:
            caption_model = load_model("C:\\Users\\nilab\\OneDrive\\Desktop\\Project25\\Image-EDit\\Creaza-Main-1-main2\\ai-service\\Models\\model.h5")
            with open("C:\\Users\\nilab\\OneDrive\\Desktop\\Project25\\Image-EDit\\Creaza-Main-1-main2\\ai-service\\Models\\tokenizer.pkl", 'rb') as f:
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

def get_caption_status():
    """Get caption model status"""
    return {
        "caption_model": {
            "loaded": caption_model is not None,
            "path": "C:\\Users\\nilab\\OneDrive\\Desktop\\Project25\\Image-EDit\\Creaza-Main-1-main2\\ai-service\\Models\\model.h5",
            "exists": os.path.exists("C:\\Users\\nilab\\OneDrive\\Desktop\\Project25\\Image-EDit\\Creaza-Main-1-main2\\ai-service\\Models\\model.h5")
        },
        "tokenizer": {
            "loaded": tokenizer is not None,
            "path": "C:\\Users\\nilab\\OneDrive\\Desktop\\Project25\\Image-EDit\\Creaza-Main-1-main2\\ai-service\\Models\\tokenizer.pkl",
            "exists": os.path.exists("C:\\Users\\nilab\\OneDrive\\Desktop\\Project25\\Image-EDit\\Creaza-Main-1-main2\\ai-service\\Models\\tokenizer.pkl")
        },
        "feature_extractor": {
            "loaded": feature_extractor is not None
        }
    }

async def process_caption_request(file):
    """Process caption generation request"""
    if caption_model is None or feature_extractor is None or tokenizer is None:
        return {"error": "Caption model not available", "status_code": 503}
    
    try:
        # Read and process image
        image_data = await file.read()
        image_file = Image.open(io.BytesIO(image_data)).convert("RGB")
        
        # Preprocess image
        processed_img = preprocess_image_for_caption(image_file)
        if processed_img is None:
            return {"error": "Failed to preprocess image", "status_code": 500}
        
        # Extract features
        image_features = extract_features(processed_img, feature_extractor)
        if image_features is None:
            return {"error": "Failed to extract image features", "status_code": 500}
        
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
        return {"error": f"Failed to generate caption: {str(e)}", "status_code": 500}