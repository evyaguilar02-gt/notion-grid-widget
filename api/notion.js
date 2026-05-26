export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { token, dbid, sortby } = req.body;
  if (!token || !dbid) return res.status(400).json({ message: 'Token y database ID son requeridos.' });

  const sortProp = sortby === 'Fecha'
    ? { property: 'Fecha', direction: 'ascending' }
    : { property: 'Orden', direction: 'ascending' };

  try {
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${dbid}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
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

    const pages = await Promise.all(data.results.map(async (page) => {
      const files = page.properties?.Imagen?.files || [];
      let imgUrl = null;

      if (files.length > 0) {
        const file = files[0];
        if (file.type === 'external') {
          imgUrl = file.external?.url || null;
        } else if (file.type === 'file') {
          imgUrl = file.file?.url || null;
        }
      }

      if (!imgUrl && page.cover) {
        imgUrl = page.cover.type === 'external'
          ? page.cover.external?.url
          : page.cover.file?.url;
      }

      return { ...page, _resolvedImg: imgUrl };
    }));

    return res.status(200).json({ results: pages });

  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}
