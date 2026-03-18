document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const tags = document.querySelectorAll('.tag');

    // 點擊標籤快速搜尋
    tags.forEach(tag => {
        tag.addEventListener('click', () => {
            searchInput.value = tag.textContent;
            performSearch(tag.textContent);
        });
    });

    // 點擊搜尋按鈕或按下 Enter
    searchBtn.addEventListener('click', () => performSearch(searchInput.value));
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(searchInput.value);
    });

    function performSearch(query) {
        if (!query.trim()) return;

        // 隱藏結果，顯示 Loading
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
        loadingIndicator.classList.remove('hidden');

        // 模擬網路延遲與 AI 解析時間
        setTimeout(() => {
            loadingIndicator.classList.add('hidden');
            displayResults(query);
        }, 1200);
    }

    function displayResults(query) {
        let matchedLaws = [];
        
        // 1. 偵測是否為指定法規及特定條號的格式 (例如："《職業安全衛生設施規則》 第 23 條" 或 "職業安全衛生設施規則第23條")
        const strictMatchRegex = /(?:《|〈)?(.+?)(?:》|〉)?\s*(第\s*[\d\-\.]+\s*條)(?:之[\d]+)?/i;
        const strictMatch = query.match(strictMatchRegex);
        
        if (strictMatch) {
            let extractedLawName = strictMatch[1].trim();
            // 處理使用者有時可能輸入簡稱
            if(extractedLawName.includes("職安") && extractedLawName.includes("設施")) {
                extractedLawName = "職業安全衛生設施規則";
            } else if (extractedLawName.includes("勞基")) {
                extractedLawName = "勞動基準法";
            }

            let extractedArticle = strictMatch[2].replace(/\s+/g, ''); // 移除空格以利比對 (例如 "第 23 條" -> "第23條")
            const subArticleMatch = query.match(/之[\d]+/); // 處理「第 X 條之 Y」
            if (subArticleMatch) {
                extractedArticle += subArticleMatch[0]; // "第23條" + "之1" => "第23條之1" (有些資料庫可能存 "第 23-1 條")
            }

            matchedLaws = regulationsDB.filter(law => {
                const lawNameMatches = law.lawName === extractedLawName || extractedLawName === ""; // 如果沒抓到名字，只比對條號
                // 處理資料庫中可能的空格 ("第 23 條" vs "第23條"，以及 "第 23-1 條" vs "第23條之1")
                const dbArticleClean = law.article.replace(/\s+/g, '').replace(/-/, '之'); 
                const queryArticleClean = extractedArticle.replace(/-/, '之');
                
                return lawNameMatches && dbArticleClean.includes(queryArticleClean);
            });
        }
        
        // 2. 如果沒有精確格式符合，則使用關鍵字模糊搜尋
        if (matchedLaws.length === 0) {
            const lowerQuery = query.toLowerCase();
            matchedLaws = regulationsDB.filter(law => {
                const inKeywords = law.keywords.some(k => k.includes(lowerQuery) || lowerQuery.includes(k));
                const inContent = law.originalText.includes(query) || law.summary.includes(query);
                
                // 更進階的比對：如果關鍵字分開出現 (例如："設施 護欄")
                const searchTerms = lowerQuery.split(/\s+/).filter(t => t.length > 0);
                const allTermsMatch = searchTerms.length > 0 && searchTerms.every(term => 
                    law.originalText.includes(term) || law.lawName.includes(term) || law.article.includes(term)
                );
                
                return inKeywords || inContent || allTermsMatch;
            });
        }

        resultsContainer.classList.remove('hidden');

        if (matchedLaws.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results fade-in">
                    <i class="fa-solid fa-magnifying-glass-chart"></i>
                    <p>找不到與「<strong>${query}</strong>」相關的法規與函釋。</p>
                    <p style="font-size: 0.9rem; margin-top: 10px; opacity: 0.7;">請嘗試更換關鍵字、簡化搜尋詞，或確定法規條號是否正確。</p>
                </div>
            `;
            return;
        }

        // 建立查詢總結標頭
        const queryHeader = document.createElement('div');
        queryHeader.className = 'query-header fade-in';
        queryHeader.innerHTML = `✅ 針對【<span style="color:var(--primary); font-weight:700;">${query}</span>】，為您檢索並解析出 ${matchedLaws.length} 筆適用法規：`;
        resultsContainer.appendChild(queryHeader);

        // 渲染每一筆法規結果
        matchedLaws.forEach((law, index) => {
            const card = document.createElement('div');
            card.className = `result-card fade-in`;
            card.style.animationDelay = `${index * 0.1}s`;
            
            // 將搜尋關鍵字高亮 (簡易版)
            let highlightedContent = law.originalText;
            
            // 如果是一般關鍵字搜尋，將關鍵字高亮
            if (!strictMatch && query.trim().length > 1) {
                const searchTerms = query.trim().split(/\s+/).filter(t => t.length > 1);
                searchTerms.forEach(term => {
                    // 使用安全的方式替換，避免破壞 HTML 或發生無限替換
                    const escapedTerm = term.replace(/[.*+?^$\{\}()|[\\]\\\\]/g, '\\$&');
                    const regex = new RegExp(`(${escapedTerm})`, 'gi');
                    highlightedContent = highlightedContent.replace(regex, '<span style="color:var(--warning); font-weight:bold; background:rgba(245,158,11,0.2); border-radius:3px; padding:0 3px;">$1</span>');
                });
            }

            card.innerHTML = `
                <div class="result-header">
                    <span class="law-tag"><i class="fa-solid fa-book"></i> ${law.lawName}</span>
                    <h3>⚖️ 依據《<span class="highlight">${law.lawName}</span>》${law.article}規定：</h3>
                </div>
                <div class="result-content">
                    <p>${highlightedContent}</p>
                </div>
                <!-- 預設摘要區域 -->
                <div class="result-summary">
                    <h4><i class="fa-regular fa-lightbulb"></i> 法規重點提示</h4>
                    <p>${law.summary || '（此為系統自動抓取之條文實體，詳細見解建議參考法源與主管機關函釋）'}</p>
                </div>
            `;
            resultsContainer.appendChild(card);
        });
    }
});
