// ============================================================
// E.B.V. — Escola Bolsa de Valores
// Netlify Function: Proxy seguro para Financial Modeling Prep
// Atualizado para nova API /stable/ (ago/2025)
// A chave API nunca aparece no frontend
// ============================================================

exports.handler = async function (event) {
  const FMP_KEY = process.env.FMP_API_KEY;

  if (!FMP_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "FMP_API_KEY não configurada no servidor." }),
    };
  }

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: corsHeaders(), body: "Method Not Allowed" };
  }

  const params = event.queryStringParameters || {};
  const endpoint = params.endpoint;

  if (!endpoint) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Parâmetro 'endpoint' obrigatório." }),
    };
  }

  // Whitelist de endpoints permitidos
  const ALLOWED = ["quote", "historical-price-eod/full", "historical-chart/1day", "etf-holder", "ratios-ttm", "profile"];
  if (!ALLOWED.includes(endpoint)) {
    return {
      statusCode: 403,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Endpoint não permitido." }),
    };
  }

  const symbol = (params.symbol || "").toUpperCase().replace(/[^A-Z0-9.]/g, "");
  if (!symbol) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Parâmetro 'symbol' obrigatório." }),
    };
  }

  // Nova API /stable/ da FMP
  let fmpUrl = `https://financialmodelingprep.com/stable/${endpoint}?symbol=${symbol}&apikey=${FMP_KEY}`;

  // Parâmetros extras
  if (params.from)   fmpUrl += `&from=${params.from}`;
  if (params.to)     fmpUrl += `&to=${params.to}`;
  if (params.limit)  fmpUrl += `&limit=${parseInt(params.limit)}`;

  try {
    const response = await fetch(fmpUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: corsHeaders(),
        body: JSON.stringify({ error: `FMP retornou status ${response.status}` }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(),
        "Cache-Control": "public, max-age=300", // cache 5 min
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Erro ao conectar com FMP: " + err.message }),
    };
  }
};

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
  };
}
