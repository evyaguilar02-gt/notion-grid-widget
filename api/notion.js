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
    var token = req.body.token;
    var dbid = req.body.dbid;

    if (!token || !dbid) {
      return res.status(400).json({ message: 'Token y database ID son requeridos.' });
    }

    var body = JSON.stringify({
      sorts: [{ property: 'Date', direction: 'ascending' }],
      page_size: 9
    });

    var options = {
      hostname: 'api.notion.com',
      path: '/v1/databases/' + dbid + '/query',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    var data = await new Promise(function(resolve, reject) {
      var request = https.request(options, function(response) {
        var rawData = '';
        response.on('data', function(chunk) { rawData += chunk; });
        response.on('end', function() {
          try {
            resolve({ status: response.statusCode, body: JSON.parse(rawData) });
          } catch(e) { reject(e); }
        });
      });
      request.on('error', reject);
      request.write(body);
      request.end();
    });

    if (data.status !== 200) {
      return res.status(data.status).json({ message: data.body.message || 'Error de Notion.' });
    }

    var pages = data.body.results.map(function(page) {
      var files = [];
      if (page.properties && page.properties.Image && page.properties.Image.files) {
        files = page.properties.Image.files;
      }
      var rawUrl = null;

      if (files.length > 0) {
        var file = files[0];
        if (file.type === 'external' && file.external) {
          rawUrl = file.external.url;
        } else if (file.file) {
          rawUrl = file.file.url;
        }
      }

      if (!rawUrl && page.cover) {
        if (page.cover.type === 'external' && page.cover.external) {
          rawUrl = page.cover.external.url;
        } else if (page.cover.file) {
          rawUrl = page.cover.file.url;
        }
      }

      var resolvedImg = rawUrl ? '/api/notion?proxy=' + encodeURIComponent(rawUrl) : null;
      page._resolvedImg = resolvedImg;
      return page;
    });

    return res.status(200).json({ results: pages });

  } catch(error) {
    return res.status(500).json({ message: 'Error: ' + error.message });
  }
};
