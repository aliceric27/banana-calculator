// 控制變量
let isActive = false;
let salary = 0;
let payday = 1;
let moneyBags = [];
let intervalId = null;
let dashboardIntervalId = null;
let startTime = null;
let lastUpdateTime = null;
let workStartHour = 9; // 默認工作開始時間
let workEndHour = 17; // 默認工作結束時間
let accumulatedAmount = 0; // 用於累計賺取的全局變量
let todayEarnedAmount = 0; // 用於今日賺取的全局變量
let updateIntervalId = null; // 用於更新金額的計時器
let debugMode = true; // 開啟調試模式，不考慮工作時間限制
let soundEnabled = true; // 是否啟用音效
let maxCoins = 20; // 預設最大金幣數量

// 用於快速播放的預加載音效對象
let cachedDropSound = null;
let cachedPickupSound = null;

// 錢袋圖片和音效路徑
const MONEY_IMAGE_PATH = chrome.runtime.getURL('images/meso.webp');
const DROP_SOUND_PATH = chrome.runtime.getURL('sounds/DropItem.mp3');
const PICKUP_SOUND_PATH = chrome.runtime.getURL('sounds/pickup.mp3');

// 預加載音效和圖片
function preloadAssets() {
  // 預加載圖片
  const img = new Image();
  img.src = MONEY_IMAGE_PATH;
  
  // 預加載音效
  cachedDropSound = new Audio(DROP_SOUND_PATH);
  cachedDropSound.load();
  
  cachedPickupSound = new Audio(PICKUP_SOUND_PATH);
  cachedPickupSound.load();
  
  console.log('預加載資源完成');
}

// 播放錢袋出現音效
function playDropSound() {
  if (!soundEnabled) return;
  
  try {
    // 使用克隆的Audio對象以允許多次播放
    const audio = cachedDropSound.cloneNode();
    audio.volume = 0.3; // 設定音量為30%
    audio.play().catch(e => {
      console.log('音效播放失敗:', e);
    });
  } catch (e) {
    console.error('音效播放錯誤:', e);
  }
}

// 播放錢袋拾取音效
function playPickupSound() {
  if (!soundEnabled) {
    console.log('音效已被禁用，不播放拾取音效');
    return;
  }
  
  console.log('嘗試播放拾取音效:', PICKUP_SOUND_PATH);
  
  try {
    // 預先創建音頻對象
    const audio = new Audio(PICKUP_SOUND_PATH);
    audio.volume = 0.3; // 設定音量為30%
    
    // 添加事件監聽器以了解音頻狀態
    audio.addEventListener('canplaythrough', () => {
      console.log('拾取音效加載完成，準備播放');
    });
    
    audio.addEventListener('play', () => {
      console.log('拾取音效開始播放');
    });
    
    audio.addEventListener('error', (e) => {
      console.error('拾取音效播放錯誤:', e);
    });
    
    // 播放音效
    const playPromise = audio.play();
    
    // 處理播放承諾
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('拾取音效播放成功');
        })
        .catch(e => {
          console.error('拾取音效播放被拒絕:', e);
          // 嘗試在用戶交互事件中再次播放
          document.addEventListener('click', function playOnClick() {
            audio.play()
              .then(() => console.log('用戶交互後播放成功'))
              .catch(err => console.error('即使在用戶交互後仍無法播放:', err));
            document.removeEventListener('click', playOnClick);
          }, { once: true });
        });
    }
  } catch (e) {
    console.error('拾取音效創建或播放錯誤:', e);
  }
}

// 計算每秒增加的薪資
function calculatePerSecond(monthlySalary, workDays = 22) {
  const workHoursPerDay = workEndHour - workStartHour;
  const secondsPerMonth = workDays * workHoursPerDay * 60 * 60;
  return monthlySalary / secondsPerMonth;
}

// 檢查現在是否在工作時間內
function isWorkingTime() {
  if (debugMode) return true; // 調試模式下總是返回true，不考慮時間限制
  
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // 只在週一到週五的工作時間內增加金額
  return (dayOfWeek > 0 && dayOfWeek < 6 && 
          ((currentHour > workStartHour || (currentHour === workStartHour && currentMinute >= 0)) && 
           (currentHour < workEndHour || (currentHour === workEndHour && currentMinute === 0))));
}

