import io
import base64
import numpy as np
from PIL import Image

try:
    import cv2
except ImportError:
    cv2 = None

try:
    from rembg import remove
except ImportError:
    remove = None

async def remove_background(file):
    """Remove background from uploaded image using rembg"""
    try:
        if remove is None:
            return {"error": "rembg library not available", "status_code": 500}
        
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
        return {"error": f"Background removal failed: {str(e)}", "status_code": 500}

async def blur_background(file):
    """Blur background of uploaded image using rembg and OpenCV"""
    try:
        if remove is None:
            return {"error": "rembg library not available", "status_code": 500}
        if cv2 is None:
            return {"error": "OpenCV not available", "status_code": 500}
        
        # Read and process the uploaded image
        contents = await file.read()
        input_image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        # Get the mask using rembg
        mask_image = remove(input_image, only_mask=True)
        
        # Convert PIL images to OpenCV format
        original_cv = cv2.cvtColor(np.array(input_image), cv2.COLOR_RGB2BGR)
        mask_cv = np.array(mask_image)
        
        # Create blurred version of original image
        blurred = cv2.GaussianBlur(original_cv, (51, 51), 0)
        
        # Normalize mask to 0-1 range
        mask_normalized = mask_cv.astype(np.float32) / 255.0
        mask_3channel = np.stack([mask_normalized] * 3, axis=-1)
        
        # Blend original and blurred using mask
        result = original_cv.astype(np.float32) * mask_3channel + blurred.astype(np.float32) * (1 - mask_3channel)
        result = result.astype(np.uint8)
        
        # Convert back to PIL and then to base64
        result_rgb = cv2.cvtColor(result, cv2.COLOR_BGR2RGB)
        result_pil = Image.fromarray(result_rgb)
        
        img_buffer = io.BytesIO()
        result_pil.save(img_buffer, format='PNG')
        img_str = base64.b64encode(img_buffer.getvalue()).decode()
        
        return {
            "success": True,
            "image": f"data:image/png;base64,{img_str}",
            "message": "Background blurred successfully"
        }
        
    except Exception as e:
        print(f"Background blur error: {str(e)}")
        return {"error": f"Background blur failed: {str(e)}", "status_code": 500}

async def custom_background_color(file, color="#FFFFFF"):
    """Replace background with custom color using rembg"""
    try:
        if remove is None:
            return {"error": "rembg library not available", "status_code": 500}
        
        print(f"Received color: {color}")
        
        # Read and process the uploaded image
        contents = await file.read()
        input_image = Image.open(io.BytesIO(contents)).convert('RGBA')
        
        # Remove the background using rembg
        output_image = remove(input_image)
        
        # Parse hex color
        color_clean = color.lstrip('#')
        if len(color_clean) != 6:
            return {"error": "Invalid color format. Use hex format like #FF0000", "status_code": 400}
        
        try:
            r, g, b = tuple(int(color_clean[i:i+2], 16) for i in (0, 2, 4))
        except ValueError:
            return {"error": "Invalid hex color", "status_code": 400}
        
        # Create new image with custom background
        background = Image.new('RGBA', output_image.size, (r, g, b, 255))
        result = Image.alpha_composite(background, output_image)
        result = result.convert('RGB')
        
        # Convert result to base64
        img_buffer = io.BytesIO()
        result.save(img_buffer, format='PNG')
        img_str = base64.b64encode(img_buffer.getvalue()).decode()
        
        return {
            "success": True,
            "image": f"data:image/png;base64,{img_str}",
            "message": f"Background replaced with color {color}"
        }
        
    except Exception as e:
        print(f"Custom background error: {str(e)}")
        return {"error": f"Custom background failed: {str(e)}", "status_code": 500}

async def custom_background_image(file, background_file):
    """Replace background with custom uploaded image using rembg"""
    try:
        if remove is None:
            return {"error": "rembg library not available", "status_code": 500}
        
        # Read and process the main image
        contents = await file.read()
        input_image = Image.open(io.BytesIO(contents)).convert('RGBA')
        
        # Read and process the background image
        bg_contents = await background_file.read()
        bg_image = Image.open(io.BytesIO(bg_contents)).convert('RGB')
        
        # Remove the background from main image
        output_image = remove(input_image)
        
        # Resize background to match main image size
        bg_resized = bg_image.resize(output_image.size, Image.Resampling.LANCZOS)
        bg_rgba = bg_resized.convert('RGBA')
        
        # Composite the images
        result = Image.alpha_composite(bg_rgba, output_image)
        result = result.convert('RGB')
        
        # Convert result to base64
        img_buffer = io.BytesIO()
        result.save(img_buffer, format='PNG')
        img_str = base64.b64encode(img_buffer.getvalue()).decode()
        
        return {
            "success": True,
            "image": f"data:image/png;base64,{img_str}",
            "message": "Background replaced with custom image"
        }
        
    except Exception as e:
        print(f"Custom background image error: {str(e)}")
        return {"error": f"Custom background image failed: {str(e)}", "status_code": 500}

def get_background_status():
    """Get background processing status"""
    return {
        "opencv_available": cv2 is not None,
        "rembg_available": remove is not None
    }