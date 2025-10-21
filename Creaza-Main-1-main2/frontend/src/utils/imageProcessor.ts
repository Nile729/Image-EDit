export class ImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async enhanceImage(imageData: ImageData, originalWidth: number, originalHeight: number, scale: number = 2): Promise<ImageData> {
    try {
      // Convert ImageData to blob
      this.canvas.width = imageData.width;
      this.canvas.height = imageData.height;
      this.ctx.putImageData(imageData, 0, 0);
      
      const blob = await new Promise<Blob>((resolve) => {
        this.canvas.toBlob(resolve as BlobCallback, 'image/png');
      });

      // Send to AI service
      const formData = new FormData();
      formData.append('file', blob, 'image.png');
      formData.append('scale', scale.toString());

      const response = await fetch('http://localhost:8002/enhance-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Enhancement failed');

      const result = await response.json();
      
      // Convert base64 back to ImageData
      const img = new Image();
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          this.canvas.width = originalWidth;
          this.canvas.height = originalHeight;
          this.ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
          resolve(this.ctx.getImageData(0, 0, originalWidth, originalHeight));
        };
        img.onerror = reject;
        img.src = result.image;
      });
    } catch (error) {
      console.error('Image enhancement failed:', error);
      return imageData; // Return original on failure
    }
  }

  downloadImage(canvas: HTMLCanvasElement, filename: string = 'edited-image.png'): void {
    try {
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }
}