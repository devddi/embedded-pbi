import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabaseClient =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path, clientId: clientIdQuery } = req.query;
  const method = req.method || 'GET';

  if (!supabaseClient) {
    return res
      .status(500)
      .json({ error: 'Configuração do Supabase ausente no ambiente do servidor.' });
  }

  try {
    const clientId =
      typeof clientIdQuery === 'string' ? clientIdQuery : Array.isArray(clientIdQuery) ? clientIdQuery[0] : undefined;

    const baseQuery = supabaseClient
      .from('powerbi_clients')
      .select('tenant_id, client_id, client_secret');

    const { data, error } = clientId
      ? await baseQuery.eq('id', clientId).limit(1)
      : await baseQuery.order('created_at', { ascending: true }).limit(1);

    if (error) {
      console.error('Erro ao buscar credenciais do Power BI no Supabase:', error);
      return res.status(500).json({ error: 'Erro ao buscar credenciais no Supabase.' });
    }

    const clientRow = data && data[0];

    if (!clientRow) {
      return res
        .status(500)
        .json({ error: 'Nenhum cliente Power BI configurado na tabela powerbi_clients.' });
    }

    const { tenant_id: tenantId, client_id: clientId, client_secret: clientSecret } = clientRow;

    if (!tenantId || !clientId || !clientSecret) {
      return res
        .status(500)
        .json({ error: 'Credenciais do cliente Power BI incompletas na tabela powerbi_clients.' });
    }

    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://analysis.windows.net/powerbi/api/.default',
        }),
      },
    );

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return res
        .status(tokenResponse.status)
        .json({ error: 'Erro ao obter token da Microsoft', details: tokenData });
    }

    const accessToken = tokenData.access_token;

    if (path === 'get-access-token') {
      return res.status(200).json({ access_token: accessToken });
    }

    const powerBiPath = Array.isArray(path) ? path.join('/') : (path as string);
    const url = `https://api.powerbi.com/${powerBiPath}`;

    const pbiResponse = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const pbiData = await pbiResponse.json().catch(() => ({}));
    return res.status(pbiResponse.status).json(pbiData);
  } catch (error: unknown) {
    console.error('Erro no Proxy Power BI:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({ error: 'Erro interno no servidor', message });
  }
}
