/* eslint-env node */
// CRA development only. Production routes these requests directly to the Worker.
const http = require('http');
module.exports = function setupProxy(app) {
  app.use('/api/community', (req, res) => {
    const origin = req.headers.origin;
    if ((origin && origin !== 'http://' + req.headers.host) || req.headers['sec-fetch-site'] === 'cross-site') {
      res.status(403).json({ error: 'Origin not allowed.' }); return;
    }
    const headers = { ...req.headers, host: '127.0.0.1:8787' };
    if (origin) headers.origin = 'http://127.0.0.1:8787';
    const upstream = http.request({ hostname: '127.0.0.1', port: 8787, path: req.originalUrl, method: req.method, headers }, response => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    });
    upstream.on('error', () => { if (!res.headersSent) res.status(503).json({ error: 'The account service is offline. Please try again shortly.' }); else res.end(); });
    req.on('aborted', () => upstream.destroy()); req.pipe(upstream);
  });
};
