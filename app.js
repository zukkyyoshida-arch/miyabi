// Lucideアイコンの初期化
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  initApp();
});

// テーマカラーのリセット
function resetTheme() {
  document.body.className = '';
}

// タイピング風テキスト演出
function typeWriter(text, element, speed = 20) {
  const txt = text || '';
  let i = 0;
  element.textContent = '';
  
  function type() {
    if (i < txt.length) {
      element.textContent += txt.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  type();
}


// アプリのグローバル状態
let currentResult = null; // 現在表示中の鑑定結果を一時保存するオブジェクト
let currentMode = 'single'; // 'single', 'compat', 'naming', 'daily'
let historyData = [];

// アプリの初期化と状態管理
function initApp() {
  // DOM要素の取得
  const btnSettings = document.getElementById('btn-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const modalSettings = document.getElementById('settings-modal');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const inputApiKey = document.getElementById('input-api-key');
  const checkboxUseMock = document.getElementById('checkbox-use-mock');
  const checkboxEnableSound = document.getElementById('checkbox-enable-sound');
  const apiStatusText = document.getElementById('api-status-text');
  const apiStatusDiv = document.getElementById('api-status');

  // モード切り替えタブ
  const tabModeSingle = document.getElementById('tab-mode-single');
  const tabModeCompat = document.getElementById('tab-mode-compat');
  const tabModeNaming = document.getElementById('tab-mode-naming');
  const tabModeDaily = document.getElementById('tab-mode-daily');

  const formSingleFields = document.getElementById('form-single-fields');
  const formCompatFields = document.getElementById('form-compat-fields');
  const formNamingFields = document.getElementById('form-naming-fields');
  const formDailyFields = document.getElementById('form-daily-fields');

  const singleOptionalGrid = document.getElementById('single-optional-grid');
  const compatOptionalGrid = document.getElementById('compat-optional-grid');
  const namingOptionalGrid = document.getElementById('naming-optional-grid');
  const dailyOptionalGrid = document.getElementById('daily-optional-grid');

  const btnToggleOptions = document.getElementById('btn-toggle-options');
  const optionalFields = document.getElementById('optional-fields');
  const optionsChevron = document.getElementById('options-chevron');

  const form = document.getElementById('fortune-form');
  const btnSubmit = document.getElementById('btn-submit');
  const loadingSection = document.getElementById('loading-section');
  const resultSection = document.getElementById('result-section');
  const btnReset = document.getElementById('btn-reset');
  const btnSaveHistory = document.getElementById('btn-save-history');
  const btnShareResult = document.getElementById('btn-share-result');
  const btnDownloadAmulet = document.getElementById('btn-download-amulet');

  // 結果グリッド
  const resultSingleGrid = document.getElementById('result-single-grid');
  const resultCompatGrid = document.getElementById('result-compat-grid');
  const resultNamingGrid = document.getElementById('result-naming-grid');
  const resultDailyGrid = document.getElementById('result-daily-grid');

  // タブ要素
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // 設定のロード
  let apiKey = localStorage.getItem('miyabi_gemini_api_key') || '';
  let useMock = localStorage.getItem('miyabi_use_mock') === 'true';
  let enableSound = localStorage.getItem('miyabi_enable_sound') !== 'false';

  if (!apiKey) {
    useMock = true;
  }

  // 設定をUIに反映
  inputApiKey.value = apiKey;
  checkboxUseMock.checked = useMock;
  checkboxEnableSound.checked = enableSound;
  updateApiStatusUI();
  
  loadHistory();

  // --- イベントリスナー ---

  tabModeSingle.addEventListener('click', () => { switchMode('single'); });
  tabModeCompat.addEventListener('click', () => { switchMode('compat'); });
  tabModeNaming.addEventListener('click', () => { switchMode('naming'); });
  tabModeDaily.addEventListener('click', () => { switchMode('daily'); });

  btnSettings.addEventListener('click', () => { modalSettings.classList.remove('hidden'); });
  btnCloseSettings.addEventListener('click', () => { modalSettings.classList.add('hidden'); });
  modalSettings.addEventListener('click', (e) => {
    if (e.target === modalSettings) modalSettings.classList.add('hidden');
  });

  btnSaveSettings.addEventListener('click', () => {
    apiKey = inputApiKey.value.trim();
    useMock = checkboxUseMock.checked;
    enableSound = checkboxEnableSound.checked;

    if (!apiKey && !useMock) {
      alert('APIキーを入力するか、モックモードを有効にしてください。');
      return;
    }

    localStorage.setItem('miyabi_gemini_api_key', apiKey);
    localStorage.setItem('miyabi_use_mock', useMock ? 'true' : 'false');
    localStorage.setItem('miyabi_enable_sound', enableSound ? 'true' : 'false');
    
    updateApiStatusUI();
    modalSettings.classList.add('hidden');
  });

  btnToggleOptions.addEventListener('click', () => {
    const isHidden = optionalFields.classList.contains('hidden');
    if (isHidden) {
      optionalFields.classList.remove('hidden');
      optionsChevron.classList.add('rotate');
    } else {
      optionalFields.classList.add('hidden');
      optionsChevron.classList.remove('rotate');
    }
  });

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      const parentCard = button.closest('.ai-reading-card');
      if (!parentCard) return;
      const siblings = parentCard.querySelectorAll('.tab-button');
      const contents = parentCard.querySelectorAll('.tab-content');

      siblings.forEach(btn => btn.classList.remove('active'));
      contents.forEach(content => content.classList.remove('active'));
      
      button.classList.add('active');
      parentCard.querySelector(`#${targetTab}`).classList.add('active');
    });
  });

  // モード切り替え処理
  function switchMode(mode) {
    currentMode = mode;
    resetValidation();

    tabModeSingle.classList.remove('active');
    tabModeCompat.classList.remove('active');
    tabModeNaming.classList.remove('active');
    tabModeDaily.classList.remove('active');

    formSingleFields.classList.add('hidden');
    formCompatFields.classList.add('hidden');
    formNamingFields.classList.add('hidden');
    formDailyFields.classList.add('hidden');

    singleOptionalGrid.classList.add('hidden');
    compatOptionalGrid.classList.add('hidden');
    namingOptionalGrid.classList.add('hidden');
    dailyOptionalGrid.classList.add('hidden');

    if (mode === 'single') {
      tabModeSingle.classList.add('active');
      formSingleFields.classList.remove('hidden');
      singleOptionalGrid.classList.remove('hidden');
      
      document.getElementById('input-last-name').required = true;
      document.getElementById('input-first-name').required = true;
      document.getElementById('input-last-name-kana').required = true;
      document.getElementById('input-first-name-kana').required = true;
    } else if (mode === 'compat') {
      tabModeCompat.classList.add('active');
      formCompatFields.classList.remove('hidden');
      compatOptionalGrid.classList.remove('hidden');

      document.getElementById('compat-last-name-1').required = true;
      document.getElementById('compat-first-name-1').required = true;
      document.getElementById('compat-last-name-kana-1').required = true;
      document.getElementById('compat-first-name-kana-1').required = true;
      document.getElementById('compat-last-name-2').required = true;
      document.getElementById('compat-first-name-2').required = true;
      document.getElementById('compat-last-name-kana-2').required = true;
      document.getElementById('compat-first-name-kana-2').required = true;
    } else if (mode === 'naming') {
      tabModeNaming.classList.add('active');
      formNamingFields.classList.remove('hidden');
      namingOptionalGrid.classList.remove('hidden');

      document.getElementById('naming-last-name').required = true;
      document.getElementById('naming-last-name-kana').required = true;
    } else if (mode === 'daily') {
      tabModeDaily.classList.add('active');
      formDailyFields.classList.remove('hidden');
      dailyOptionalGrid.classList.remove('hidden');

      document.getElementById('daily-last-name').required = true;
      document.getElementById('daily-first-name').required = true;
      document.getElementById('daily-last-name-kana').required = true;
      document.getElementById('daily-first-name-kana').required = true;
    }
  }

  function resetValidation() {
    document.querySelectorAll('#fortune-form input').forEach(input => input.required = false);
  }

  // 占い実行
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (enableSound) playOring();

    form.parentElement.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    resultSection.classList.add('hidden');

    let loadingTexts = [];
    if (currentMode === 'single') {
      loadingTexts = ["天格・地格・人格を解析中...", "陰陽のバランスと五行の調和を測定中...", "AIが名前に込められた本質を読み解いています...", "天命のアドバイスを組み立てています..."];
    } else if (currentMode === 'compat') {
      loadingTexts = ["二人の画数を算出中...", "五行の相性と引き合う力を測定中...", "AIが二人の縁（えにし）を読み解いています...", "調和のアドバイスを組み立てています..."];
    } else if (currentMode === 'naming') {
      loadingTexts = ["名字の画数から吉数を算出中...", "漢字の成り立ちと吉凶バランスを精査中...", "AIが最高の漢字リコメンド候補を選定しています...", "祝福のアドバイスを組み立てています..."];
    } else {
      loadingTexts = ["今日の天体の動きをスキャン中...", "名前と日付の波長を干渉測定中...", "AIが本日の数霊運を組み立てています...", "今日の開運行動を決定中..."];
    }

    let textIndex = 0;
    document.getElementById('loading-text').textContent = loadingTexts[0];
    const loadingInterval = setInterval(() => {
      textIndex = (textIndex + 1) % loadingTexts.length;
      document.getElementById('loading-text').textContent = loadingTexts[textIndex];
    }, 2200);

    try {
      if (currentMode === 'single') {
        const lastName = document.getElementById('input-last-name').value.trim();
        const firstName = document.getElementById('input-first-name').value.trim();
        const lastNameKana = document.getElementById('input-last-name-kana').value.trim();
        const firstNameKana = document.getElementById('input-first-name-kana').value.trim();
        const birthday = document.getElementById('input-birthday').value;
        const gender = document.getElementById('input-gender').value;

        let resultData;
        if (useMock) {
          await new Promise(resolve => setTimeout(resolve, 2500));
          resultData = getMockDataSingle(lastName, firstName, lastNameKana, firstNameKana);
        } else {
          resultData = await callGeminiAPISingle(apiKey, {
            lastName, firstName, lastNameKana, firstNameKana, birthday, gender
          });
        }

        currentResult = {
          type: 'single', lastName, firstName, lastNameKana, firstNameKana, data: resultData
        };

        displayResultSingle(resultData, lastName, firstName, lastNameKana, firstNameKana);
      } else if (currentMode === 'compat') {
        const lastName1 = document.getElementById('compat-last-name-1').value.trim();
        const firstName1 = document.getElementById('compat-first-name-1').value.trim();
        const lastNameKana1 = document.getElementById('compat-last-name-kana-1').value.trim();
        const firstNameKana1 = document.getElementById('compat-first-name-kana-1').value.trim();
        
        const lastName2 = document.getElementById('compat-last-name-2').value.trim();
        const firstName2 = document.getElementById('compat-first-name-2').value.trim();
        const lastNameKana2 = document.getElementById('compat-last-name-kana-2').value.trim();
        const firstNameKana2 = document.getElementById('compat-first-name-kana-2').value.trim();
        const relation = document.getElementById('compat-relation').value;

        let resultData;
        if (useMock) {
          await new Promise(resolve => setTimeout(resolve, 2500));
          resultData = getMockDataCompat(lastName1, firstName1, lastName2, firstName2);
        } else {
          resultData = await callGeminiAPICompat(apiKey, {
            lastName1, firstName1, lastNameKana1, firstNameKana1,
            lastName2, firstName2, lastNameKana2, firstNameKana2, relation
          });
        }

        currentResult = {
          type: 'compat',
          lastName1, firstName1, lastNameKana1, firstNameKana1,
          lastName2, firstName2, lastNameKana2, firstNameKana2,
          data: resultData
        };

        displayResultCompat(resultData, lastName1, firstName1, lastName2, firstName2);
      } else if (currentMode === 'naming') {
        const lastName = document.getElementById('naming-last-name').value.trim();
        const lastNameKana = document.getElementById('naming-last-name-kana').value.trim();
        const firstNameKana = document.getElementById('naming-first-name-kana').value.trim();
        const gender = document.getElementById('naming-gender').value;
        const wish = document.getElementById('naming-wish').value.trim();
        const element = document.getElementById('naming-element').value;

        let resultData;
        if (useMock) {
          await new Promise(resolve => setTimeout(resolve, 2500));
          resultData = getMockDataNaming(lastName, lastNameKana, firstNameKana, gender, wish);
        } else {
          resultData = await callGeminiAPINaming(apiKey, {
            lastName, lastNameKana, firstNameKana, gender, wish, element
          });
        }

        currentResult = {
          type: 'naming', lastName, lastNameKana, firstNameKana, gender, wish, data: resultData
        };

        displayResultNaming(resultData, lastName, lastNameKana);
      } else if (currentMode === 'daily') {
        const lastName = document.getElementById('daily-last-name').value.trim();
        const firstName = document.getElementById('daily-first-name').value.trim();
        const lastNameKana = document.getElementById('daily-last-name-kana').value.trim();
        const firstNameKana = document.getElementById('daily-first-name-kana').value.trim();

        let resultData;
        if (useMock) {
          await new Promise(resolve => setTimeout(resolve, 2500));
          resultData = getMockDataDaily(lastName, firstName);
        } else {
          resultData = await callGeminiAPIDaily(apiKey, {
            lastName, firstName, lastNameKana, firstNameKana
          });
        }

        currentResult = {
          type: 'daily', lastName, firstName, lastNameKana, firstNameKana, data: resultData
        };

        displayResultDaily(resultData, lastName, firstName, lastNameKana, firstNameKana);
      }

      // 「鑑定帳に保存」ボタンの状態復元
      btnSaveHistory.disabled = false;
      btnSaveHistory.innerHTML = '<i data-lucide="bookmark"></i><span>鑑定帳に保存</span>';
      
      // お守り保存ボタンを表示制御（個人鑑定・日運鑑定時のみ有効、それ以外は非表示）
      if (currentMode === 'single' || currentMode === 'daily') {
        btnDownloadAmulet.classList.remove('hidden');
      } else {
        btnDownloadAmulet.classList.add('hidden');
      }

      lucide.createIcons();

    } catch (error) {
      console.error(error);
      alert(`エラーが発生しました: ${error.message}\n設定画面でAPIキーを確認するか、モックモードでお試しください。`);
      form.parentElement.classList.remove('hidden');
      resetTheme();
    } finally {
      clearInterval(loadingInterval);
      loadingSection.classList.add('hidden');
    }
  });

  // リセットボタン
  btnReset.addEventListener('click', () => {
    resultSection.classList.add('hidden');
    form.parentElement.classList.remove('hidden');
    form.reset();
    optionalFields.classList.add('hidden');
    optionsChevron.classList.remove('rotate');
    
    const firstTabs = document.querySelectorAll('.ai-tabs');
    firstTabs.forEach(tabs => {
      const firstBtn = tabs.querySelector('.tab-button');
      if (firstBtn) firstBtn.click();
    });

    resetTheme();
  });

  // 鑑定帳に保存
  btnSaveHistory.addEventListener('click', () => {
    if (!currentResult) return;

    const isDuplicate = historyData.some(item => {
      if (item.type !== currentResult.type) return false;
      if (item.type === 'single' || item.type === 'daily') {
        return item.lastName === currentResult.lastName && item.firstName === currentResult.firstName;
      } else if (item.type === 'compat') {
        return item.lastName1 === currentResult.lastName1 && item.firstName1 === currentResult.firstName1 &&
               item.lastName2 === currentResult.lastName2 && item.firstName2 === currentResult.firstName2;
      } else {
        return item.lastName === currentResult.lastName && 
               item.firstNameKana === currentResult.firstNameKana && 
               item.wish === currentResult.wish;
      }
    });

    if (isDuplicate) {
      alert('この結果は既に鑑定帳に保存されています。');
      return;
    }

    const newHistoryItem = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('ja-JP'),
      ...currentResult
    };

    historyData.unshift(newHistoryItem);
    localStorage.setItem('miyabi_fortune_history', JSON.stringify(historyData));
    
    renderHistoryUI();

    btnSaveHistory.disabled = true;
    btnSaveHistory.innerHTML = '<i data-lucide="check"></i><span>保存されました</span>';
    lucide.createIcons();
  });

  // 結果をコピー
  btnShareResult.addEventListener('click', () => {
    if (!currentResult) return;

    let shareText = '';
    if (currentResult.type === 'single') {
      const d = currentResult.data;
      shareText = `【雅 AI姓名判断】\n${currentResult.lastName} ${currentResult.firstName} 殿の鑑定結果\n`;
      shareText += `総格：${d.sokaku.score}画 (${d.sokaku.fortune})\n`;
      shareText += `開運色：${d.luckyColor} / 開運品：${d.luckyItem}\n`;
      shareText += `本質：${d.essence.substring(0, 80)}...\n`;
      shareText += `#雅AI姓名判断\n`;
    } else if (currentResult.type === 'compat') {
      const d = currentResult.data;
      shareText = `【雅 AI姓名相性判断】\n`;
      shareText += `${currentResult.lastName1} ${currentResult.firstName1} × ${currentResult.lastName2} ${currentResult.firstName2}\n`;
      shareText += `二人の共鳴度：${d.compatRate}%\n`;
      shareText += `基本相性：${d.essence.substring(0, 80)}...\n`;
      shareText += `#雅AI姓名判断\n`;
    } else if (currentResult.type === 'naming') {
      const d = currentResult.data;
      shareText = `【雅 AI命名鑑定】\n`;
      shareText += `${currentResult.lastName}家の子供の命名候補\n`;
      shareText += `名字天格：${d.tenkaku}画 / おすすめ画数：${d.bestScores}\n`;
      d.candidates.forEach((c, idx) => {
        shareText += `${idx+1}. ${currentResult.lastName} ${c.kanji} (${c.kana}) - 総格${c.scores.sokaku.score}画 (${c.scores.sokaku.fortune})\n`;
      });
      shareText += `#雅AI姓名判断\n`;
    } else {
      const d = currentResult.data;
      shareText = `【雅 AI本日の運勢】\n`;
      shareText += `${currentResult.lastName} ${currentResult.firstName} 殿\n`;
      shareText += `今日の総合波長：${'★'.repeat(d.stars)}${'☆'.repeat(5-d.stars)}\n`;
      shareText += `ラッキーカラー：${d.luckyColor} / ラッキーアイテム：${d.luckyItem}\n`;
      shareText += `今日のアドバイス：${d.flow.substring(0, 80)}...\n`;
      shareText += `#雅AI姓名判断\n`;
    }

    navigator.clipboard.writeText(shareText).then(() => {
      alert('鑑定結果をクリップボードにコピーしました！');
    }).catch(err => {
      console.error('コピー失敗:', err);
    });
  });

  // お守り画像の生成とダウンロード
  btnDownloadAmulet.addEventListener('click', () => {
    if (!currentResult) return;
    generateAmuletImage(currentResult);
  });

  // APIステータス表示の更新
  function updateApiStatusUI() {
    if (useMock) {
      apiStatusText.textContent = "APIキーを使用せず、デモ（モック）モードで動作します。";
      apiStatusDiv.className = "status-indicator info";
    } else if (apiKey) {
      apiStatusText.textContent = "Gemini APIキーが設定されています。AIによる本格鑑定を行います。";
      apiStatusDiv.className = "status-indicator success";
    } else {
      apiStatusText.textContent = "APIキーが設定されていないため、現在はモックモードで動作します。";
      apiStatusDiv.className = "status-indicator info";
      checkboxUseMock.checked = true;
      useMock = true;
    }
  }

  // 履歴のロード・描画
  function loadHistory() {
    const stored = localStorage.getItem('miyabi_fortune_history');
    if (stored) {
      try {
        historyData = JSON.parse(stored);
      } catch (e) {
        historyData = [];
      }
    }
    renderHistoryUI();
  }

  function renderHistoryUI() {
    const historyList = document.getElementById('history-list');
    const emptyText = document.getElementById('history-empty-text');

    if (historyData.length === 0) {
      historyList.classList.add('hidden');
      emptyText.classList.remove('hidden');
      return;
    }

    emptyText.classList.add('hidden');
    historyList.classList.remove('hidden');
    historyList.innerHTML = '';

    historyData.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-item';
      
      let title = '';
      let scoreText = '';
      let badgeClass = '';
      let badgeLabel = '';

      if (item.type === 'single') {
        title = `${item.lastName} ${item.firstName}`;
        scoreText = `総格: ${item.data.sokaku.score}画 (${item.data.sokaku.fortune})`;
        badgeClass = 'type-single';
        badgeLabel = '個人';
      } else if (item.type === 'compat') {
        title = `${item.firstName1} × ${item.firstName2}`;
        scoreText = `共鳴度: ${item.data.compatRate}%`;
        badgeClass = 'type-compat';
        badgeLabel = '相性';
      } else if (item.type === 'naming') {
        title = `${item.lastName}家 命名`;
        const candNames = item.data.candidates.map(c => c.kanji).join(', ');
        scoreText = `候補: ${candNames}`;
        badgeClass = 'type-naming';
        badgeLabel = '命名';
      } else {
        title = `${item.lastName} ${item.firstName}`;
        scoreText = `今日の運勢: ★${item.data.stars}`;
        badgeClass = 'type-daily';
        badgeLabel = '日運';
      }

      card.innerHTML = `
        <div class="history-item-info">
          <span class="history-item-type ${badgeClass}">${badgeLabel}</span>
          <span class="history-item-name">${title}</span>
          <span class="history-item-score">${scoreText}</span>
        </div>
        <button class="btn-delete-history" data-id="${item.id}" title="削除" aria-label="削除">
          <i data-lucide="trash-2"></i>
        </button>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-history')) return;
        restoreHistoryItem(item);
      });

      const btnDelete = card.querySelector('.btn-delete-history');
      btnDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHistoryItem(item.id);
      });

      historyList.appendChild(card);
    });

    lucide.createIcons();
  }

  function deleteHistoryItem(id) {
    if (!confirm('この鑑定履歴を鑑定帳から削除しますか？')) return;
    historyData = historyData.filter(item => item.id !== id);
    localStorage.setItem('miyabi_fortune_history', JSON.stringify(historyData));
    renderHistoryUI();
  }

  function restoreHistoryItem(item) {
    form.parentElement.classList.add('hidden');
    resultSection.classList.remove('hidden');
    
    currentResult = item;
    currentMode = item.type;

    if (item.type === 'single') {
      displayResultSingle(item.data, item.lastName, item.firstName, item.lastNameKana, item.firstNameKana);
    } else if (item.type === 'compat') {
      displayResultCompat(item.data, item.lastName1, item.firstName1, item.lastName2, item.firstName2);
    } else if (item.type === 'naming') {
      displayResultNaming(item.data, item.lastName, item.lastNameKana);
    } else {
      displayResultDaily(item.data, item.lastName, item.firstName, item.lastNameKana, item.firstNameKana);
    }

    btnSaveHistory.disabled = true;
    btnSaveHistory.innerHTML = '<i data-lucide="check"></i><span>保存済み</span>';
    
    if (currentMode === 'single' || currentMode === 'daily') {
      btnDownloadAmulet.classList.remove('hidden');
    } else {
      btnDownloadAmulet.classList.add('hidden');
    }

    lucide.createIcons();
    resultSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// --- Web Audio API による「おりん」の合成発音 ---
let audioCtx = null;
function playOring() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const frequencies = [650.0, 650.8, 1014.0, 1430.0, 1780.0, 2340.0];
    const gains = [0.35, 0.35, 0.15, 0.08, 0.05, 0.02];

    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.8, now + 0.01);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 4.5);
    masterGain.connect(audioCtx.destination);

    frequencies.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      
      const decay = idx > 1 ? 2.0 : 4.0;
      gainNode.gain.setValueAtTime(gains[idx], now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + decay);
      
      osc.connect(gainNode);
      gainNode.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 5.0);
    });
  } catch (e) {
    console.warn("Audio Context の再生に失敗しました:", e);
  }
}

// --- 個人鑑定用：結果表示 ---
function displayResultSingle(data, lastName, firstName, lastNameKana, firstNameKana) {
  const resultSingleGrid = document.getElementById('result-single-grid');
  const resultCompatGrid = document.getElementById('result-compat-grid');
  const resultNamingGrid = document.getElementById('result-naming-grid');
  const resultDailyGrid = document.getElementById('result-daily-grid');

  resultSingleGrid.classList.remove('hidden');
  resultCompatGrid.classList.add('hidden');
  resultNamingGrid.classList.add('hidden');
  resultDailyGrid.classList.add('hidden');

  document.getElementById('result-name').textContent = `${lastName} ${firstName} 殿`;
  document.getElementById('result-kana').textContent = `${lastNameKana} ${firstNameKana}`;

  setScoreUI('score-ten', data.tenkaku);
  setScoreUI('score-jin', data.jinkaku);
  setScoreUI('score-chi', data.chikaku);
  setScoreUI('score-gai', data.gaikaku);
  setScoreUI('score-so', data.sokaku);

  // 開運色と開運アイテムの表示
  document.getElementById('single-lucky-color-text').textContent = data.luckyColor;
  document.getElementById('single-lucky-item-text').textContent = data.luckyItem;
  document.getElementById('single-lucky-color-preview').style.backgroundColor = data.luckyColorCode || '#ffffff';

  // レーダーチャートの描画を実行
  drawRadarChart({
    ten: data.tenkaku.fortune,
    jin: data.jinkaku.fortune,
    chi: data.chikaku.fortune,
    gai: data.gaikaku.fortune,
    so: data.sokaku.fortune
  });

  const soFortune = data.sokaku.fortune;
  resetTheme();
  if (soFortune.includes('大吉')) {
    document.body.classList.add('theme-daikichi');
  } else if (soFortune.includes('吉') || soFortune.includes('小吉')) {
    document.body.classList.add('theme-kichi');
  } else if (soFortune.includes('凶')) {
    document.body.classList.add('theme-kyou');
  }

  document.getElementById('result-section').classList.remove('hidden');

  const essenceTarget = document.getElementById('ai-essence-text');
  const destinyTarget = document.getElementById('ai-destiny-text');
  const adviceTarget = document.getElementById('ai-advice-text');

  typeWriter(data.essence, essenceTarget, 12);
  typeWriter(data.destiny, destinyTarget, 12);
  typeWriter(data.advice, adviceTarget, 12);
}

// --- 相性鑑定用：結果表示 ---
function displayResultCompat(data, lastName1, firstName1, lastName2, firstName2) {
  const resultSingleGrid = document.getElementById('result-single-grid');
  const resultCompatGrid = document.getElementById('result-compat-grid');
  const resultNamingGrid = document.getElementById('result-naming-grid');
  const resultDailyGrid = document.getElementById('result-daily-grid');

  resultSingleGrid.classList.add('hidden');
  resultCompatGrid.classList.remove('hidden');
  resultNamingGrid.classList.add('hidden');
  resultDailyGrid.classList.add('hidden');

  document.getElementById('result-name').textContent = `${firstName1} × ${firstName2}`;
  document.getElementById('result-kana').textContent = `${lastName1}${firstName1} と ${lastName2}${firstName2}`;

  document.getElementById('compat-name-1').textContent = firstName1;
  document.getElementById('compat-name-2').textContent = firstName2;
  document.getElementById('compat-so-1').textContent = `${data.so1}画`;
  document.getElementById('compat-so-2').textContent = `${data.so2}画`;
  document.getElementById('compat-rate').textContent = `${data.compatRate}%`;
  
  const rateBar = document.getElementById('compat-rate-bar');
  rateBar.style.width = '0%';
  setTimeout(() => {
    rateBar.style.width = `${data.compatRate}%`;
  }, 100);

  resetTheme();
  document.body.classList.add('theme-compat');

  document.getElementById('result-section').classList.remove('hidden');

  const compatEssenceTarget = document.getElementById('ai-compat-essence-text');
  const compatSynergyTarget = document.getElementById('ai-compat-synergy-text');
  const compatAdviceTarget = document.getElementById('ai-compat-advice-text');

  typeWriter(data.essence, compatEssenceTarget, 12);
  typeWriter(data.synergy, compatSynergyTarget, 12);
  typeWriter(data.advice, compatAdviceTarget, 12);
}

// --- 命名鑑定用：結果表示 ---
function displayResultNaming(data, lastName, lastNameKana) {
  const resultSingleGrid = document.getElementById('result-single-grid');
  const resultCompatGrid = document.getElementById('result-compat-grid');
  const resultNamingGrid = document.getElementById('result-naming-grid');
  const resultDailyGrid = document.getElementById('result-daily-grid');

  resultSingleGrid.classList.add('hidden');
  resultCompatGrid.classList.add('hidden');
  resultNamingGrid.classList.remove('hidden');
  resultDailyGrid.classList.add('hidden');

  document.getElementById('result-name').textContent = `${lastName}家 命名鑑定`;
  document.getElementById('result-kana').textContent = `${lastNameKana}け めいめいかんてい`;

  document.getElementById('naming-ten-val').textContent = `${data.tenkaku}画`;
  document.getElementById('naming-best-scores').textContent = data.bestScores;
  document.getElementById('naming-analysis-desc').textContent = data.advice;

  const container = document.getElementById('naming-candidates-container');
  container.innerHTML = '';

  data.candidates.forEach((cand) => {
    const card = document.createElement('div');
    card.className = 'naming-candidate-card';

    const getBadgeClass = (f) => {
      if (f.includes('大吉')) return 'badge-daikichi';
      if (f.includes('吉')) return 'badge-kichi';
      if (f.includes('小吉') || f.includes('半吉')) return 'badge-shokichi';
      if (f.includes('凶')) return 'badge-kyou';
      return 'badge-chutotsu';
    };

    const s = cand.scores;
    card.innerHTML = `
      <div class="candidate-header">
        <div class="candidate-name-box">
          <span class="candidate-name">${lastName} ${cand.kanji}</span>
          <span class="candidate-kana">${cand.kana}</span>
        </div>
        <div class="candidate-score-summary">
          総格: ${s.sokaku.score}画 <span class="fortune-badge ${getBadgeClass(s.sokaku.fortune)}">${s.sokaku.fortune}</span>
        </div>
      </div>
      <div class="candidate-details">
        <div class="candidate-scores-mini">
          <div class="mini-score-item">
            <span class="mini-score-label">天格（名字）</span>
            <span class="mini-score-val">${s.tenkaku.score}画 (${s.tenkaku.fortune})</span>
          </div>
          <div class="mini-score-item">
            <span class="mini-score-label">人格（中心）</span>
            <span class="mini-score-val">${s.jinkaku.score}画 <span class="fortune-badge ${getBadgeClass(s.jinkaku.fortune)}">${s.jinkaku.fortune}</span></span>
          </div>
          <div class="mini-score-item">
            <span class="mini-score-label">地格（名前）</span>
            <span class="mini-score-val">${s.chikaku.score}画 <span class="fortune-badge ${getBadgeClass(s.chikaku.fortune)}">${s.chikaku.fortune}</span></span>
          </div>
          <div class="mini-score-item">
            <span class="mini-score-label">外格（環境）</span>
            <span class="mini-score-val">${s.gaikaku.score}画 <span class="fortune-badge ${getBadgeClass(s.gaikaku.fortune)}">${s.gaikaku.fortune}</span></span>
          </div>
        </div>
        <div class="candidate-meaning-box">
          <div class="meaning-title">漢字の意味と解説</div>
          <div class="meaning-text">${cand.meanings}</div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  const blessingTarget = document.getElementById('naming-blessing-text');
  typeWriter(data.blessing, blessingTarget, 15);

  resetTheme();
  document.body.classList.add('theme-naming');

  document.getElementById('result-section').classList.remove('hidden');
}

