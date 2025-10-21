export class WebGLRenderer {
  private gl: WebGLRenderingContext
  private program: WebGLProgram | null = null
  private blurProgram: WebGLProgram | null = null
  private positionBuffer: WebGLBuffer | null = null
  private textureCoordBuffer: WebGLBuffer | null = null
  private framebuffer: WebGLFramebuffer | null = null

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl')
    if (!gl) throw new Error('WebGL not supported')
    this.gl = gl
    this.initShaders()
    this.initBuffers()
    this.framebuffer = gl.createFramebuffer()
  }

  private initShaders() {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `)

    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform sampler2D u_image;
      uniform float u_brightness;
      uniform float u_contrast;
      uniform float u_saturation;
      uniform float u_hue;
      uniform float u_grayscale;
      varying vec2 v_texCoord;

      vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        
        // Brightness
        color.rgb += u_brightness;
        
        // Contrast
        color.rgb = (color.rgb - 0.5) * (1.0 + u_contrast) + 0.5;
        
        // Hue & Saturation
        vec3 hsv = rgb2hsv(color.rgb);
        hsv.x += u_hue / 360.0;
        hsv.y *= (1.0 + u_saturation);
        color.rgb = hsv2rgb(hsv);
        
        // Grayscale
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        color.rgb = mix(color.rgb, vec3(gray), u_grayscale);
        
        gl_FragColor = clamp(color, 0.0, 1.0);
      }
    `)

    this.program = this.createProgram(vertexShader, fragmentShader)
    
    const blurFragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      uniform float u_blur;
      varying vec2 v_texCoord;
      
      void main() {
        vec2 onePixel = vec2(1.0) / u_resolution;
        vec4 color = vec4(0.0);
        float total = 0.0;
        
        for (float x = -4.0; x <= 4.0; x += 1.0) {
          for (float y = -4.0; y <= 4.0; y += 1.0) {
            vec2 offset = vec2(x, y) * onePixel * u_blur;
            float weight = exp(-(x*x + y*y) / 8.0);
            color += texture2D(u_image, v_texCoord + offset) * weight;
            total += weight;
          }
        }
        
        gl_FragColor = color / total;
      }
    `)
    
    this.blurProgram = this.createProgram(vertexShader, blurFragmentShader)
  }

  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!
    this.gl.shaderSource(shader, source)
    this.gl.compileShader(shader)
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(this.gl.getShaderInfoLog(shader) || 'Shader compilation failed')
    }
    return shader
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = this.gl.createProgram()!
    this.gl.attachShader(program, vertexShader)
    this.gl.attachShader(program, fragmentShader)
    this.gl.linkProgram(program)
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error(this.gl.getProgramInfoLog(program) || 'Program linking failed')
    }
    return program
  }

  private initBuffers() {
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    this.positionBuffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW)

    const texCoords = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1])
    this.textureCoordBuffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureCoordBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW)
  }

  applyFilters(imageData: ImageData, filters: Record<string, number>): ImageData {
    const { width, height } = imageData
    this.gl.canvas.width = width
    this.gl.canvas.height = height
    
    let currentTexture = this.createTexture(imageData)
    
    // Apply blur first if needed
    if (filters.blur && filters.blur > 0) {
      currentTexture = this.applyBlur(currentTexture, width, height, filters.blur)
    }
    
    // Apply other filters
    this.gl.useProgram(this.program)
    this.gl.bindTexture(this.gl.TEXTURE_2D, currentTexture)
    
    this.gl.uniform1f(this.gl.getUniformLocation(this.program!, 'u_brightness'), (filters.brightness || 0) / 100)
    this.gl.uniform1f(this.gl.getUniformLocation(this.program!, 'u_contrast'), (filters.contrast || 0) / 100)
    this.gl.uniform1f(this.gl.getUniformLocation(this.program!, 'u_saturation'), (filters.saturation || 0) / 100)
    this.gl.uniform1f(this.gl.getUniformLocation(this.program!, 'u_hue'), filters.hue || 0)
    this.gl.uniform1f(this.gl.getUniformLocation(this.program!, 'u_grayscale'), (filters.grayscale || 0) / 100)

    this.setupAttributes(this.program!)
    this.gl.viewport(0, 0, width, height)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)

    const pixels = new Uint8ClampedArray(width * height * 4)
    this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels)

    return new ImageData(pixels, width, height)
  }

  private createTexture(imageData: ImageData): WebGLTexture {
    const texture = this.gl.createTexture()!
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, imageData.width, imageData.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData.data)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
    return texture
  }

  private applyBlur(texture: WebGLTexture, width: number, height: number, blur: number): WebGLTexture {
    const outputTexture = this.gl.createTexture()!
    this.gl.bindTexture(this.gl.TEXTURE_2D, outputTexture)
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer)
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, outputTexture, 0)

    this.gl.useProgram(this.blurProgram)
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
    this.gl.uniform2f(this.gl.getUniformLocation(this.blurProgram!, 'u_resolution'), width, height)
    this.gl.uniform1f(this.gl.getUniformLocation(this.blurProgram!, 'u_blur'), blur / 10)

    this.setupAttributes(this.blurProgram!)
    this.gl.viewport(0, 0, width, height)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
    return outputTexture
  }

  private setupAttributes(program: WebGLProgram) {
    const positionLocation = this.gl.getAttribLocation(program, 'a_position')
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer)
    this.gl.enableVertexAttribArray(positionLocation)
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

    const texCoordLocation = this.gl.getAttribLocation(program, 'a_texCoord')
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureCoordBuffer)
    this.gl.enableVertexAttribArray(texCoordLocation)
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0)
  }
}