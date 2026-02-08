/**
 * Image Optimization Engine
 * Uses native Canvas API to resize and compress images before upload
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp';
}

export interface OptimizedImageResult {
  file: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  format: 'image/jpeg',
};

/**
 * Validates an image file before processing
 * @param file - The file to validate
 * @returns Error message or null if valid
 */
export const validateImageFile = (file: File): string | null => {
  const MAX_SIZE = 25 * 1024 * 1024; // 25MB warning threshold
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Formato inválido: ${file.type}. Use JPG, PNG, WebP ou GIF.`;
  }

  if (file.size > MAX_SIZE) {
    return `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). O limite é 25MB.`;
  }

  return null;
};

/**
 * Loads an image file into an HTMLImageElement
 */
const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Erro ao carregar a imagem'));
    };
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Calculates new dimensions maintaining aspect ratio
 */
const calculateDimensions = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  // If image is smaller than max dimensions, keep original size
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const aspectRatio = width / height;

  if (width > height) {
    // Landscape
    const newWidth = Math.min(width, maxWidth);
    const newHeight = Math.round(newWidth / aspectRatio);
    
    if (newHeight > maxHeight) {
      return {
        width: Math.round(maxHeight * aspectRatio),
        height: maxHeight,
      };
    }
    
    return { width: newWidth, height: newHeight };
  } else {
    // Portrait or square
    const newHeight = Math.min(height, maxHeight);
    const newWidth = Math.round(newHeight * aspectRatio);
    
    if (newWidth > maxWidth) {
      return {
        width: maxWidth,
        height: Math.round(maxWidth / aspectRatio),
      };
    }
    
    return { width: newWidth, height: newHeight };
  }
};

/**
 * Converts canvas to a File object
 */
const canvasToFile = (
  canvas: HTMLCanvasElement,
  fileName: string,
  format: string,
  quality: number
): Promise<File> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Erro ao converter imagem'));
          return;
        }
        
        // Generate new filename with correct extension
        const extension = format === 'image/webp' ? 'webp' : 'jpg';
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        const newFileName = `${baseName}.${extension}`;
        
        const file = new File([blob], newFileName, { type: format });
        resolve(file);
      },
      format,
      quality
    );
  });
};

/**
 * Compresses and resizes an image file
 * @param file - The original image file
 * @param options - Compression options
 * @returns Optimized image result with the new file and metadata
 */
export const compressImage = async (
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // Load the image
  const img = await loadImage(file);
  
  // Calculate new dimensions
  const { width, height } = calculateDimensions(
    img.width,
    img.height,
    opts.maxWidth,
    opts.maxHeight
  );

  // Create canvas and draw resized image
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Erro ao criar contexto de canvas');
  }

  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw the image
  ctx.drawImage(img, 0, 0, width, height);

  // Convert to file
  const optimizedFile = await canvasToFile(
    canvas,
    file.name,
    opts.format,
    opts.quality
  );

  const optimizedSize = optimizedFile.size;
  const compressionRatio = originalSize > 0 
    ? Math.round((1 - optimizedSize / originalSize) * 100) 
    : 0;

  return {
    file: optimizedFile,
    originalSize,
    optimizedSize,
    compressionRatio,
    width,
    height,
  };
};

/**
 * Compresses multiple images in parallel
 */
export const compressImages = async (
  files: File[],
  options: ImageOptimizationOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<OptimizedImageResult[]> => {
  const results: OptimizedImageResult[] = [];
  let completed = 0;

  for (const file of files) {
    const result = await compressImage(file, options);
    results.push(result);
    completed++;
    onProgress?.(completed, files.length);
  }

  return results;
};

/**
 * Formats file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