// --- 今日の運勢用：結果表示 ---
function displayResultDaily(data, lastName, firstName, lastNameKana, firstNameKana) {
  const resultSingleGrid = document.getElementById('result-single-grid');
  const resultCompatGrid = document.getElementById('result-compat-grid');
  const resultNamingGrid = document.getElementById('result-naming-grid');
  const resultDailyGrid = document.getElementById('result-daily-grid');

  resultSingleGrid.classList.add('hidden');
  resultCompatGrid.classList.add('hidden');
  resultNamingGrid.classList.add('hidden');
  resultDailyGrid.classList.remove('hidden');

  document.getElementById('result-name').textContent = `${lastName} ${firstName} 殿`;
  document.getElementById('result-kana').textContent = `今日の天命歩数計: ${lastNameKana} ${firstNameKana}`;

  // 星マーク (★) の描画
  const starsBox = document.getElementById('daily-stars-box');
  const starCount = data.stars || 3;
  starsBox.textContent = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);

  // ラッキーカラー＆アイテム
  document.getElementById('daily-lucky-color-text').textContent = data.luckyColor;
  document.getElementById('daily-lucky-item-text').textContent = data.luckyItem;
  document.getElementById('daily-lucky-color-preview').style.backgroundColor = data.luckyColorCode || '#ffffff';

  resetTheme();
  document.body.classList.add('theme-daily');

  document.getElementById('result-section').classList.remove('hidden');

  const dailyFlowTarget = document.getElementById('ai-daily-flow-text');
  const dailyActionTarget = document.getElementById('ai-daily-action-text');

  typeWriter(data.flow, dailyFlowTarget, 12);
  typeWriter(data.action, dailyActionTarget, 12);
}

