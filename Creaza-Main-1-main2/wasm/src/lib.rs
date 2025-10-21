use wasm_bindgen::prelude::*;
use web_sys::ImageData;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[wasm_bindgen]
pub struct PixelProcessor;

#[wasm_bindgen]
impl PixelProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> PixelProcessor {
        PixelProcessor
    }

    #[wasm_bindgen]
    pub fn apply_brightness(&self, image_data: &mut ImageData, brightness: f32) {
        let data = image_data.data();
        let mut pixels = data.to_vec();
        
        for i in (0..pixels.len()).step_by(4) {
            let r = pixels[i] as f32;
            let g = pixels[i + 1] as f32;
            let b = pixels[i + 2] as f32;
            
            pixels[i] = (r + brightness * 255.0).clamp(0.0, 255.0) as u8;
            pixels[i + 1] = (g + brightness * 255.0).clamp(0.0, 255.0) as u8;
            pixels[i + 2] = (b + brightness * 255.0).clamp(0.0, 255.0) as u8;
        }
        
        // Update image data (simplified - would need proper JS interop)
    }

    #[wasm_bindgen]
    pub fn apply_contrast(&self, image_data: &mut ImageData, contrast: f32) {
        let data = image_data.data();
        let mut pixels = data.to_vec();
        let factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));
        
        for i in (0..pixels.len()).step_by(4) {
            let r = pixels[i] as f32;
            let g = pixels[i + 1] as f32;
            let b = pixels[i + 2] as f32;
            
            pixels[i] = (factor * (r - 128.0) + 128.0).clamp(0.0, 255.0) as u8;
            pixels[i + 1] = (factor * (g - 128.0) + 128.0).clamp(0.0, 255.0) as u8;
            pixels[i + 2] = (factor * (b - 128.0) + 128.0).clamp(0.0, 255.0) as u8;
        }
    }

    #[wasm_bindgen]
    pub fn apply_grayscale(&self, image_data: &mut ImageData) {
        let data = image_data.data();
        let mut pixels = data.to_vec();
        
        for i in (0..pixels.len()).step_by(4) {
            let r = pixels[i] as f32;
            let g = pixels[i + 1] as f32;
            let b = pixels[i + 2] as f32;
            
            let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
            
            pixels[i] = gray;
            pixels[i + 1] = gray;
            pixels[i + 2] = gray;
        }
    }

    #[wasm_bindgen]
    pub fn gaussian_blur(&self, image_data: &mut ImageData, radius: f32) {
        let width = image_data.width() as usize;
        let height = image_data.height() as usize;
        let data = image_data.data();
        let mut pixels = data.to_vec();
        
        // Simplified Gaussian blur implementation
        let kernel_size = (radius * 2.0) as usize + 1;
        let sigma = radius / 3.0;
        
        // Generate Gaussian kernel
        let mut kernel = vec![0.0; kernel_size];
        let mut sum = 0.0;
        
        for i in 0..kernel_size {
            let x = i as f32 - radius;
            kernel[i] = (-x * x / (2.0 * sigma * sigma)).exp();
            sum += kernel[i];
        }
        
        // Normalize kernel
        for i in 0..kernel_size {
            kernel[i] /= sum;
        }
        
        // Apply horizontal blur
        let mut temp = pixels.clone();
        for y in 0..height {
            for x in 0..width {
                let mut r = 0.0;
                let mut g = 0.0;
                let mut b = 0.0;
                let mut a = 0.0;
                
                for k in 0..kernel_size {
                    let px = (x as i32 + k as i32 - radius as i32).clamp(0, width as i32 - 1) as usize;
                    let idx = (y * width + px) * 4;
                    
                    r += pixels[idx] as f32 * kernel[k];
                    g += pixels[idx + 1] as f32 * kernel[k];
                    b += pixels[idx + 2] as f32 * kernel[k];
                    a += pixels[idx + 3] as f32 * kernel[k];
                }
                
                let idx = (y * width + x) * 4;
                temp[idx] = r as u8;
                temp[idx + 1] = g as u8;
                temp[idx + 2] = b as u8;
                temp[idx + 3] = a as u8;
            }
        }
        
        // Apply vertical blur
        for y in 0..height {
            for x in 0..width {
                let mut r = 0.0;
                let mut g = 0.0;
                let mut b = 0.0;
                let mut a = 0.0;
                
                for k in 0..kernel_size {
                    let py = (y as i32 + k as i32 - radius as i32).clamp(0, height as i32 - 1) as usize;
                    let idx = (py * width + x) * 4;
                    
                    r += temp[idx] as f32 * kernel[k];
                    g += temp[idx + 1] as f32 * kernel[k];
                    b += temp[idx + 2] as f32 * kernel[k];
                    a += temp[idx + 3] as f32 * kernel[k];
                }
                
                let idx = (y * width + x) * 4;
                pixels[idx] = r as u8;
                pixels[idx + 1] = g as u8;
                pixels[idx + 2] = b as u8;
                pixels[idx + 3] = a as u8;
            }
        }
    }

    #[wasm_bindgen]
    pub fn remove_background(&self, image_data: &mut ImageData, threshold: f32) {
        let data = image_data.data();
        let mut pixels = data.to_vec();
        
        // Simple background removal based on edge detection
        // In a real implementation, this would use a trained model
        for i in (0..pixels.len()).step_by(4) {
            let r = pixels[i] as f32 / 255.0;
            let g = pixels[i + 1] as f32 / 255.0;
            let b = pixels[i + 2] as f32 / 255.0;
            
            // Simple edge detection
            let luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            
            if luminance < threshold {
                pixels[i + 3] = 0; // Make transparent
            }
        }
    }
}