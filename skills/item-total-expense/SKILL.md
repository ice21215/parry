---
name: item-total-expense
description: 讀取 EXCEL，自動抓取「項目/品名」與「金額/支出」欄位，統計各單項金額總支出。
---

# 單項金額總支出統計技能 (Item Total Expense Calculator)

這個 Skill 提供了一個工具，幫助使用者從指定的 Excel 表格中，自動辨識「項目（或品名、名稱）」和「金額（或支出、小計）」欄位，並將相同項目的金額加總，統計出各單項的總支出。

## 觸發時機
當使用者要求「統計單項金額總支出」、「加總各項目的花費」、「計算每種品名總共花了多少錢」時，請使用此技能。

## 環境準備
請確保這個技能的運作環境中已經安裝了 `xlsx` 解析套件：
```bash
npm install xlsx
```

## 執行方式
使用 NodeJS 執行 `scripts/calculate_item_expense.js`，並將目標的 Excel 絕對路徑作為參數傳入：

```bash
node C:\Users\User\.gemini\antigravity\skills\item-total-expense\scripts\calculate_item_expense.js "<目標_EXCEL_絕對路徑>"
```

## 腳本行為
腳本會嘗試尋找包含「項目」、「品名」、「名稱」、「單項」或「縮寫」的標題欄位，以及包含「金額」、「支出」、「支出金額」或「小計」的標題欄位，以相容於「零用金收支明細表」等常見格式。
成功找到後，會掃描底下所有的資料行，將相同名稱的項目進行金額加總。
最後將所有的單項加總金額依照大小由高到低排序印出，並提供總金額，幫助使用者快速了解各項目的總花費。