// スコアUIのヘルパー
function setScoreUI(elementId, scoreData) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const score = scoreData.score;
  const fortune = scoreData.fortune;
  
  let badgeClass = 'badge-chutotsu';
  if (fortune.includes('大吉')) badgeClass = 'badge-daikichi';
  else if (fortune.includes('吉')) badgeClass = 'badge-kichi';
  else if (fortune.includes('小吉') || fortune.includes('半吉')) badgeClass = 'badge-shokichi';
  else if (fortune.includes('凶')) badgeClass = 'badge-kyou';

  element.innerHTML = `${score} <span class="fortune-badge ${badgeClass}">${fortune}</span>`;
}

// --- HTML5 Canvas による五格レーダーチャートの動的描画 ---
function drawRadarChart(fortunes) {
  const canvas = document.getElementById('radar-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const labels = ["天格", "人格", "地格", "外格", "総格"];
  const keys = ["ten", "jin", "chi", "gai", "so"];

  // 吉凶を1〜5の数値に変換
  const getFortuneValue = (fortune) => {
    const f = fortune || '';
    if (f.includes('大吉')) return 5;
    if (f.includes('大凶')) return 1;
    if (f.includes('吉')) return 4;
    if (f.includes('小吉') || f.includes('半吉')) return 3.5;
    if (f.includes('中吉') || f.includes('吉凶半々')) return 3;
    if (f.includes('凶')) return 1.8;
    return 2.5; // その他
  };

  const dataValues = keys.map(key => getFortuneValue(fortunes[key]));

  const center = canvas.width / 2;
  const radius = center - 35;
  const sides = 5;

  // 1. ガイドライン（同心五角形）の描画
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let r = 1; r <= 5; r++) {
    const currentRadius = (radius / 5) * r;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
      const x = center + Math.cos(angle) * currentRadius;
      const y = center + Math.sin(angle) * currentRadius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // 2. 軸線の描画
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
  }
  ctx.stroke();

  // 3. データエリアのプロットと描画
  ctx.fillStyle = 'rgba(223, 186, 92, 0.28)'; // 金色の半透明
  ctx.strokeStyle = '#dfba5c'; // 金色
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
    const valueRadius = (radius / 5) * dataValues[i];
    const x = center + Math.cos(angle) * valueRadius;
    const y = center + Math.sin(angle) * valueRadius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // データポイントの丸を描画
  ctx.fillStyle = '#fff';
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
    const valueRadius = (radius / 5) * dataValues[i];
    const x = center + Math.cos(angle) * valueRadius;
    const y = center + Math.sin(angle) * valueRadius;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 4. 文字ラベルの描画
  ctx.fillStyle = '#9c9ab0';
  ctx.font = "bold 11px 'Noto Serif JP', serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
    const labelX = center + Math.cos(angle) * (radius + 20);
    const labelY = center + Math.sin(angle) * (radius + 15);
    ctx.fillText(labels[i], labelX, labelY);
  }
}

