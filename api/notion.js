const https = require('https');
const http = require('http');
const url = require('url');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET' && req.query && req.query.proxy) {
    var imageUrl = decodeURIComponent(req.query.proxy);
    var notionToken = req.query.token ? decodeURIComponent(req.query.token) : '';
    var parsed = url.parse(imageUrl);
    var client = parsed.protocol === 'https:' ? https : http;

    return new Promise(function(resolve) {
      var imgOptions = {
        hostname: parsed.hostname,
        path: parsed.path + (parsed.search || ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Authorization': notionToken ? 'Bearer ' + notionToken : ''
        }
      };

      var request = client.get(imgOptions, function(response) {
        if (response.statusCode === 301 || response.statusCode === 302) {
          var redirectUrl = response.headers.location;
          var redirectParsed = url.parse(redirectUrl);
          var redirectClient = redirectParsed.protocol === 'https:' ? https : http;
          var redirectRequest = redirectClient.get(redirectUrl, function(redirectResponse) {
            var contentType = redirectResponse.headers['content-type'] || 'image/jpeg';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 's-maxage=3500');
            redirectResponse.pipe(res);
            redirectResponse.on('end', resolve);
          });
          redirectRequest.on('error', function() { res.status(500).end(); resolve(); });
          return;
        }
        if (response.statusCode !== 200) {
          res.status(response.statusCode).end();
          return resolve();
        }
        var contentType = response.headers['content-type'] || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 's-maxage=3500');
        response.pipe(res);
        response.on('end', resolve);
      });
      request.on('error', function() { res.status(500).end(); resolve(); });
    });
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

      page._resolvedImg = rawUrl ? '/api/notion?proxy=' + encodeURIComponent(rawUrl) + '&token=' + encodeURIComponent(token) : null;
      return page;
    });

    return res.status(200).json({ results: pages });

  } catch(error) {
    return res.status(500).json({ message: 'Error: ' + error.message });
  }
};
