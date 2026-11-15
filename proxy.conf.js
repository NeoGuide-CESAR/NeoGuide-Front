// Proxy do ng serve: encaminha /api/neo para a API Lumi (NeoGuide-NeoChat).
// A chave X-API-Key é anexada aqui, no servidor de desenvolvimento, e nunca chega ao bundle do navegador.
const fs = require('fs');
const path = require('path');

function lerChaveDoEnvDaLumi() {
  try {
    const env = fs.readFileSync(path.join(__dirname, '..', 'NeoGuide-NeoChat', '.env'), 'utf8');
    const linha = env.split(/\r?\n/).find((l) => l.startsWith('API_KEY='));
    return linha ? linha.slice('API_KEY='.length).trim() : '';
  } catch {
    return '';
  }
}

const CHAVE_LUMI = process.env.LUMI_API_KEY || lerChaveDoEnvDaLumi();

module.exports = {
  '/api/neo': {
    target: process.env.LUMI_API_URL || 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: { '^/api/neo': '/api/v1' },
    // Cabeçalho de requisição aplicado pelo http-proxy (vale para qualquer versão do http-proxy-middleware).
    headers: { 'X-API-Key': CHAVE_LUMI },
  },
};