// 初始化累計賺取金額
function initializeAccumulatedAmount() {
  const now = new Date();
  const perSecond = calculatePerSecond(salary);
  
  // 簡化計算，從發薪日開始計算已工作的小時數
  let workingHours = 0;
  
  // 假設自發薪日以來平均每個工作日工作8小時
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let daysPassed = 0;
  
  if (now.getDate() >= payday) {
    // 當前日期在發薪日之後
    daysPassed = now.getDate() - payday;
  } else {
    // 當前日期在發薪日之前，從上個月的發薪日開始計算
    const lastMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    daysPassed = lastMonthDays - payday + now.getDate();
  }
  
  // 計算工作日數量(簡單假設每週5個工作日)
  const workDaysPassed = Math.floor(daysPassed * 5 / 7);
  
  // 計算已工作小時數
  workingHours = workDaysPassed * (workEndHour - workStartHour);
  
  // 今天已工作的時間
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentSecond = now.getSeconds();
  
  if (currentHour >= workStartHour && currentHour < workEndHour) {
    // 今天在工作時間內
    workingHours += (currentHour - workStartHour) + (currentMinute / 60) + (currentSecond / 3600);
  } else if (currentHour >= workEndHour) {
    // 已過工作時間
    workingHours += (workEndHour - workStartHour);
  }
  
  // 計算已工作秒數
  const workingSeconds = workingHours * 3600;
  
  // 計算累計金額和今日金額
  accumulatedAmount = perSecond * workingSeconds;
  
  // 計算今日已工作的秒數
  if (currentHour >= workStartHour && currentHour < workEndHour) {
    const todayWorkedSeconds = ((currentHour - workStartHour) * 3600) + (currentMinute * 60) + currentSecond;
    todayEarnedAmount = perSecond * todayWorkedSeconds;
  } else if (currentHour >= workEndHour) {
    // 已過工作時間，計算整個工作時段
    todayEarnedAmount = perSecond * (workEndHour - workStartHour) * 3600;
  } else {
    todayEarnedAmount = 0; // 今天還沒開始工作
  }
  
  // 強制數值更新到儀表板
  updateDashboard();
  
  console.log('初始化金額 - 累計賺取:', accumulatedAmount.toFixed(2), '今日賺取:', todayEarnedAmount.toFixed(2));
}

// 更新金額（每秒執行）
function updateAmounts() {
  if (!isActive) return;
  
  const perSecond = calculatePerSecond(salary);
  
  // 檢查是否在工作時間內(調試模式下總是更新)
  if (isWorkingTime() || debugMode) {
    // 更新今日賺取和累計賺取
    todayEarnedAmount += perSecond;
    accumulatedAmount += perSecond;
    
    // 輸出調試信息
    if (debugMode) {
      console.log('金額更新 - 每秒增加:', perSecond.toFixed(4), 
                  '累計賺取:', accumulatedAmount.toFixed(2), 
                  '今日賺取:', todayEarnedAmount.toFixed(2));
    }
    
    // 確保儀表板更新
    const dashboard = document.getElementById('salary-dashboard');
    if (dashboard) {
      const todayEarnedElement = document.getElementById('today-earned');
      const totalEarnedElement = document.getElementById('total-earned');
      
      if (todayEarnedElement) {
        todayEarnedElement.querySelector('span:last-child').textContent = 
          `$${todayEarnedAmount.toFixed(2)}`;
      }
      
      if (totalEarnedElement) {
        totalEarnedElement.querySelector('span:last-child').textContent = 
          `$${accumulatedAmount.toFixed(2)}`;
      }
    }
  }
}

