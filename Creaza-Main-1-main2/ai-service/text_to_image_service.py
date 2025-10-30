import base64
import requests

# Global variables
HF_API_KEYS = [
    ""
]
current_key_index = 0
HF_MODEL = "black-forest-labs/FLUX.1-schnell"
HF_API_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"

def get_next_api_key():
    """Rotate to next API key"""
    global current_key_index
    current_key_index = (current_key_index + 1) % len(HF_API_KEYS)
    return HF_API_KEYS[current_key_index]

def get_current_api_key():
    """Get current API key"""
    return HF_API_KEYS[current_key_index]

async def generate_text_to_image(request):
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
                return {"error": f"API request failed: {response.text}", "status_code": response.status_code}
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed with key {current_key_index + 1}: {str(e)}")
            if attempt < max_retries - 1:
                get_next_api_key()  # Switch to next key
                continue
            else:
                return {"error": f"All API keys failed: {str(e)}", "status_code": 500}
    
    return {"error": "All API keys exhausted", "status_code": 500}