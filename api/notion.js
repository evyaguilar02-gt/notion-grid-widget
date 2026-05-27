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
    var statusValidos = ['publicado', 'en producci', 'programado', 'en proceso', 'published', 'scheduled'];

    function limpiar(str) {
      if (!str) return '';
      var resultado = '';
      for (var i = 0; i < str.length; i++) {
        var code = str.charCodeAt(i);
        if (code < 127 || (code >= 160 && code <= 591)) {
          resultado += str[i].toLowerCase();
        }
      }
      return resultado.trim();
    }

    var redBuscada = limpiar(red);

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
      var statusLimpio = limpiar(statusNombre);
      var statusValido = statusValidos.some(function(v){ return statusLimpio.indexOf(v) !== -1; });
      if (!statusValido) return false;

      var redProp = props.Red;
      if (!redProp) return false;
      var redesSeleccionadas = [];
      if (redProp.multi_select && redProp.multi_select.length > 0) {
        redesSeleccionadas = redProp.multi_select.map(function(r){ return limpiar(r.name); });
      } else if (redProp.select && redProp.select.name) {
        redesSeleccionadas = [limpiar(redProp.select.name)];
      }
      if (redesSeleccionadas.indexOf(redBuscada) === -1) return false;

      var formatoProp = props.Formato;
      if (!formatoProp) return false;
      var formatosSeleccionados = [];
      if (formatoProp.multi_select && formatoProp.multi_select.length > 0) {
        formatosSeleccionados = formatoProp.multi_select.map(function(f){ return limpiar(f.name); });
      } else if (formatoProp.select && formatoProp.select.name) {
        formatosSeleccionados = [limpiar(formatoProp.select.name)];
      }
      var tieneFormatoValido = formatosSeleccionados.some(function(f){
        return formatosValidos.indexOf(f) !== -1;
      });
      if (!tieneFormatoValido) return false;

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
      page._directImg = rawUrl || null;
      page._formato = limpiar(formatoNombre);
      return page;
    });

    return res.status(200).json({ results: pages });

  } catch(error) {
    return res.status(500).json({ message: 'Error: ' + error.message });
  }
};
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
    var statusValidos = ['publicado', 'producci', 'programado', 'proceso', 'published', 'scheduled'];

    function normalizar(str) {
      if (!str) return '';
      return str
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .split('')
        .filter(function(c) {
          var code = c.charCodeAt(0);
          return code < 65536;
        })
        .join('')
        .trim();
    }

    function contieneRed(nombre, busqueda) {
      var n = normalizar(nombre);
      var b = normalizar(busqueda);
      // Busca si el texto sin emojis contiene la palabra clave
      var nSinEmoji = n.replace(/[^\w\s]/g, '').trim();
      var bSinEmoji = b.replace(/[^\w\s]/g, '').trim();
      return n === b || nSinEmoji === bSinEmoji || n.indexOf(bSinEmoji) !== -1 || nSinEmoji.indexOf(bSinEmoji) !== -1;
    }

    var redBuscada = normalizar(red);

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

      // Debe tener Fecha
      var fechaProp = props.Fecha;
      if (!fechaProp || !fechaProp.date || !fechaProp.date.start) return false;

      // Status válido
      var statusProp = props.Status;
      if (!statusProp) return false;
      var statusNombre = '';
      if (statusProp.status && statusProp.status.name) statusNombre = statusProp.status.name;
      else if (statusProp.select && statusProp.select.name) statusNombre = statusProp.select.name;
      if (!statusNombre) return false;
      var statusNorm = normalizar(statusNombre).replace(/[^\w\s]/g, '').trim();
      var statusValido = statusValidos.some(function(v){ return statusNorm.indexOf(v) !== -1; });
      if (!statusValido) return false;

      // Red debe incluir la seleccionada
      var redProp = props.Red;
      if (!redProp) return false;
      var redesSeleccionadas = [];
      if (redProp.multi_select && redProp.multi_select.length > 0) {
        redesSeleccionadas = redProp.multi_select.map(function(r){ return r.name; });
      } else if (redProp.select && redProp.select.name) {
        redesSeleccionadas = [redProp.select.name];
      }
      var tieneRed = redesSeleccionadas.some(function(r){
        return contieneRed(r, red);
      });
      if (!tieneRed) return false;

      // Formato válido — excluye Historia
      var formatoProp = props.Formato;
      if (!formatoProp) return false;
      var formatosSeleccionados = [];
      if (formatoProp.multi_select && formatoProp.multi_select.length > 0) {
        formatosSeleccionados = formatoProp.multi_select.map(function(f){ return normalizar(f.name).replace(/[^\w\s]/g, '').trim(); });
      } else if (formatoProp.select && formatoProp.select.name) {
        formatosSeleccionados = [normalizar(formatoProp.select.name).replace(/[^\w\s]/g, '').trim()];
      }
      var tieneFormatoValido = formatosSeleccionados.some(function(f){
        return formatosValidos.indexOf(f) !== -1;
      });
      if (!tieneFormatoValido) return false;

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
      page._directImg = rawUrl || null;
      page._formato = normalizar(formatoNombre).replace(/[^\w\s]/g, '').trim();
      return page;
    });

    return res.status(200).json({ results: pages });

  } catch(error) {
    return res.status(500).json({ message: 'Error: ' + error.message });
  }
};
