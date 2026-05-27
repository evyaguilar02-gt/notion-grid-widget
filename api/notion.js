const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    var token = req.body.token;
    var dbid = req.body.dbid;
    var red = req.body.red || 'Instagram';

    if (!token || !dbid) return res.status(400).json({ message: 'Token y database ID son requeridos.' });

    var formatosValidos = ['reel', 'post', 'carrusel'];

    function soloTexto(str) {
      if (!str) return '';
      v…
[13:00, 27/5/2026] Evelyn Aguilar: <!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Feed Preview · The Creator Vault</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;display:flex;justify-content:center;padding:1rem;min-height:100vh}
.wrap{width:100%;max-width:420px}
.setup{background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:1.25rem;margin-bottom:1.5rem}
.setup h2{font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px}
.field{margin-bottom:10px}
.field label{display:block;font-size:12px;color:#666;margin-bottom:4px}
.field input,.field…
[13:05, 27/5/2026] Evelyn Aguilar: const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    var token = req.body.token;
    var dbid = req.body.dbid;
    var red = req.body.red || 'Instagram';

    if (!token || !dbid) return res.status(400).json({ message: 'Token y database ID son requeridos.' });

    function sinEmoji(str) {
      if (!str) return '';
      var out = '';
      for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c < 8192) out += str[i];
      }
      return out.toLowerCase().trim();
    }

    var redBuscada = sinEmoji(red);

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
          try { resolve({ status: response.statusCode, body: JSON.parse(rawData) }); }
          catch(e) { reject(e); }
        });
      });
      request.on('error', reject);
      request.write(body);
      request.end();
    });

    if (data.status !== 200) return res.status(data.status).json({ message: data.body.message || 'Error de Notion.' });

    var filtrados = data.body.results.filter(function(page) {
      var props = page.properties;
      if (!props) return false;

      var fechaProp = props.Fecha;
      if (!fechaProp || !fechaProp.date || !fechaProp.date.start) return false;

      var statusProp = props.Status;
      if (!statusProp) return false;
      var statusNombre = '';
      if (statusProp.status && statusProp.status.name) statusNombre = statusProp.status.name;
      else if (statusProp.select && statusProp.select.name) statusNombre = statusProp.select.name;
      if (!statusNombre) return false;
      var statusS = sinEmoji(statusNombre);
      var statusOk = statusS.indexOf('publicado') !== -1 ||
                     statusS.indexOf('programado') !== -1 ||
                     statusS.indexOf('producci') !== -1 ||
                     statusS.indexOf('published') !== -1 ||
                     statusS.indexOf('scheduled') !== -1;
      if (!statusOk) return false;

      var redProp = props.Red;
      if (!redProp) return false;
      var redes = [];
      if (redProp.multi_select && redProp.multi_select.length > 0) {
        redes = redProp.multi_select.map(function(r){ return sinEmoji(r.name); });
      } else if (redProp.select && redProp.select.name) {
        redes = [sinEmoji(redProp.select.name)];
      }
      var tieneRed = redes.some(function(r){ return r.indexOf(redBuscada) !== -1 || redBuscada.indexOf(r) !== -1; });
      if (!tieneRed) return false;

      var formatoProp = props.Formato;
      if (!formatoProp) return false;
      var formatos = [];
      if (formatoProp.multi_select && formatoProp.multi_select.length > 0) {
        formatos = formatoProp.multi_select.map(function(f){ return sinEmoji(f.name); });
      } else if (formatoProp.select && formatoProp.select.name) {
        formatos = [sinEmoji(formatoProp.select.name)];
      }
      var validos = ['reel', 'post', 'carrusel'];
      var tieneFormato = formatos.some(function(f){
        return validos.some(function(v){ return f.indexOf(v) !== -1; });
      });
      if (!tieneFormato) return false;

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
        if (file.type === 'external' && file.external) rawUrl = file.external.url;
        else if (file.file) rawUrl = file.file.url;
      }
      if (!rawUrl && page.cover) {
        if (page.cover.type === 'external' && page.cover.external) rawUrl = page.cover.external.url;
        else if (page.cover.file) rawUrl = page.cover.file.url;
      }

      var formatoProp = page.properties && page.properties.Formato;
      var formatoNombre = '';
      if (formatoProp) {
        if (formatoProp.multi_select && formatoProp.multi_select.length > 0) formatoNombre = formatoProp.multi_select[0].name;
        else if (formatoProp.select && formatoProp.select.name) formatoNombre = formatoProp.select.name;
      }

      var statusProp = page.properties && page.properties.Status;
      var statusNombre = '';
      if (statusProp) {
        if (statusProp.status && statusProp.status.name) statusNombre = statusProp.status.name;
        else if (statusProp.select && statusProp.select.name) statusNombre = statusProp.select.name;
      }

      page._directImg = rawUrl || null;
      page._formato = sinEmoji(formatoNombre);
      page._status = statusNombre;
      return page;
    });

    return res.status(200).json({ results: pages });

  } catch(error) {
    return res.status(500).json({ message: 'Error: ' + error.message });
  }
};
