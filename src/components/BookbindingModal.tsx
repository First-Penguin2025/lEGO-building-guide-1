import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { 
  X, 
  FileText, 
  Download, 
  Settings, 
  BookOpen, 
  Check, 
  HelpCircle, 
  Printer, 
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { LegoItem } from '../types';

interface BookbindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LegoItem[];
  builders: string[];
}

type BoundSize = 'a4' | 'b5' | 'a5';
type BindingGutter = 'none' | 'left' | 'alternate'; // Alternate is for double-sided print photobooks!

export function BookbindingModal({ isOpen, onClose, items, builders }: BookbindingModalProps) {
  const [selectedBuilderFilter, setSelectedBuilderFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState<BoundSize>('a4');
  const [gutterSize, setGutterSize] = useState<BindingGutter>('alternate');
  const [includeCover, setIncludeCover] = useState<boolean>(true);
  const [coverTitle, setCoverTitle] = useState<string>('ぼく・わたしのレゴ作品集');
  const [coverSubtitle, setCoverSubtitle] = useState<string>('〜 たいせつなレゴさくひんたちのきろく 〜');
  const [includePageNumbers, setIncludePageNumbers] = useState<boolean>(true);
  const [photobookLayout, setPhotobookLayout] = useState<'1-per-page' | '2-per-page'>('1-per-page');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [exportLog, setExportLog] = useState<string[]>([]);

  if (!isOpen) return null;

  // Filter items based on builder filter for the book
  const filteredItems = items.filter(item => {
    if (selectedBuilderFilter === 'all') return true;
    if (selectedBuilderFilter === 'none') return !item.builder;
    return item.builder === selectedBuilderFilter;
  });

  // Helper function to safely read image and convert it into canvas/clean-base64
  const getCleanBase64Image = (imgSrc: string): Promise<{ dataUrl: string, width: number, height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Prevent CORS taint
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          // Downscale slightly if too large to prevent massive PDF size
          const maxDim = 1200;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw standard white background to handle transparent PNGs nicely
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // Compress for optimal size
            resolve({ dataUrl, width: w, height: h });
          } else {
            resolve({ dataUrl: imgSrc, width: img.width, height: img.height });
          }
        } catch (e) {
          // If canvas paint fails (e.g., CORS), fallback to original src
          resolve({ dataUrl: imgSrc, width: img.width || 800, height: img.height || 600 });
        }
      };
      
      img.onerror = () => {
        // Fallback or skip
        resolve({ dataUrl: imgSrc, width: 800, height: 600 });
      };
      
      img.src = imgSrc;
    });
  };

  const handleExportPDF = async () => {
    if (filteredItems.length === 0) {
      alert('えらばれた ［つくり手］ の作品がありません。別の方をえらぶか、作品を追加してね！');
      return;
    }

    setIsExporting(true);
    setExportLog([]);
    setExportProgress('ブックデータの作成をはじめるよ！💨');

    const log = (msg: string) => {
      setExportLog(prev => [...prev, msg]);
    };

    try {
      // 1. Initialize jsPDF
      // standard letter/A4 is portrait. Let's do portrait!
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: pageSize === 'a4' ? 'a4' : pageSize === 'b5' ? 'b5' : 'a5'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      log(`📄 出力サイズ: ${pageSize.toUpperCase()} (${Math.round(pdfWidth)}mm × ${Math.round(pdfHeight)}mm)`);
      log(`📚 対象作品数: ${filteredItems.length}件`);

      let pageIdx = 1;

      // Draw helper function for clean font/title/memo text wrapped manually
      const drawWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number, lineSpacing: number = 5): number => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        lines.forEach((line: string, i: number) => {
          pdf.text(line, x, y + (i * lineSpacing));
        });
        return lines.length * lineSpacing;
      };

      // Helper to calculate gutters / margins per page for double-sided bookbinding layout
      const getPageMargins = (pageNum: number) => {
        const topMargin = 20;
        const bottomMargin = 20;
        let leftMargin = 15;
        let rightMargin = 15;

        if (gutterSize === 'left') {
          // Add 10mm binding gutter to the left side of every page
          leftMargin = 25;
        } else if (gutterSize === 'alternate') {
          // Odd pages have binding on left, Even pages have binding on right! (For actual photobook back-to-back binding!)
          if (pageNum % 2 !== 0) {
            leftMargin = 25; // Spine is on the left
            rightMargin = 15;
          } else {
            leftMargin = 15;
            rightMargin = 25; // Spine is on the right
          }
        }
        return { top: topMargin, bottom: bottomMargin, left: leftMargin, right: rightMargin };
      };

      // ----------------------------------------------------
      // PAGE 1: GORGEOUS COVER (If enabled)
      // ----------------------------------------------------
      if (includeCover) {
        setExportProgress('1 / 3: てんさい表紙ページを作っているよ...🎨');
        log('🎨 表紙（カバー）を作成中...');

        // Primary playful theme color (Lego Deep Blue representation)
        // Set fill color
        pdf.setFillColor(0, 85, 150); // Deep Blue #005596
        pdf.rect(0, 0, pdfWidth, pdfHeight * 0.45, 'F');

        // Draw cute lego blocks decorations on the cover
        pdf.setFillColor(255, 213, 0); // Yellow
        pdf.rect(15, 20, 18, 12, 'F');
        pdf.setFillColor(219, 48, 34); // Red
        pdf.rect(37, 20, 12, 12, 'F');
        pdf.setFillColor(34, 139, 34); // Green
        pdf.rect(53, 22, 16, 10, 'F');

        // White background cards details
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(26);
        
        // Output Cover title - wrapped nicely
        pdf.text(coverTitle, 20, pdfHeight * 0.28);
        
        pdf.setFontSize(11);
        pdf.text(coverSubtitle, 20, pdfHeight * 0.35);

        // Lower body area: Book statistics or a cute welcome box
        pdf.setTextColor(40, 50, 60);

        const borderOffset = 18;
        pdf.setDrawColor(200, 220, 240);
        pdf.setLineWidth(1);
        pdf.rect(borderOffset, pdfHeight * 0.5, pdfWidth - (borderOffset * 2), pdfHeight * 0.4, 'D');

        pdf.setFontSize(16);
        pdf.text('★ ごあいさつ ★', 25, pdfHeight * 0.56);
        
        pdf.setFontSize(10);
        const introText = 'これは、じぶんのてで作ったせかいでたったひとつの、レゴブロックさくひんたちをあつめた「オリジナル作品アルバム」です。ぼうけんのきろくが、ぎゅっとつまっています。いつまでも、たいせつにしようね！';
        drawWrappedText(introText, 25, pdfHeight * 0.62, pdfWidth - 55, 10, 5.5);

        // Print details
        pdf.setFillColor(245, 248, 252);
        pdf.rect(25, pdfHeight * 0.76, pdfWidth - 50, 20, 'F');
        pdf.setLineWidth(0.2);
        pdf.setDrawColor(220, 225, 235);
        pdf.rect(25, pdfHeight * 0.76, pdfWidth - 50, 20, 'D');

        pdf.setTextColor(80, 90, 100);
        pdf.setFontSize(9);
        const dateStr = `📅 サクヒン図鑑さくせい日: ${new Date().toLocaleDateString('ja-JP')}`;
        const builderStr = selectedBuilderFilter === 'all' 
          ? '👤 せいさくしゃ: みんなの作品' 
          : `👤 せいさくしゃ: ${selectedBuilderFilter}`;
        const countStr = `📸 登録されている作品数: ${filteredItems.length} 作品`;

        pdf.text(dateStr, 29, pdfHeight * 0.81);
        pdf.text(`${builderStr}  |  ${countStr}`, 29, pdfHeight * 0.86);

        // Cover page finished, increment page number for index page or body pages
        pageIdx++;
      }

      // ----------------------------------------------------
      // PAGE 2+: BODY PAGES WITH LEGO CREATIONS
      // ----------------------------------------------------
      const countTotal = filteredItems.length;
      log('📸 写真読み込み＆各ページのレンダリングを開始...');

      for (let i = 0; i < countTotal; i++) {
        const item = filteredItems[i];
        
        // Progress display
        const percent = Math.round(((i + 1) / countTotal) * 100);
        setExportProgress(`2 / 3: 作品「${item.name}」を印刷シートにかきこみ中 (${i + 1}/${countTotal} - ${percent}%)`);
        log(`🔹 ページ作成中 (${i + 1}/${countTotal}): ¹ ${item.name}`);

        // If not first page of the whole document, we add a new page
        if (i > 0 || includeCover) {
          pdf.addPage();
        }

        const margins = getPageMargins(pageIdx);
        const printW = pdfWidth - margins.left - margins.right;
        const printH = pdfHeight - margins.top - margins.bottom;

        // Draw nice page background/border frame
        pdf.setFillColor(252, 253, 255);
        pdf.rect(margins.left, margins.top, printW, printH, 'F');
        pdf.setDrawColor(218, 225, 235);
        pdf.setLineWidth(0.5);
        pdf.rect(margins.left, margins.top, printW, printH, 'D');

        // Draw outer trim/bleed line (just a small dotted guideline for bookbinding cutting)
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineDashPattern([1, 2], 0);
        pdf.rect(5, 5, pdfWidth - 10, pdfHeight - 10, 'D');
        pdf.setLineDashPattern([], 0); // Reset

        // 1. Page Header Info
        pdf.setTextColor(100, 110, 120);
        pdf.setFontSize(8);
        pdf.text('レゴさくひん記録アルバム', margins.left + 5, margins.top + 7);
        pdf.text(`つくり手: ${item.builder || 'みんな'}`, margins.left + printW - 35, margins.top + 7);

        // Divider
        pdf.setDrawColor(225, 230, 240);
        pdf.setLineWidth(0.3);
        pdf.line(margins.left + 5, margins.top + 10, margins.left + printW - 5, margins.top + 10);

        // 2. Creation Title Block
        pdf.setTextColor(0, 85, 150); // #005596 (Lego Blue)
        pdf.setFontSize(16);
        // Clean display title
        pdf.text(`✨ ${item.name}`, margins.left + 8, margins.top + 18);

        // Sub attributes (Date + Rating as Stars!)
        const stars = '★'.repeat(item.rating || 5) + '☆'.repeat(5 - (item.rating || 5));
        pdf.setTextColor(110, 120, 130);
        pdf.setFontSize(9);
        pdf.text(`完成日: ${item.date}    |    お気に入り: ${stars}`, margins.left + 8, margins.top + 24);

        // 3. Render Images cleanly
        // How many images do we have?
        const creationImages = Array.isArray(item.images) && item.images.length > 0
          ? item.images
          : item.image ? [item.image] : [];

        // Image container coordinates
        const imgStartY = margins.top + 28;
        const availableImgH = printH - 58; // reserve bottom space for notes/memo
        
        if (creationImages.length === 0) {
          // No image placeholder
          pdf.setFillColor(240, 243, 247);
          pdf.rect(margins.left + 8, imgStartY, printW - 16, availableImgH, 'F');
          pdf.setTextColor(150, 160, 170);
          pdf.setFontSize(10);
          pdf.text('（しゃしんは登録されていません）', margins.left + printW/2 - 25, imgStartY + availableImgH/2);
        } else if (creationImages.length === 1) {
          // 1 Single Beautiful Large Image fits perfectly
          const imageObj = await getCleanBase64Image(creationImages[0]);
          
          // Calculate max bounding size while preserving aspect ratio
          const maxW = printW - 16;
          const maxH = availableImgH;
          const ratio = imageObj.width / imageObj.height;
          
          let paintW = maxW;
          let paintH = maxW / ratio;
          if (paintH > maxH) {
            paintH = maxH;
            paintW = maxH * ratio;
          }

          // Center image horizontally in the slot
          const paintX = margins.left + 8 + (maxW - paintW) / 2;
          const paintY = imgStartY + (maxH - paintH) / 2;

          // Draw image
          try {
            pdf.addImage(imageObj.dataUrl, 'JPEG', paintX, paintY, paintW, paintH);
            // Draw neat picture border
            pdf.setDrawColor(200, 210, 220);
            pdf.setLineWidth(0.4);
            pdf.rect(paintX, paintY, paintW, paintH, 'D');
          } catch (err) {
            log(`⚠️ 「${item.name}」の画像読み込みエラー: 代替プレースホルダーを描画します`);
            pdf.setFillColor(245, 245, 245);
            pdf.rect(paintX, paintY, paintW, paintH, 'F');
            pdf.text('画像データを読み込めませんでした', paintX + 10, paintY + paintH/2);
          }
        } else if (creationImages.length === 2) {
          // 2 Images layout - Side by Side or Top / Down depending on space
          const maxSingleW = (printW - 20) / 2;
          const maxSingleH = availableImgH;

          for (let imgIdx = 0; imgIdx < 2; imgIdx++) {
            const imageObj = await getCleanBase64Image(creationImages[imgIdx]);
            const ratio = imageObj.width / imageObj.height;
            
            let paintW = maxSingleW;
            let paintH = maxSingleW / ratio;
            if (paintH > maxSingleH) {
              paintH = maxSingleH;
              paintW = maxSingleH * ratio;
            }

            const slotStartX = margins.left + 8 + imgIdx * (maxSingleW + 4);
            const paintX = slotStartX + (maxSingleW - paintW) / 2;
            const paintY = imgStartY + (maxSingleH - paintH) / 2;

            try {
              pdf.addImage(imageObj.dataUrl, 'JPEG', paintX, paintY, paintW, paintH);
              pdf.setDrawColor(200, 210, 220);
              pdf.setLineWidth(0.4);
              pdf.rect(paintX, paintY, paintW, paintH, 'D');
            } catch (err) {
              pdf.setFillColor(245, 245, 245);
              pdf.rect(slotStartX, imgStartY, maxSingleW, maxSingleH, 'F');
            }
          }
        } else {
          // 3 or 4 Images: 2x2 grid layout
          const colW = (printW - 20) / 2;
          const rowH = (availableImgH - 6) / 2;

          for (let imgIdx = 0; imgIdx < Math.min(creationImages.length, 4); imgIdx++) {
            const col = imgIdx % 2;
            const row = Math.floor(imgIdx / 2);

            const imageObj = await getCleanBase64Image(creationImages[imgIdx]);
            const ratio = imageObj.width / imageObj.height;

            let paintW = colW;
            let paintH = colW / ratio;
            if (paintH > rowH) {
              paintH = rowH;
              paintW = rowH * ratio;
            }

            const slotStartX = margins.left + 8 + col * (colW + 4);
            const slotStartY = imgStartY + row * (rowH + 4);

            const paintX = slotStartX + (colW - paintW) / 2;
            const paintY = slotStartY + (rowH - paintH) / 2;

            try {
              pdf.addImage(imageObj.dataUrl, 'JPEG', paintX, paintY, paintW, paintH);
              pdf.setDrawColor(200, 210, 220);
              pdf.setLineWidth(0.4);
              pdf.rect(paintX, paintY, paintW, paintH, 'D');
            } catch (err) {
              pdf.setFillColor(245, 245, 245);
              pdf.rect(slotStartX, slotStartY, colW, rowH, 'F');
            }
          }
        }

        // 4. Memo / Text Area at the bottom
        const memoY = margins.top + printH - 26;
        pdf.setFillColor(248, 250, 254);
        pdf.rect(margins.left + 8, memoY, printW - 16, 20, 'F');
        pdf.setDrawColor(218, 225, 235);
        pdf.setLineWidth(0.3);
        pdf.rect(margins.left + 8, memoY, printW - 16, 20, 'D');

        // Draw small pencil icon representation
        pdf.setTextColor(0, 85, 150);
        pdf.setFontSize(8);
        pdf.text('✏️ おすすめポイント / メモ:', margins.left + 12, memoY + 5.5);

        // Memo content
        pdf.setTextColor(60, 70, 80);
        pdf.setFontSize(8.5);
        const memoText = item.memo || '特になし（まいにち楽しく作りました！）🌟';
        drawWrappedText(memoText, margins.left + 12, memoY + 11, printW - 24, 8.5, 4);

        // 5. Page Number (Nombre) at the bottom
        if (includePageNumbers) {
          pdf.setTextColor(140, 150, 160);
          pdf.setFontSize(8);
          // Left-right alternating page digits or centered
          if (gutterSize === 'alternate') {
            if (pageIdx % 2 !== 0) {
              // Right side for odd page
              pdf.text(`- ${pageIdx} -`, margins.left + printW - 12, margins.top + printH - 2);
            } else {
              // Left side for even page
              pdf.text(`- ${pageIdx} -`, margins.left + 4, margins.top + printH - 2);
            }
          } else {
            // Centered
            pdf.text(`- ${pageIdx} -`, margins.left + printW/2 - 4, margins.top + printH - 2);
          }
        }

        pageIdx++;
      }

      // ----------------------------------------------------
      // PAGE FINAL: CONCLUDING BACK COVER
      // ----------------------------------------------------
      setExportProgress('3 / 3: 裏表紙をつけて製本用データを書き出しています...💾');
      log('💖 裏表紙（バックカバー）を合成中...');
      pdf.addPage();
      
      const lastMargins = getPageMargins(pageIdx);
      
      // Fun branding background
      pdf.setFillColor(0, 85, 150); // Deep Lego Blue
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.text('Thank you for Building!', pdfWidth/2 - 32, pdfHeight * 0.42);

      // Cute message
      pdf.setFontSize(9);
      pdf.text('レゴの世界は、きみのイマジネーションと同じくらい無限大だよ！', pdfWidth/2 - 46, pdfHeight * 0.48);
      pdf.text('これからもすてきなさくひんをたくさん作ろうね。', pdfWidth/2 - 34, pdfHeight * 0.52);

      // Studio build logo stamp
      pdf.setFillColor(255, 213, 0); // Yellow lego badge
      pdf.rect(pdfWidth/2 - 15, pdfHeight * 0.65, 30, 12, 'F');
      pdf.setTextColor(0, 85, 150);
      pdf.setFontSize(10);
      pdf.text('LEGO ALBUM', pdfWidth/2 - 11, pdfHeight * 0.72);

      // 4. Download Trigger
      log('💾 PDFファイルをブラウザに送信します！');
      const filename = `lego-album_${selectedBuilderFilter === 'all' ? 'everyone' : selectedBuilderFilter}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      
      log(`🎉 すばらしい！「${filename}」のダウンロードが完了したよ！`);
      setExportProgress('done');
    } catch (err: any) {
      log(`❌ PDFの生成中にエラーがおきました: ${err.message || err}`);
      console.error(err);
      setExportProgress('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full border-4 border-sky-500 shadow-2xl overflow-hidden flex flex-col my-8 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#005596] text-white p-6 relative flex items-center justify-between border-b-4 border-yellow-400">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📚</span>
            <div>
              <h3 className="text-xl font-black text-yellow-300 tracking-wide">製本用 PDF データ出力</h3>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                お気に入りレゴ作品の一覧を、すぐに印刷・フォトブックにできる本格PDFとして出力するよ！
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          
          {/* Main Info */}
          <div className="p-4 bg-sky-50 rounded-2xl border border-dashed border-sky-200 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#ffd500] fill-[#ffd500] shrink-0 mt-0.5" />
            <div className="text-xs text-[#005596] font-bold leading-relaxed">
              <strong>【製本のためのこだわり設計】</strong><br />
              印刷の際に本をとじるための<strong>「綴じ代マージン（のど）」</strong>、奇数・偶数ページでの<strong>左右交互マージン（ノンブル配置も最適化）</strong>を全自動で計算して美しくレイアウトします！そのままコンビニや入稿サービスで印刷して絵本にできるよ！🎨📖
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: Config */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-700 flex items-center gap-1">
                <Settings className="w-4 h-4 text-slate-500" />
                <span>アルバムの基本設定</span>
              </h4>

              {/* Builder Print Filter */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 mb-1">
                  👤 出力するつくり手（せいさくしゃ）
                </label>
                <select
                  value={selectedBuilderFilter}
                  onChange={(e) => setSelectedBuilderFilter(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#005596] focus:outline-none"
                >
                  <option value="all">📁 すべての人の作品をまとめる ({items.length}件)</option>
                  <option value="none">❔ つくり手未設定のみ ({items.filter(x => !x.builder).length}件)</option>
                  {builders.map(b => (
                    <option key={b} value={b}>👤 {b} の作品集 ({items.filter(x => x.builder === b).length}件)</option>
                  ))}
                </select>
              </div>

              {/* Cover settings */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeCover}
                    onChange={(e) => setIncludeCover(e.target.checked)}
                    className="w-4 h-4 text-[#005596] focus:ring-[#005596] rounded border-slate-300"
                  />
                  <span className="text-[11px] font-black text-slate-700">📒 表紙（カバー）をつくる</span>
                </label>

                {includeCover && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-dashed border-slate-200 pl-1">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 mb-1">表紙のタイトル</span>
                      <input
                        type="text"
                        value={coverTitle}
                        onChange={(e) => setCoverTitle(e.target.value)}
                        placeholder="例: たろうのレゴ大冒険"
                        className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:border-[#005596] outline-none"
                      />
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 mb-1">表紙のサブタイトル</span>
                      <input
                        type="text"
                        value={coverSubtitle}
                        onChange={(e) => setCoverSubtitle(e.target.value)}
                        placeholder="例: たいせつなきろく"
                        className="w-full text-[10px] font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:border-[#005596] outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Page Number Toggle */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includePageNumbers}
                    onChange={(e) => setIncludePageNumbers(e.target.checked)}
                    className="w-4 h-4 text-[#005596] focus:ring-[#005596] rounded border-slate-300"
                  />
                  <span className="text-[11px] font-black text-slate-700">🔢 ノンブル（ページ番号）を入れる</span>
                </label>
              </div>
            </div>

            {/* Right Column: Binding Layout options */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-700 flex items-center gap-1">
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>印刷・製本オプション</span>
              </h4>

              {/* Page size helper */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 mb-1">
                  📐 出力用紙サイズ
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['a4', 'b5', 'a5'] as BoundSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPageSize(size)}
                      className={`py-2 text-[10px] font-black rounded-xl border-2 transition-all cursor-pointer text-center ${
                        pageSize === size 
                          ? 'border-[#005596] bg-[#005596] text-white shadow-sm' 
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {size.toUpperCase()}用紙
                    </button>
                  ))}
                </div>
              </div>

              {/* Binding margins layout */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 mb-1">
                  📖 綴じ代マージン設定（のど幅）
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setGutterSize('alternate')}
                    className={`w-full p-3 text-left rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      gutterSize === 'alternate'
                        ? 'border-[#005596] bg-blue-50/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-black block text-slate-800">📖 左右交互マージン（本格両面製本用）</span>
                      <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">奇数ページは左のど、偶数ページは右のどに自動綴じ代をとります</span>
                    </div>
                    {gutterSize === 'alternate' && <Check className="w-4 h-4 text-[#005596]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setGutterSize('left')}
                    className={`w-full p-3 text-left rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      gutterSize === 'left'
                        ? 'border-[#005596] bg-blue-50/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-black block text-slate-800">🖇️ 全ページ等幅左綴じ用</span>
                      <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">ルーズリーフやクリップ留めなど、すべての左端に25mmの綴じ代を確保します</span>
                    </div>
                    {gutterSize === 'left' && <Check className="w-4 h-4 text-[#005596]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setGutterSize('none')}
                    className={`w-full p-3 text-left rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      gutterSize === 'none'
                        ? 'border-[#005596] bg-blue-50/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-black block text-slate-800">📄 マージンなし（標準スライドショー印刷）</span>
                      <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">綴じ代なしで均一に配置します（1ページずつのPDF閲覧に最適です）</span>
                    </div>
                    {gutterSize === 'none' && <Check className="w-4 h-4 text-[#005596]" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Exporting Log and progress state */}
          {isExporting && (
            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl border-2 border-slate-700 font-mono text-xs space-y-2 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between text-[#ffd500] font-bold border-b border-slate-700 pb-1.5">
                <span>⚡️ PDFレンダリングステータス</span>
                <span className="animate-pulse">{exportProgress === 'done' ? '✅ 完了' : '⏳ 処理中...'}</span>
              </div>
              <p className="text-[#00ffd5] font-black">{exportProgress === 'done' ? 'ダウンロードがはじまりました！✨' : exportProgress}</p>
              
              <div className="space-y-1 text-[10px] text-slate-300">
                {exportLog.map((logStr, lIdx) => (
                  <div key={lIdx} className="leading-5">➔ {logStr}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t-2 border-slate-100">
          <div className="text-left">
            <span className="text-xs text-slate-400 font-bold block mb-0.5">※ 画像数や通信状態により完了まで数秒かかる場合があります</span>
            <span className="text-[10px] font-black text-slate-500 bg-slate-200 px-2.5 py-1 rounded-md">
              対象: {filteredItems.length} 作品 / 印刷ページ数: {filteredItems.length + (includeCover ? 2 : 1)} ページ
            </span>
          </div>

          <div className="flex w-full sm:w-auto items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting && exportProgress !== 'done' && exportProgress !== 'error'}
              className="flex-1 sm:flex-none py-3 px-5 text-xs font-black text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer"
            >
              もどる
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={filteredItems.length === 0 || (isExporting && exportProgress !== 'done' && exportProgress !== 'error')}
              className="flex-1 sm:flex-none bg-[#005596] hover:bg-[#00447a] text-white py-3.5 px-6 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md border-b-4 border-[#00335c] active:translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Printer className="w-4 h-4" />
              <span>製本用 PDF データをダウンロード ⚡️</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