// --- HTML5 Canvas によるお守り画像（千社札風）の生成・ダウンロード ---
function generateAmuletImage(result) {
  const canvas = document.createElement('canvas');
  canvas.width = 450;
  canvas.height = 750;
  const ctx = canvas.getContext('2d');

  // 1. 背景のグラデーション（高級感のある漆黒〜深紫）
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#0e0d12');
  grad.addColorStop(0.5, '#191522');
  grad.addColorStop(1, '#08070a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. 二重の金枠（和モダン境界）
  ctx.strokeStyle = '#dfba5c';
  ctx.lineWidth = 4;
  ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
  ctx.lineWidth = 1;
  ctx.strokeRect(23, 23, canvas.width - 46, canvas.height - 46);

  // 金の和風角飾りを描く
  const drawCorner = (x, y, dx, dy) => {
    ctx.strokeStyle = '#dfba5c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + dx * 20, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * 20);
    ctx.stroke();
  };
  drawCorner(28, 28, 1, 1);
  drawCorner(canvas.width - 28, 28, -1, 1);
  drawCorner(28, canvas.height - 28, 1, -1);
  drawCorner(canvas.width - 28, canvas.height - 28, -1, -1);

  // 3. 千社札の札枠（中央の白木目調あるいは半透明枠）
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.strokeStyle = 'rgba(223, 186, 92, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(60, 60, canvas.width - 120, canvas.height - 120, 8);
  } else {
    // 古いブラウザ（iOS 15以前のSafariなど）用のフォールバック描画
    const x = 60, y = 60, w = canvas.width - 120, h = canvas.height - 120, r = 8;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  }
  ctx.fill();
  ctx.stroke();

  // 4. 文字描画（縦書き処理）
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 文字を縦書きに描画するヘルパー
  const drawVerticalText = (text, x, y, font, color, spacing = 40) => {
    ctx.font = font;
    ctx.fillStyle = color;
    for (let i = 0; i < text.length; i++) {
      ctx.fillText(text.charAt(i), x, y + i * spacing);
    }
  };

  // 4-1. お守りタイトル（上部横書き）
  ctx.font = "bold 15px 'Outfit', sans-serif";
  ctx.fillStyle = '#ffb5c5'; // 桜色
  ctx.letterSpacing = '4px';
  ctx.fillText("雅  AI  姓名  守  護  符", canvas.width / 2, 95);

  // 4-2. 氏名（中央巨大縦書き）
  let name = "";
  let subText = "";
  let fortune = "";

  if (result.type === 'single') {
    name = `${result.lastName} ${result.firstName}`;
    subText = `総格 ${result.data.sokaku.score}画`;
    fortune = result.data.sokaku.fortune;
  } else if (result.type === 'daily') {
    name = `${result.lastName} ${result.firstName}`;
    subText = "本日の数霊運";
    fortune = `波長 ★${result.data.stars}`;
  }

  // 名前縦書き
  drawVerticalText(name, canvas.width / 2, 170, "900 36px 'Noto Serif JP', serif", '#f3f3f6', 48);

  // 4-3. 右側に総格などの補足（縦書き）
  drawVerticalText(subText, canvas.width / 2 + 100, 200, "bold 18px 'Noto Serif JP', serif", '#9c9ab0', 25);

  // 4-4. 左側に吉凶運勢（縦書き）
  drawVerticalText(fortune, canvas.width / 2 - 100, 200, "900 24px 'Noto Serif JP', serif", '#dfba5c', 30);

  // 5. 雅の朱印（スタンプ効果）を右下に配置
  const stampX = canvas.width / 2 + 80;
  const stampY = canvas.height - 130;
  ctx.strokeStyle = '#ff4500'; // 朱色
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(stampX, stampY, 26, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.fillStyle = '#ff4500';
  ctx.font = "900 16px 'Noto Serif JP', serif";
  ctx.fillText("雅", stampX, stampY - 8);
  ctx.fillText("印", stampX, stampY + 10);

  // 6. 画像のダウンロード
  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `雅_お守り_${name.replace(" ", "")}.png`;
  link.href = dataURL;
  link.click();
}

// --- Gemini API 連携（個人鑑定） ---
async function callGeminiAPISingle(key, params) {
  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const prompt = `
あなたは一流の姓名判断鑑定士であり、陰陽五行説や画数による数霊術に精通したAIです。
以下の人物について、姓名判断を行ってください。

【対象者の情報】
- 氏名: ${params.lastName} ${params.firstName}
- よみがな: ${params.lastNameKana} ${params.firstNameKana}
${params.birthday ? `- 生年月日: ${params.birthday}` : ''}
${params.gender ? `- 性別: ${params.gender}` : ''}

【姓名判断のルール】
1. 各格（天格・人格・地格・外格・総格）の画数を厳密に計算（または算出）し、その吉凶（大吉、吉、小吉、中吉/吉凶半々、凶、大凶など）を決定してください。
2. 陰陽五行（木・火・土・金・水）のバランスから、この人のエネルギーを最も調和させる「ラッキーカラー」と「ラッキーアイテム」を導き出してください。
3. 鑑定結果は以下のJSONフォーマットで返却してください。余計なマークダウンや説明テキストは含めず、純粋なJSONのみを返してください。

【出力JSONフォーマット】
{
  "tenkaku": { "score": 数値, "fortune": "吉凶" },
  "jinkaku": { "score": 数値, "fortune": "吉凶" },
  "chikaku": { "score": 数値, "fortune": "吉凶" },
  "gaikaku": { "score": 数値, "fortune": "吉凶" },
  "sokaku": { "score": 数値, "fortune": "吉凶" },
  "luckyColor": "ラッキーカラー名（例：『瑠璃色 (ダークブルー)』など、情緒的な和名＋一般的な英名）",
  "luckyColorCode": "ラッキーカラーのカラーコード（例：『#0047ab』など、必ず有効な16進数HEXカラーコード）",
  "luckyItem": "ラッキーアイテム（日常生活で身につけたり置いたりしやすいもの）",
  "essence": "【本質・性格の鑑定結果】（200文字〜300文字程度。人格から読み取れる本質的な性格特性を丁寧に解説してください）",
  "destiny": "【人生・仕事運の鑑定結果】（200文字〜300文字程度。社会的な成功運、適職、人生のバイオリズムについて解説してください）",
  "advice": "【吉凶と助言】（150文字〜200文字程度。総格を踏まえた総合的な運勢のまとめと開運アドバイスを優しく伝えてください）"
}
`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `HTTPエラー ${response.status}`);
  }

  const resData = await response.json();
  const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResult) throw new Error("AIからの応答が空でした。");

  try {
    return JSON.parse(textResult.trim());
  } catch (e) {
    throw new Error("AIが正しいデータ形式で返答できませんでした。");
  }
}

