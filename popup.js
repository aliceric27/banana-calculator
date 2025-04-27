document.addEventListener('DOMContentLoaded', function() {
  const salaryInput = document.getElementById('salary');
  const paydayInput = document.getElementById('payday');
  const workStartHourInput = document.getElementById('workStartHour');
  const workEndHourInput = document.getElementById('workEndHour');
  const maxCoinsInput = document.getElementById('maxCoins');
  const maxCoinsNumberInput = document.getElementById('maxCoinsInput');
  const maxCoinsValue = document.getElementById('maxCoinsValue');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');

  // 載入儲存的設定
  chrome.storage.local.get(['salary', 'payday', 'workStartHour', 'workEndHour', 'maxCoins', 'isActive'], function(result) {
    if (result.salary) salaryInput.value = result.salary;
    if (result.payday) paydayInput.value = result.payday;
    if (result.workStartHour) workStartHourInput.value = result.workStartHour;
    if (result.workEndHour) workEndHourInput.value = result.workEndHour;
    if (result.maxCoins) {
      maxCoinsInput.value = result.maxCoins;
      maxCoinsNumberInput.value = result.maxCoins;
      maxCoinsValue.textContent = result.maxCoins;
    }
    
    if (result.isActive) {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      statusDiv.textContent = '計算中...';
    }
  });

  // 金幣數量滑動條變更事件
  maxCoinsInput.addEventListener('input', function() {
    const value = parseInt(this.value);
    maxCoinsValue.textContent = value;
    maxCoinsNumberInput.value = value;
    
    updateMaxCoinsSettings(value);
  });
  
  // 金幣數量輸入框變更事件
  maxCoinsNumberInput.addEventListener('input', function() {
    let value = parseInt(this.value);
    
    // 確保值在有效範圍內
    if (isNaN(value) || value < 5) value = 5;
    if (value > 9999) value = 9999;
    
    maxCoinsValue.textContent = value;
    maxCoinsInput.value = value;
    
    updateMaxCoinsSettings(value);
  });
  
  // 更新金幣數量設定並發送到內容腳本
  function updateMaxCoinsSettings(value) {
    // 即時儲存設定
    chrome.storage.local.set({
      maxCoins: value
    });
    
    // 如果是在計算中，即時發送更新
    chrome.storage.local.get(['isActive'], function(result) {
      if (result.isActive) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateMaxCoins',
            maxCoins: value
          });
        });
      }
    });
  }

  // 開始計算按鈕
  startBtn.addEventListener('click', function() {
    const salary = parseFloat(salaryInput.value);
    const payday = parseInt(paydayInput.value);
    const workStartHour = parseInt(workStartHourInput.value);
    const workEndHour = parseInt(workEndHourInput.value);
    const maxCoins = parseInt(maxCoinsNumberInput.value);
    
    if (!salary || isNaN(salary) || salary <= 0) {
      alert('請輸入有效的薪資金額！');
      return;
    }
    
    if (!payday || isNaN(payday) || payday < 1 || payday > 31) {
      alert('請輸入有效的發薪日（1-31）！');
      return;
    }
    
    if (isNaN(workStartHour) || workStartHour < 0 || workStartHour >= 24) {
      alert('請輸入有效的工作開始時間（0-23）！');
      return;
    }
    
    if (isNaN(workEndHour) || workEndHour < 0 || workEndHour >= 24) {
      alert('請輸入有效的工作結束時間（0-23）！');
      return;
    }
    
    if (workStartHour >= workEndHour) {
      alert('工作開始時間必須早於結束時間！');
      return;
    }
    
    // 儲存設定
    chrome.storage.local.set({
      salary: salary,
      payday: payday,
      workStartHour: workStartHour,
      workEndHour: workEndHour,
      maxCoins: maxCoins,
      isActive: true
    }, function() {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      statusDiv.textContent = '計算中...';
      
      // 發送訊息到 background script 開始計算
      chrome.runtime.sendMessage({
        action: 'start',
        salary: salary,
        payday: payday,
        workStartHour: workStartHour,
        workEndHour: workEndHour,
        maxCoins: maxCoins
      });
    });
  });
  
  // 停止計算按鈕
  stopBtn.addEventListener('click', function() {
    chrome.storage.local.set({
      isActive: false
    }, function() {
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      statusDiv.textContent = '已停止計算';
      
      // 發送訊息到 background script 停止計算
      chrome.runtime.sendMessage({
        action: 'stop'
      });
    });
  });
}); 