// 創建儀表板
function createDashboard() {
  // 檢查是否已經存在儀表板
  if (document.getElementById('salary-dashboard')) return;
  
  const dashboard = document.createElement('div');
  dashboard.id = 'salary-dashboard';
  dashboard.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 15px;
    border-radius: 8px;
    font-family: 'Microsoft JhengHei', sans-serif;
    z-index: 10000;
    min-width: 220px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    transition: opacity 0.3s;
  `;
  
  // 創建標題
  const title = document.createElement('div');
  title.style.cssText = `
    font-weight: bold;
    font-size: 16px;
    margin-bottom: 10px;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    padding-bottom: 5px;
  `;
  title.textContent = '薪資儀表板';
  dashboard.appendChild(title);
  
  // 創建各項指標
  const todayEarned = document.createElement('div');
  todayEarned.id = 'today-earned';
  todayEarned.style.cssText = 'margin: 8px 0;';
  todayEarned.innerHTML = '<span style="color: #aaa;">今日賺取:</span> <span style="float: right; color: #4CAF50;">$0.00</span>';
  dashboard.appendChild(todayEarned);
  
  const perSecond = document.createElement('div');
  perSecond.id = 'per-second';
  perSecond.style.cssText = 'margin: 8px 0;';
  perSecond.innerHTML = '<span style="color: #aaa;">每秒速率:</span> <span style="float: right; color: #2196F3;">$0.00/秒</span>';
  dashboard.appendChild(perSecond);
  
  const totalEarned = document.createElement('div');
  totalEarned.id = 'total-earned';
  totalEarned.style.cssText = 'margin: 8px 0;';
  totalEarned.innerHTML = '<span style="color: #aaa;">累計賺取:</span> <span style="float: right; color: #FFC107;">$0.00</span>';
  dashboard.appendChild(totalEarned);
  
  // 新增目標賺取欄位
  const targetEarned = document.createElement('div');
  targetEarned.id = 'target-earned';
  targetEarned.style.cssText = 'margin: 8px 0;';
  targetEarned.innerHTML = '<span style="color: #aaa;">目標賺取:</span> <span style="float: right; color: #FF5722;">$0.00</span>';
  dashboard.appendChild(targetEarned);
  
  // 顯示金幣數量上限
  const coinLimit = document.createElement('div');
  coinLimit.id = 'coin-limit';
  coinLimit.style.cssText = 'margin: 8px 0;';
  coinLimit.innerHTML = `<span style="color: #aaa;">金幣上限:</span> <span style="float: right; color: #9C27B0;">${maxCoins}個</span>`;
  dashboard.appendChild(coinLimit);
  
  // 當前金幣數量顯示
  const coinCount = document.createElement('div');
  coinCount.id = 'coin-count';
  coinCount.style.cssText = 'margin: 8px 0;';
  coinCount.innerHTML = `<span style="color: #aaa;">目前金幣:</span> <span style="float: right; color: #00BCD4;">0個</span>`;
  dashboard.appendChild(coinCount);
  
  // 工作時間顯示
  const workTime = document.createElement('div');
  workTime.id = 'work-time';
  workTime.style.cssText = 'margin: 5px 0; font-size: 12px; color: #aaa; text-align: center; margin-top: 15px;';
  workTime.textContent = `工作時間: ${workStartHour}:00 - ${workEndHour}:00`;
  dashboard.appendChild(workTime);
  
  // 音效控制
  const soundControl = document.createElement('div');
  soundControl.style.cssText = 'margin: 5px 0; font-size: 12px; text-align: center;';
  soundControl.innerHTML = `<label style="color: #aaa;"><input type="checkbox" id="sound-toggle" ${soundEnabled ? 'checked' : ''}> 啟用音效</label>`;
  dashboard.appendChild(soundControl);
  
  // 音效開關事件
  const soundToggle = soundControl.querySelector('#sound-toggle');
  soundToggle.addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
    // 儲存設定
    chrome.storage.local.set({ soundEnabled: soundEnabled });
  });
  
  // 添加拖動功能
  let isDragging = false;
  let offsetX, offsetY;
  
  title.style.cursor = 'move';
  title.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - dashboard.getBoundingClientRect().left;
    offsetY = e.clientY - dashboard.getBoundingClientRect().top;
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      dashboard.style.right = 'auto';
      dashboard.style.left = (e.clientX - offsetX) + 'px';
      dashboard.style.top = (e.clientY - offsetY) + 'px';
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  document.body.appendChild(dashboard);
  
  // 立即更新儀表板
  updateDashboard();
}

// 更新儀表板數據
function updateDashboard() {
  if (!isActive) return;
  
  const dashboard = document.getElementById('salary-dashboard');
  if (!dashboard) return;
  
  const perSecondValue = calculatePerSecond(salary);
  
  const todayEarnedElement = document.getElementById('today-earned');
  const perSecondElement = document.getElementById('per-second');
  const totalEarnedElement = document.getElementById('total-earned');
  const targetEarnedElement = document.getElementById('target-earned');
  const coinLimitElement = document.getElementById('coin-limit');
  const coinCountElement = document.getElementById('coin-count');
  const workTimeElement = document.getElementById('work-time');
  
  if (todayEarnedElement) {
    todayEarnedElement.innerHTML = `<span style="color: #aaa;">今日賺取:</span> <span style="float: right; color: #4CAF50;">$${todayEarnedAmount.toFixed(2)}</span>`;
  }
  
  if (perSecondElement) {
    perSecondElement.innerHTML = `<span style="color: #aaa;">每秒速率:</span> <span style="float: right; color: #2196F3;">$${perSecondValue.toFixed(4)}/秒</span>`;
  }
  
  if (totalEarnedElement) {
    totalEarnedElement.innerHTML = `<span style="color: #aaa;">累計賺取:</span> <span style="float: right; color: #FFC107;">$${accumulatedAmount.toFixed(2)}</span>`;
  }
  
  if (targetEarnedElement) {
    targetEarnedElement.innerHTML = `<span style="color: #aaa;">目標賺取:</span> <span style="float: right; color: #FF5722;">$${salary.toFixed(2)}</span>`;
  }
  
  if (coinLimitElement) {
    coinLimitElement.innerHTML = `<span style="color: #aaa;">金幣上限:</span> <span style="float: right; color: #9C27B0;">${maxCoins}個</span>`;
  }
  
  if (coinCountElement) {
    coinCountElement.innerHTML = `<span style="color: #aaa;">目前金幣:</span> <span style="float: right; color: #00BCD4;">${moneyBags.length}個</span>`;
  }
  
  if (workTimeElement) {
    workTimeElement.textContent = `工作時間: ${workStartHour}:00 - ${workEndHour}:00`;
  }
}

// 開始定期更新儀表板
function startDashboardUpdates() {
  // 清除可能存在的計時器
  if (dashboardIntervalId) {
    clearInterval(dashboardIntervalId);
    dashboardIntervalId = null;
  }
  
  if (updateIntervalId) {
    clearInterval(updateIntervalId);
    updateIntervalId = null;
  }
  
  // 初始化最後更新時間
  lastUpdateTime = new Date();
  startTime = new Date();
  
  // 先初始化一次金額
  initializeAccumulatedAmount();
  
  // 啟動獨立的金額更新計時器（每秒更新一次）
  updateIntervalId = setInterval(updateAmounts, 1000);
  
  // 更頻繁地更新儀表板，確保視覺呈現平滑
  dashboardIntervalId = setInterval(updateDashboard, 3000);
  
  console.log('已啟動金額更新，計時器ID:', updateIntervalId);
}

// 停止更新儀表板
function stopDashboardUpdates() {
  if (dashboardIntervalId) {
    clearInterval(dashboardIntervalId);
    dashboardIntervalId = null;
  }
  
  if (updateIntervalId) {
    clearInterval(updateIntervalId);
    updateIntervalId = null;
    console.log('已停止金額更新');
  }
  
  // 重置上次更新時間和累計金額
  lastUpdateTime = null;
  accumulatedAmount = 0;
  todayEarnedAmount = 0;
  
  // 移除儀表板
  const dashboard = document.getElementById('salary-dashboard');
  if (dashboard && dashboard.parentNode) {
    dashboard.parentNode.removeChild(dashboard);
  }
}

// 創建錢袋元素
function createMoneyBag() {
  // 獲取頁面尺寸
  const maxWidth = window.innerWidth - 50;
  const maxHeight = window.innerHeight - 50;
  
  // 隨機位置
  const xPos = Math.floor(Math.random() * maxWidth);
  const yPos = Math.floor(Math.random() * maxHeight);
  
  // 創建元素
  const moneyBag = document.createElement('div');
  moneyBag.className = 'salary-money-bag';
  moneyBag.style.cssText = `
    position: fixed;
    left: ${xPos}px;
    top: ${yPos}px;
    width: 32px;
    height: 32px;
    z-index: 9999;
    cursor: pointer;
    user-select: none;
    filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.3));
    animation: pop-in 0.5s ease-out;
    transform-origin: center;
    background-image: url('${MONEY_IMAGE_PATH}');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  `;
  
  // 創建工具提示
  const tooltip = document.createElement('div');
  tooltip.className = 'salary-tooltip';
  tooltip.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 14px;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s;
    font-family: Arial, sans-serif;
  `;
  
  // 計算每秒增加的薪資
  const perSecond = calculatePerSecond(salary);
  tooltip.textContent = `💰${perSecond.toFixed(4)} 元`;
  
  moneyBag.appendChild(tooltip);
  
  // 添加 hover 效果
  moneyBag.addEventListener('mouseenter', () => {
    tooltip.style.opacity = '1';
  });
  
  moneyBag.addEventListener('mouseleave', () => {
    tooltip.style.opacity = '0';
  });
  
  // 添加點擊效果（點擊移除）
  moneyBag.addEventListener('click', () => {
    // 播放拾取音效
    if (soundEnabled) {
      try {
        // 使用預加載並克隆的音效對象
        const audio = cachedPickupSound.cloneNode();
        audio.volume = 0.3;
        
        // 直接播放（在點擊事件中不應該有瀏覽器限制）
        audio.play()
          .then(() => console.log('成功播放拾取音效'))
          .catch(err => console.error('播放拾取音效失敗:', err));
      } catch (e) {
        console.error('無法創建或播放拾取音效:', e);
      }
    }
    
    moneyBag.style.animation = 'pop-out 0.3s forwards';
    setTimeout(() => {
      if (moneyBag.parentNode) {
        moneyBag.parentNode.removeChild(moneyBag);
      }
      moneyBags = moneyBags.filter(bag => bag !== moneyBag);
    }, 300);
  });
  
  // 播放掉落音效
  playDropSound();
  
  return moneyBag;
}

