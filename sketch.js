let allQuestions = [];      // 從 Google Sheets 載入的所有題目
let quizQuestions = [];     // 每次隨機抽出的 5 題
let currentQuestion = 0;
let score = 0;
let selectedOption = null;
let isAnswered = false;
let optionButtons = [];
let nextButton;             
let restartButton;          
let categoryPhysicsButton;  // 物理科普按鈕
let categoryMathButton;     // 數學基本運算按鈕
let isLoading = false;      // 一開始先不載入，等選擇分類後才載入
let isSelectingCategory = true; // 是否正在選擇分類畫面
let errorMessage = "";      // 用來顯示錯誤訊息
let canvas;                 // 宣告畫布全域變數

// 你的 Google 試算表 CSV 連結對照表
const sheetUrls = {
  // 物理科普（目前為佔位連結，請之後自行替換）
  physics: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2PuVttEbQSfrgiEG_A7GgFvVtsN9nG-RcG5p59AnpJla6C-ORQtN2MWpjbPYjVrYaQFMpRCH2T25D/pub?output=csv',
  // 數學基本運算（剛才提供的連結）
  math: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSBupgugxGCLBHQIc0sM4b9osKaC-Heg-B4VfXD093IS0XgmG9Sh8XGKGHZjiQnKCK0YEILW17Va2Rl/pub?gid=0&single=true&output=csv'
};
let currentSheetCSVUrl = '';

function setup() {
  let canvasWidth = min(windowWidth - 40, 650);
  let canvasHeight = min(windowHeight - 120, 540);
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent("quiz-container");
 
  createOptionButtons();
  
  // 建立「物理科普」分類按鈕
  categoryPhysicsButton = createButton("物理科普");
  styleCategoryButton(categoryPhysicsButton);
  categoryPhysicsButton.mousePressed(() => selectCategory('physics'));

  // 建立「數學基本運算」分類按鈕
  categoryMathButton = createButton("數學基本運算");
  styleCategoryButton(categoryMathButton);
  categoryMathButton.mousePressed(() => selectCategory('math'));

  nextButton = createButton("進入下一題");
  styleMainButton(nextButton);
  nextButton.hide();
  nextButton.mousePressed(goToNextQuestion);

  restartButton = createButton("重新選擇分類");
  styleMainButton(restartButton);
  restartButton.hide();
  restartButton.mousePressed(resetToCategorySelection);

  updateLayout();
}

function styleCategoryButton(btn) {
  btn.style('background-color', '#4f46e5');
  btn.style('color', '#ffffff');
  btn.style('border', 'none');
  btn.style('border-radius', '12px');
  btn.style('font-family', '"Noto Serif TC", serif');
  btn.style('font-weight', '700');
  btn.style('cursor', 'pointer');
  btn.mouseOver(() => btn.style('background-color', '#4338ca'));
  btn.mouseOut(() => btn.style('background-color', '#4f46e5'));
}

function styleMainButton(btn) {
  btn.style('background-color', '#4f46e5');
  btn.style('color', '#ffffff');
  btn.style('border', 'none');
  btn.style('border-radius', '10px');
  btn.style('font-family', '"Noto Serif TC", serif');
  btn.style('font-weight', '700');
  btn.style('cursor', 'pointer');
  btn.mouseOver(() => btn.style('background-color', '#4338ca'));
  btn.mouseOut(() => btn.style('background-color', '#4f46e5'));
}

// 選擇分類並開始載入對應試算表
function selectCategory(category) {
  currentSheetCSVUrl = sheetUrls[category] + '&t=' + Date.now();
  isSelectingCategory = false;
  isLoading = true;
  errorMessage = "";
  
  categoryPhysicsButton.hide();
  categoryMathButton.hide();

  loadTable(currentSheetCSVUrl, 'csv', 'header', 
    (table) => {
      allQuestions = table;
      isLoading = false;
      console.log("題庫載入成功！總筆數：", allQuestions.getRowCount());
      if (allQuestions.getRowCount() > 0) {
        initQuiz();
      } else {
        errorMessage = "試算表內容是空的，請檢查 Google 試算表！";
      }
    }, 
    (err) => {
      isLoading = false;
      errorMessage = "無法讀取 Google 試算表，請檢查 CSV 連結或是否已發布！";
      console.error("載入失敗詳細錯誤：", err);
    }
  );
}

