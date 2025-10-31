from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import requests

# Import our service modules
from caption_service import (
    load_caption_model, 
    process_caption_request, 
    get_caption_status
)
from background_service import (
    remove_background, 
    blur_background, 
    custom_background_color, 
    custom_background_image,
    get_background_status
)
from enhancement_service import (
    check_lapsrn_model, 
    enhance_image,
    get_enhancement_status
)
from text_to_image_service import generate_text_to_image

app = FastAPI(title="Image Editor AI Service", version="1.0.0")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# API Keys and Chat Service Configuration
CHAT_API_KEY = "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"

# Available chat models
CHAT_MODELS = {
    "llama-4-maverick": "meta-llama/llama-4-maverick:free",
    "glm-4.5-air": "z-ai/glm-4.5-air:free"
}

class TextToImageRequest(BaseModel):
    prompt: str
    width: int = 512
    height: int = 512
    num_inference_steps: int = 50
    guidance_scale: float = 12.0

class ChatRequest(BaseModel):
    message: str
    model: str = "llama-4-maverick"
    history: list = []

@app.get("/")
async def root():
    return {"message": "Image Editor AI Service", "status": "running"}

@app.get("/model-status")
async def model_status():
    """Check status of all AI models"""
    status = {}
    status.update(get_caption_status())
    status.update(get_background_status())
    status.update(get_enhancement_status())
    return status

