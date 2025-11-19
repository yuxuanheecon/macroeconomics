// 使用 CommonJS 语法，兼容性最强
module.exports = async (req, res) => {
  // 1. 设置 CORS 头，允许跨域调用（有助于调试）
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 处理 OPTIONS 预检请求 (浏览器有时候会先发这个)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. 检查 Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Error: API Key is missing in Vercel Env Variables' });
  }

  // 3. 仅允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Error: Prompt is missing' });
    }

    // 4. 发起请求 (使用 gemini-1.5-flash)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const systemPrompt = "你是一位全能型的全球宏观经济分析师。你的能力不再局限于解释概念，而是可以处理用户提出的**所有宏观经济相关问题**。风格要求：客观、理性、简练、带有赛博朋克的冷峻感。字数控制在 300 字以内。";

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google API Error:", errorText);
      return res.status(response.status).json({ error: `Google API Error`, details: errorText });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: 'Internal Server Error', msg: error.message });
  }
};
