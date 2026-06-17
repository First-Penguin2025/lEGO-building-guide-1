import { LegoItem } from '../types';

export function generateSingleHTML(items: LegoItem[]): string {
  const serializedItems = JSON.stringify(items);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>レゴ作品図鑑</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Noto Sans JP', 'Inter', sans-serif;
      background-color: #fcfcfc;
    }
    .lego-yellow-shadow {
      box-shadow: 0 4px 0 0 #ccaa00;
    }
    .lego-yellow-shadow:active {
      transform: translateY(2px);
      box-shadow: 0 2px 0 0 #ccaa00;
    }
    /* Simple custom scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    ::-webkit-scrollbar-thumb {
      background: #ffd500;
      border-radius: 4px;
    }
  </style>
</head>
<body class="text-slate-800 bg-slate-50 min-h-screen">

  <!-- Header -->
  <header class="bg-[#005596] text-white py-6 px-4 shadow-lg border-b-4 border-[#ffd500]">
    <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <!-- Playful Lego icon style -->
        <div class="bg-[#ffd500] text-[#005596] w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl shadow-inner border-2 border-white select-none">
          凸
        </div>
        <div>
          <h1 class="text-2xl sm:text-3xl font-black tracking-wider text-[#ffd500] drop-shadow-sm">
            レゴ作品図鑑
          </h1>
          <p class="text-xs text-blue-100 font-medium">お気に入りのレゴをつみあげて、じぶんだけの図鑑をつくろう！</p>
        </div>
      </div>
      <span class="text-xs bg-yellow-400 text-slate-900 px-3 py-1 rounded-full font-bold shadow-md">
        おうち保存対応 🏠
      </span>
    </div>
  </header>

  <!-- Quick Navigation Panel -->
  <div class="bg-white border-b-2 border-slate-200 py-3 px-4 shadow-sm sticky top-0 z-40">
    <div class="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[#005596] font-black text-xs">かんたんナビ 🚀 :</span>
        <button
          onclick="document.getElementById('section-register').scrollIntoView({ behavior: 'smooth' })"
          class="text-xs font-bold bg-[#005596] hover:bg-[#00447a] text-white px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border-b-2 border-blue-900"
        >
          <span>🔨</span>
          <span>さくひん登録（とうろく）</span>
        </button>
        <button
          onclick="showAllAndScrollToGallery()"
          class="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border-b-2 border-amber-700"
        >
          <span>📖</span>
          <span>ずかんコレクションを見る (<span id="nav-items-count">0</span>件) 🔎</span>
        </button>
      </div>
      <div class="text-[11px] text-slate-500 font-bold flex items-center gap-1">
        <span>💡</span>
        <span>登録すると、すぐに自動で追加されるよ！</span>
      </div>
    </div>
  </div>

  <main class="max-w-4xl mx-auto px-4 py-8">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
      
      <!-- Left Column: Form -->
      <section id="section-register" class="md:col-span-5 bg-white p-6 rounded-2xl border-4 border-[#005596] shadow-xl relative overflow-hidden scroll-mt-20">
        <div class="absolute top-2 right-2 flex gap-1 opacity-20">
          <div class="w-3 h-3 bg-[#005596] rounded-full"></div>
          <div class="w-3 h-3 bg-[#ffd500] rounded-full"></div>
        </div>

        <h2 class="text-xl font-extrabold text-[#005596] mb-5 pb-2 border-b-2 border-dashed border-slate-200 flex items-center gap-2">
          🔨 あたらしいさくひん
        </h2>

        <form id="lego-form" onsubmit="registerItem(event)" class="space-y-5">
          <!-- Name Input -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">さくひんの名前 <span class="text-red-500 font-normal text-xs">*必須</span></label>
            <input type="text" id="name-input" required placeholder="例: かっこいいスーパーカー" 
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#005596] focus:ring-2 focus:ring-blue-100 transition-colors text-base font-bold">
          </div>

          <!-- Date Input -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">作った日 <span class="text-red-500 font-normal text-xs">*必須</span></label>
            <input type="date" id="date-input" required 
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#005596] text-base font-bold">
          </div>

          <!-- Rating Input (お気に入り度) -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">お気に入り度 <span class="text-red-500 font-normal text-xs">*必須</span></label>
            <div class="flex items-center gap-1 bg-slate-50 border-2 border-slate-200 p-2.5 rounded-xl">
              <div class="flex gap-1.5" id="star-input-container">
                <button type="button" onclick="setHtmlRating(1)" class="text-2xl transition-transform hover:scale-125 focus:outline-none select-none cursor-pointer" id="star-btn-1">⭐️</button>
                <button type="button" onclick="setHtmlRating(2)" class="text-2xl transition-transform hover:scale-125 focus:outline-none select-none cursor-pointer" id="star-btn-2">⭐️</button>
                <button type="button" onclick="setHtmlRating(3)" class="text-2xl transition-transform hover:scale-125 focus:outline-none select-none cursor-pointer" id="star-btn-3">⭐️</button>
                <button type="button" onclick="setHtmlRating(4)" class="text-2xl transition-transform hover:scale-125 focus:outline-none select-none cursor-pointer" id="star-btn-4">⭐️</button>
                <button type="button" onclick="setHtmlRating(5)" class="text-2xl transition-transform hover:scale-125 focus:outline-none select-none cursor-pointer" id="star-btn-5">⭐️</button>
              </div>
              <span id="star-text" class="text-xs font-bold text-slate-500 ml-2">星 5 個のお気に入り！</span>
            </div>
            <input type="hidden" id="rating-input" value="5">
          </div>

          <!-- Image Select Trigger -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">しゃしん <span class="text-red-500 font-normal text-xs">*必須</span></label>
            <input type="file" id="image-file" accept="image/*" class="hidden" onchange="previewSelectedImage(event)">
            
            <button type="button" onclick="document.getElementById('image-file').click()" 
              class="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-[#005596] hover:bg-slate-50 transition-colors group cursor-pointer text-slate-500">
              <span class="text-3xl group-hover:scale-110 transition-transform">📸</span>
              <span class="text-sm font-bold">写真をとる・えらぶ</span>
              <span class="text-[10px] text-slate-400">アルバムやカメラから画像を選べます</span>
            </button>

            <!-- Preview image section -->
            <div id="file-preview-area" class="hidden mt-3 relative rounded-xl overflow-hidden border-2 border-slate-200 aspect-square">
              <img id="image-preview" src="" class="w-full h-full object-cover" alt="Preview">
              <button type="button" onclick="clearSelectedImage()" 
                class="absolute top-2 right-2 bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold hover:bg-black/80 transition-colors">
                ✕
              </button>
            </div>
          </div>

          <!-- Register button -->
          <button type="submit" 
            class="w-full bg-[#ffd500] hover:bg-[#ffe033] text-slate-900 font-black py-4 px-6 rounded-2xl border-b-4 border-yellow-700 shadow-md lego-yellow-shadow transition-transform active:translate-y-1 flex items-center justify-center gap-2 text-lg">
            ✨ 図鑑に登録する
          </button>
        </form>
      </section>

      <!-- Right Column: List -->
      <section id="section-gallery" class="md:col-span-7 space-y-6 scroll-mt-20">
        
        <!-- Search & Sorting -->
        <div class="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-md space-y-3">
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">🔍</span>
            <input type="text" id="search-input" oninput="filterGalleries()" placeholder="なまえ でさがす..." 
              class="w-full pl-10 pr-4 py-2 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-[#005596] text-sm font-bold bg-slate-50/50">
          </div>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <span class="text-xs font-bold text-slate-500 flex items-center gap-1">
              <span>🔄</span> ならびかえ（ならび順）:
            </span>
            <select id="sort-select" onchange="filterGalleries()" class="appearance-none bg-slate-50 border-2 border-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#005596] cursor-pointer">
              <option value="newest">📅 つくった日が新しい順</option>
              <option value="oldest">📅 つくった日が古い順</option>
              <option value="rating">⭐️ お気に入り度が高い順</option>
              <option value="name">🔤 名前（50音）順</option>
            </select>
          </div>
        </div>

        <!-- Catalog Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
          <h3 class="text-xl font-bold text-slate-800 flex items-center gap-1.5">
            📖 作品コレクション
            <span id="items-count" class="text-sm bg-blue-100 text-[#005596] px-2.5 py-0.5 rounded-full font-black">0</span>
          </h3>
          <div id="bulk-toggle-container" class="hidden">
            <button
              id="btn-toggle-select"
              onclick="toggleSelectMode()"
              class="text-xs font-bold bg-[#ffd500]/15 border border-[#ffd500] text-slate-800 px-3 py-1.5 rounded-xl hover:bg-[#ffd500]/25 cursor-pointer active:translate-y-0.5"
            >
              🗑️ まとめて消す (複数選択)
            </button>
          </div>
        </div>

        <!-- Bulk Select Control Banner -->
        <div id="bulk-select-banner" class="hidden bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
          <div class="flex items-center gap-2">
            <span id="bulk-selected-count" class="text-xs font-black bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center">0</span>
            <span class="text-xs font-black text-blue-900">個（こ）のしゃしんを選んでいます</span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onclick="selectAllHtml()"
              class="text-[11px] font-bold bg-white border border-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              id="btn-select-all-html"
            >
              ✅ ぜんぶ選ぶ (全選択)
            </button>
            <button
              type="button"
              id="btn-bulk-delete-html"
              onclick="bulkDeleteHtml()"
              class="text-xs font-black bg-slate-200 border-b-2 border-slate-300 text-slate-400 px-4 py-1.5 rounded-xl cursor-not-allowed"
              disabled
            >
              🗑️ まとめて削除 (0枚)
            </button>
          </div>
        </div>

        <!-- Empty state placeholder -->
        <div id="empty-placeholder" class="bg-white py-12 px-6 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-400">
          <div class="text-5xl mb-3">🧩</div>
          <p class="font-bold text-slate-500 text-lg">まだ作品が登録されていません</p>
          <p class="text-xs text-slate-400 mt-1">左のフォームからかっこいいレゴ作品を登録しよう！</p>
        </div>

        <!-- Tiled Grid -->
        <div id="lego-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        </div>
      </section>

    </div>
  </main>

  <!-- Lightbox Modal -->
  <div id="lightbox-modal" class="fixed inset-0 bg-slate-950/90 hidden items-center justify-center p-4 z-50 transition-opacity duration-300" onclick="closeLightbox()">
    <div class="bg-white rounded-2xl max-w-lg w-full overflow-hidden border-4 border-[#005596] shadow-2xl relative" onclick="event.stopPropagation()">
      <button onclick="closeLightbox()" class="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold transition-colors z-10">
        ✕
      </button>
      
      <div class="aspect-4/3 w-full bg-slate-100 relative">
        <img id="lightbox-img" src="" class="w-full h-full object-contain" alt="Large view">
      </div>
      
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <span id="lightbox-date" class="text-xs text-slate-400 font-bold"></span>
        </div>
        <div>
          <h4 id="lightbox-name" class="text-2xl font-black text-slate-900 leading-snug"></h4>
          <!-- Stars container -->
          <div id="lightbox-stars-container" class="flex items-center gap-1 mt-1 text-sm bg-amber-50/50 border border-amber-200/50 py-1 px-3 rounded-xl w-fit select-none">
            <span class="text-xs font-bold text-amber-700">お気に入り度:</span>
            <span id="lightbox-stars" class="text-amber-400"></span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Custom Dialog Modal (Alert / Confirm) -->
  <div id="html-custom-dialog" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs hidden items-center justify-center p-4 z-50 animate-fade-in" onclick="closeHtmlDialog()">
    <div class="bg-white rounded-3xl max-w-sm w-full overflow-hidden border-4 border-[#ffd500] shadow-2xl relative p-6 flex flex-col items-center text-center space-y-4" onclick="event.stopPropagation()">
      
      <!-- Icon -->
      <div id="html-dialog-icon" class="w-16 h-16 rounded-2xl bg-[#ffd500]/15 flex items-center justify-center text-3xl select-none">
        💡
      </div>

      <div class="space-y-1">
        <h4 id="html-dialog-title" class="text-lg font-black text-slate-800">かくにん</h4>
        <p id="html-dialog-message" class="text-sm font-bold text-slate-500 leading-relaxed whitespace-pre-line"></p>
      </div>

      <!-- Action buttons -->
      <div id="html-dialog-actions" class="flex gap-2 w-full pt-2">
        <!-- Dynamically filled -->
      </div>
    </div>
  </div>

  <footer class="text-center py-8 text-xs text-slate-400 border-t border-slate-100 mt-12">
    <p>© レゴ作品図鑑 - おうちのブラウザだけで動くよ</p>
  </footer>

  <script>
    let legoItems = [];
    let base64ImageString = "";
    let currentRating = 5;
    let isSelectMode = false;
    let selectedIds = [];

    const defaultData = ${serializedItems};

    function init() {
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('date-input').value = today;

      const saved = localStorage.getItem('lego_creations_v3_clean');
      if (saved) {
        try {
          legoItems = JSON.parse(saved);
        } catch(e) {
          legoItems = defaultData;
        }
      } else {
        legoItems = defaultData;
        saveToLocalStorage();
      }

      renderGallery();
    }

    function saveToLocalStorage() {
      localStorage.setItem('lego_creations_v3_clean', JSON.stringify(legoItems));
    }

    function setHtmlRating(val) {
      currentRating = val;
      document.getElementById('rating-input').value = val;
      for (let i = 1; i <= 5; i++) {
        const btn = document.getElementById('star-btn-' + i);
        if (btn) {
          btn.innerText = i <= val ? '⭐️' : '☆';
        }
      }
      document.getElementById('star-text').innerText = "星 " + val + " 個のお気に入り！";
    }

    function previewSelectedImage(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        base64ImageString = e.target.result;
        document.getElementById('image-preview').src = base64ImageString;
        document.getElementById('file-preview-area').classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }

    function clearSelectedImage() {
      document.getElementById('image-file').value = "";
      base64ImageString = "";
      document.getElementById('image-preview').src = "";
      document.getElementById('file-preview-area').classList.add('hidden');
    }

    function registerItem(event) {
      event.preventDefault();

      const name = document.getElementById('name-input').value.trim();
      const date = document.getElementById('date-input').value;
      const rating = parseInt(document.getElementById('rating-input').value, 10) || 5;

      if (!name || !date) {
        showHtmlAlert("名前、日付を入力してください！");
        return;
      }

      if (!base64ImageString) {
        showHtmlAlert("しゃしんを選んでから登録してください！📸");
        return;
      }

      const newItem = {
        id: 'lego_' + Date.now(),
        name: name,
        date: date,
        image: base64ImageString,
        rating: rating
      };

      legoItems.unshift(newItem);
      saveToLocalStorage();

      document.getElementById('lego-form').reset();
      clearSelectedImage();
      setHtmlRating(5); // Reset stars to 5

      const today = new Date().toISOString().split('T')[0];
      document.getElementById('date-input').value = today;

      renderGallery();
      showHtmlAlert("✨ 「 " + name + " 」をずかんに登録したよ！やったね！");
    }

    function toggleSelectMode() {
      isSelectMode = !isSelectMode;
      selectedIds = [];
      const btn = document.getElementById('btn-toggle-select');
      const banner = document.getElementById('bulk-select-banner');
      
      if (isSelectMode) {
        btn.innerText = '選択をやめる ✕';
        btn.className = 'text-xs font-bold bg-rose-50 border border-rose-300 text-rose-700 px-3 py-1.5 rounded-xl hover:bg-rose-100 cursor-pointer';
        banner.style.display = 'flex';
      } else {
        btn.innerText = '🗑️ まとめて消す (複数選択)';
        btn.className = 'text-xs font-bold bg-[#ffd500]/15 border border-[#ffd500] text-slate-800 px-3 py-1.5 rounded-xl hover:bg-[#ffd500]/25 cursor-pointer active:translate-y-0.5';
        banner.style.display = 'none';
      }
      updateBulkUi();
      renderGallery();
    }

    function toggleSelectItem(id) {
      const idx = selectedIds.indexOf(id);
      if (idx > -1) {
        selectedIds.splice(idx, 1);
      } else {
        selectedIds.push(id);
      }
      updateBulkUi();
      renderGallery();
    }

    function selectAllHtml() {
      const searchVal = document.getElementById('search-input').value.toLowerCase().trim();
      const filtered = legoItems.filter(item => item.name.toLowerCase().includes(searchVal));
      const filteredIds = filtered.map(item => item.id);
      
      const allSelected = filteredIds.every(id => selectedIds.includes(id));
      if (allSelected) {
        selectedIds = selectedIds.filter(id => !filteredIds.includes(id));
      } else {
        selectedIds = Array.from(new Set([...selectedIds, ...filteredIds]));
      }
      updateBulkUi();
      renderGallery();
    }

    function updateBulkUi() {
      const countEl = document.getElementById('bulk-selected-count');
      if (!countEl) return;
      
      countEl.innerText = selectedIds.length;
      const btnDelete = document.getElementById('btn-bulk-delete-html');
      btnDelete.innerText = '🗑️ まとめて削除 (' + selectedIds.length + '枚)';
      if (selectedIds.length === 0) {
        btnDelete.disabled = true;
        btnDelete.className = 'text-xs font-black bg-slate-200 border-b-2 border-slate-300 text-slate-400 px-4 py-1.5 rounded-xl cursor-not-allowed';
      } else {
        btnDelete.disabled = false;
        btnDelete.className = 'text-xs font-black bg-rose-500 hover:bg-rose-600 border-b-2 border-rose-700 text-white px-4 py-1.5 rounded-xl cursor-pointer';
      }

      const searchVal = document.getElementById('search-input').value.toLowerCase().trim();
      const filtered = legoItems.filter(item => item.name.toLowerCase().includes(searchVal));
      const filteredIds = filtered.map(item => item.id);
      const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
      document.getElementById('btn-select-all-html').innerText = allSelected ? '🧹 選択（せんたく）をはずす' : '✅ ぜんぶ選ぶ (全選択)';
    }

    let htmlDialogCallback = null;

    function showHtmlAlert(message, title = 'お知らせ') {
      document.getElementById('html-dialog-icon').innerText = '💡';
      document.getElementById('html-dialog-title').innerText = title;
      document.getElementById('html-dialog-message').innerText = message;
      
      const actions = document.getElementById('html-dialog-actions');
      actions.innerHTML = '<button type="button" onclick="closeHtmlDialog()" class="w-full bg-[#005596] hover:bg-[#00447a] text-white font-extrabold py-3 rounded-xl text-xs cursor-pointer border-b-2 border-[#00335c]">オッケー！👌</button>';
      
      const modal = document.getElementById('html-custom-dialog');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function showHtmlConfirm(message, onConfirm, title = 'かくにん') {
      document.getElementById('html-dialog-icon').innerText = '❓';
      document.getElementById('html-dialog-title').innerText = title;
      document.getElementById('html-dialog-message').innerText = message;
      htmlDialogCallback = onConfirm;

      const actions = document.getElementById('html-dialog-actions');
      actions.innerHTML = '<button type="button" onclick="closeHtmlDialog()" class="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold py-2.5 rounded-xl text-xs cursor-pointer border-b-2 border-slate-300">やめる ✕</button><button type="button" onclick="executeHtmlConfirm()" class="w-1/2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold py-2.5 rounded-xl text-xs cursor-pointer border-b-2 border-rose-700 shadow-sm">けす 🗑️</button>';

      const modal = document.getElementById('html-custom-dialog');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function executeHtmlConfirm() {
      if (htmlDialogCallback) {
        htmlDialogCallback();
      }
      closeHtmlDialog();
    }

    function closeHtmlDialog() {
      const modal = document.getElementById('html-custom-dialog');
      modal.classList.remove('flex');
      modal.classList.add('hidden');
      htmlDialogCallback = null;
    }

    function bulkDeleteHtml() {
      if (selectedIds.length === 0) return;
      showHtmlConfirm('えらんだ ' + selectedIds.length + '個 のさくひんをまとめて消してもいいですか？', function() {
        legoItems = legoItems.filter(function(item) { return !selectedIds.includes(item.id); });
        saveToLocalStorage();
        selectedIds = [];
        toggleSelectMode();
      }, 'まとめて消す');
    }

    function deleteItem(id, event) {
      event.stopPropagation();
      showHtmlConfirm("この作品をずかんから消してもいいですか？", function() {
        legoItems = legoItems.filter(function(item) { return item.id !== id; });
        if (selectedIds.includes(id)) {
          selectedIds = selectedIds.filter(function(x) { return x !== id; });
          updateBulkUi();
        }
        saveToLocalStorage();
        renderGallery();
      }, "作品を消す");
    }

    function renderGallery() {
      const grid = document.getElementById('lego-grid');
      const emptyState = document.getElementById('empty-placeholder');
      const searchVal = document.getElementById('search-input').value.toLowerCase().trim();
      const sortBy = document.getElementById('sort-select') ? document.getElementById('sort-select').value : 'newest';

      const filtered = legoItems.filter(item => {
        return item.name.toLowerCase().includes(searchVal);
      });

      filtered.sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id);
        } else if (sortBy === 'oldest') {
          return new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id);
        } else if (sortBy === 'rating') {
          const rA = a.rating !== undefined ? a.rating : 5;
          const rB = b.rating !== undefined ? b.rating : 5;
          if (rB !== rA) {
            return rB - rA;
          }
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        } else if (sortBy === 'name') {
          return a.name.localeCompare(b.name, 'ja');
        }
        return 0;
      });

      document.getElementById('items-count').innerText = filtered.length;
      document.getElementById('nav-items-count').innerText = legoItems.length;

      const bulkToggle = document.getElementById('bulk-toggle-container');
      if (legoItems.length > 0) {
        if (bulkToggle) bulkToggle.classList.remove('hidden');
      } else {
        if (bulkToggle) bulkToggle.classList.add('hidden');
        if (isSelectMode) {
          isSelectMode = false;
          selectedIds = [];
          const btn = document.getElementById('btn-toggle-select');
          const banner = document.getElementById('bulk-select-banner');
          if (btn) {
            btn.innerText = '🗑️ まとめて消す (複数選択)';
            btn.className = 'text-xs font-bold bg-[#ffd500]/15 border border-[#ffd500] text-slate-800 px-3 py-1.5 rounded-xl hover:bg-[#ffd500]/25 cursor-pointer active:translate-y-0.5';
          }
          if (banner) banner.style.display = 'none';
        }
      }

      if (filtered.length === 0) {
        grid.innerHTML = "";
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');

      grid.innerHTML = filtered.map(item => {
        const itemRating = item.rating !== undefined ? item.rating : 5;
        let starsHtml = "";
        for (let i = 0; i < 5; i++) {
          starsHtml += i < itemRating ? "⭐️" : "☆";
        }

        const isSelected = selectedIds.includes(item.id);
        
        let cardClass = "";
        let checkBadgeHtml = "";
        let deleteBtnHtml = "";
        let viewBtnHtml = "";
        let clickAction = "";

        if (isSelectMode) {
          clickAction = "toggleSelectItem('" + item.id + "')";
          if (isSelected) {
            cardClass = "border-blue-600 ring-4 ring-blue-100 scale-[0.98]";
            checkBadgeHtml = "<div class=\"absolute top-3 left-3 z-30 w-7 h-7 rounded-full flex items-center justify-center border-2 border-blue-600 bg-blue-600 text-white font-extrabold text-xs\">✓</div>";
          } else {
            cardClass = "border-slate-200 opacity-80 scale-[0.97] hover:border-slate-300";
            checkBadgeHtml = "<div class=\"absolute top-3 left-3 z-30 w-7 h-7 rounded-full flex items-center justify-center border-2 border-slate-300 bg-white/90 text-transparent font-extrabold text-xs\"></div>";
          }
        } else {
          clickAction = "openLightbox('" + item.id + "')";
          cardClass = "border-slate-200 hover:border-[#005596] hover:scale-[1.02] group";
          deleteBtnHtml = "<button onclick=\"deleteItem('" + item.id + "', event)\" class=\"absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-white/90 hover:bg-red-500 hover:text-white text-slate-500 shadow-md flex items-center justify-center transition-colors border border-slate-100 cursor-pointer\">🗑️</button>";
          viewBtnHtml = "<span class=\"text-[#005596] text-xs font-black group-hover:translate-x-1 transition-transform\">みる 🔎</span>";
        }

        return \`
          <div onclick="\${clickAction}" class="bg-white rounded-2xl overflow-hidden border-3 \${cardClass} transition-all duration-300 cursor-pointer flex flex-col shadow-sm relative">
            
            <!-- Image Wrap with Floating Overlays -->
            <div class="aspect-4/3 w-full bg-slate-50 relative overflow-hidden flex items-center justify-center">
              <img src="\${item.image}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="\${item.name}" referrerpolicy="no-referrer">
              
              \${checkBadgeHtml}
              \${deleteBtnHtml}
            </div>

            <!-- Content Details -->
            <div class="p-4 flex flex-col flex-grow justify-between border-t border-slate-100 font-sans">
              <div>
                <h4 class="font-extrabold text-slate-800 text-base leading-tight tracking-wide group-hover:text-[#005596] transition-colors mb-0.5 truncate">
                  \${item.name}
                </h4>
                <!-- Stars display -->
                <div class="flex items-center gap-0.5 text-xs text-amber-400 select-none pb-1.5">
                  \${starsHtml}
                </div>
              </div>
              <div class="flex items-center justify-between text-[11px] font-bold text-slate-400 mt-2 border-t border-slate-50 pt-2">
                <span>📅 \${item.date}</span>
                \${viewBtnHtml}
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    function filterGalleries() {
      renderGallery();
    }

    function showAllAndScrollToGallery() {
      document.getElementById('search-input').value = '';
      renderGallery();
      setTimeout(function() {
        document.getElementById('section-gallery').scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }

    function openLightbox(id) {
      const item = legoItems.find(i => i.id === id);
      if (!item) return;

      document.getElementById('lightbox-img').src = item.image;
      document.getElementById('lightbox-date').innerText = '📅 作った日: ' + item.date;
      document.getElementById('lightbox-name').innerText = item.name;

      const itemRating = item.rating !== undefined ? item.rating : 5;
      let starsHtml = "";
      for (let i = 0; i < 5; i++) {
        starsHtml += i < itemRating ? "⭐️" : "☆";
      }
      document.getElementById('lightbox-stars').innerText = starsHtml;

      const modal = document.getElementById('lightbox-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeLightbox() {
      const modal = document.getElementById('lightbox-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    window.onload = init;
  </script>
</body>
</html>`;
}
