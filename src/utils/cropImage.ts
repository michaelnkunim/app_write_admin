interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default async function getCroppedImg(imageSrc: string, pixelCrop: PixelCrop) {
  const image = new Image();
  image.src = imageSrc;
  
  // Create a promise that resolves when the image is loaded
  await new Promise((resolve) => {
    image.onload = resolve;
  });
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Return as data URL instead of object URL
  return new Promise<string>((resolve, reject) => {
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      resolve(dataUrl);
    } catch {
      reject(new Error('Failed to create data URL from canvas'));
    }
  });
} 