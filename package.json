const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { token, dbid } = req.body;

    if (!token || !dbid) {
      return res.status(400).json({ message: 'Token y database ID son requeridos.' });
    }

    const body = JSON.stringify({
      sorts: [{ property: 'Date', direction: 'ascending' }],
      page_size: 9
    });

    const options = {
      hostname: 'api.notion.com',
      path: /v1/databases/${dbid}/query,
      method: 'POST',
      headers: {
        'Authorization': Bearer ${token},
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const data = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let rawData = '';
        response.on('data', (chunk) => { rawData += chunk; });
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode, body: JSON.parse(rawData) });
          } catch (e) {
            reject(e);
          }
        });
      });
      request.on('error', reject);
      request.write(body);
      request.end();
    });

    if (data.status !== 200) {
      return res.status(data.status).json({ message: data.body.message || 'Error de Notion.' });
    }

    const pages = data.body.results.map((page) => {
      const files = page.properties?.Image?.files || [];
      let rawUrl = null;

      if (files.length > 0) {
        const file = files[0];
        rawUrl = file.type === 'external' ? file.external?.url : file.file?.url;
      }

      if (!rawUrl && page.cover) {
        rawUrl = page.cover.type === 'external' ? page.cover.external?.url : page.cover.file?.url;
      }

      const _resolvedImg = rawUrl ? /api/notion?proxy=${encodeURIComponent(rawUrl)} : null;
      return { ...page, _resolvedImg };
    });

    return res.status(200).json({ results: pages });

  } catch (error) {
    return res.status(500).json({ message: 'Error: ' + error.message });
  }
};
