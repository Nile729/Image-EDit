const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Open image file
app.post('/api/open-image', upload.single('image'), async (req, res) => {
  try {
    console.log('File upload request received:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const metadata = await sharp(req.file.path).metadata();
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64 = imageBuffer.toString('base64');
    
    console.log('Image processed:', metadata.width, 'x', metadata.height);
    
    // Clean up temp file
    fs.unlinkSync(req.file.path);

    res.json({
      data: `data:${req.file.mimetype};base64,${base64}`,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save image
app.post('/api/save-image', async (req, res) => {
  try {
    const { imageData, filename, format = 'png' } = req.body;
    
    // Remove data URL prefix
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Process with Sharp for optimization
    const processedBuffer = await sharp(buffer)
      .toFormat(format, { quality: 90 })
      .toBuffer();
    
    const filepath = path.join(__dirname, 'downloads', filename);
    
    // Ensure downloads directory exists
    if (!fs.existsSync(path.dirname(filepath))) {
      fs.mkdirSync(path.dirname(filepath), { recursive: true });
    }
    
    fs.writeFileSync(filepath, processedBuffer);
    
    res.json({ 
      success: true, 
      message: `Image saved to ${filepath}`,
      path: filepath 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Image Editor Backend running on http://localhost:${PORT}`);
  console.log(`📁 Serving frontend from: ${path.join(__dirname, '../frontend/dist')}`);
});