// --- Gemini API 連携（相性鑑定） ---
async function callGeminiAPICompat(key, params) {
  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const relationText = {
    general: "友人・一般",
    romance: "恋愛・結婚",
    business: "仕事・ビジネス"
  }[params.relation] || "一般";

  const prompt = `
あなたは一流の姓名判断鑑定士であり、陰陽五行説や画数による数霊術に精通したAIです。
以下の二人の姓名判断と、二人の相性について鑑定してください。

【対象者の情報】
- 一人目: ${params.lastName1} ${params.firstName1} (よみがな: ${params.lastNameKana1} ${params.firstNameKana1})
- 二人目: ${params.lastName2} ${params.firstName2} (よみがな: ${params.lastNameKana2} ${params.firstNameKana2})
- 二人の関係性: ${relationText}

【出力JSONフォーマット】
{
  "so1": 一人目の総格の数値,
  "so2": 二人目の総格の数値,
  "compatRate": 0から100の数値(相性共鳴度),
  "essence": "【縁（えにし）と基本相性】（200文字〜300文字程度。響きや五行のバランスから基本的な引き合う強さについて解説してください）",
  "synergy": "【発展とシナジー】（200文字〜300文字程度。二人が協力した際に生まれる相乗効果について解説してください）",
  "advice": "【調和へのアドバイス】（150文字〜200文字程度。より良い関係を築くための注意点や開運アクションを伝えてください）"
}
`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `HTTPエラー ${response.status}`);
  }

  const resData = await response.json();
  const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResult) throw new Error("AIからの応答が空でした。");

  try {
    return JSON.parse(textResult.trim());
  } catch (e) {
    throw new Error("AIが正しいデータ形式で返答できませんでした。");
  }
}

