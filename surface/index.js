const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static('public'));

// Proxy route: /proxy?url=https://example.com
app.get('/proxy', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('No URL');

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      }
    });

    const contentType = response.headers.get('content-type') || 'text/html';
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Access-Control-Allow-Origin', '*');

    let body = await response.text();

    // Rewrite links to go through our proxy
    const base = new URL(target);
    body = body
      .replace(/href="\/(?!\/)/g, `href="/proxy?url=${base.origin}/`)
      .replace(/src="\/(?!\/)/g, `src="/proxy?url=${base.origin}/`)
      .replace(/action="\/(?!\/)/g, `action="/proxy?url=${base.origin}/`);

    res.send(body);
  } catch (e) {
    res.status(500).send('Proxy error: ' + e.message);
  }
});

app.listen(process.env.PORT || 3000, () => console.log('SurfaceProxy backend running'));