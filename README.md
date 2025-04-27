# 薪資計算器 Chrome 擴充插件

這是一個簡單實用的 Chrome 擴充插件，可幫助您實時監控自己的薪資增長情況。通過輸入年薪和工作時間，它會計算出您每秒、每分鐘、每小時賺取的薪資，並以視覺化方式呈現。

## 功能特點

- 🧮 根據月薪自動計算每秒、每分鐘、每小時的薪資
- ⏱️ 實時顯示工作時間內的薪資累積
- 💰 每秒在頁面隨機位置生成錢袋動畫，直觀感受收入增長
- 💾 使用 Chrome 存儲功能保存您的設定
- 🌐 可作為擴充插件使用，或通過 demo.html 直接體驗

## 安裝指南

### 方法一：從 Chrome 網上應用店安裝

1. 前往 Chrome 網上應用店
2. 搜索「薪資計算器」
3. 點擊「添加至 Chrome」

### 方法二：開發者模式安裝

1. 下載並解壓此專案
2. 在 Chrome 瀏覽器地址欄輸入 `chrome://extensions/`
3. 開啟右上角的「開發者模式」
4. 點擊「載入未封裝項目」
5. 選擇解壓後的專案資料夾

## 使用方法

### 作為擴充插件使用

1. 點擊 Chrome 工具列中的擴充插件圖標
2. 在彈出的視窗中輸入您的年薪、工作天數和每天工作時數
3. 點擊「開始計算」按鈕即可看到薪資增長情況

### 使用 Demo 頁面

1. 開啟 `demo.html` 文件
2. 輸入您的薪資資訊
3. 點擊「開始計算」

## 檔案結構

```
/
├── manifest.json          # 擴充插件配置文件
├── popup.html             # 擴充插件彈出視窗
├── content.js             # 內容腳本
├── background.js          # 背景腳本
├── demo.html              # 獨立運行的演示頁面
└── images/                # 擴充插件圖標
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 技術說明

此擴充插件使用了以下技術：

- HTML/CSS/JavaScript：前端實現
- Chrome Extension API：實現瀏覽器擴充功能
- 使用 Chrome Storage API 保存用戶設定

## 貢獻

歡迎對此專案提出改進建議或直接貢獻代碼。您可以通過以下方式參與：

1. Fork 本專案
2. 創建新的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟一個 Pull Request