// --- Gemini API 連携（命名鑑定） ---
async function callGeminiAPINaming(key, params) {
  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const genderText = params.gender === 'boy' ? '男の子' : params.gender === 'girl' ? '女の子' : '指定なし';
  const elementText = params.element ? `重視したい五行・要素: ${params.element}` : '';

  const prompt = `
あなたは赤ちゃんの命名・漢字提案に精通した姓名判断鑑定士AIです。
以下の条件で、子供の命名候補と漢字のリコメンドを提案してください。

【条件】
- 名字（姓）: ${params.lastName} (よみがな: ${params.lastNameKana})
- 性別: ${genderText}
${params.firstNameKana ? `- 希望する名前のよみがな（響き）: ${params.firstNameKana}` : '- よみがな: 名字に合うものからAIが自由に提案'}
${params.wish ? `- 子供に込めたい願いやイメージ: ${params.wish}` : ''}
${elementText}

【出力JSONフォーマット】
{
  "tenkaku": 名字の天格数値,
  "bestScores": "おすすめの画数の組み合わせ（例：『地格16画・総格31画』など）",
  "advice": "名字の画数からみた吉数配置に関するアドバイス（80文字〜120文字程度）",
  "candidates": [
    {
      "kanji": "名前の漢字",
      "kana": "よみがな（ひらがな）",
      "meanings": "漢字の意味、成り立ち、そして込められた願いとの関連性の解説（120文字〜180文字程度）",
      "scores": {
        "tenkaku": { "score": 名字天格の数値, "fortune": "家運" },
        "jinkaku": { "score": 人格の数値, "fortune": "吉凶" },
        "chikaku": { "score": 地格の数値, "fortune": "吉凶" },
        "gaikaku": { "score": 外格の数値, "fortune": "吉凶" },
        "sokaku": { "score": 総格の数値, "fortune": "吉凶" }
      }
    }
  ],
  "blessing": "子供の未来への温かい祝福と名付けに関する優しいアドバイスメッセージ（120文字〜180文字程度）"
}
`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `HTTPエラー ${response.status}`);
  }

  const resData = await response.json();
  const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResult) throw new Error("AIからの応答が空でした。");

  try {
    return JSON.parse(textResult.trim());
  } catch (e) {
    throw new Error("AIが正しいデータ形式で返答できませんでした。");
  }
}

