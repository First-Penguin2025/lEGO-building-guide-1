export interface LegoItem {
  id: string;
  name: string;
  date: string;
  image: string; // Legacy field for compatibility (will point to images[0])
  images: string[]; // Up to 4 images
  memo?: string; // Optional nice memo
  rating?: number; // Optional star rating (1-5)
  builder?: string; // Builder name (制作者)
}
