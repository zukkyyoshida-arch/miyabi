// Lucideアイコンの初期化
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  initApp();
});

// アプリの初期化と状態管理
function initApp() {
  // DOM要素の取得
  const btnSettings = document.getElementById('btn-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const modalSettings = document.getElementById('settings-modal');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const inputApiKey = document.getElementById('input-api-key');
  const checkboxUseMock = document.getElementById('checkbox-use-mock');
  const apiStatusText = document.getElementById('api-status-text');
  const apiStatusDiv = document.getElementById('api-status');

  const btnToggleOptions = document.getElementById('btn-toggle-options');
  const optionalFields = document.getElementById('optional-fields');
  const optionsChevron = document.getElementById('options-chevron');

  const form = document.getElementById('fortune-form');
  const btnSubmit = document.getElementById('btn-submit');
  const loadingSection = document.getElementById('loading-section');
  const resultSection = document.getElementById('result-section');
  const btnReset = document.getElementById('btn-reset');

  // タブ要素
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // 設定のロード
  let apiKey = localStorage.getItem('miyabi_gemini_api_key') || '';
  let useMock = localStorage.getItem('miyabi_use_mock') === 'true';

  // APIキーが無い場合は自動的にモックモードをONにする
  if (!apiKey) {
    useMock = true;
  }

  // 設定をUIに反映
  inputApiKey.value = apiKey;
  checkboxUseMock.checked = useMock;
  updateApiStatusUI();

  // --- イベントリスナー ---

  // 設定モーダルの開閉
  btnSettings.addEventListener('click', () => {
    modalSettings.classList.remove('hidden');
  });

  btnCloseSettings.addEventListener('click', () => {
    modalSettings.classList.add('hidden');
  });

  modalSettings.addEventListener('click', (e) => {
    if (e.target === modalSettings) {
      modalSettings.classList.add('hidden');
    }
  });

  // 設定保存
  btnSaveSettings.addEventListener('click', () => {
    apiKey = inputApiKey.value.trim();
    useMock = checkboxUseMock.checked;

    if (!apiKey && !useMock) {
      alert('APIキーを入力するか、モックモードを有効にしてください。');
      return;
    }

    localStorage.setItem('miyabi_gemini_api_key', apiKey);
    localStorage.setItem('miyabi_use_mock', useMock ? 'true' : 'false');
    
    updateApiStatusUI();
    modalSettings.classList.add('hidden');
  });

  // オプションフィールドの開閉
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

  // タブ切り替え
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      button.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });

  // 占い実行
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const lastName = document.getElementById('input-last-name').value.trim();
    const firstName = document.getElementById('input-first-name').value.trim();
    const lastNameKana = document.getElementById('input-last-name-kana').value.trim();
    const firstNameKana = document.getElementById('input-first-name-kana').value.trim();
    const birthday = document.getElementById('input-birthday').value;
    const gender = document.getElementById('input-gender').value;

    // UI状態の更新 (ローディングへ)
    form.parentElement.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    resultSection.classList.add('hidden');

    // ローディングテキストの演出用タイマー
    const loadingTexts = [
      "天格・地格・人格を解析中...",
      "陰陽のバランスと五行の調和を測定中...",
      "AIが名前に込められた本質を読み解いています...",
      "天命のアドバイスを組み立てています..."
    ];
    let textIndex = 0;
    const loadingInterval = setInterval(() => {
      textIndex = (textIndex + 1) % loadingTexts.length;
      document.getElementById('loading-text').textContent = loadingTexts[textIndex];
    }, 2500);

    try {
      let resultData;
      if (useMock) {
        // デモ用のディレイ
        await new Promise(resolve => setTimeout(resolve, 3000));
        resultData = getMockData(lastName, firstName, lastNameKana, firstNameKana);
      } else {
        resultData = await callGeminiAPI(apiKey, {
          lastName, firstName, lastNameKana, firstNameKana, birthday, gender
        });
      }

      // 結果をUIに描画
      displayResult(resultData, lastName, firstName, lastNameKana, firstNameKana);

    } catch (error) {
      console.error(error);
      alert(`エラーが発生しました: ${error.message}\n設定画面でAPIキーを確認するか、モックモードでお試しください。`);
      
      // フォームに戻す
      form.parentElement.classList.remove('hidden');
    } finally {
      clearInterval(loadingInterval);
      loadingSection.classList.add('hidden');
    }
  });

  // リセットボタン (もう一度占う)
  btnReset.addEventListener('click', () => {
    resultSection.classList.add('hidden');
    form.parentElement.classList.remove('hidden');
    form.reset();
    optionalFields.classList.add('hidden');
    optionsChevron.classList.remove('rotate');
    // タブを一番最初に戻す
    tabButtons[0].click();
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
}

// --- Gemini API 連携 ---
async function callGeminiAPI(key, params) {
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
2. 漢字の画数は、伝統的な康煕字典（旧字体）の画数を基準とすることが望ましいですが、現代で一般的な画数での解説でも構いません。
3. 鑑定結果は以下のJSONフォーマットで返却してください。余計なマークダウンや説明テキストは含めず、純粋なJSONのみを返してください。

【出力JSONフォーマット】
{
  "tenkaku": { "score": 数値, "fortune": "吉凶文字列" },
  "jinkaku": { "score": 数値, "fortune": "吉凶文字列" },
  "chikaku": { "score": 数値, "fortune": "吉凶文字列" },
  "gaikaku": { "score": 数値, "fortune": "吉凶文字列" },
  "sokaku": { "score": 数値, "fortune": "吉凶文字列" },
  "essence": "【本質・性格の鑑定結果】（200文字〜300文字程度。名前の響きや五行のバランス、人格から読み取れる本質的な性格特性を丁寧に解説してください）",
  "destiny": "【人生・仕事運の鑑定結果】（200文字〜300文字程度。社会的な成功運、適職、対人関係、人生のバイオリズムについて解説してください）",
  "advice": "【吉凶と助言】（150文字〜200文字程度。総格を踏まえた総合的な運勢のまとめと、より豊かな人生を送るための具体的な心構えや開運アドバイスを優しく伝えてください）"
}

レスポンスは必ずこのJSONスキーマに完全に従った有効なJSONオブジェクトにしてください。
`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `HTTPエラー ${response.status}`);
  }

  const resData = await response.json();
  const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textResult) {
    throw new Error("AIからの応答が空でした。");
  }

  try {
    return JSON.parse(textResult.trim());
  } catch (e) {
    console.error("JSONパース失敗:", textResult);
    throw new Error("AIが正しいデータ形式で返答できませんでした。もう一度お試しください。");
  }
}

// --- モックデータ生成ロジック ---
function getMockData(lastName, firstName, lastNameKana, firstNameKana) {
  // 文字コードなどから簡易的なハッシュ値を生成し、常に同じ名前なら同じ結果が出るようにする
  const fullName = lastName + firstName;
  let hash = 0;
  for (let i = 0; i < fullName.length; i++) {
    hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  // 画数（モック）の計算
  // 名字の文字数や名前の文字数からそれっぽく算出
  const ten = (lastName.length * 7 + (hash % 10)) % 40 + 5;
  const jin = (firstName.length * 8 + ((hash >> 2) % 12)) % 40 + 5;
  const chi = (firstName.length * 6 + ((hash >> 4) % 15)) % 40 + 5;
  const gai = Math.abs((ten + chi) - jin) || 12;
  const so = ten + chi;

  const fortunes = ["大吉", "吉", "吉", "小吉", "吉凶半々", "吉", "大吉"];
  const getFortune = (val) => fortunes[val % fortunes.length];

  // 性格特性などの文面パターン
  const essences = [
    `${lastName}様の持つ「水」の性質と、${firstName}様の持つ「木」の性質が美しく調和しています。本質的には非常に知的で直感力に優れ、他者の気持ちを敏感に察知できる優しい心の持ち主です。時折、深く考えすぎるあまり慎重になりすぎる傾向がありますが、その熟考こそが大きな失敗を防ぐ盾となっています。周囲に安心感を与える不思議な魅力があり、自然と人が集まる存在です。`,
    `非常に情熱的で活発なエネルギーに満ちたお名前です。${firstName}という響きには、新しい道を切り拓く強いパイオニア精神が宿っています。困難な状況にあっても決して諦めず、持ち前のバイタリティで自ら道を切り拓くリーダータイプです。その一方で、内面は非常に繊細で、身内や仲間を誰よりも大切にする温かい心の持ち主でもあります。`,
    `調和と安定を重んじる、非常に穏やかで誠実な資質を持っています。誰に対しても公平に接することができ、グループや組織の調停役として絶大な信頼を得るでしょう。一歩一歩着実にステップアップしていく大器晩成型です。自己主張を抑えがちなところがありますが、自分の意見を素直に表現することで、さらに魅力が開花します。`
  ];

  const destinies = [
    `人生を通じて、対人関係に非常に恵まれる運勢を持っています。仕事面では、人と人を繋ぐポジションや、創造性を活かせる分野で頭角を現すでしょう。特に30代半ばから晩年にかけて、それまでに築いた信頼関係が大きな花を咲かせ、社会的・経済的な安定を手に入れます。独立独歩よりも、良きパートナーや仲間に恵まれることで運気が倍増します。`,
    `若いうちから自立心が強く、独自のキャリアを築く運命にあります。直感と決断力に優れているため、不確実な状況でも正しい選択を瞬時に行うことができます。クリエイティブな開発業務や、専門性の高い職種で大成功を収める暗示があります。財運も非常に強く、自らのアイデアを形にすることで大きな富を引き寄せます。`,
    `着実な努力がそのまま実を結ぶ、非常に堅実な成功運を持っています。教育、福祉、公務、あるいは大企業の管理職など、社会的な信頼を重視する分野で本領を発揮します。生涯を通じて極端な浮き沈みが少なく、穏やかで安心感のある人生設計を描くことができるでしょう。中年期以降、趣味や副業が本業を超えるような素晴らしい展開も期待できます。`
  ];

  const advices = [
    `総格${so}画は「発展と調和」を司る吉数です。現状に満足せず、常に少し高めの目標を持つことで、潜在能力がさらに引き出されます。日頃から感謝の気持ちを言葉で伝えるようにすると、対人運がさらに向上し、ピンチの時に強力な助っ人が現れるでしょう。`,
    `総格${so}画は「不屈の開拓精神」を表す力強い画数です。自分の直感を信じて進むことが最大の開運アクションとなります。時折、周囲とのスピード感のズレから摩擦が生じることがありますので、対話の時間を意識的に持つと吉です。`,
    `総格${so}画は「幸福と長寿」を示す大変穏やかな吉数です。日々の規則正しい生活と、自然に触れる時間を大切にすることで、心身のエネルギーがクリアに保たれます。自身の持つ「癒やし」の力を信じ、周囲の人に微笑みを与えることで運気は最高潮に達します。`
  ];

  return {
    tenkaku: { score: ten, fortune: getFortune(ten) },
    jinkaku: { score: jin, fortune: getFortune(jin) },
    chikaku: { score: chi, fortune: getFortune(chi) },
    gaikaku: { score: gai, fortune: getFortune(gai) },
    sokaku: { score: so, fortune: getFortune(so) },
    essence: essences[hash % essences.length],
    destiny: destinies[(hash >> 1) % destinies.length],
    advice: advices[(hash >> 2) % advices.length]
  };
}

// --- 結果表示とタイピングエフェクト ---
function displayResult(data, lastName, firstName, lastNameKana, firstNameKana) {
  const resultSection = document.getElementById('result-section');
  
  // 名前とカナのセット
  document.getElementById('result-name').textContent = `${lastName} ${firstName} 殿`;
  document.getElementById('result-kana').textContent = `${lastNameKana} ${firstNameKana}`;

  // 各格の点数とバッジの反映
  setScoreUI('score-ten', data.tenkaku);
  setScoreUI('score-jin', data.jinkaku);
  setScoreUI('score-chi', data.chikaku);
  setScoreUI('score-gai', data.gaikaku);
  setScoreUI('score-so', data.sokaku);

  // 結果セクションを表示
  resultSection.classList.remove('hidden');

  // AI鑑定テキストのクリアと流し込み（タイピング風）
  const essenceTarget = document.getElementById('ai-essence-text');
  const destinyTarget = document.getElementById('ai-destiny-text');
  const adviceTarget = document.getElementById('ai-advice-text');

  essenceTarget.textContent = '';
  destinyTarget.textContent = '';
  adviceTarget.textContent = '';

  // タブが切り替わったときにもテキストが表示されているようにするため、
  // 最初はタイピング風に表示しつつ、完了フラグを管理するか、即座にタイピングを開始します。
  // ここでは、現在のアクティブなタブから順次または同時並行でタイピング表示を行います。
  typeWriter(data.essence, essenceTarget, 15);
  typeWriter(data.destiny, destinyTarget, 15);
  typeWriter(data.advice, adviceTarget, 15);
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

// タイピング風テキスト演出
function typeWriter(text, element, speed = 20) {
  let i = 0;
  element.textContent = '';
  
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  type();
}
