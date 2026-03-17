---
name: pdf-expense-extractor
description: 讀取 PDF 檔案（如發票、收據），自動抓取並統計其中的金額支出，並進行總計。
---

# PDF 金額支出統計技能 (PDF Expense Extractor)

這個 Skill 提供了一個工具，幫助使用者從指定的 PDF 檔案中自動辨識與金額相關的文字，擷取項目名稱與對應金額，並統計總支出。

## 觸發時機
當使用者要求「統計 PDF 裡的金額」、「分析 PDF 發票」、「加總這份收據的花費」時，請使用此技能。

## 環境準備
請確保環境中已經安裝了 `pdf-parse` 套件：
```bash
npm install pdf-parse
```

## 執行方式
使用 NodeJS 執行 `scripts/extract_pdf_expense.js`，並將目標的 PDF 絕對路徑作為參數傳入：

```bash
node C:\Users\User\.gemini\antigravity\skills\pdf-expense-extractor\scripts\extract_pdf_expense.js "<目標_PDF_絕對路徑>"
```

## 腳本行為
腳本會讀取 PDF 內容，利用正規表示式 (Regex) 搜尋常見的發票/收據項目格式。
它會尋找類似「品名 + 價格」或「項目... $金額」的結構，並將重複項目的金額進行加總，最後提供一份美觀的統計報告與總金額。
