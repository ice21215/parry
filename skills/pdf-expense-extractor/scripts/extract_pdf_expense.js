const fs = require('fs');
const pdf = require('pdf-parse');

async function extractPdfExpense(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`找不到檔案：${filePath}`);
        return;
    }

    const colors = {
        reset: "\x1b[0m",
        bright: "\x1b[1m",
        fgYellow: "\x1b[33m",
        fgCyan: "\x1b[36m",
        fgGreen: "\x1b[32m",
        fgRed: "\x1b[31m",
        fgGray: "\x1b[90m"
    };

    try {
        console.log(colors.fgGray + "⏳ 正在讀取 PDF 文字圖層..." + colors.reset);
        const dataBuffer = fs.readFileSync(filePath);
        let data;
        try {
            data = await pdf(dataBuffer);
        } catch (pdfErr) {
            if (pdfErr.message.includes('No password given')) {
                console.log("\n" + colors.fgRed + "🔒 此 PDF 已受密碼保護！" + colors.reset);
                console.log("💡 解決策略：請用 Chrome 打開 PDF -> 點擊「列印」 -> 另存為 PDF，即可移除密碼。");
                return;
            }
            throw pdfErr;
        }

        const text = data.text;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const itemTotals = {};

        // 檢查是否包含關鍵字
        const hasKeywords = text.includes('商品名稱') || text.includes('單價') || text.includes('金額');

        lines.forEach(line => {
            // 跳過日期與電話
            if (line.match(/\d{4}[\/-]\d{2}[\/-]\d{2}/) || line.match(/\d{2}-\d{4}-\d{4}/)) return;

            // 模式 1: "項目名稱 100" 或 "項目名稱 $100" (金額在末尾)
            let match = line.match(/([^\d]{2,})\s+([$￥])?\s*(\d{1,3}(,\d{3})*(\.\d+)?)\s*(元)?$/);
            
            if (match) {
                let itemName = match[1].trim();
                let numValue = parseFloat(match[3].replace(/,/g, ''));

                if (!isNaN(numValue) && numValue > 0 && numValue < 1000000) {
                    if (!itemName.match(/^(總計|合計|Total|Subtotal|金額|小計|單價|商品名稱|應付)$/i)) {
                        itemTotals[itemName] = (itemTotals[itemName] || 0) + numValue;
                    }
                }
            } else {
                // 模式 2: 寬鬆匹配 (中間有金額)
                const fallback = line.match(/(.+?)\s+([$￥])?\s*(\d{1,3}(,\d{3})*(\.\d+)?)\s*(元)?/);
                if (fallback) {
                    let itemName = fallback[1].trim();
                    let numValue = parseFloat(fallback[3].replace(/,/g, ''));
                    if (!isNaN(numValue) && numValue > 0 && numValue < 500000 && itemName.length > 1 && itemName.length < 30) {
                        if (!itemName.match(/^(日期|電話|發票|地址|統編|商品名稱|單價)$/i)) {
                            itemTotals[itemName] = (itemTotals[itemName] || 0) + numValue;
                        }
                    }
                }
            }
        });

        if (Object.keys(itemTotals).length === 0) {
            console.log("\n" + colors.fgRed + "⚠️  無法從 PDF 中自動辨識出金額支出。" + colors.reset);
            console.log(colors.fgGray + "--------------------------------------------------" + colors.reset);
            if (text.trim().length <= 10) {
                console.log(" [診斷結果]：PDF 內容為空。這極可能是「圖片型 PDF」(無文字圖層)。");
                console.log(" 建議：此類檔案需要 OCR (圖轉文) 處理，目前環境限制暫不支持，請提供文字檔。");
            } else {
                console.log(" [診斷結果]：有讀到文字，但格式不符。");
                console.log(" 偵測到的前 300 字內容：\n");
                console.log(colors.fgCyan + text.substring(0, 300).replace(/\n/g, ' ') + "..." + colors.reset);
            }
            console.log(colors.fgGray + "--------------------------------------------------" + colors.reset);
            return;
        }

        console.log("\n" + colors.fgCyan + "══════════════════════════════════════════════════" + colors.reset);
        console.log(colors.bright + " 📄 PDF 金額統計報告 (PRO MAX)：" + colors.reset + "\n");

        const sortedItems = Object.keys(itemTotals).map(key => ({
            name: key,
            total: itemTotals[key]
        })).sort((a, b) => b.total - a.total);

        let grandTotal = 0;
        sortedItems.forEach(item => {
            console.log(`  ➤ ${colors.fgYellow}${item.name}${colors.reset} ` +
                        ".".repeat(Math.max(2, 30 - item.name.length * 2)) + 
                        ` ${colors.fgGreen}${item.total.toLocaleString()} 元${colors.reset}`);
            grandTotal += item.total;
        });

        console.log(colors.fgCyan + "──────────────────────────────────────────────────" + colors.reset);
        console.log(`  💰 ${colors.bright}總計金額${colors.reset}： ` + ".".repeat(25) + ` ${colors.bright}${colors.fgGreen}${grandTotal.toLocaleString()} 元${colors.reset}`);
        console.log(colors.fgCyan + "══════════════════════════════════════════════════" + colors.reset + "\n");

    } catch (err) {
        console.error("處理時發生錯誤：", err);
    }
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error("請提供 PDF 絕對路徑！");
} else {
    extractPdfExpense(args[0]);
}
