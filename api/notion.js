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
    var statusValidos = ['publicado', 'en producci', 'programado'…
[12:45, 27/5/2026] Evelyn Aguilar: const https = require('https');

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
    var statusValidos = ['publicado', 'producci', 'programado', '…
[12:48, 27/5/2026] Evelyn Aguilar: const https = require('https');

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

    function quitarEmojis(str) {
      if (!str) return '';
    …
[12:59, 27/5/2026] Evelyn Aguilar: const https = require('https');

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
      var out = '';
      var i = 0;
      while (i < str.length) {
        var code = str.charCodeAt(i);
        if (code >= 0xD800 && code <= 0xDBFF) {
          i += 2;
          continue;
        }
        if (code > 0x2000) {
          i++;
          continue;
        }
        out += str[i];
        i++;
      }
      return out.toLowerCase().trim();
    }

    var redBuscada = soloTexto(red);

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
      var statusTexto = soloTexto(statusNombre);
      var statusOk = statusTexto.indexOf('publicado') !== -1 ||
                     statusTexto.indexOf('programado') !== -1 ||
                     statusTexto.indexOf('producci') !== -1 ||
                     statusTexto.indexOf('published') !== -1 ||
                     statusTexto.indexOf('scheduled') !== -1;
      if (!statusOk) return false;

      var redProp = props.Red;
      if (!redProp) return false;
      var redesArray = [];
      if (redProp.multi_select && redProp.multi_select.length > 0) {
        redesArray = redProp.multi_select.map(function(r){ return soloTexto(r.name); });
      } else if (redProp.select && redProp.select.name) {
        redesArray = [soloTexto(redProp.select.name)];
      }
      var tieneRed = redesArray.some(function(r){
        return r.indexOf(redBuscada) !== -1 || redBuscada.indexOf(r) !== -1;
      });
      if (!tieneRed) return false;

      var formatoProp = props.Formato;
      if (!formatoProp) return false;
      var formatosArray = [];
      if (formatoProp.multi_select && formatoProp.multi_select.length > 0) {
        formatosArray = formatoProp.multi_select.map(function(f){ return soloTexto(f.name); });
      } else if (formatoProp.select && formatoProp.select.name) {
        formatosArray = [soloTexto(formatoProp.select.name)];
      }
      var tieneFormato = formatosArray.some(function(f){
        return formatosValidos.some(function(v){ return f.indexOf(v) !== -1; });
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
      page._formato = soloTexto(formatoNombre);
      page._status = statusNombre;
      return page;
    });

    return res.status(200).json({ results: pages });

  } catch(error) {
    return res.status(500).json({ message: 'Error: ' + error.message });
  }
};