@app.get("/chat/models")
async def get_chat_models():
    """Get available chat models"""
    return {
        "models": [
            {"id": "llama-4-maverick", "name": "Llama 4 Maverick", "description": "Fast and efficient model"},
            {"id": "glm-4.5-air", "name": "GLM 4.5 Air", "description": "Lightweight conversational model"}
        ]
    }

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    """Chat with AI assistant using selected model"""
    print(f"Received chat request: {request.message} (model: {request.model})")
    
    try:
        # Get the model from the available models
        selected_model = CHAT_MODELS.get(request.model, CHAT_MODELS["llama-4-maverick"])
        
        system_prompt = """You are an AI assistant for our Image Editor application. ONLY provide help about OUR editor's features:

AVAILABLE TOOLS:
- Brush Tool: Paint and draw on canvas
- Eraser Tool: Remove parts of image
- Text Tool: Add text overlays
- Shape Tools: Draw rectangles, circles, lines
- Selection Tools: Select areas for editing

AVAILABLE FEATURES:
- Layer Management: Create, delete, reorder layers
- Background Removal: AI-powered background removal
- Background Blur: Blur image backgrounds
- Custom Backgrounds: Replace with colors or images
- Image Enhancement: 4x super-resolution upscaling
- Image Caption Generation: AI-generated descriptions
- Text-to-Image: Generate images from text prompts
- Filters: Apply various image filters
- Undo/Redo: History management
- Save/Export: Download edited images

FOR UNAVAILABLE FEATURES:
If asked about features NOT in our editor, respond with:
"That feature is not available in our Image Editor. However, you can use our available features: [list relevant alternatives from our tools]. Would you like help with any of these instead?"

RESTRICTIONS:
- Do NOT mention other software (Photoshop, GIMP, etc.)
- Do NOT suggest external tools or websites
- ONLY discuss features available in OUR editor
- For missing features, politely redirect to available alternatives

Provide step-by-step guidance using only our available tools and features."""
        
        # Build conversation history
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        for msg in request.history:
            messages.append({"role": "user", "content": msg["user"]})
            messages.append({"role": "assistant", "content": msg["assistant"]})
        
        # Add current message
        messages.append({"role": "user", "content": request.message})
        
        headers = {
            "Authorization": f"Bearer {CHAT_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": selected_model,
            "messages": messages,
            "temperature": 0.7
        }
        
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload
        )
        
        print(f"API Response Status: {response.status_code}")
        print(f"API Response: {response.text[:500]}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    choice = data["choices"][0]
                    if "message" in choice and "content" in choice["message"]:
                        content = choice["message"]["content"]
                        if content and content.strip():
                            return {
                                "success": True,
                                "message": content.strip(),
                                "model_used": request.model
                            }
                print(f"No valid content from {selected_model}")
            except Exception as json_error:
                print(f"JSON parsing error: {json_error}")
        
        # Fallback response
        return {
            "success": True,
            "message": "I'm your assistant for our Image Editor! I can help with our available features: Brush/Eraser tools, Layers, Background removal/blur, Image enhancement, Text-to-image, Filters, and more. If you ask about unavailable features, I'll suggest alternatives from our toolkit.",
            "model_used": request.model
        }
        
    except Exception as e:
        print(f"Chat error: {str(e)}")
        return {
            "success": True,
            "message": "I'm here to help with our Image Editor! Ask me about our available tools and features. If something isn't available, I'll suggest the best alternatives from our toolkit.",
            "model_used": request.model
        }

@app.post("/generate-caption")
async def generate_image_caption(file: UploadFile = File(...)):
    """Generate caption for uploaded image"""
    result = await process_caption_request(file)
    if "error" in result:
        raise HTTPException(status_code=result["status_code"], detail=result["error"])
    return result

@app.post("/remove-background")
async def remove_background_endpoint(file: UploadFile = File(...)):
    """Remove background from uploaded image using rembg"""
    result = await remove_background(file)
    if "error" in result:
        raise HTTPException(status_code=result["status_code"], detail=result["error"])
    return result

@app.post("/blur-background")
async def blur_background_endpoint(file: UploadFile = File(...)):
    """Blur background of uploaded image using rembg and OpenCV"""
    result = await blur_background(file)
    if "error" in result:
        raise HTTPException(status_code=result["status_code"], detail=result["error"])
    return result

@app.post("/custom-background")
async def custom_background_endpoint(file: UploadFile = File(...), color: str = Form("#FFFFFF")):
    """Replace background with custom color using rembg"""
    result = await custom_background_color(file, color)
    if "error" in result:
        raise HTTPException(status_code=result["status_code"], detail=result["error"])
    return result

@app.post("/custom-background-image")
async def custom_background_image_endpoint(
    file: UploadFile = File(...), 
    background: UploadFile = File(...)
):
    """Replace background with custom uploaded image using rembg"""
    result = await custom_background_image(file, background)
    if "error" in result:
        raise HTTPException(status_code=result["status_code"], detail=result["error"])
    return result

@app.post("/enhance-image")
async def enhance_image_endpoint(file: UploadFile = File(...)):
    """Enhance image using LapSRN 4x super-resolution"""
    result = await enhance_image(file)
    if "error" in result:
        raise HTTPException(status_code=result["status_code"], detail=result["error"])
    return result

@app.post("/text-to-image")
async def text_to_image(request: TextToImageRequest):
    """Generate image from text using Black Forest Labs FLUX.1-schnell via Hugging Face API"""
    result = await generate_text_to_image(request)
    if "error" in result:
        raise HTTPException(status_code=result["status_code"], detail=result["error"])
    return result

if __name__ == "__main__":
    print("Starting Image Editor AI Service...")
    
    # Load caption model on startup
    load_caption_model()
    
    # Check LapSRN model on startup
    check_lapsrn_model()
    
    print("Available endpoints:")
    print("   - GET /chat/models (Get available chat models)")
    print("   - POST /chat (Chat with selectable AI models)")
    print("   - POST /text-to-image")
    print("   - POST /generate-caption (returns image + caption)")
    print("   - POST /remove-background (rembg background removal)")
    print("   - POST /blur-background (rembg + OpenCV background blur)")
    print("   - POST /custom-background (rembg + custom color background)")
    print("   - POST /custom-background-image (rembg + custom image background)")
    print("   - POST /enhance-image (LapSRN 4x super-resolution)")
    print("Running on http://localhost:8002")
    
    uvicorn.run(app, host="0.0.0.0", port=8002)