function initQuiz() {
  let rows = allQuestions.getRows();
  let tempQuestions = [];

  for (let r of rows) {
    tempQuestions.push({
      prompt: r.getString('prompt'),
      options: [
        r.getString('optionA'),
        r.getString('optionB'),
        r.getString('optionC'),
        r.getString('optionD')
      ],
      correct: int(r.getString('correct'))
    });
  }

  // Fisher-Yates 隨機洗牌
  for (let i = tempQuestions.length - 1; i > 0; i--) {
    let j = floor(random(i + 1));
    let temp = tempQuestions[i];
    tempQuestions[i] = tempQuestions[j];
    tempQuestions[j] = temp;
  }

  let numToDraw = min(5, tempQuestions.length);
  quizQuestions = tempQuestions.slice(0, numToDraw);
 
  currentQuestion = 0;
  score = 0;
  isAnswered = false;
  selectedOption = null;

  if (quizQuestions.length > 0) {
    resetOptionButtonStyles();
    updateButtonText(0);
    updateLayout(); 
  }
}

function draw() {
  background(15, 23, 42); 
  textFont('Noto Serif TC');

  // 1. 選擇分類畫面
  if (isSelectingCategory) {
    fill(255);
    textSize(24);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text("請選擇測驗主題", width / 2, height / 2 - 85);
    
    categoryPhysicsButton.show();
    categoryMathButton.show();
    for (let btn of optionButtons) btn.hide();
    nextButton.hide();
    restartButton.hide();
    return;
  }

  // 2. 載入中畫面
  if (isLoading) {
    fill(255);
    textSize(18);
    textAlign(CENTER, CENTER);
    text("正在從 Google 試算表載入題庫...", width / 2, height / 2);
    for (let btn of optionButtons) btn.hide();
    nextButton.hide();
    return;
  }

  // 3. 錯誤訊息畫面
  if (errorMessage !== "") {
    fill(248, 113, 113);
    textSize(16);
    textAlign(CENTER, CENTER);
    text(errorMessage, width / 2, height / 2);
    for (let btn of optionButtons) btn.hide();
    nextButton.hide();
    return;
  }

  // 4. 測驗進行中與結算畫面
  if (currentQuestion < quizQuestions.length) {
    if (quizQuestions.length > 0 && optionButtons.length === 4) {
      let currentLabelCheck = optionButtons[0].html();
      if (currentLabelCheck.endsWith(": ") || currentLabelCheck === "") {
        updateButtonText(currentQuestion);
      }
    }
    drawQuizScreen();
    restartButton.hide();
  } else {
    drawScoreScreen();
    for (let btn of optionButtons) {
      btn.hide();
    }
    nextButton.hide();
    restartButton.show();
  }
}

function drawQuizScreen() {
  let q = quizQuestions[currentQuestion];
  let isMobile = width < 480;

  fill(148, 163, 184);
  noStroke();
  textSize(isMobile ? 14 : 16);
  textAlign(LEFT, TOP);
  text(`題目 ${currentQuestion + 1} / ${quizQuestions.length}`, 24, 20);

  fill(255);
  textSize(isMobile ? 20 : 24);
  textStyle(BOLD);
  text(q.prompt, 24, 50, width - 48);

  if (isAnswered) {
    textSize(isMobile ? 14 : 16);
    textStyle(BOLD);
    let labels = ["A", "B", "C", "D"];
    let feedbackY = height - 55; 
   
    if (selectedOption === q.correct) {
      fill(74, 222, 128);
      text("✔ 答對了！", 24, feedbackY);
    } else {
      fill(248, 113, 113);
      text(`✖ 答錯！正確答案是：${labels[q.correct]}: ${q.options[q.correct]}`, 24, feedbackY);
    }
  }
}

function drawScoreScreen() {
  let isMobile = width < 480;

  fill(255);
  textSize(isMobile ? 26 : 32);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text("測驗結束！", width / 2, height / 2 - 80);

  textSize(isMobile ? 20 : 24);
  fill(129, 140, 248);
  text(`你的總分：${Math.round(score)} / 100 分`, width / 2, height / 2 - 25);

  fill(148, 163, 184);
  textSize(isMobile ? 14 : 16);
  text("要返回重新選擇分類嗎？", width / 2, height / 2 + 25);
}

function createOptionButtons() {
  let labels = ["A", "B", "C", "D"];

  for (let i = 0; i < 4; i++) {
    let btn = createButton(`${labels[i]}: `);
    btn.style('background-color', '#1e293b');
    btn.style('color', '#f8fafc');
    btn.style('border', '2px solid #334155');
    btn.style('border-radius', '10px');
    btn.style('font-family', '"Noto Serif TC", serif');
    btn.style('font-weight', '600');
    btn.style('cursor', 'pointer');
    btn.style('text-align', 'left');
    btn.hide();
   
    let index = i;
    btn.mousePressed(() => handleAnswer(index));
   
    btn.mouseOver(() => {
      if (!isAnswered) btn.style('background-color', '#334155');
    });
    btn.mouseOut(() => {
      if (!isAnswered) btn.style('background-color', '#1e293b');
    });

    optionButtons.push(btn);
  }
}