// 開始顯示錢袋
function startMoneyBags() {
  if (intervalId) return;
  
  console.log('開始計算薪資，設定:', {
    salary: salary,
    payday: payday,
    workTime: `${workStartHour}:00-${workEndHour}:00`,
    maxCoins: maxCoins
  });
  
  // 設置開始時間
  startTime = new Date();
  
  // 預加載資源
  preloadAssets();
  
  // 確認圖片和音效URL是否正確
  console.log('資源URL檢查:',{
    '圖片路徑': MONEY_IMAGE_PATH,
    '掉落音效': DROP_SOUND_PATH,
    '拾取音效': PICKUP_SOUND_PATH
  });
  
  // 添加 CSS 動畫
  const style = document.createElement('style');
  style.id = 'salary-animations';
  style.textContent = `
    @keyframes pop-in {
      0% { transform: scale(0); opacity: 0; }
      70% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes pop-out {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(0); opacity: 0; }
    }
    
    .salary-money-bag:hover {
      transform: scale(1.2);
    }
  `;
  document.head.appendChild(style);
  
  // 從儲存中讀取音效設定
  chrome.storage.local.get(['soundEnabled'], function(result) {
    if (result.soundEnabled !== undefined) {
      soundEnabled = result.soundEnabled;
    }
    
    // 建立儀表板
    createDashboard();
    startDashboardUpdates();
  });
  
  // 固定每秒生成一個金幣
  intervalId = setInterval(() => {
    if (!isActive) return;
    
    // 限制最大數量為設定的金幣數量
    if (moneyBags.length >= maxCoins) {
      // 移除最舊的錢袋
      const oldBag = moneyBags.shift();
      if (oldBag && oldBag.parentNode) {
        oldBag.parentNode.removeChild(oldBag);
      }
    }
    
    // 創建新錢袋並添加到頁面
    const newBag = createMoneyBag();
    document.body.appendChild(newBag);
    moneyBags.push(newBag);
    
    // 更新金幣數量顯示
    const coinCountElement = document.getElementById('coin-count');
    if (coinCountElement) {
      coinCountElement.innerHTML = `<span style="color: #aaa;">目前金幣:</span> <span style="float: right; color: #00BCD4;">${moneyBags.length}個</span>`;
    }
  }, 1000); // 固定1秒生成一個
}