// --- Gemini API 連携（今日の運勢） ---
async function callGeminiAPIDaily(key, params) {
  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const today = new Date().toLocaleDateString('ja-JP');

  const prompt = `
あなたは一流の姓名判断鑑定士であり、数霊術と今日の運気の波長を読み解くAIです。
以下の人物について、今日の日付と名前の数霊波長から、「本日の運勢」を診断してください。

【対象者の情報】
- 氏名: ${params.lastName} ${params.firstName}
- よみがな: ${params.lastNameKana} ${params.firstNameKana}
- 今日（診断対象日）の日付: ${today}

【ルール】
1. 今日の総合評価を1〜5の星の数で決定してください（3: 普通, 4: 良い, 5: 絶好調, 2: 停滞期, 1: 試練期）。
2. 本日のこの人のエネルギーを最大化（または安定）させる「今日のラッキーカラー」と「今日のラッキーアイテム」を決定してください。
3. 鑑定結果は以下のJSONフォーマットで返却してください。余計なマークダウンや説明は含めず、純粋なJSONのみを返してください。

【出力JSONフォーマット】
{
  "stars": 1から5の数値(総合波長評価),
  "luckyColor": "ラッキーカラー名（例：『萌黄色 (ライトグリーン)』等、和名＋一般的な英名）",
  "luckyColorCode": "ラッキーカラーのカラーコード（例：『#00ff00』等の有効なHEXカラーコード）",
  "luckyItem": "ラッキーアイテム",
  "flow": "【今日の運気と波長】（120文字〜180文字程度。名前の総格と今日の日付の相性から、本日の全体的なエネルギーのバイオリズムを解説してください）",
  "action": "【おすすめのアクション】（120文字〜180文字程度。今日運気を引き寄せるための具体的な行動や、気をつけるべき心構えを伝えてください）"
}
`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `HTTPエラー ${response.status}`);
  }

  const resData = await response.json();
  const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResult) throw new Error("AIからの応答が空でした。");

  try {
    return JSON.parse(textResult.trim());
  } catch (e) {
    throw new Error("AIが正しいデータ形式で返答できませんでした。");
  }
}

