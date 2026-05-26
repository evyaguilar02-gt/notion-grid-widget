module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET' && req.query.proxy) {
    try {
      const imageUrl = decodeURIComponent(req.query.proxy);
      const imageRes = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!imageRes.ok) return res.status(404).end();
      const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
      const buffer = await imageRes.arrayBuffer();
      return res.send(Buffer.from(buffer));
    } catch {
      return res.status(500).end();
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { token, dbid, sortby } = req.body;
  if (!token || !dbid) return res.status(400).json({ message: 'Token y database ID son requeridos.' });

  const sortProp = sortby === 'Fecha'
    ? { property: 'Date', direction: 'ascending' }
    : { property: 'Orden', direction: 'ascending' };

  try {
    const dbRes = await fetch(https://api.notion.com/v1/databases/${dbid}/query, {
      method: 'POST',
      headers: {
        'Authorization': Bearer ${token},
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sorts: [{ property: sortProp.property, direction: sortProp.direction }],
        page_size: 9
      })
    });

    const data = await dbRes.json();
    if (!dbRes.ok) return res.status(dbRes.status).json({ message: data.message || 'Error de Notion.' });

    const pages = data.results.map((page) => {
      const files = page.properties?.Image?.files || [];
      let rawUrl = null;

      if (files.length > 0) {
        const file = files[0];
        rawUrl = file.type === 'external'
          ? file.external?.url
          : file.file?.url;
      }

      if (!rawUrl && page.cover) {
        rawUrl = page.cover.type === 'external'
          ? page.cover.external?.url
          : page.cover.file?.url;
      }

      const _resolvedImg = rawUrl
        ? /api/notion?proxy=${encodeURIComponent(rawUrl)}
        : null;

      return { ...page, _resolvedImg };
    });

    return res.status(200).json({ results: pages });

  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}
