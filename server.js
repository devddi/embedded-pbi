import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch'; // Caso precise em node < 18, mas node >= 18 já tem fetch nativo

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Configuração do Supabase
// Tenta ler variáveis do arquivo .env, tanto com prefixo VITE quanto sem
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Tenta ler chave de serviço (backend) ou anon (frontend)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('⚠️  AVISO: Variáveis de ambiente do Supabase não encontradas. A API pode falhar.');
  console.log('Esperado: VITE_SUPABASE_URL e (opcionalmente) SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Endpoint: /api/powerbi
app.all('/api/powerbi', async (req, res) => {
  const { path, clientId: clientIdQuery } = req.query;
  const method = req.method;

  if (!path) {
    return res.status(400).json({ error: 'Parâmetro "path" é obrigatório.' });
  }

  try {
    // 1. Obter credenciais do cliente Power BI no Supabase
    let clientId = clientIdQuery;
    
    // Se clientIdQuery for array, pega o primeiro
    if (Array.isArray(clientIdQuery)) {
      clientId = clientIdQuery[0];
    }

    let query = supabase
      .from('powerbi_clients')
      .select('tenant_id, client_id, client_secret');
    
    if (clientId) {
      query = query.eq('id', clientId).limit(1);
    } else {
      query = query.order('created_at', { ascending: true }).limit(1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar credenciais do Power BI:', error);
      return res.status(500).json({ error: 'Erro ao buscar credenciais no Supabase.', details: error });
    }

    if (!data || data.length === 0) {
      console.log('Nenhum cliente Power BI encontrado. Query params:', { clientId });
      return res.status(404).json({ error: 'Nenhum cliente Power BI encontrado na tabela powerbi_clients.' });
    }

    const clientRow = data[0];
    const { tenant_id, client_id, client_secret } = clientRow;

    if (!tenant_id || !client_id || !client_secret) {
      return res.status(500).json({ error: 'Credenciais do cliente incompletas na tabela.' });
    }

    // 2. Obter Access Token da Microsoft
    const tokenUrl = `https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`;
    
    // Log para debug (cuidado com segredos em produção, mas útil aqui)
    console.log(`Tentando autenticar cliente ${clientId || 'padrão'}...`);
    console.log(`Tenant: ${tenant_id}`);
    console.log(`Client ID: ${client_id}`);
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id,
        client_secret,
        scope: 'https://analysis.windows.net/powerbi/api/.default'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Erro ao obter token Microsoft:', tokenResponse.status, errorText);
      return res.status(tokenResponse.status).json({ 
        error: 'Erro ao autenticar na Microsoft', 
        status: tokenResponse.status,
        details: errorText 
      });
    }

    let tokenData;
    try {
        const text = await tokenResponse.text(); // Lê como texto primeiro
        tokenData = JSON.parse(text); // Tenta parsear
    } catch (e) {
        console.error('Resposta da Microsoft não é JSON válido:', e);
        return res.status(500).json({ error: 'Resposta inválida da Microsoft' });
    }

    const accessToken = tokenData.access_token;

    // Se for apenas para pegar o token
    if (path === 'get-access-token') {
      return res.json({ access_token: accessToken });
    }

    // 3. Proxy para a API do Power BI
    const powerBiPath = Array.isArray(path) ? path.join('/') : path;
    const pbiUrl = `https://api.powerbi.com/${powerBiPath}`;

    const pbiResponse = await fetch(pbiUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    // Tenta ler JSON, se falhar retorna vazio
    const pbiData = await pbiResponse.json().catch(() => ({}));
    
    return res.status(pbiResponse.status).json(pbiData);

  } catch (error) {
    console.error('Erro no servidor local:', error);
    return res.status(500).json({ error: 'Erro interno no servidor local', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor de API local rodando em http://localhost:${PORT}`);
  console.log(`👉 Proxy para Power BI disponível em http://localhost:${PORT}/api/powerbi`);
  console.log(`   (As chamadas do frontend para /api/powerbi serão redirecionadas para cá)\n`);
});
