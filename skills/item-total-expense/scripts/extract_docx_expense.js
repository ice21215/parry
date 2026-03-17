const fs = require('fs');
const mammoth = require('mammoth');

async function extractDocxExpense(filePath) {
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
        console.log(colors.fgGray + "⏳ 正在深入分析 Word 文件結構..." + colors.reset);
        
        // Use mammoth to extract HTML so we can see table structure
        const result = await mammoth.convertToHtml({path: filePath});
        const html = result.value;
        
        // Reparse text for logging if needed
        const rawTextResult = await mammoth.extractRawText({path: filePath});
        const text = rawTextResult.value;

        const itemTotals = {};

        // Heuristic 1: Extract from HTML tables (more reliable for Excel-to-Word conversions)
        // Look for <tr>...</tr> and then <td>...</td>
        const tableRows = html.match(/<tr>(.*?)<\/tr>/g) || [];
        
        tableRows.forEach(row => {
            const cells = row.match(/<td>(.*?)<\/td>/g) || [];
            if (cells.length >= 2) {
                // Remove HTML tags from cells
                const cellTexts = cells.map(c => c.replace(/<[^>]*>/g, '').trim());
                
                // Try to find a cell that looks like an amount
                cellTexts.forEach((cell, idx) => {
                    const cleanCell = cell.replace(/,/g, '');
                    const numValue = parseFloat(cleanCell);
                    
                    if (!isNaN(numValue) && numValue > 0 && numValue < 1000000) {
                        // Potential amount. Check preceding or following cells for item name
                        let itemName = "";
                        
                        // Try preceding cells first
                        for (let i = idx - 1; i >= 0; i--) {
                            if (cellTexts[i].length > 1 && !cellTexts[i].match(/^(單價|商品名稱|金額|數量|項目|說明|小計)$/)) {
                                itemName = cellTexts[i];
                                break;
                            }
                        }
                        
                        // If still empty, try following cells (less common but possible)
                        if (!itemName && idx + 1 < cellTexts.length) {
                             if (cellTexts[idx+1].length > 1) itemName = cellTexts[idx+1];
                        }

                        if (itemName && itemName.length < 50) {
                             itemTotals[itemName] = (itemTotals[itemName] || 0) + numValue;
                        }
                    }
                });
            }
        });

        // Heuristic 2: Fallback to line-based parsing if table parsing found nothing
        if (Object.keys(itemTotals).length === 0) {
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            lines.forEach(line => {
                const match = line.match(/([^\d]{2,})\s+([$￥])?\s*(\d{1,3}(,\d{3})*(\.\d+)?)\s*(元)?$/);
                if (match) {
                    let itemName = match[1].trim();
                    let numValue = parseFloat(match[3].replace(/,/g, ''));
                    if (!isNaN(numValue) && numValue > 0 && numValue < 1000000) {
                        if (!itemName.match(/^(總計|合計|Total|Subtotal|金額|小計|單價|商品名稱|應付)$/i)) {
                            itemTotals[itemName] = (itemTotals[itemName] || 0) + numValue;
                        }
                    }
                }
            });
        }

        if (Object.keys(itemTotals).length === 0) {
            console.log("\n" + colors.fgRed + "⚠️  無法從 Word 中提取出格式化的統計資料。" + colors.reset);
            console.log(colors.fgGray + "--------------------------------------------------" + colors.reset);
            
            if (text.trim().length <= 5 && html.includes('<img')) {
                console.log(" [診斷結果]：文件主體看似為一張「圖片」。");
                console.log(" 提示：即使轉成 Word，如果內容是一張「圖」，程式也無法直接讀取。");
                console.log(" 💡 建議：請將圖片直接傳送給我，我直接用視覺能力幫您統計！");
            } else if (text.trim().length > 0) {
                 console.log(" [診斷結果]：有讀到文字，但未能成功解析為「項目+金額」格式。");
                 console.log(" 預覽內容：\n");
                 console.log(colors.fgCyan + text.substring(0, 400).replace(/\s+/g, ' ') + "..." + colors.reset);
            } else {
                 console.log(" [診斷結果]：Word 文件內沒有可讀取的文字內容。");
            }
            console.log(colors.fgGray + "--------------------------------------------------" + colors.reset);
            return;
        }

        console.log("\n" + colors.fgCyan + "══════════════════════════════════════════════════" + colors.reset);
        console.log(colors.bright + " 📄 Word 項目金額統計報告：" + colors.reset + "\n");

        const sortedItems = Object.keys(itemTotals).map(key => ({
            name: key,
            total: itemTotals[key]
        })).sort((a, b) => b.total - a.total);

        let grandTotal = 0;
        sortedItems.forEach(item => {
            console.log(`  ➤ ${colors.fgYellow}${item.name}${colors.reset} ` +
                        ".".repeat(Math.max(2, 40 - item.name.length * 2)) + 
                        ` ${colors.fgGreen}${item.total.toLocaleString()} 元${colors.reset}`);
            grandTotal += item.total;
        });

        console.log(colors.fgCyan + "──────────────────────────────────────────────────" + colors.reset);
        console.log(`  💰 ${colors.bright}總計金額${colors.reset}： ` + ".".repeat(35) + ` ${colors.bright}${colors.fgGreen}${grandTotal.toLocaleString()} 元${colors.reset}`);
        console.log(colors.fgCyan + "══════════════════════════════════════════════════" + colors.reset + "\n");

    } catch (err) {
        console.error("處理時發生錯誤：", err);
    }
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error("請提供 Word 絕對路徑！");
} else {
    extractDocxExpense(args[0]);
}
