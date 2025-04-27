// 在背景執行的腳本，處理擴充功能的主要邏輯

// 監聽來自popup的訊息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'start') {
    // 將設定儲存到本地儲存
    chrome.storage.local.set({
      salary: message.salary,
      payday: message.payday,
      workStartHour: message.workStartHour,
      workEndHour: message.workEndHour,
      maxCoins: message.maxCoins,
      isActive: true
    });
    
    // 向當前活動分頁發送開始訊息
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'start',
          salary: message.salary,
          payday: message.payday,
          workStartHour: message.workStartHour,
          workEndHour: message.workEndHour,
          maxCoins: message.maxCoins
        });
      }
    });
  } else if (message.action === 'stop') {
    // 儲存狀態為非活動
    chrome.storage.local.set({
      isActive: false
    });
    
    // 向當前活動分頁發送停止訊息
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'stop'
        });
      }
    });
  }
});

// 監聽分頁切換或更新事件，以便在新頁面中初始化顯示
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.active) {
    // 檢查擴充功能是否處於活動狀態
    chrome.storage.local.get(['isActive', 'salary', 'payday', 'workStartHour', 'workEndHour', 'maxCoins'], function(result) {
      if (result.isActive) {
        // 向新分頁發送開始訊息
        chrome.tabs.sendMessage(tabId, {
          action: 'start',
          salary: result.salary,
          payday: result.payday,
          workStartHour: result.workStartHour,
          workEndHour: result.workEndHour,
          maxCoins: result.maxCoins
        });
      }
    });
  }
});

// 監聽分頁切換事件，確保當前分頁也顯示計算結果
chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.storage.local.get(['isActive', 'salary', 'payday', 'workStartHour', 'workEndHour', 'maxCoins'], function(result) {
    if (result.isActive) {
      // 向當前活動分頁發送開始訊息
      chrome.tabs.sendMessage(activeInfo.tabId, {
        action: 'start',
        salary: result.salary,
        payday: result.payday,
        workStartHour: result.workStartHour,
        workEndHour: result.workEndHour,
        maxCoins: result.maxCoins
      });
    }
  });
}); 