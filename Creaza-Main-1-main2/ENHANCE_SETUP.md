# Image Enhancement Setup

## Overview
The image enhancement feature uses LapSRN (Laplacian Pyramid Super-Resolution Network) to upscale images by 4x while preserving quality and details.

## Setup Instructions

### 1. Install Dependencies
```bash
cd ai-service
pip install opencv-contrib-python
```

### 2. Download LapSRN Model
```bash
cd ai-service
python download_model.py
```

Or download manually:
- URL: https://github.com/fannymonori/TF-LapSRN/raw/master/export/LapSRN_x4.pb
- Save as: `ai-service/LapSRN_x4.pb`

### 3. Verify Setup
The model file should be approximately 5.3 MB in size.

## Usage

1. **Load an image** in the editor
2. **Go to AI Panel** on the right sidebar
3. **Click "Enhance Image (4x SR)"** button
4. **Wait for processing** (may take 10-30 seconds depending on image size and hardware)
5. **New enhanced layer** will be created with 4x resolution

## Technical Details

### Model Information
- **Model**: LapSRN (Laplacian Pyramid Super-Resolution Network)
- **Scale Factor**: 4x upscaling
- **Input**: Any image format (PNG, JPG, etc.)
- **Output**: PNG format with 4x dimensions

### Performance
- **CPU**: 10-30 seconds for typical images
- **GPU**: 2-5 seconds (if CUDA-enabled OpenCV is available)
- **Memory**: Requires ~4x original image memory for processing

### Limitations
- Large images (>2000px) may take longer to process
- Very large images may cause memory issues
- Quality depends on input image content

## API Endpoint

### POST /enhance-image
- **Input**: Image file (multipart/form-data)
- **Output**: JSON with base64-encoded enhanced image
- **Processing**: LapSRN 4x super-resolution

```json
{
  "success": true,
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "message": "Image enhanced successfully with 4x super-resolution"
}
```

## Integration

The enhancement feature is fully integrated with:
- **Undo/Redo System**: Enhancement operations are tracked in history
- **Layer Management**: Creates new layer preserving original
- **AI Panel**: Accessible via "Enhance Image (4x SR)" button
- **Progress Feedback**: Shows processing status and progress

## Troubleshooting

### Model Not Found
- Ensure `LapSRN_x4.pb` is in the `ai-service` directory
- Run `python download_model.py` to download automatically

### OpenCV Issues
- Install: `pip install opencv-contrib-python`
- For GPU support: Install CUDA-enabled OpenCV build

### Memory Errors
- Reduce image size before enhancement
- Close other applications to free memory
- Consider processing smaller sections of large images

### Slow Performance
- GPU acceleration automatically used if available
- CPU processing is normal for this type of operation
- Consider upgrading hardware for faster processing