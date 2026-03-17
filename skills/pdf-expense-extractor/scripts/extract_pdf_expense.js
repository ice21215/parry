const fs = require('fs');
const pdf = require('pdf-parse');

async function extractPdfExpense(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`找不到檔案：${filePath}`);
        return;
    }

    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        const text = data.text;

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        const itemTotals = {};
        
        // Basic Regex for amount: looks for numbers that stand alone or are preceded by $ or after a space
        // Example: "商品名稱 100", "Item A $50", "Total: 1000"
        const amountRegex = /(\d{1,3}(,\d{3})*(\.\d+)?)/;

        lines.forEach(line => {
            // Skip lines that look like dates or phone numbers to reduce noise
            if (line.match(/\d{4}\/\d{2}\/\d{2}/) || line.match(/\d{2}-\d{4}-\d{4}/)) return;

            // Simple heurestic: split line by space/tab. 
            // If the last part or second to last part is a number, treat it as an expense.
            const parts = line.split(/\s+/);
            if (parts.length >= 2) {
                const lastPart = parts[parts.length - 1].replace(/,/g, '');
                const numValue = parseFloat(lastPart);
                
                if (!isNaN(numValue) && numValue > 0 && numValue < 1000000) { // Limit to avoid total sums or dates
                    // The rest is the item name
                    const itemName = parts.slice(0, parts.length - 1).join(' ').trim();
                    if (itemName.length > 1 && !itemName.match(/^(總計|合計|Total|Subtotal)$/i)) {
                        if (!itemTotals[itemName]) {
                            itemTotals[itemName] = 0;
                        }
                        itemTotals[itemName] += numValue;
                    }
                }
            }
        });

        const colors = {
            reset: "\x1b[0m",
            bright: "\x1b[1m",
            fgYellow: "\x1b[33m",
            fgCyan: "\x1b[36m",
            fgGreen: "\x1b[32m"
        };

        if (Object.keys(itemTotals).length === 0) {
            console.log("\n⚠️  無法從 PDF 中辨識出明顯的消費項目與金額。");
            return;
        }

        console.log("\n" + colors.fgCyan + "══════════════════════════════════════════════════" + colors.reset);
        console.log(colors.bright + " 📄 PDF 發票/收據金額統計結果：" + colors.reset + "\n");

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
        console.log(`  💰 ${colors.bright}總計${colors.reset}： ` + ".".repeat(28) + ` ${colors.bright}${colors.fgGreen}${grandTotal.toLocaleString()} 元${colors.reset}`);
        console.log(colors.fgCyan + "══════════════════════════════════════════════════" + colors.reset + "\n");

    } catch (err) {
        console.error("處理 PDF 時發生錯誤：", err);
    }
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error("請提供 PDF 檔案的絕對路徑！");
} else {
    extractPdfExpense(args[0]);
}