// 停止並清除所有錢袋
function stopMoneyBags() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  // 停止更新儀表板
  stopDashboardUpdates();
  
  // 重置開始時間
  startTime = null;
  
  // 移除所有錢袋
  moneyBags.forEach(bag => {
    if (bag.parentNode) {
      bag.parentNode.removeChild(bag);
    }
  });
  moneyBags = [];
  
  // 移除動畫樣式
  const style = document.getElementById('salary-animations');
  if (style) {
    style.parentNode.removeChild(style);
  }
  
  console.log('已停止薪資計算');
}

// 更新金幣數量上限
function updateMaxCoins(newMaxCoins) {
  console.log('更新金幣數量上限:', newMaxCoins);
  maxCoins = newMaxCoins;
  
  // 如果當前金幣超過新設定的上限，刪除多餘的金幣
  if (moneyBags.length > maxCoins) {
    // 計算要刪除的數量
    const numToRemove = moneyBags.length - maxCoins;
    
    // 一次最多刪除100個，避免卡頓
    const batchSize = Math.min(numToRemove, 100);
    
    console.log(`需要刪除 ${numToRemove} 個金幣，本次批次處理 ${batchSize} 個`);
    
    // 批次處理刪除
    const excessBags = moneyBags.splice(0, batchSize);
    excessBags.forEach(bag => {
      if (bag.parentNode) {
        bag.parentNode.removeChild(bag);
      }
    });
    
    // 如果還有更多要刪除，設定定時器處理剩餘的
    if (moneyBags.length > maxCoins) {
      setTimeout(() => updateMaxCoins(maxCoins), 100);
    }
  }
  
  // 更新儀表板顯示
  const coinLimitElement = document.getElementById('coin-limit');
  if (coinLimitElement) {
    coinLimitElement.innerHTML = `<span style="color: #aaa;">金幣上限:</span> <span style="float: right; color: #9C27B0;">${maxCoins}個</span>`;
  }
}