function updateButtonText(qIndex) {
  if (quizQuestions.length === 0 || !quizQuestions[qIndex]) return;
  let q = quizQuestions[qIndex];
  let labels = ["A", "B", "C", "D"];
  for (let i = 0; i < optionButtons.length; i++) {
    optionButtons[i].html(`${labels[i]}: ${q.options[i]}`);
    optionButtons[i].show();
  }
  updateLayout(); 
}

function resetOptionButtonStyles() {
  for (let btn of optionButtons) {
    btn.style('background-color', '#1e293b');
    btn.style('border', '2px solid #334155');
  }
}

function updateLayout() {
  if (!canvas) return; 

  let canvasWidth = constrain(windowWidth - 40, 320, 650);
  let canvasHeight = constrain(windowHeight - 140, 480, 620);
  resizeCanvas(canvasWidth, canvasHeight);

  let isMobile = canvasWidth < 480;
  let canvasX = (windowWidth - canvasWidth) / 2;
  let canvasY = (windowHeight - canvasHeight) / 2 - 20;

  // 調整分類按鈕的位置
  if (categoryPhysicsButton && categoryMathButton) {
    let catBtnWidth = isMobile ? canvasWidth - 48 : 260;
    let catBtnHeight = isMobile ? 46 : 52;
    
    categoryPhysicsButton.size(catBtnWidth, catBtnHeight);
    categoryPhysicsButton.position(canvasX + (canvasWidth - catBtnWidth) / 2, canvasY + height / 2 - 15);
    categoryPhysicsButton.style('font-size', isMobile ? '16px' : '18px');

    categoryMathButton.size(catBtnWidth, catBtnHeight);
    categoryMathButton.position(canvasX + (canvasWidth - catBtnWidth) / 2, canvasY + height / 2 + 50);
    categoryMathButton.style('font-size', isMobile ? '16px' : '18px');
  }

  let btnWidth = canvasWidth - 48;
  let btnHeight = isMobile ? 40 : 44;
  let gap = isMobile ? 48 : 52; 

  let startY = 200; 
  if (quizQuestions.length > 0 && currentQuestion < quizQuestions.length) {
    let q = quizQuestions[currentQuestion];
    let fontSize = isMobile ? 20 : 24;
    let approxRows = Math.ceil((q.prompt.length * fontSize) / (canvasWidth - 48));
    let promptHeight = approxRows * (fontSize + 6); 
    startY = max(200, 50 + promptHeight + 20); 
  }

  for (let i = 0; i < optionButtons.length; i++) {
    optionButtons[i].size(btnWidth, btnHeight);
    optionButtons[i].position(canvasX + 24, canvasY + startY + (i * gap));
    optionButtons[i].style('font-size', isMobile ? '14px' : '15px');
    optionButtons[i].style('padding-left', isMobile ? '12px' : '16px');
  }

  if (nextButton) {
    let nBtnWidth = isMobile ? canvasWidth - 48 : 200;
    let nBtnHeight = isMobile ? 42 : 46;
    nextButton.size(nBtnWidth, nBtnHeight);
    nextButton.position(canvasX + 24, canvasY + canvasHeight - 50);
    nextButton.style('font-size', isMobile ? '15px' : '16px');
  }

  if (restartButton) {
    let rBtnWidth = isMobile ? 180 : 220;
    let rBtnHeight = isMobile ? 44 : 50;
    restartButton.size(rBtnWidth, rBtnHeight);
    restartButton.position(windowWidth / 2 - rBtnWidth / 2, canvasY + canvasHeight / 2 + 100);
    restartButton.style('font-size', isMobile ? '16px' : '18px');
  }
}

function windowResized() {
  updateLayout();
}

function handleAnswer(choice) {
  if (isAnswered || quizQuestions.length === 0) return;
 
  isAnswered = true;
  selectedOption = choice;
  let q = quizQuestions[currentQuestion];

  let pointsPerQuestion = 100 / quizQuestions.length;
  if (choice === q.correct) {
    score += pointsPerQuestion;
    optionButtons[choice].style('background-color', '#166534');
    optionButtons[choice].style('border', '2px solid #4ade80');
  } else {
    optionButtons[choice].style('background-color', '#991b1b');
    optionButtons[choice].style('border', '2px solid #f87171');
   
    optionButtons[q.correct].style('background-color', '#166534');
    optionButtons[q.correct].style('border', '2px solid #4ade80');
  }

  // 確保點擊後立刻顯示並重新定位「進入下一題」按鈕
  updateLayout();
  nextButton.show();
}

function goToNextQuestion() {
  currentQuestion++;
  isAnswered = false;
  selectedOption = null;
  nextButton.hide();
  resetOptionButtonStyles();

  if (currentQuestion < quizQuestions.length) {
    updateButtonText(currentQuestion);
  }
}

// 重新回到分類選擇畫面
function resetToCategorySelection() {
  isSelectingCategory = true;
  restartButton.hide();
  for (let btn of optionButtons) {
    btn.hide();
  }
  updateLayout();
}
