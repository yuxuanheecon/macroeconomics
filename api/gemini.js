// 这是一个运行在服务器端的云函数，用户无法查看其源码
export default async function handler(req, res) {
  // 1. 检查请求方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. 从环境变量中安全获取 Key (这个 Key 只有服务器知道)
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: API Key missing' });
  }

  try {
    const { prompt } = req.body;

    // 3. 系统提示词 (System Prompt)
    const systemPrompt = "你是一位全能型的全球宏观经济分析师。你的能力不再局限于解释概念，而是可以处理用户提出的**所有宏观经济相关问题**，包括：1. **热点事件点评**：对最新发生的财经新闻进行深度剖析。2. **数据查询与分析**：提供关键经济数据（如GDP、CPI）的历史背景或最新数值（基于搜索工具）。3. **知识科普**：解释复杂的经济学术语。4. **趋势研判**：基于逻辑推演未来的市场走向。风格要求：客观、理性、简练、带有赛博朋克的冷峻感。字数控制在 300 字以内。";

    // 4. 在服务器端向 Google 发起请求
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ google_search: {} }] // 启用搜索工具
      }),
    });

    const data = await response.json();

    // 5. 将 Google 的结果转发回给前端
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API Error' });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
```

### 第二步：修改前端网页 (`index.html`)

现在你的网页不需要直接找 Google 了，而是找你自己刚才写的这个 `api/gemini` 中转站。

找到 `index.html` 中的 `callGemini` 函数，用下面的代码**完全替换**掉原来的 `callGemini` 函数（大概在 `<script>` 标签的末尾部分）：

```javascript
    /* ====== Logic: Gemini API (Secure Serverless Version) ====== */
    function handleEnter(event) {
      if(event.key === 'Enter') callGemini();
    }

    async function callGemini() {
      const promptInput = document.getElementById('ai-prompt').value;
      const outputDiv = document.getElementById('ai-output');
      const btn = document.querySelector('.ai-btn');
      
      if (!promptInput.trim()) {
        alert("请输入您想了解的宏观经济问题！");
        return;
      }

      // UI Loading State
      btn.disabled = true;
      outputDiv.innerHTML = `
        <div class="ai-loading">
          <span class="sparkle-icon">✨</span> 
          <span>正在连接私有云节点，智能分析中...</span>
        </div>
      `;

      try {
        // 修改点：不再直接请求 Google，而是请求我们自己的后端 API
        // 注意：这里不需要 apiKey 参数，因为它藏在后台里
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptInput
          })
        });

        if (!response.ok) throw new Error('API Request Failed');

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        // 简单的 Markdown 格式化
        const formattedText = text
          .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--neon-cyan)">$1</strong>')
          .replace(/\*/g, '•')
          .replace(/\n/g, '<br>');

        outputDiv.innerHTML = formattedText || "分析师暂时离线，请稍后再试。";

      } catch (error) {
        console.error(error);
        outputDiv.innerHTML = `<span style="color:var(--neon-pink)">// ERROR: 连接超时或系统繁忙，请稍后重试。</span>`;
      } finally {
        btn.disabled = false;
      }
    }
