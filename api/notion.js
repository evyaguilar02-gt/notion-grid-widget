const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    var token = req.body.token;
    var dbid = req.body.dbid;
    var red = req.body.red || 'Instagram';

    if (!token || !dbid) {
      return res.status(400).json({ message: 'Token y database ID son requeridos.' });
    }

    var formatosValidos = ['Reel', 'Post', 'Carrusel'];

    var body = JSON.stringify({
      sorts: [{ property: 'Fecha', direction: 'descending' }],
      page_size: 50
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

    var filtrados = data.body.results.filter(function(page) {
      var props = page.properties;
      if (!props) return false;

      // Debe tener Fecha
      var fechaProp = props.Fecha;
      if (!fechaProp || !fechaProp.date || !fechaProp.date.start) return false;

      // Debe tener Status
      var statusProp = props.Status;
      if (!statusProp) return false;
      var statusNombre = '';
      if (statusProp.status && statusProp.status.name) statusNombre = statusProp.status.name;
      if (!statusNombre) return false;

      // Debe tener Red = Instagram (o la red seleccionada)
      var redProp = props.Red;
      if (!redProp) return false;
      var redNombre = '';
      if (redProp.select && redProp.select.name) redNombre = redProp.select.name;
      else if (redProp.multi_select && redProp.multi_select.length > 0) redNombre = redProp.multi_select[0].name;
      if (redNombre !== red) return false;

      // Debe tener Formato válido
      var formatoProp = props.Formato;
      if (!formatoProp) return false;
      var formatoNombre = '';
      if (formatoProp.select && formatoProp.select.name) formatoNombre = formatoProp.select.name;
      else if (formatoProp.multi_select && formatoProp.multi_select.length > 0) formatoNombre = formatoProp.multi_select[0].name;
      if (!formatosValidos.includes(formatoNombre)) return false;

      return true;
    });

    var pages = filtrados.slice(0, 9).map(function(page) {
      var files = [];
      if (page.properties && page.properties.Imagen && page.properties.Imagen.files) {
        files = page.properties.Imagen.files;
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

      page._directImg = rawUrl || null;
      return page;
    });

    return res.status(200).json({ results: pages });

  } catch(error) {
    return res.status(500).json({ message: 'Error: ' + error.message });
  }
};
