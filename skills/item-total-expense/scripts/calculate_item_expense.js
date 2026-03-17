const xlsx = require('xlsx');
const fs = require('fs');

function calculateItemExpense(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`找不到檔案：${filePath}，請確認路徑或檔名是否正確。`);
        return;
    }

    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        let headerRowIndex = -1;
        let itemColIndex = -1;
        let expenseColIndex = -1;
        let dateColIndex = -1;

        // Find the columns
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (Array.isArray(row)) {
                for (let j = 0; j < row.length; j++) {
                    const cellValue = String(row[j] || '').replace(/\s+/g, '');
                    
                    if (itemColIndex === -1 && (cellValue.includes('項目') || cellValue.includes('品名') || cellValue.includes('單項') || cellValue.includes('名稱') || cellValue.includes('摘要') || cellValue.includes('科目') || cellValue.includes('說明'))) {
                        itemColIndex = j;
                    }
                    if (expenseColIndex === -1 && (cellValue.includes('支出') || cellValue.includes('小計') || cellValue.includes('總價') || cellValue.includes('花費') || (cellValue.includes('金額') && !cellValue.includes('收入')))) {
                        expenseColIndex = j;
                    }
                    if (dateColIndex === -1 && (cellValue.includes('時間') || cellValue.includes('日期'))) {
                        dateColIndex = j;
                    }
                }
                if (itemColIndex !== -1 && expenseColIndex !== -1) {
                    headerRowIndex = i;
                    break;
                }
            }
        }

        if (headerRowIndex === -1 || itemColIndex === -1 || expenseColIndex === -1) {
            console.error("❌ 在表格中找不到包含「項目/品名/名稱」或「金額/支出/小計」的欄位名稱！");
            if (jsonData.length > 0) {
                console.log("發現的潛在標題列：", jsonData[0]);
            }
            return;
        }

        const itemTotals = {};

        // Helper to format Excel serial dates roughly if needed
        function formatExcelDate(dateVal) {
            if (!dateVal) return "";
            if (typeof dateVal === 'number') {
                // Approximate conversion for Excel dates (assuming epoch 1900)
                const date = new Date((dateVal - 25569) * 86400 * 1000);
                return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
            }
            return String(dateVal).split(' ')[0]; // Basic string fallback
        }

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (Array.isArray(row)) {
                let itemName = row[itemColIndex];
                let expense = row[expenseColIndex];
                let dateVal = dateColIndex !== -1 ? row[dateColIndex] : '';

                if (itemName && String(itemName).trim() !== '') {
                    itemName = String(itemName).trim();
                    let numValue = 0;
                    if (expense !== undefined && expense !== null && String(expense).trim() !== '') {
                        numValue = parseFloat(String(expense).replace(/,/g, ''));
                        if (isNaN(numValue)) numValue = 0;
                    }
                    
                    if (!itemTotals[itemName]) {
                        itemTotals[itemName] = { total: 0, dates: new Set() };
                    }
                    itemTotals[itemName].total += numValue;
                    
                    if (numValue > 0 && dateVal) {
                        itemTotals[itemName].dates.add(formatExcelDate(dateVal));
                    }
                }
            }
        }

        if (Object.keys(itemTotals).length === 0) {
            console.log("找不到任何有效的資料。");
            return;
        }

        const colors = {
            reset: "\x1b[0m",
            bright: "\x1b[1m",
            fgYellow: "\x1b[33m",
            fgCyan: "\x1b[36m",
            fgGreen: "\x1b[32m",
            fgGray: "\x1b[90m"
        };
        
        console.log("\n" + colors.fgCyan + "════════════════════════════════════════════════════════════════" + colors.reset);
        console.log(colors.bright + " 📊 各單項金額總支出統計結果：" + colors.reset + "\n");
        
        // Sort by amount descending
        const sortedItems = Object.keys(itemTotals).map(key => ({
            name: key,
            total: itemTotals[key].total,
            dates: Array.from(itemTotals[key].dates).join(', ')
        })).sort((a, b) => b.total - a.total);

        let grandTotal = 0;
        sortedItems.forEach(item => {
            const dateStr = item.dates ? ` ${colors.fgGray}(${item.dates})${colors.reset}` : "";
            const nameWithDate = `${item.name}${dateStr}`;
            // Rough calculation for padding (Chinese characters are wider)
            const visibleLength = item.name.length * 2 + (item.dates ? item.dates.length + 3 : 0);
            const padding = ".".repeat(Math.max(2, 35 - visibleLength));

            console.log(`  ➤ ${colors.fgYellow}${item.name}${colors.reset}${dateStr} ` +
                        padding + 
                        ` ${colors.fgGreen}${item.total.toLocaleString()} 元${colors.reset}`);
            grandTotal += item.total;
        });
        console.log(colors.fgCyan + "────────────────────────────────────────────────────────────────" + colors.reset);
        console.log(`  💰 ${colors.bright}總計${colors.reset}： ` + ".".repeat(34) + ` ${colors.bright}${colors.fgGreen}${grandTotal.toLocaleString()} 元${colors.reset}`);
        console.log(colors.fgCyan + "════════════════════════════════════════════════════════════════" + colors.reset + "\n");

    } catch (err) {
        console.error("處理時發生錯誤：", err);
    }
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error("請提供 Excel 檔案的絕對路徑！");
} else {
    let targetPath = args[0];
    if (targetPath.startsWith('"') && targetPath.endsWith('"')) {
        targetPath = targetPath.slice(1, -1);
    }
    calculateItemExpense(targetPath);
}