// 監聽來自背景腳本的訊息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'start') {
    isActive = true;
    salary = message.salary;
    payday = message.payday;
    
    // 設定工作時間
    if (message.workStartHour !== undefined) {
      workStartHour = message.workStartHour;
    }
    
    if (message.workEndHour !== undefined) {
      workEndHour = message.workEndHour;
    }
    
    // 設定金幣數量上限
    if (message.maxCoins !== undefined) {
      maxCoins = message.maxCoins;
    }
    
    startMoneyBags();
  } else if (message.action === 'stop') {
    isActive = false;
    stopMoneyBags();
  } else if (message.action === 'updateMaxCoins') {
    // 處理更新金幣數量上限的訊息
    updateMaxCoins(message.maxCoins);
  }
});

// 檢查是否需要立即開始顯示錢袋
chrome.storage.local.get(['isActive', 'salary', 'payday', 'workStartHour', 'workEndHour', 'maxCoins', 'soundEnabled'], function(result) {
  if (result.soundEnabled !== undefined) {
    soundEnabled = result.soundEnabled;
  }
  
  if (result.maxCoins !== undefined) {
    maxCoins = result.maxCoins;
  }
  
  if (result.isActive) {
    isActive = true;
    salary = result.salary;
    payday = result.payday;
    
    // 設定工作時間
    if (result.workStartHour !== undefined) {
      workStartHour = result.workStartHour;
    }
    
    if (result.workEndHour !== undefined) {
      workEndHour = result.workEndHour;
    }
    
    startMoneyBags();
  }
}); 