// --- モックデータ生成（個人鑑定） ---
function getMockDataSingle(lastName, firstName, lastNameKana, firstNameKana) {
  const fullName = lastName + firstName;
  let hash = 0;
  for (let i = 0; i < fullName.length; i++) {
    hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const ten = (lastName.length * 7 + (hash % 10)) % 40 + 5;
  const jin = (firstName.length * 8 + ((hash >> 2) % 12)) % 40 + 5;
  const chi = (firstName.length * 6 + ((hash >> 4) % 15)) % 40 + 5;
  const gai = Math.abs((ten + chi) - jin) || 12;
  const so = ten + chi;

  const fortunes = ["大吉", "吉", "吉", "小吉", "吉凶半々", "吉", "大吉", "大凶", "凶"];
  const getFortune = (val) => fortunes[val % fortunes.length];

  const luckyColors = ["茜色 (マダーレッド)", "山吹色 (ゴールド)", "瑠璃色 (ロイヤルブルー)", "翡翠色 (ミントグリーン)", "桜色 (ソフトピンク)"];
  const luckyColorCodes = ["#b7282e", "#fabf14", "#0052ad", "#38b48b", "#fef4f4"];
  const luckyItems = ["木製のコーム", "金属製のキーホルダー", "観葉植物", "温かいハーブティー", "お気に入りの香水"];

  const essences = [
    `${lastName}様の持つ「水」の性質と、${firstName}様の持つ「木」の性質が美しく調和しています。本質的には非常に知的で直感力に優れ、他者の気持ちを敏感に察知できる優しい心の持ち主です。`,
    `非常に情熱的で活発なエネルギーに満ちたお名前です。${firstName}という響きには、新しい道を切り拓く強いパイオニア精神が宿っています。困難な状況にあっても決して諦めないリーダータイプです。`,
    `調和と安定を重んじる、非常に穏やかで誠実な資質を持っています。誰に対しても公平に接することができ、グループや組織の調停役として絶大な信頼を得るでしょう。`
  ];

  const destinies = [
    `人生を通じて、対人関係に非常に恵まれる運勢を持っています。仕事面では、人と人を繋ぐポジションや、創造性を活かせる分野で頭角を現すでしょう。`,
    `若いうちから自立心が強く、独自のキャリアを築く運命にあります。直感と決断力に優れているため、専門性の高い職種で大成功を収める暗示があります。`,
    `着実な努力がそのまま実を結ぶ、非常に堅実な成功運を持っています。社会的な信頼を重視する分野で本領を発揮します。生涯を通じて穏やかな人生設計を描けるでしょう。`
  ];

  const advices = [
    `総格${so}画は「発展と調和」を司る数霊です。現状に満足せず、常に少し高めの目標を持つことで、潜在能力がさらに引き出されます。感謝の気持ちを大切に。`,
    `総格${so}画は「不屈の開拓精神」を表す力強い画数です。自分の直感を信じて進むことが最大の開運アクションとなります。`,
    `総格${so}画は「幸福と長寿」を示す大変穏やかな吉数です。日々の規則正しい生活と、自然に触れる時間を大切にすることで、心身のエネルギーがクリアに保たれます。`
  ];

  return {
    tenkaku: { score: ten, fortune: getFortune(ten) },
    jinkaku: { score: jin, fortune: getFortune(jin) },
    chikaku: { score: chi, fortune: getFortune(chi) },
    gaikaku: { score: gai, fortune: getFortune(gai) },
    sokaku: { score: so, fortune: getFortune(so) },
    luckyColor: luckyColors[hash % luckyColors.length],
    luckyColorCode: luckyColorCodes[hash % luckyColorCodes.length],
    luckyItem: luckyItems[hash % luckyItems.length],
    essence: essences[hash % essences.length],
    destiny: destinies[(hash >> 1) % destinies.length],
    advice: advices[(hash >> 2) % advices.length]
  };
}

// --- モックデータ生成（相性鑑定） ---
function getMockDataCompat(lastName1, firstName1, lastName2, firstName2) {
  const combName = lastName1 + firstName1 + lastName2 + firstName2;
  let hash = 0;
  for (let i = 0; i < combName.length; i++) {
    hash = combName.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const so1 = (firstName1.length * 9 + (hash % 15)) % 30 + 15;
  const so2 = (firstName2.length * 8 + ((hash >> 2) % 15)) % 30 + 15;
  const compatRate = 50 + (hash % 49);

  const essences = [
    `お二人の名前の響きは、お互いを助け合い成長させる理想的な関係です。${firstName1}様の持つ穏やかな包容力と、${firstName2}様の持つ前向きな推進力が組み合わさることで、出会ってすぐに深い安心感を抱く縁があります。`,
    `お二人の出会いは、お互いにこれまで持っていなかった「新しい視野」をもたらす刺激に満ちた縁です。お互いを深く尊敬し合える関係が築かれます。`,
    `お互いの欠点を自然と補い合える、パズルのピースが噛み合うような相性です。片方が落ち込んでいる時にはもう片方が手を差し伸べ、二人三脚で困難を乗り越えていく運命的な引き合いを持っています。`
  ];

  const synergies = [
    `仕事や共同のプロジェクトにおいて、お二人は爆発的なシナジーを発揮します。役割分担が自然に行われ、一人では到底成し遂げられないような大きな目標を達成できる運勢です。`,
    `お互いに「最高のモチベーター」となれる関係です。相手の活躍を見ることで自分も頑張ろうという前向きな闘志が湧き、切磋琢磨して人生のステージを上げていけます。`,
    `お二人が一緒になることで、精神的な「絶対的安心感」という強固な土台が作られます。どのような嵐のような状況にあっても、二人が支え合うことで揺るぎない平穏がもたらされます。`
  ];

  const advices = [
    `非常に強い共鳴力がある相性ですが、近すぎるあまりに「甘え」が出やすい傾向があります。些細なことでも「ありがとう」と言葉にして感謝を伝えることが絆を保つ鍵です。`,
    `お互いの価値観を認め合える良い関係ですが、こだわりが強くなりすぎて意見が対立することがあります。そんな時は一歩引いて対話する余裕を。`,
    `二人の調和は素晴らしい状態ですが、周囲の雑音に惑わされないように二人の信頼関係を最優先にしてください。二人で決めたことを一歩ずつ進めることが開運への近道です。`
  ];

  return {
    so1, so2, compatRate,
    essence: essences[hash % essences.length],
    synergy: synergies[(hash >> 1) % synergies.length],
    advice: advices[(hash >> 2) % advices.length]
  };
}

// --- モックデータ生成（命名鑑定） ---
function getMockDataNaming(lastName, lastNameKana, firstNameKana, gender, wish) {
  let hash = 0;
  for (let i = 0; i < lastName.length; i++) {
    hash = lastName.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const ten = (lastName.length * 6 + (hash % 10)) % 25 + 10;
  const bestGe = 15;
  const bestSo = ten + bestGe;

  const boys = [
    { kanji: "大翔", kana: "ひろと", meanings: "『大』は大きく羽ばたくこと、『翔』は空を舞うことを意味します。周囲を圧倒するダイナミックな才能を開花させ、世界の舞台で自由かつ羽ばたいて活躍してほしいという願いが込められています。" },
    { kanji: "悠真", kana: "ゆうま", meanings: "『悠』はのびのびとした時の流れや広い心、『真』は嘘偽りのない誠実さを表します。他者に対して常に優しく誠実に向き合える、スケールの大きい人物になってほしいという願いです。" },
    { kanji: "陽向", kana: "ひなた", meanings: "『陽』は太陽の光、『向』は前を向いて進む姿勢を表します。周囲を明るく照らす温かい光のような存在であり、希望に向かって歩み続けることを応援するお名前です。" }
  ];

  const girls = [
    { kanji: "陽葵", kana: "ひまり", meanings: "『陽』は暖かく明るい太陽の光、『葵』は太陽に向かってまっすぐ咲く美しい花を意味します。誰からも愛される明るさを持ち、目標に凛と向かって美しく成長してほしいという願いが込められています。" },
    { kanji: "結衣", kana: "ゆい", meanings: "『結』は人との絆や協力、『衣』は優しく包み込む衣服を表します。周囲との絆を大切にし、人を温かく包み込める包容力のある優しい人になりますようにという願いです。" },
    { kanji: "美咲", kana: "みさき", meanings: "『美』は調和のとれた美しさ、『咲』は才能が開花し笑顔がこぼれることを意味します。内面も外見も美しく磨き上げられ、笑顔と才能の花を咲かせてほしいという親心が込められています。" }
  ];

  let selectedCandidates = gender === 'girl' ? girls : boys;

  if (firstNameKana) {
    selectedCandidates = selectedCandidates.map((cand, idx) => {
      const kanjis = gender === 'girl' ? ["愛結", "陽彩", "花音"] : ["大和", "颯太", "陸斗"];
      return {
        kanji: kanjis[idx],
        kana: firstNameKana,
        meanings: `希望された『${firstNameKana}』という美しい響きに合わせ、『${kanjis[idx]}』という漢字を当てました。名前の響きが持つ優しい波動と、画数吉数配置が合致した非常に素晴らしい命名です。`
      };
    });
  }

  const resultCandidates = selectedCandidates.map(cand => {
    const jin = (cand.kanji.length * 8 + (hash % 10)) % 25 + 10;
    const chi = bestGe;
    const gai = Math.abs((ten + chi) - jin) || 12;
    const so = ten + chi;

    const fortunes = ["大吉", "吉", "大吉", "吉", "小吉"];
    const getFortune = (val) => fortunes[val % fortunes.length];

    return {
      kanji: cand.kanji,
      kana: cand.kana,
      meanings: cand.meanings,
      scores: {
        tenkaku: { score: ten, fortune: "家運" },
        jinkaku: { score: jin, fortune: getFortune(jin) },
        chikaku: { score: chi, fortune: getFortune(chi) },
        gaikaku: { score: gai, fortune: getFortune(gai) },
        sokaku: { score: so, fortune: getFortune(so) }
      }
    };
  });

  const blessings = [
    `新しい命の誕生、心よりお祝い申し上げます。${lastName}家の伝統ある画数に調和し、現代的な輝きを放つ素晴らしいお名前候補が集まりました。言葉の響きはお子様の最初の一歩であり、一生の宝物です。`,
    `お子様への温かい想いが、名前の響きを通して確かに表現されています。名字との組み合わせにおいて、五行が互いを強め合う吉数配置となっており、生涯を通じて安定した守護と発展が期待できるお名前です。`
  ];

  return {
    tenkaku: ten,
    bestScores: `地格 ${bestGe}画・総格 ${bestSo}画`,
    advice: `${lastName}家の名字（天格 ${ten}画）は非常にどっしりとした安定感があります。これに調和する地格 ${bestGe}画の名前を合わせることで、人格・総格ともに最高クラスの大吉数が配置され、子供の個性を最大化する運気が開かれます。`,
    candidates: resultCandidates,
    blessing: blessings[hash % blessings.length]
  };
}

// --- モックデータ生成（今日の運勢） ---
function getMockDataDaily(lastName, firstName) {
  const fullName = lastName + firstName;
  
  // 今日の日付を文字列化
  const todayStr = new Date().toLocaleDateString('ja-JP');
  const combName = fullName + todayStr;

  let hash = 0;
  for (let i = 0; i < combName.length; i++) {
    hash = combName.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const stars = 3 + (hash % 3); // 3〜5の星評価

  const luckyColors = ["茜色 (マダーレッド)", "山吹色 (ゴールド)", "瑠璃色 (ロイヤルブルー)", "翡翠色 (ミントグリーン)", "桜色 (ソフトピンク)"];
  const luckyColorCodes = ["#b7282e", "#fabf14", "#0052ad", "#38b48b", "#fef4f4"];
  const luckyItems = ["お気に入りの本", "お気に入りの香水", "温かいお茶", "ペンケース", "レザーの財布"];

  const flows = [
    `今日のあなたのお名前の数霊は、周囲のバイオリズムと同調し、非常に調和のとれた波長を生み出しています。新しいことを始めたり、大切な人との対話を行ったりするのに最も適したエネルギーの持ち上がりを見せています。`,
    `本日は「安定」を象徴する静かな一日になりそうです。無理に動き回るよりも、自分の内面を見つめ直し、足元を固めることで最大の幸運を呼び込める安定的な流れとなっています。`,
    `今日は非常に活力にあふれた活発な運気です。チャンスは突然訪れる暗示がありますので、いつでも動けるフットワークの軽さを大切にすると、素晴らしい出会いや進展がもたらされるでしょう。`
  ];

  const actions = [
    `朝一番に冷たい水を一杯飲み、大きく深呼吸をすることが今日の開運アクションです。身の回りの不要な書類や不要なファイルを少し整理するだけでも、停滞していた運気が一気に動き出します。`,
    `今日は、日頃なかなか話す機会のない同僚や友人に一言、挨拶を投げかけてみてください。思いがけない有益なアドバイスや、新しい仕事のヒントがその会話から見つかる予感があります。`,
    `お気に入りのカフェや静かな場所で、自分の好きな音楽を聴く時間が今日の運気をさらにパワーアップさせます。何よりもリラックスを心がけることが大切です。`
  ];

  return {
    stars,
    luckyColor: luckyColors[hash % luckyColors.length],
    luckyColorCode: luckyColorCodes[hash % luckyColorCodes.length],
    luckyItem: luckyItems[hash % luckyItems.length],
    flow: flows[hash % flows.length],
    action: actions[hash % actions.length]
  };
}

