import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Camera, 
  Calendar, 
  Sparkles, 
  Check, 
  Search, 
  X, 
  Heart,
  Smartphone,
  Cloud,
  Clipboard,
  HelpCircle,
  Info,
  ChevronRight,
  Printer,
  Users,
  Edit2
} from 'lucide-react';
import { LegoItem } from './types';
import { LegoAlbumIcon } from './components/LegoAlbumIcon';
import { BookbindingModal } from './components/BookbindingModal';

// Default starter creations if local storage is empty
const INITIAL_CREATIONS: LegoItem[] = [];

export default function App() {
  const isPickerMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('picker') === 'google-photos';

  if (isPickerMode) {
    return <GooglePhotosPicker />;
  }

  const [items, setItems] = useState<LegoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating' | 'name'>('newest');
  
  // Selection states for multi-delete
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Builder/Creator states
  const [builders, setBuilders] = useState<string[]>(() => {
    const saved = localStorage.getItem('lego_builders_v1');
    return saved ? JSON.parse(saved) : ['おとうさん', 'おかあさん', 'ぼく', 'わたし'];
  });
  const [formBuilder, setFormBuilder] = useState('');
  const [newBuilderInput, setNewBuilderInput] = useState('');
  const [editingBuilderIndex, setEditingBuilderIndex] = useState<number | null>(null);
  const [editingBuilderValue, setEditingBuilderValue] = useState('');
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [selectedBuilderFilter, setSelectedBuilderFilter] = useState('all');
  
  // Bookbinding state
  const [isBookbindingModalOpen, setIsBookbindingModalOpen] = useState(false);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formRating, setFormRating] = useState<number>(5);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formMemo, setFormMemo] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // URL input states
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [bulkUrlInput, setBulkUrlInput] = useState('');
  
  // UI states
  const [isPhotoImportModalOpen, setIsPhotoImportModalOpen] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<LegoItem | null>(null);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  
  // Custom dialog notifications (sandbox & iframe safe replacement for window.alert / window.confirm)
  const [dialogInfo, setDialogInfo] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  const showAlert = (message: string, title: string = 'お知らせ') => {
    setDialogInfo({
      isOpen: true,
      type: 'alert',
      title,
      message,
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, title: string = 'かくにん') => {
    setDialogInfo({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
    });
  };

  // Listen for pictures chosen from the Picker popup
  useEffect(() => {
    const handlePickerMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_PHOTOS_PICKED' && Array.isArray(event.data?.images)) {
        processImageSources(event.data.images);
      }
    };
    
    window.addEventListener('message', handlePickerMessage);
    return () => window.removeEventListener('message', handlePickerMessage);
  }, [formImages]);

  // Open the dedicated Google Photos picker popup window
  const handleOpenGooglePhotosPicker = () => {
    const remainingCount = 4 - formImages.length;
    if (remainingCount <= 0) {
      showAlert('写真は1つの作品に4枚までしか登録できないよ！😢', 'ちゅうい ⚠️');
      return;
    }
    
    const width = 850;
    const height = 750;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    // Save remaining so the popup remembers it even after OAuth reloads
    localStorage.setItem('google_picker_remaining', remainingCount.toString());
    
    const url = `${window.location.origin}/?picker=google-photos&remaining=${remainingCount}`;
    const popup = window.open(
      url,
      'google_photos_picker_popup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );
    
    if (!popup) {
      showAlert('ポップアップブロックが起動しました。ブラウザの設定で許可してね！😢', 'ちゅうい ⚠️');
    }
  };

  // Google OAuth hash callback (runs on root page loads)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      const state = params.get('state');
      
      if (token && state === 'google-photos') {
        localStorage.setItem('google_photos_access_token', token);
        const lastRemaining = localStorage.getItem('google_picker_remaining') || '4';
        
        // Redirect back to picker mode so they can select photos in this same window!
        window.location.href = `${window.location.origin}/?picker=google-photos&remaining=${lastRemaining}`;
      }
    }
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleAreaPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const files: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) files.push(file);
      } else if (item.type === 'text/plain') {
        item.getAsString((text) => {
          if (text && (text.startsWith('http') || text.startsWith('data:image/'))) {
            processImageSources([text]);
            setIsPhotoImportModalOpen(false);
          }
        });
      }
    }
    
    if (files.length > 0) {
      const readers = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });
      
      const base64s = await Promise.all(readers);
      processImageSources(base64s);
      setIsPhotoImportModalOpen(false);
      showAlert('コピー写真から全自動でインポートして貼り付けたよ！📸⚡️', '自動インポート成功 🎉');
    }
  };

  // Helper to extract clean image sources from dropped or pasted items
  const processImageSources = async (sources: string[]) => {
    const remainingSlots = 4 - formImages.length;
    if (remainingSlots <= 0) {
      showAlert('写真は1つの作品に4枚までしか登録できないよ！😢', 'ちゅうい ⚠️');
      return;
    }

    const urlsToAdd = sources.slice(0, remainingSlots);
    const resolvedUrls: string[] = [];

    for (const url of urlsToAdd) {
      if (!url) continue;

      // Intercept Google Photos / Amazon Photos HTML page URLs (cannot be rendered in <img>)
      const isGooglePhotosPage = url.includes('photos.google.com') && !url.includes('googleusercontent.com') && !url.includes('lh3.googleusercontent.com');
      const isAmazonPhotosPage = (url.includes('amazon.co.jp/photos') || url.includes('amazon.com/photos') || url.includes('clouddrive')) && !url.match(/\.(jpeg|jpg|png|gif|webp)/i);

      if (isGooglePhotosPage || isAmazonPhotosPage) {
        showAlert(
          '⚠️ GoogleフォトやAmazon Photosの「ページのWebリンク」をご利用のようです。\n\n【おすすめの超かんたん方法 💡】\n写真の上で「右クリック ➡️ 画像をコピー」して、この画面で「Ctrl + V（貼り付け）」を押してください！ログイン不要で、そのまますぐに最高画質の写真が登録できます！📸✨',
          '画像のコピーをお試しください'
        );
        continue;
      }

      // If it's already a base64 Data URL, use it directly
      if (url.startsWith('data:image/')) {
        resolvedUrls.push(url);
        continue;
      }

      let success = false;

      // 1. Try fetching via images.weserv.nl CORS proxy to bypass limits and convert to Base64 for offline viewing
      try {
        const cleanUrl = url.trim();
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;
        const res = await fetch(proxyUrl).catch(() => null);
        if (res && res.ok) {
          const blob = await res.blob();
          const encodedStr = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          if (encodedStr && encodedStr.startsWith('data:image/')) {
            resolvedUrls.push(encodedStr);
            success = true;
          }
        }
      } catch (proxyErr) {
        console.warn('Proxy retrieve failed, fallback to direct fetch', proxyErr);
      }

      if (success) continue;

      // 2. Fallback: Try fetching direct with CORS
      try {
        const res = await fetch(url, { mode: 'cors' }).catch(() => null);
        if (res && res.ok) {
          const blob = await res.blob();
          const encodedStr = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          if (encodedStr && encodedStr.startsWith('data:image/')) {
            resolvedUrls.push(encodedStr);
            success = true;
          }
        }
      } catch (err) {
        // ignore
      }

      if (success) continue;

      // 3. Last fallback: Keep raw direct URL (Browser will render if permitted by hotlink controls)
      resolvedUrls.push(url);
    }

    if (resolvedUrls.length > 0) {
      setFormImages(prev => [...prev, ...resolvedUrls].slice(0, 4));
      showAlert('写真をずかんのフォルダーにドラッグ＆追加したよ！📸✨', '追加完了 🎉');
    }
  };

  const handlePasteClick = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      let foundImg = false;
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            foundImg = true;
            const blob = await item.getType(type);
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (base64) {
                setFormImages(prev => {
                  if (prev.length >= 4) {
                    showAlert('写真は1つの作品に4枚までしか登録できないよ！😢', 'ちゅうい ⚠️');
                    return prev;
                  }
                  showAlert('クリップボードの写真をきれいにインポートしたよ！📸✨', '貼り付け成功 📋');
                  return [...prev, base64].slice(0, 4);
                });
              }
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      if (!foundImg) {
        showAlert('クリップボードにコピーされた画像が見つかりませんでした。\nGoogleフォトやAmazon Photos、ウェブサイトなどから『右クリック ➡️ 画像をコピー』してから、このボタンを押してみてね！💡', '画像がみつかりません');
      }
    } catch (err) {
      showAlert('セキュリティにより自動の貼り付けボタンが制限されました。代わりに、この画面上でキーボードの「Ctrl + V」(Macなら「Cmd + V」) を押すと直接貼り付けが可能です！ぜひ試してみてね！⌨️✨', 'キーボードでお試しください');
    }
  };

  // Handle drag and drop interaction
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // 1. Files dropped directly. Only process if files have real size (> 0 bytes)
    // Drag/Drop from other browser windows like Google Photos might carry 0-byte skeleton File objects, which we want to skip in favor of URL parsing.
    const droppedFiles = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.size > 0);
    if (droppedFiles.length > 0) {
      const imgFiles = droppedFiles.filter(file => file.type.startsWith('image/'));
      if (imgFiles.length === 0) {
        showAlert('画像ファイル（PNGやJPGなど）を選んでね！📸', 'ちゅうい ⚠️');
        return;
      }

      const remainingSlots = 4 - formImages.length;
      if (remainingSlots <= 0) {
        showAlert('写真は1つの作品に4枚までしか登録できないよ！😢', 'ちゅうい ⚠️');
        return;
      }

      const filesToProcess = imgFiles.slice(0, remainingSlots);
      const readPromises = filesToProcess.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result && typeof event.target.result === 'string') {
              resolve(event.target.result);
            } else {
              resolve('');
            }
          };
          reader.readAsDataURL(file);
        });
      });

      const base64s = await Promise.all(readPromises);
      const validBase64s = base64s.filter(s => s !== '');
      setFormImages(prev => [...prev, ...validBase64s].slice(0, 4));
      
      if (imgFiles.length > remainingSlots) {
        showAlert(`写真は最大4枚までだよ。余分な写真はカットされました。`, 'お知らせ');
      } else {
        showAlert('写真を追加したよ！📸✨');
      }
      return;
    }

    // 2. Fallbacks for dropped URLs/Images from external websites (like Google Photos or Amazon Photos)
    const urlList = e.dataTransfer.getData('text/uri-list');
    const htmlData = e.dataTransfer.getData('text/html');
    const textData = e.dataTransfer.getData('text/plain');
    let capturedUrls: string[] = [];

    if (htmlData) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlData, 'text/html');
        // Extract from standard img tags
        const imgs = Array.from(doc.querySelectorAll('img'));
        for (const img of imgs) {
          const src = img.getAttribute('src') || img.getAttribute('data-src') || img.src;
          if (src && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:'))) {
            capturedUrls.push(src);
          }
        }
        // Extract from anchor links wrapping the photos
        const links = Array.from(doc.querySelectorAll('a'));
        for (const a of links) {
          const href = a.getAttribute('href') || a.href;
          if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            if (href.match(/\.(jpeg|jpg|gif|png|webp)/i) || href.includes('googleusercontent') || href.includes('clouddrive') || href.includes('photos')) {
              capturedUrls.push(href);
            }
          }
        }
      } catch (err) {
        console.warn('DOMParser extraction failed, parsing using regex', err);
      }
    }

    // Fallback if DOMParser hasn't captured any valid URLs
    if (capturedUrls.length === 0) {
      if (urlList) {
        capturedUrls = urlList.split('\n').map(u => u.trim()).filter(u => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')));
      } else if (htmlData) {
        const srcMatch = htmlData.match(/src="([^"]+)"/i);
        if (srcMatch && srcMatch[1]) {
          capturedUrls.push(srcMatch[1]);
        }
      } else if (textData && (textData.startsWith('http://') || textData.startsWith('https://') || textData.startsWith('data:'))) {
        capturedUrls.push(textData.trim());
      }
    }

    if (capturedUrls.length > 0) {
      await processImageSources(capturedUrls);
    } else {
      showAlert('ドラッグされたデータから写真を取り込めませんでした。手元の写真ファイルを入れるか、画像URLを貼り付けてみてね！📸', 'ちゅうい ⚠️');
    }
  };

  // Initialize and load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('lego_creations_v3_clean');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Automatic runtime legacy migration to multi-image array
        const migrated = parsed.map((item: any) => {
          if (!item.images) {
            return {
              ...item,
              images: item.image ? [item.image] : [],
            };
          }
          return item;
        });
        setItems(migrated);
        localStorage.setItem('lego_creations_v3_clean', JSON.stringify(migrated));
      } catch (e) {
        setItems(INITIAL_CREATIONS);
      }
    } else {
      setItems(INITIAL_CREATIONS);
      localStorage.setItem('lego_creations_v3_clean', JSON.stringify(INITIAL_CREATIONS));
    }

    // Set today as default date
    const today = new Date().toISOString().split('T')[0];
    setFormDate(today);

    // Set formBuilder default
    const savedBuilders = localStorage.getItem('lego_builders_v1');
    const bList = savedBuilders ? JSON.parse(savedBuilders) : ['おとうさん', 'おかあさん', 'ぼく', 'わたし'];
    if (bList.length > 0) {
      setFormBuilder(bList[0]);
    }
  }, []);

  // Listen for paste actions globally
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Check if target is an input or textarea to avoid capturing text pastes there
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;

      e.preventDefault();

      let remaining = 0;
      setFormImages(prev => {
        remaining = 4 - prev.length;
        if (remaining <= 0) {
          showAlert('写真は1つの作品に4枚までしか登録できないよ！😢', 'ちゅうい ⚠️');
          return prev;
        }

        const itemsToProcess = imageItems.slice(0, remaining);
        
        itemsToProcess.forEach(item => {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (base64) {
                setFormImages(current => {
                  if (current.length >= 4) return current;
                  return [...current, base64].slice(0, 4);
                });
                showAlert('コピーした写真をきれいにインポートしたよ！📸✨', 'インポート成功 🎉');
              }
            };
            reader.readAsDataURL(file);
          }
        });

        return prev;
      });
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Save to LocalStorage helper
  const saveItems = (newItems: LegoItem[]) => {
    setItems(newItems);
    localStorage.setItem('lego_creations_v3_clean', JSON.stringify(newItems));
  };

  const saveBuilders = (newList: string[]) => {
    setBuilders(newList);
    localStorage.setItem('lego_builders_v1', JSON.stringify(newList));
  };

  const renameBuilder = (index: number, newName: string) => {
    const oldName = builders[index];
    if (!newName.trim() || newName.trim() === oldName) return;
    
    const updatedBuilders = [...builders];
    updatedBuilders[index] = newName.trim();
    saveBuilders(updatedBuilders);
    
    // Cascade update items
    const updatedItems = items.map(item => {
      if (item.builder === oldName) {
        return { ...item, builder: newName.trim() };
      }
      return item;
    });
    saveItems(updatedItems);
    
    // If formBuilder matches, update it too
    if (formBuilder === oldName) {
      setFormBuilder(newName.trim());
    }
    setEditingBuilderIndex(null);
    showAlert(`つくり手の名前を「${oldName}」から「${newName.trim()}」に変更したよ！今までの作品もぜんぶ書きかわったよ！✏️✨`);
  };

  const addBuilder = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (builders.includes(cleanName)) {
      showAlert('もう同じ名前のつくり手がいるよ！🧐');
      return;
    }
    const updated = [...builders, cleanName];
    saveBuilders(updated);
    setFormBuilder(cleanName); // auto select newly created
    setNewBuilderInput('');
  };

  const deleteBuilder = (index: number) => {
    const nameToDelete = builders[index];
    showConfirm(
      `つくり手「${nameToDelete}」をリストから消しますか？\n(この人の作品のつくり手情報は消えませんが、未設定になります)`,
      () => {
        const updated = builders.filter((_, idx) => idx !== index);
        saveBuilders(updated);
        
        // Clear items builder association if needed
        const updatedItems = items.map(item => {
          if (item.builder === nameToDelete) {
            const { builder, ...rest } = item;
            return rest as LegoItem;
          }
          return item;
        });
        saveItems(updatedItems);
        
        if (formBuilder === nameToDelete) {
          setFormBuilder(updated[0] || '');
        }
      },
      'つくり手を消す'
    );
  };

  // Handle Photo Picker (Multiple files selection allowed)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    if (selectedFiles.length === 0) return;

    const remainingSlots = 4 - formImages.length;
    if (remainingSlots <= 0) {
      showAlert('写真は1つの作品に4枚までしか登録できないよ！😢', 'ちゅうい ⚠️');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const filesToProcess = selectedFiles.slice(0, remainingSlots);
    let processedCount = 0;
    const results: string[] = [];

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          results.push(event.target.result);
        }
        processedCount++;
        if (processedCount === filesToProcess.length) {
          setFormImages(prev => [...prev, ...results].slice(0, 4));
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Manual URL Importer Handler for Google Photos / Amazon Photos Shared Links
  const handleUrlImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrlInput.trim()) return;

    if (formImages.length >= 4) {
      showAlert('写真は最大4枚まで登録できるよ！😢', 'ちゅうい ⚠️');
      return;
    }

    await processImageSources([imageUrlInput.trim()]);
    setImageUrlInput('');
    setIsUrlModalOpen(false);
  };

  // Instant Bulk File Importer (Multiselect/Drag to immediate individual creation insertions)
  const handleBulkFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    if (selectedFiles.length === 0) return;

    showAlert('写真の一括インポートを開始するよ！🚀', 'インポート開始 📥');
    
    const importPromises = selectedFiles.map(file => {
      return new Promise<LegoItem>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = (event.target?.result && typeof event.target.result === 'string') 
            ? event.target.result 
            : '';
          
          const displayName = file.name.replace(/\.[^/.]+$/, "");
          const today = new Date().toISOString().split('T')[0];
          
          resolve({
            id: 'lego_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: displayName || 'インポートした作品',
            date: today,
            image: base64,
            images: base64 ? [base64] : [],
            memo: 'ローカルファイルから一括インポートしました 📁✨',
            rating: 5
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const newItems = await Promise.all(importPromises);
    const validItems = newItems.filter(item => item.image !== '');
    
    if (validItems.length > 0) {
      const updated = [...validItems, ...items];
      saveItems(updated);
      showAlert(`🎉 ${validItems.length}枚 の作品を一瞬でインポート（自動ずかん登録）したよ！`, '完了 🏆');
    }
    
    if (e.target) e.target.value = '';
  };

  // Instant Bulk URL Importer (Newline or comma separated URLs with CORS auto-bypass / proxy protection logic)
  const handleBulkUrlImport = async () => {
    if (!bulkUrlInput.trim()) {
      showAlert('URLを入力してね！🔗', 'ちゅうい ⚠️');
      return;
    }

    const urls = bulkUrlInput
      .split(/[\n,]+/)
      .map(u => u.trim())
      .filter(u => u.startsWith('http://') || u.startsWith('https://'));

    if (urls.length === 0) {
      showAlert('有効な画像URL（http:// または https:// から始まるもの）が見つかりませんでした。', 'ちゅうい ⚠️');
      return;
    }

    showAlert(`${urls.length}件のURLから自動インポートを開始するよ！CORSエラーのバイパスと読み込みを試みます... 🔍`, 'インポート中 🔄');

    const importedItems: LegoItem[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      let title = 'ネットの作品';
      try {
        const uObj = new URL(url);
        const pathParts = uObj.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        if (fileName && fileName.includes('.')) {
          title = decodeURIComponent(fileName.replace(/\.[^/.]+$/, ""));
        } else if (fileName) {
          title = decodeURIComponent(fileName);
        }
      } catch (err) {
        // ignore
      }

      if (title.length > 25) title = title.substring(0, 25) + '...';
      if (!title || title === 'ネットの作品') title = `インポート作品 ${items.length + importedItems.length + 1}`;

      // CORS bypass automatic fallback extraction (Proxy First, then CORS Direct, then Raw URL)
      let finalImg = url;
      let success = false;

      // 1. Try using images.weserv.nl as CORS proxy to retrieve base64, preserving high quality and avoiding expiry
      try {
        const cleanUrl = url.trim();
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;
        const res = await fetch(proxyUrl).catch(() => null);
        if (res && res.ok) {
          const blob = await res.blob();
          const encodedStr = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          if (encodedStr && encodedStr.startsWith('data:image/')) {
            finalImg = encodedStr;
            success = true;
          }
        }
      } catch (proxyErr) {
        console.warn('Proxy load failed in bulk import, trying direct', proxyErr);
      }

      if (!success) {
        // 2. Direct fetch with CORS mode fallback
        try {
          const res = await fetch(url, { mode: 'cors' }).catch(() => null);
          if (res && res.ok) {
            const blob = await res.blob();
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            if (base64 && base64.startsWith('data:image/')) {
              finalImg = base64;
              success = true;
            }
          }
        } catch (err) {
          // Fallback transparently using raw CORS-permissive direct mapping
          console.warn(`CORS fallback direct mapping: ${url}`);
        }
      }

      importedItems.push({
        id: 'lego_' + Date.now() + '_url_' + i + '_' + Math.random().toString(36).substring(2, 5),
        name: title,
        date: today,
        image: finalImg,
        images: [finalImg],
        memo: `一括URLインポート（元アドレス：${url.substring(0, 50)}${url.length > 50 ? '...' : ''}）🌐`,
        rating: 5
      });
    }

    if (importedItems.length > 0) {
      const updated = [...importedItems, ...items];
      saveItems(updated);
      setBulkUrlInput('');
      showAlert(`🎉 ${importedItems.length}件 のネット写真をインポートし、自動で登録完了したよ！\n※ CORS制限のある写真は直接URLで保護しながら読み込んでいます。`, 'インポート完了 🏆');
    }
  };

  // Add Item
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      showAlert('作品の名前を入力してね！✏️');
      return;
    }
    if (!formDate) {
      showAlert('制作日を入力してね！📅');
      return;
    }
    if (formImages.length === 0) {
      showAlert('スマホやカメラで撮影した写真、あるいはGoogleフォトなどの写真をえらんでね！📸');
      return;
    }

    const newItem: LegoItem = {
      id: 'lego_' + Date.now(),
      name: formName.trim(),
      date: formDate,
      image: formImages[0], // Dual mapping fallback
      images: formImages,
      memo: formMemo.trim() || undefined,
      rating: formRating,
      builder: formBuilder ? formBuilder : undefined
    };

    const updated = [newItem, ...items];
    saveItems(updated);

    // Reset Form
    setFormName('');
    setFormMemo('');
    setFormImages([]);
    setFormRating(5);
    const today = new Date().toISOString().split('T')[0];
    setFormDate(today);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    showAlert(`✨ 「${newItem.name}」をずかんに登録したよ！`);
  };

  // Delete Item
  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering lightbox modal
    e.stopPropagation(); // Avoid triggering lightbox modal
    showConfirm(
      `「${name}」をずかんから消してもいいですか？`,
      () => {
        const updated = items.filter(item => item.id !== id);
        saveItems(updated);
        setSelectedIds(selectedIds.filter(x => x !== id));
      },
      'さくひんを消す'
    );
  };

  // Bulk Delete Selected Items
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    showConfirm(
      `えらんだ ${selectedIds.length}個 のさくひんをまとめて消してもいいですか？`,
      () => {
        const updated = items.filter(item => !selectedIds.includes(item.id));
        saveItems(updated);
        setSelectedIds([]);
        setIsSelectMode(false);
      },
      'まとめて消す'
    );
  };

  // Filter and sort items
  const sortedItems = [...items]
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (item.memo && item.memo.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesBuilder = selectedBuilderFilter === 'all' ||
                            (selectedBuilderFilter === 'none' && !item.builder) ||
                            (item.builder === selectedBuilderFilter);
      return matchesSearch && matchesBuilder;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id);
      } else if (sortBy === 'oldest') {
        return new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id);
      } else if (sortBy === 'rating') {
        const ratingA = a.rating ?? 5;
        const ratingB = b.rating ?? 5;
        if (ratingB !== ratingA) {
          return ratingB - ratingA;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'ja');
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-yellow-200 flex flex-col font-sans" id="app-root">
      
      {/* Decorative Top Brick Accent Line */}
      <div className="h-4 bg-repeat-x flex" style={{ backgroundImage: 'radial-gradient(circle, #ffd500 40%, transparent 41%)', backgroundSize: '24px 16px', backgroundColor: '#005596' }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="w-6 h-3 bg-[#005596] border-b-2 border-yellow-400/20 rounded-t-sm" />
        ))}
      </div>

      {/* Brand Header */}
      <header className="bg-[#005596] text-white py-6 px-4 md:px-8 shadow-md relative overflow-hidden" id="app-header">
        {/* Abstract background brick patterns */}
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
          <div className="absolute top-1/2 left-4 w-12 h-8 bg-white border border-white rounded-md flex justify-around p-1">
            <div className="w-3 h-3 bg-white rounded-full"></div>
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
          <div className="absolute top-1/4 right-8 w-16 h-8 bg-white border border-white rounded-md flex justify-around p-1">
            <div className="w-3 h-3 bg-white rounded-full"></div>
            <div className="w-3 h-3 bg-white rounded-full"></div>
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            {/* Playful 3D Lego Album App Icon (recreated precisely from user image) */}
            <motion.div 
              whileHover={{ rotate: [0, -6, 6, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="w-16 h-16 cursor-pointer select-none relative z-20"
              id="app-main-logo"
            >
              <LegoAlbumIcon className="w-full h-full drop-shadow-md" />
            </motion.div>
            
            <div className="text-center md:text-left">
              <h1 id="main-title" className="text-2xl md:text-4xl font-extrabold tracking-wider text-[#ffd500] drop-shadow-sm flex items-center justify-center md:justify-start gap-2">
                レゴ作品図鑑
              </h1>
              <p className="text-xs md:text-sm text-blue-100 font-medium mt-1">
                作ったレゴをしゃしんにとって、じぶんだけのすてきな図鑑（コレクション）をつくろう！
              </p>
            </div>
          </div>

        </div>
      </header>

      {/* Quick Navigation Panel */}
      <div className="bg-white border-b-2 border-slate-200 py-3 px-4 shadow-sm sticky top-0 z-40" id="quick-nav">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[#005596] font-black text-xs md:text-sm">かんたんナビ 🚀 :</span>
            <button
              onClick={() => {
                const element = document.getElementById('section-register');
                if (element) {
                  const y = element.getBoundingClientRect().top + window.pageYOffset - 90;
                  window.scrollTo({ top: y, behavior: 'smooth' });
                }
              }}
              className="text-xs font-extrabold bg-[#005596] hover:bg-[#00447a] text-white px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border-b-2 border-blue-900 active:translate-y-0.5"
            >
              <span>🔨</span>
              <span>さくひん登録（とうろく）</span>
            </button>
            <button
              onClick={() => {
                setSearchQuery('');
                setTimeout(() => {
                  const element = document.getElementById('section-gallery');
                  if (element) {
                    const y = element.getBoundingClientRect().top + window.pageYOffset - 90;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }, 80);
              }}
              className="text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border-b-2 border-amber-700 active:translate-y-0.5"
            >
              <span>📖</span>
              <span>さくひんコレクションを見る ({items.length}件) 🔎</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
            <span>💡</span>
            <span>登録すると、すぐ下に自動で追加されるよ！</span>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8" id="app-main">
        
        {/* Left Column: Form Section */}
        <section className="lg:col-span-4 flex flex-col gap-6 scroll-mt-24" id="section-register">
          <div className="bg-white p-6 rounded-3xl border-4 border-[#005596] shadow-xl relative overflow-hidden flex flex-col">
            
            {/* Stud background representation */}
            <div className="absolute top-4 right-4 flex gap-1 opacity-20 select-none pointer-events-none">
              <div className="w-4 h-4 bg-[#005596] rounded-full flex items-center justify-center text-[8px] font-bold text-white">LEGO</div>
              <div className="w-4 h-4 bg-[#ffd500] rounded-full flex items-center justify-center text-[8px] font-bold text-[#005596]">LEGO</div>
            </div>

            <h2 className="text-xl font-black text-[#005596] mb-6 pb-2 border-b-2 border-dashed border-slate-200 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#ffd500] fill-[#ffd500]" />
              <span>あたらしいさくひん</span>
            </h2>

            <form onSubmit={handleRegister} className="space-y-5 flex-grow flex flex-col justify-between">
              <div className="space-y-4">
                {/* 1. Creation Name */}
                <div>
                  <label htmlFor="input-creation-name" className="block text-sm font-black text-slate-700 mb-1 flex items-center gap-1">
                    <span>さくひんの名前</span>
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-bold">必須</span>
                  </label>
                  <input
                    type="text"
                    id="input-creation-name"
                    required
                    maxLength={30}
                    placeholder="例: 火星たんさしゃ、大きなしろ"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-[#005596] focus:ring-4 focus:ring-blue-100 transition-all font-bold text-base"
                  />
                </div>

                {/* 2. Finished Date */}
                <div>
                  <label htmlFor="input-creation-date" className="block text-sm font-black text-slate-700 mb-1 flex items-center gap-1">
                    <span>つくった日</span>
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-bold">必須</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="input-creation-date"
                      required
                      max={new Date().toISOString().split('T')[0]}
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-[#005596] transition-all font-bold text-base bg-white"
                    />
                  </div>
                </div>

                {/* 2.5. Creator / Builder Selection */}
                <div>
                  <label htmlFor="input-creation-builder" className="block text-sm font-black text-slate-700 mb-1 flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1">
                      <span>つくり手 (せいさくしゃ)</span>
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-bold">必須</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsBuilderModalOpen(true)}
                      className="text-xs font-black text-[#005596] hover:underline flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>変更・追加 ✏️</span>
                    </button>
                  </label>
                  <div className="relative">
                    <select
                      id="input-creation-builder"
                      required
                      value={formBuilder}
                      onChange={(e) => setFormBuilder(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-[#005596] transition-all font-bold text-sm bg-white cursor-pointer"
                    >
                      {builders.map((name) => (
                        <option key={name} value={name}>
                          👤 {name}
                        </option>
                      ))}
                      {builders.length === 0 && (
                        <option value="">(つくり手を登録してね)</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* 3. Rating (お気に入り度) */}
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-1 flex items-center gap-1">
                    <span>お気に入り度</span>
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-bold">必須</span>
                  </label>
                  <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 p-2.5 rounded-2xl">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormRating(star)}
                          className="text-2xl transition-all duration-150 hover:scale-125 focus:outline-none select-none cursor-pointer"
                          title={`星 ${star}`}
                        >
                          {star <= formRating ? '⭐️' : '☆'}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-extrabold text-slate-500 ml-2">
                      星 {formRating} 個のお気に入り！
                    </span>
                  </div>
                </div>

                {/* Optional: Points & Memo */}
                <div>
                  <label htmlFor="input-creation-memo" className="block text-sm font-black text-slate-700 mb-1">
                    おすすめポイント / メモ <span className="text-[10px] text-slate-400 font-bold">(かかなくてもいいよ)</span>
                  </label>
                  <textarea
                    id="input-creation-memo"
                    placeholder="例: うしろのウイングと、赤色のライトを工夫しました！"
                    maxLength={140}
                    value={formMemo}
                    onChange={(e) => setFormMemo(e.target.value)}
                    className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-[#005596] text-sm font-bold min-h-16 h-20 resize-none leading-relaxed"
                  />
                </div>

                {/* 3. Photo Uploader Section */}
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-1 flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1">
                      <span>レゴのしゃしん <span className="text-amber-500 font-extrabold">(最大4まい)</span></span>
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-bold">必須</span>
                    </span>
                    <span className="text-xs text-slate-400 font-bold">{formImages.length} / 4枚</span>
                  </label>
                  
                  <input
                    type="file"
                    id="photo-uploader"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  {/* Registered Thumbnails Grid */}
                  {formImages.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-3" id="preview-thumbnails-grid">
                      {formImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-4/3 rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-100 group shadow-sm">
                          <img
                            src={img}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-1 left-1.5 bg-slate-900/70 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded">
                            {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormImages(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-1 right-1 bg-slate-100/90 hover:bg-rose-500 hover:text-white text-slate-700 w-6 h-6 rounded-full flex items-center justify-center font-bold transition-all shadow-md cursor-pointer text-xs"
                            title="写真を消す"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Drop zone shown if under 4 images */}
                  {formImages.length < 4 ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => setIsPhotoImportModalOpen(true)}
                      className={`w-full py-6 border-3 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group p-4 text-center ${
                        isDragging 
                          ? 'border-yellow-400 bg-yellow-50/50 scale-[1.02] shadow-md ring-4 ring-yellow-200/50' 
                          : 'border-slate-300 hover:border-[#005596] bg-slate-50 hover:bg-slate-100/50'
                      }`}
                      id="upload-zone"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 transition-all ${
                        isDragging ? 'bg-yellow-100 text-[#005596] scale-110' : 'bg-blue-50 text-[#005596] group-hover:scale-110'
                      }`}>
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black text-slate-700 leading-normal">
                        {formImages.length === 0 ? 'しゃしんをドラッグ＆ドロップ、またはえらぶ' : 'さらにしゃしんを追加する'}
                      </span>
                      <p className="text-[9px] text-slate-400 mt-1 font-bold leading-tight">
                        ブラウザ（GoogleフォトやAmazon Photos）の写真をここにドラッグ＆ドロップして入れることもできます！📁✨
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs font-bold text-center">
                      ✅ 写真が4枚いっぱいに登録されました！
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Trigger */}
              <div className="mt-8">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  id="btn-submit-registration"
                  className="w-full bg-[#ffd500] hover:bg-[#ffe033] text-slate-900 font-extrabold py-4 px-6 rounded-2xl shadow-md border-b-4 border-yellow-700 transition-all flex items-center justify-center gap-2 text-lg cursor-pointer"
                >
                  <Plus className="w-5 h-5 stroke-[3px]" />
                  <span>図鑑に登録する ✨</span>
                </motion.button>
              </div>
            </form>
          </div>


        </section>

        {/* Right Column: Catalog Gallery Grid Section */}
        <section className="lg:col-span-8 flex flex-col gap-6 scroll-mt-24" id="section-gallery">
          
          {/* Filtering Widgets */}
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
            {/* Search filter input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                id="search-box"
                placeholder="なまえ や メモ でさがす..."
                value={searchQuery}
                aria-label="なまえ や メモ でさがす"
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-[#005596] text-sm font-bold bg-slate-50/50"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-black text-slate-500 flex items-center gap-1">
                <span>🔄</span>
                <span>ならびかえ（ならび順）:</span>
              </span>
              <div className="relative inline-block w-full sm:w-auto">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full sm:w-auto appearance-none bg-slate-50/80 border-2 border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-black px-4 py-2 pr-8 rounded-xl focus:outline-none focus:border-[#005596] transition-all cursor-pointer"
                >
                  <option value="newest">📅 つくった日が新しい順</option>
                  <option value="oldest">📅 つくった日が古い順</option>
                  <option value="rating">⭐️ お気に入り度が高い順</option>
                  <option value="name">🔤 名前（50音）順</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                  <span className="text-[10px]">▼</span>
                </div>
              </div>
            </div>

            {/* Builder Filter (つくった人でしぼりこむ) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-black text-slate-500 flex items-center gap-1.5">
                <span>👥</span>
                <span>つくった人でしぼりこむ:</span>
              </span>
              <div className="relative flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  list="builder-filter-list"
                  value={selectedBuilderFilter === 'all' ? '' : selectedBuilderFilter === 'none' ? 'つくり手未設定のみ' : selectedBuilderFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '全員の作品を表示' || val === '全員の作品') {
                      setSelectedBuilderFilter('all');
                    } else if (val === 'つくり手未設定のみ') {
                      setSelectedBuilderFilter('none');
                    } else {
                      setSelectedBuilderFilter(val);
                    }
                  }}
                  placeholder="👤 全員の作品を表示 (名前を入力してさがせるよ)"
                  className="w-full sm:w-64 bg-slate-50/80 border-2 border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-black px-4 py-2 rounded-xl focus:outline-none focus:border-[#005596] transition-all font-sans"
                />
                
                {selectedBuilderFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedBuilderFilter('all')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs p-0.5"
                    title="クリア"
                  >
                    ✕
                  </button>
                )}

                <datalist id="builder-filter-list">
                  <option value="全員の作品を表示" />
                  <option value="つくり手未設定のみ" />
                  {builders.map((bName) => (
                    <option key={bName} value={bName} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Collection Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
            <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
              <span>📖 さくひんコレクション</span>
              <span id="collection-count" className="text-xs bg-blue-100 text-[#005596] px-2.5 py-1 rounded-full font-black min-w-8 text-center shadow-inner">
                {sortedItems.length}
              </span>
            </h3>
            {items.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBookbindingModalOpen(true)}
                  className="text-xs font-black px-4 py-2 bg-[#005596] hover:bg-[#00447a] text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md border-b-4 border-blue-900 active:translate-y-0.5"
                >
                  <Printer className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  <span>製本用PDFを出力 📚</span>
                </button>

                <button
                  onClick={() => {
                    setIsSelectMode(!isSelectMode);
                    setSelectedIds([]);
                  }}
                  className={`text-xs font-black px-3 py-1.5 rounded-xl border-2 transition-all flex items-center gap-1 cursor-pointer ${
                    isSelectMode
                      ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                      : 'bg-[#ffd500]/10 border-[#ffd500] text-slate-800 hover:bg-[#ffd500]/20'
                  }`}
                >
                  <span>{isSelectMode ? '選択をやめる ✕' : '🗑️ まとめて消す (複数選択)'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Bulk Select Control Banner */}
          {isSelectMode && items.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-black bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center">
                  {selectedIds.length}
                </span>
                <span className="text-xs font-black text-blue-900">
                  枚（まい）のしゃしんを選んでいます
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sortedIds = sortedItems.map(item => item.id);
                    const allSelected = sortedIds.every(id => selectedIds.includes(id));
                    if (allSelected) {
                      // Deselect all sorted items
                      setSelectedIds(selectedIds.filter(id => !sortedIds.includes(id)));
                    } else {
                      // Add missing sorted items
                      const union = Array.from(new Set([...selectedIds, ...sortedIds]));
                      setSelectedIds(union);
                    }
                  }}
                  className="text-[11px] font-bold bg-white border border-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {sortedItems.length > 0 && sortedItems.map(item => item.id).every(id => selectedIds.includes(id)) ? '🧹 選択（せんたく）をはずす' : '✅ ぜんぶ選ぶ (全選択)'}
                </button>
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={handleBulkDelete}
                  className={`text-xs font-black px-4 py-1.5 rounded-xl border-b-2 flex items-center gap-1.5 transition-all ${
                    selectedIds.length > 0
                      ? 'bg-rose-500 hover:bg-rose-600 border-rose-700 text-white cursor-pointer active:translate-y-0.5'
                      : 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>🗑️ まとめて削除 ({selectedIds.length}枚)</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Catalog grid */}
          <AnimatePresence>
            {sortedItems.length === 0 ? (
              <motion.div
                key="empty-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                id="empty-view"
                className="bg-white py-16 px-6 rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-400 shadow-inner flex flex-col items-center justify-center"
              >
                <div className="text-5xl mb-3 select-none">🧸</div>
                <p className="font-extrabold text-slate-600 text-lg">
                  あてはまる作品がありません
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  レゴのあたらしい作品を登録するか、ちがうキーワードや日付で探してみてね！
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key="creation-cards-grid"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                id="creation-cards-grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {sortedItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 1, scale: 1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      key={item.id}
                      id={`lego-card-${item.id}`}
                      onClick={() => {
                        if (isSelectMode) {
                          if (isSelected) {
                            setSelectedIds(selectedIds.filter(id => id !== item.id));
                          } else {
                            setSelectedIds([...selectedIds, item.id]);
                          }
                        } else {
                          setLightboxItem(item);
                          setLightboxImageIndex(0);
                        }
                      }}
                      className={`bg-white rounded-2xl overflow-hidden border-3 transition-all duration-300 flex flex-col shadow-sm relative cursor-pointer ${
                        isSelectMode
                          ? isSelected
                            ? 'border-blue-600 ring-4 ring-blue-100 scale-[0.98]'
                            : 'border-slate-200 opacity-80 scale-[0.97] hover:border-slate-300'
                          : 'border-slate-200 hover:border-[#005596] hover:scale-[1.02] group'
                      }`}
                    >
                      {/* Image Frame with Floating Overlays */}
                      <div className="aspect-4/3 w-full bg-slate-50 relative overflow-hidden flex items-center justify-center">
                        <img
                          src={(item.images && item.images.length > 0) ? item.images[0] : item.image}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />

                        {/* Overlapping layered look badge if multiple images */}
                        {item.images && item.images.length > 1 && (
                          <div className="absolute bottom-3 right-3 z-20 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-md border border-white/10 select-none">
                            <span>📷</span>
                            <span>{item.images.length}枚</span>
                          </div>
                        )}

                        {/* Checkbox Overlay in Select Mode */}
                        {isSelectMode && (
                          <div className={`absolute top-3 left-3 z-30 w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-md transition-all ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white/90 border-slate-300 text-transparent'
                          }`}>
                            <Check className="w-4 h-4 stroke-[4px]" />
                          </div>
                        )}

                        {/* Floating Tool Button: Trash Can */}
                        {!isSelectMode && (
                          <button
                            onClick={(e) => handleDelete(item.id, item.name, e)}
                            id={`btn-delete-${item.id}`}
                            className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-white/95 hover:bg-rose-500 hover:text-white text-slate-500 shadow-md flex items-center justify-center transition-colors border border-slate-100 cursor-pointer"
                            title="作品を消す"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Info Panel */}
                      <div className="p-4 flex flex-col justify-between flex-grow border-t border-slate-100 font-sans">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-slate-800 text-sm md:text-base leading-tight tracking-wide group-hover:text-[#005596] transition-colors truncate">
                            {item.name}
                          </h4>
                          {/* Rating display */}
                          <div className="flex items-center gap-0.5 text-xs text-amber-400 select-none pb-1" title={`お気に入り度: ${item.rating ?? 5}`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i}>
                                {i < (item.rating ?? 5) ? '⭐️' : '☆'}
                              </span>
                            ))}
                          </div>

                          {item.builder && (
                            <div className="inline-flex items-center gap-1 bg-sky-50 text-[#005596] text-[9px] font-black px-2 py-0.5 rounded-md mb-1.5">
                              <span>👤</span>
                              <span>つくり手: {item.builder}</span>
                            </div>
                          )}
                          {item.memo && (
                            <p className="text-xs text-slate-500 line-clamp-1 font-medium bg-slate-50 p-1.5 rounded">
                              {item.memo}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 pt-3 border-t border-slate-50 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{item.date}</span>
                          </span>
                          {!isSelectMode && (
                            <span className="text-[#005596] text-xs font-black group-hover:translate-x-1.5 transition-transform flex items-center gap-0.5">
                              <span>みる</span>
                              <span>🔎</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

      </main>

      {/* Detail Showcase Lightbox Modal for Children */}
      <AnimatePresence>
        {lightboxItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80" id="lightbox-modal">
            {/* Overlay */}
            <div className="absolute inset-0" onClick={() => setLightboxItem(null)} />

            {/* Inner frame */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full overflow-hidden border-4 border-[#005596] shadow-2xl relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Float Close Button */}
              <button
                onClick={() => setLightboxItem(null)}
                className="absolute top-3 right-3 bg-slate-950/60 hover:bg-slate-900 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 z-10 cursor-pointer"
                title="とじる"
              >
                <X className="w-4 h-4 text-white stroke-[2.5px]" />
              </button>

              {/* Large Image Showcase with carousel configuration */}
              <div className="aspect-4/3 w-full bg-slate-950 relative overflow-hidden flex items-center justify-center animate-fade-in">
                {(() => {
                  const images = (lightboxItem.images && lightboxItem.images.length > 0) 
                    ? lightboxItem.images 
                    : [lightboxItem.image];
                  const currentImage = images[lightboxImageIndex] || lightboxItem.image;

                  return (
                    <>
                      <img
                        src={currentImage}
                        alt={`${lightboxItem.name} - ${lightboxImageIndex + 1}`}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />

                      {/* Left Navigation Arrow */}
                      {images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setLightboxImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-white/10 flex items-center justify-center text-white text-xs font-bold focus:outline-none cursor-pointer transition-colors shadow-md"
                          title="前のしゃしん"
                        >
                          ◀
                        </button>
                      )}

                      {/* Right Navigation Arrow */}
                      {images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setLightboxImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-white/10 flex items-center justify-center text-white text-xs font-bold focus:outline-none cursor-pointer transition-colors shadow-md"
                          title="次のしゃしん"
                        >
                          ▶
                        </button>
                      )}

                      {/* Dot Page Indicator */}
                      {images.length > 1 && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/70 px-3 py-1.5 rounded-full border border-white/10 select-none">
                          {images.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setLightboxImageIndex(i)}
                              className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                                i === lightboxImageIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'
                              }`}
                              title={`${i + 1}枚目のしゃしん`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Meta context block */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {/* Production Date */}
                  <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>作った日: {lightboxItem.date}</span>
                  </span>

                  {lightboxItem.builder && (
                    <span className="text-xs bg-sky-50 text-[#005596] font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <span>👤 つくり手:</span>
                      <strong>{lightboxItem.builder}</strong>
                    </span>
                  )}
                </div>

                {/* Details text */}
                <div className="space-y-2">
                  <h4 className="text-xl md:text-2xl font-black text-slate-900 leading-snug">
                    {lightboxItem.name}
                  </h4>
                  {/* Rating in lightbox */}
                  <div className="flex items-center gap-1 text-sm bg-amber-50/50 border border-amber-200/50 py-1.5 px-3 rounded-xl w-fit select-none">
                    <span className="text-xs font-black text-amber-700 mr-1 flex items-center">お気に入り度:</span>
                    <div className="flex items-center text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className="text-base">
                          {i < (lightboxItem.rating ?? 5) ? '⭐️' : '☆'}
                        </span>
                      ))}
                    </div>
                  </div>
                  {lightboxItem.memo ? (
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/30">
                      <p className="text-xs text-[#005596] font-bold mb-1 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                        <span>こだわりポイント・メモ</span>
                      </p>
                      <p className="text-sm text-slate-600 font-bold leading-relaxed whitespace-pre-wrap">
                        {lightboxItem.memo}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">この作品へのメモはありません</p>
                  )}
                </div>

                {/* Action button inside popup to make it parent-child interactive */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setLightboxItem(null)}
                    className="w-full bg-[#005596] hover:bg-[#00447a] text-white font-black py-3 rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    わかった！閉じる 👍
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom alert/confirm dialog component */}
      <AnimatePresence>
        {dialogInfo?.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="custom-dialog-overlay" onClick={() => {
            if (dialogInfo.type === 'alert') {
              setDialogInfo(null);
            }
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full overflow-hidden border-4 border-[#ffd500] shadow-2xl relative z-50 p-6 flex flex-col items-center text-center font-sans space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Toy Icon block */}
              <div className="w-16 h-16 rounded-2xl bg-[#ffd500]/15 flex items-center justify-center text-3xl select-none animate-bounce">
                {dialogInfo.type === 'confirm' ? '❓' : '💡'}
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-800">
                  {dialogInfo.title}
                </h4>
                <p className="text-sm font-bold text-slate-500 leading-relaxed whitespace-pre-line">
                  {dialogInfo.message}
                </p>
              </div>

              {/* Dynamic Action Controls */}
              <div className="flex gap-2 w-full pt-2">
                {dialogInfo.type === 'confirm' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setDialogInfo(null)}
                      className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border-b-2 border-slate-300"
                    >
                      やめる ✕
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (dialogInfo.onConfirm) dialogInfo.onConfirm();
                        setDialogInfo(null);
                      }}
                      className="w-1/2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border-b-2 border-rose-700 shadow-sm"
                    >
                      けす 🗑️
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDialogInfo(null)}
                    className="w-full bg-[#005596] hover:bg-[#00447a] text-white font-extrabold py-3 rounded-xl text-xs transition-colors cursor-pointer border-b-2 border-[#00335c]"
                  >
                    オッケー！👌
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📸 Photo Import Helper Modal */}
      <AnimatePresence>
        {isPhotoImportModalOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" 
            onClick={() => setIsPhotoImportModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full overflow-hidden border-4 border-sky-400 shadow-2xl relative p-6 flex flex-col font-sans gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-sky-100">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📸</span>
                  <div>
                    <h3 className="text-md font-black text-[#005596]">しゃしんを追加する</h3>
                    <p className="text-[10px] text-slate-400 font-bold">追加したい方法をえらんでね！</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPhotoImportModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 gap-3">
                {/* 1. Device Local Selection */}
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsPhotoImportModalOpen(false);
                  }}
                  className="w-full text-left p-4 bg-sky-50/50 hover:bg-sky-50 border-2 border-sky-200 hover:border-sky-400 rounded-2xl flex items-center gap-4 transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span>📱 このスマホ・PCの写真からえらぶ</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 leading-normal">
                      端末に保存してあるしゃしんや、その場でカメラで撮ったしゃしんを使うよ！
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-sky-500 transition-colors" />
                </button>

                {/* 2. Google Photos Picker Popup */}
                <button
                  type="button"
                  onClick={() => {
                    handleOpenGooglePhotosPicker();
                    setIsPhotoImportModalOpen(false);
                  }}
                  className="w-full text-left p-4 bg-amber-50/40 hover:bg-amber-50 border-2 border-amber-200 hover:border-amber-400 rounded-2xl flex items-center gap-4 transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span>☁️ Googleフォトからえらぶ (最大4枚)</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 leading-normal">
                      Googleフォトのアカウントとセキュアにつないで、登録したい写真を一瞬でえらべるよ！
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500 transition-colors" />
                </button>

                {/* 3. Paste / Tutorial / Clipboard paste board for Safari/Chrome/Amazon Photos */}
                <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                      <Clipboard className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-slate-800">
                        📸 クリップボード貼り付け / Amazon Photos ほか
                      </h4>
                      <p className="text-[10px] text-slate-500 font-bold mt-1 leading-normal">
                        Amazon Photosは公式連携ができないため、写真の上で<strong>「コピー（画像をコピー）」</strong>して、以下の貼付け枠を長押しして貼り付け（ペースト）するだけでカンタンに登録できます！
                      </p>
                    </div>
                  </div>

                  {/* Mobilized Custom Clipboard pasted catcher textarea inside modal! */}
                  <div className="relative">
                    <textarea
                      ref={pasteAreaRef}
                      placeholder="📋 ここを長押しタップなどで「貼り付け(ペースト)」してね！コピーされた画像がインポートされるよ"
                      rows={2}
                      className="w-full text-[10px] font-bold p-2.5 border-2 border-slate-200 focus:border-[#005596] rounded-xl outline-none resize-none bg-white placeholder-slate-400 text-slate-600 leading-normal"
                      onPaste={handleAreaPaste}
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[8px] font-bold text-slate-400 pointer-events-none select-none bg-slate-100 px-1.5 py-0.5 rounded-md">
                      <span>長押しで貼り付け</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold justify-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <Info className="w-3.5 h-3.5" />
                <span>コピーした画像は自動で安全なコードに変換され、ずかんに登録されます。</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 👤 Builder / Creator Management Modal */}
      <AnimatePresence>
        {isBuilderModalOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
            onClick={() => setIsBuilderModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full overflow-hidden border-4 border-[#005596] shadow-2xl relative p-6 flex flex-col font-sans gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👷</span>
                  <div>
                    <h3 className="text-md font-black text-[#005596]">つくり手 (せいさくしゃ) を入力</h3>
                    <p className="text-[10px] text-slate-400 font-bold">名前の変更や追加・削除ができるよ！</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBuilderModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Builders List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {builders.map((name, index) => {
                  const isEditing = editingBuilderIndex === index;
                  return (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl gap-3 transition-colors hover:bg-slate-50/80"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-grow">
                          <input
                            type="text"
                            maxLength={15}
                            value={editingBuilderValue}
                            onChange={(e) => setEditingBuilderValue(e.target.value)}
                            className="flex-grow px-3 py-1.5 text-xs font-bold border-2 border-[#005596] rounded-xl outline-none bg-white font-sans"
                          />
                          <button
                            type="button"
                            onClick={() => renameBuilder(index, editingBuilderValue)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingBuilderIndex(null)}
                            className="bg-slate-300 hover:bg-slate-400 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 truncate">
                            <span>👤</span>
                            <span>{name}</span>
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBuilderIndex(index);
                                setEditingBuilderValue(name);
                              }}
                              className="p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
                              title="名前をかえる"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteBuilder(index)}
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                              title="消す"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {builders.length === 0 && (
                  <p className="text-center text-xs text-slate-400 font-bold py-6">
                    つくり手が誰もいません。下のフォームから追加してね！👷💬
                  </p>
                )}
              </div>

              {/* Add New Builder input */}
              <div className="pt-2 border-t border-dashed border-slate-200">
                <span className="block text-[11px] font-black text-slate-500 mb-1.5">
                  ➕ あたらしいつくり手を追加する
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="例: たろう、お姉ちゃん"
                    value={newBuilderInput}
                    onChange={(e) => setNewBuilderInput(e.target.value)}
                    className="flex-grow px-4 py-2.5 text-xs font-bold border-2 border-slate-200 focus:border-[#005596] rounded-xl outline-none bg-slate-50/50 font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addBuilder(newBuilderInput);
                    }}
                    className="bg-[#005596] hover:bg-[#00447a] text-white text-xs font-black px-4 py-2.5 rounded-xl border-b-4 border-blue-900 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
                  >
                    追加 (たす)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold justify-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <Info className="w-3.5 h-3.5" />
                <span>名前を変更すると、過去に登録した作品もいっしょにかわります！🚀</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📚 Bookbinding PDF Export Modal */}
      <BookbindingModal
        isOpen={isBookbindingModalOpen}
        onClose={() => setIsBookbindingModalOpen(false)}
        items={items}
        builders={builders}
      />

      {/* Joyful footer */}
      <footer className="text-center py-8 text-xs text-slate-400 border-t border-slate-100 mt-12 bg-white" id="app-footer-info">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-extrabold text-slate-500">🧱 おうちでレゴ作品図鑑 🧱</p>
          <p className="text-slate-400">
            おうちのスマートフォンのアルバム・カメラ機能に対応しています。ブラウザの履歴を消さないかぎり長期保存されます。
          </p>
        </div>
      </footer>

    </div>
  );
}

interface GooglePhotoMediaItem {
  id: string;
  filename: string;
  baseUrl: string;
  mimeType: string;
}

function GooglePhotosPicker() {
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('google_photos_access_token');
  });
  const [photos, setPhotos] = useState<GooglePhotoMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  const googleClientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '';
  const searchParams = new URLSearchParams(window.location.search);
  const remainingCount = parseInt(searchParams.get('remaining') || '4', 10);

  const fetchPhotos = async (pageToken: string | null = null, append = false) => {
    if (!googleAccessToken) return;
    setLoading(true);
    setError(null);
    try {
      let url = 'https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=24';
      if (pageToken) {
        url += `&pageToken=${encodeURIComponent(pageToken)}`;
      }
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('google_photos_access_token');
          setGoogleAccessToken(null);
          throw new Error('ログインの期限が切れました。もう一度Googleアカウントに接続してください。🔑');
        }
        throw new Error('Googleフォトの写真の読み込みに失敗しました。😭 API設定やリダイレクト設定を確認してください。');
      }
      
      const data = await response.json();
      const items = data.mediaItems || [];
      if (append) {
        setPhotos(prev => [...prev, ...items]);
      } else {
        setPhotos(items);
      }
      setNextPageToken(data.nextPageToken || null);
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (googleAccessToken) {
      fetchPhotos();
    }
  }, [googleAccessToken]);

  const handleConnect = () => {
    if (!googleClientId) {
      return;
    }
    
    localStorage.setItem('google_picker_remaining', remainingCount.toString());

    const redirectUri = window.location.origin;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
      include_granted_scopes: 'true',
      state: 'google-photos',
      prompt: 'consent'
    }).toString();

    window.location.href = authUrl;
  };

  const handleDisconnect = () => {
    localStorage.removeItem('google_photos_access_token');
    setGoogleAccessToken(null);
    setPhotos([]);
  };

  const toggleSelectImage = (baseUrl: string) => {
    setSelectedImages(prev => {
      if (prev.includes(baseUrl)) {
        return prev.filter(url => url !== baseUrl);
      }
      if (prev.length >= remainingCount) {
        alert(`写真はレゴ作品に最大${remainingCount}枚までしか登録できないよ！😢`);
        return prev;
      }
      return [...prev, baseUrl];
    });
  };

  const handleConfirmSelection = () => {
    if (selectedImages.length === 0) {
      alert('写真をえらんでね！📸');
      return;
    }
    if (window.opener) {
      window.opener.postMessage({ type: 'GOOGLE_PHOTOS_PICKED', images: selectedImages }, window.location.origin);
      window.close();
    } else {
      alert('レゴ作品登録画面（メイン画面）が見つかりません。');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none text-slate-800">
      {/* Header */}
      <header className="bg-white border-b-4 border-slate-200 px-6 py-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md transform rotate-[-2deg] border-2 border-white">
            🧱
          </div>
          <div>
            <h1 className="text-lg font-black text-[#005596] leading-none mb-1">レゴ図鑑</h1>
            <p className="text-[10px] text-slate-400 font-bold">Google Photos Picker Accessory</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {googleAccessToken && (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black transition-colors flex items-center gap-1 cursor-pointer border border-rose-200"
            >
              <span>🧹 接続解除</span>
            </button>
          )}
          <button
            onClick={() => window.close()}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors cursor-pointer"
          >
            ❌
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
        {!googleAccessToken ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 max-w-md mx-auto w-full">
            {!googleClientId ? (
              // Beautiful credential helper
              <div className="bg-white p-6 rounded-3xl border-4 border-rose-400 shadow-xl space-y-4 text-center w-full">
                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
                  ⚙️
                </div>
                <h2 className="text-lg font-black text-slate-800">Googleフォト連携の設定が必要です</h2>
                
                <div className="text-left space-y-3.5 text-xs font-bold text-slate-600 leading-relaxed bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                  <p className="text-[11px] text-rose-800">
                    開発者メニュー（AI Studioの設定）から Google OAuth クライアントID を登録・設定してください。手順：
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-500">
                    <li>Google Cloud Consoleで認証情報を発行</li>
                    <li>リダイレクトURIに <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 text-[10px] break-all">{window.location.origin}</code> を登録</li>
                    <li>AI Studioの環境変数に <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 text-[10px]">VITE_GOOGLE_CLIENT_ID</code> を追加</li>
                  </ol>
                </div>
                
                <button
                  onClick={() => window.close()}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-3 px-6 rounded-2xl border-b-4 border-slate-300 transition-all text-xs cursor-pointer"
                >
                  とじる ❌
                </button>
              </div>
            ) : (
              // Polished connect banner
              <div className="bg-white p-8 rounded-3xl border-4 border-sky-400 shadow-xl space-y-6 text-center w-full">
                <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center mx-auto text-4xl">
                  ☁️
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#005596] mb-2">Googleフォトとつなぐ</h2>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed">
                    Googleフォトのアカウントとセキュアに接続し、レゴ図鑑に登録したい写真を直接えらぶことができるよ！✨
                  </p>
                </div>

                <button
                  onClick={handleConnect}
                  className="w-full bg-[#005596] hover:bg-[#00447a] text-white font-black py-4 px-6 rounded-2xl shadow-md border-b-4 border-[#00335c] transition-all text-sm flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
                >
                  <span>🌐 Googleフォトに接続する 🔑</span>
                </button>
                
                <p className="text-[10px] text-slate-400 font-medium">
                  ※閲覧の許可のみで、写真を変更・削除することは一切ありません。
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-sky-50 border-2 border-sky-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div>
                <h2 className="text-sm font-black text-[#005596] flex items-center gap-1">
                  <span>📸 写真えらび</span>
                </h2>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  レゴ作品に登録したい写真をえらんでね！ (あと <span className="text-[#005596] font-black text-sm">{remainingCount - selectedImages.length}</span> 枚えらべます)
                </p>
              </div>
              <div className="text-xs font-black text-slate-500 bg-white/80 border border-slate-200 px-3 py-1.5 rounded-xl shrink-0">
                選択中: <span className="text-[#005596] text-sm">{selectedImages.length}</span> / {remainingCount} 枚
              </div>
            </div>

            {loading && photos.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                <span className="text-4xl animate-spin">⏳</span>
                <span className="text-xs font-bold text-slate-400">写真を読み込んでいます...</span>
              </div>
            ) : error ? (
              <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-2xl text-center space-y-3">
                <p className="text-xs text-rose-700 font-bold">{error}</p>
                <button
                  onClick={() => fetchPhotos()}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-800 px-4 py-2 rounded-xl text-xs font-black cursor-pointer"
                >
                  やりなおす 🔄
                </button>
              </div>
            ) : photos.length === 0 ? (
              <div className="bg-white border-2 border-slate-200 p-12 rounded-3xl text-center space-y-2">
                <span className="text-4xl">📂</span>
                <p className="text-xs text-slate-500 font-bold">Googleフォトに写真が見つかりませんでした。</p>
              </div>
            ) : (
              <div className="space-y-6 flex-1 flex flex-col">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[480px] overflow-y-auto pr-1 p-1">
                  {photos.map((photo) => {
                    const isSelected = selectedImages.includes(photo.baseUrl);
                    const selectedIndex = selectedImages.indexOf(photo.baseUrl) + 1;
                    
                    return (
                      <div
                        key={photo.id}
                        onClick={() => toggleSelectImage(photo.baseUrl)}
                        className={`relative aspect-square rounded-2xl overflow-hidden border-3 cursor-pointer transition-all duration-200 group shadow-sm bg-white ${
                          isSelected 
                            ? 'border-yellow-400 ring-4 ring-yellow-200 scale-[0.98]' 
                            : 'border-slate-200 hover:border-[#005596] hover:scale-[1.02]'
                        }`}
                      >
                        <img
                          src={`${photo.baseUrl}=w250-h250-c`}
                          alt={photo.filename}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Selector Indicator */}
                        <div className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs border-2 shadow-sm transition-all duration-200 ${
                          isSelected 
                            ? 'bg-yellow-400 text-slate-800 border-white scale-110' 
                            : 'bg-black/20 text-transparent border-white/60 group-hover:bg-black/40'
                        }`}>
                          {isSelected ? selectedIndex : <Check className="w-4 h-4 stroke-[3px]" />}
                        </div>

                        {/* Hover Overlay */}
                        {!isSelected && (
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-white/95 text-[10px] font-black text-[#005596] px-2 py-1 rounded-lg shadow-xs">
                              えらぶ 👍
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {nextPageToken && (
                  <div className="text-center">
                    <button
                      onClick={() => fetchPhotos(nextPageToken, true)}
                      className="px-5 py-2.5 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer text-slate-600"
                    >
                      さらに読み込む ⏳
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Fixed Sticky Footer for Actions */}
      {googleAccessToken && photos.length > 0 && (
        <footer className="bg-white border-t-4 border-slate-200 px-6 py-4 sticky bottom-0 z-10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="text-xs font-bold text-slate-400">
            ※えらんだ写真は自動で安全なBase64コードに変換され、図鑑のしゃしん欄にコピーされます。
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            <button
              onClick={() => window.close()}
              className="flex-1 sm:flex-none px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl transition-all border-b-4 border-slate-300 text-xs cursor-pointer"
            >
              とじる ❌
            </button>
            <button
              onClick={handleConfirmSelection}
              disabled={selectedImages.length === 0}
              className={`flex-1 sm:flex-none px-8 py-3.5 font-black rounded-2xl text-xs transition-all flex items-center justify-center gap-2 border-b-4 ${
                selectedImages.length === 0 
                  ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed' 
                  : 'bg-yellow-400 hover:bg-yellow-300 text-slate-800 border-yellow-600 cursor-pointer shadow-md active:translate-y-0.5'
              }`}
            >
              <span>選択した写真を追加する ({selectedImages.length}枚) 📥✨</span>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
