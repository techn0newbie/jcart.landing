// ================================================================
// JOGJACART — Netlify Function
// Handles: CORS, duplicate phone check, code generation, Google Sheets
// ================================================================

exports.handler = async function (event) {

  // ── CORS headers — allows your GitHub Pages site to call this ──
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ status: 'error', message: 'Method not allowed' }) };
  }

  try {
    const data = JSON.parse(event.body);
    const { name, email, phone, timestamp } = data;

    // ── NORMALIZE PHONE ──
    let cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);

    // ── CALL GOOGLE APPS SCRIPT ──
    const gasUrl = process.env.APPS_SCRIPT_URL;
    const gasResponse = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone: cleanPhone, timestamp })
    });

    const result = await gasResponse.json();

    // ── BUILD WA LINK ──
    const waMessage = encodeURIComponent(
      'Halo ' + name + '! 🎉\n\n' +
      'Terima kasih sudah bergabung dengan JogjaCart.\n\n' +
      'Berikut kode diskon 10% untuk pembelian pertama kamu:\n\n' +
      '👉 *' + result.discountCode + '*\n\n' +
      'Gunakan kode ini saat checkout. Selamat berbelanja! 🛍️'
    );
    const waLink = cleanPhone ? 'https://wa.me/' + cleanPhone + '?text=' + waMessage : null;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: result.status,
        discountCode: result.discountCode,
        waLink: waLink
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ status: 'error', message: err.toString() })
    };
  }
};
