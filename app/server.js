const express = require('express');
const path = require('path');
const httpProxy = require('http-proxy');

const app = express();
const proxy = httpProxy.createProxyServer({
  target: 'http://backend:4000',
  changeOrigin: true,
  ws: true
});

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Proxy all API calls to backend
app.use('/api', (req, res) => {
  proxy.web(req, res);
});

app.post('/login', (req, res) => {
  proxy.web(req, res);
});

app.post('/verify-token', (req, res) => {
  proxy.web(req, res);
});

app.post('/create-password', (req, res) => {
  proxy.web(req, res);
});

app.post('/verificar_password', (req, res) => {
  proxy.web(req, res);
});

app.post('/guardar-chave-rsa', (req, res) => {
  proxy.web(req, res);
});

app.post('/criar-eleicao', (req, res) => {
  proxy.web(req, res);
});

app.get('/eleicoes/:id/resultados', (req, res) => {
  proxy.web(req, res);
});

app.get('/eleicoes/:id/opcoes', (req, res) => {
  proxy.web(req, res);
});

app.get('/eleicoes/codigo/:codigo', (req, res) => {
  proxy.web(req, res);
});

app.get('/eleicoes', (req, res) => {
  proxy.web(req, res);
});

app.post('/verificar-eleicao-privada', (req, res) => {
  proxy.web(req, res);
});

app.get('/eleicoes-publicas', (req, res) => {
  proxy.web(req, res);
});

app.post('/api/iniciar-votacao', (req, res) => {
  proxy.web(req, res);
});

app.post('/api/votar', (req, res) => {
  proxy.web(req, res);
});

app.get('/api/sessao-info', (req, res) => {
  proxy.web(req, res);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch 404 and serve index.html for SPA routing
app.use((req, res) => {
  if (req.path.startsWith('/api') || req.method !== 'GET') {
    proxy.web(req, res);
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  if (res.headersSent) {
    return res.end();
  }
  res.status(500).json({ error: 'Backend error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App server running on port ${PORT}, proxying to backend:4000`);
});
