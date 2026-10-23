// Isolated QA entry. Does not change or serve the application's routes or UI.
process.env.NODE_ENV = 'development';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const webpack = require('webpack');
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'moviesync-qa-'));
const compiler = webpack({
  mode: 'development', devtool: false,
  entry: path.join(__dirname, 'streaming-qa.jsx'),
  output: { path: output, filename: 'qa.js' },
  module: { rules: [{ test: /\.jsx?$/, exclude: /node_modules/,
    use: { loader: require.resolve('babel-loader'), options: {
      babelrc: false, configFile: false, presets: [require.resolve('babel-preset-react-app')],
    } } }] },
  resolve: { modules: [path.join(root, 'node_modules'), 'node_modules'], extensions: ['.js', '.jsx'] },
});
compiler.run((error, stats) => {
  compiler.close(() => {});
  if (error || stats.hasErrors()) {
    console.error(error || stats.toString({ all: false, errors: true }));
    process.exitCode = 1;
    return;
  }
  console.log('Streaming QA bundle compiled successfully. No playback has been verified.');
  if (process.argv.includes('--check')) return;
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MovieSync isolated playback QA</title></head><body><div id="root"></div><script src="/qa.js"></script></body></html>';
  const server = http.createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.url === '/qa.js') {
      response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      fs.createReadStream(path.join(output, 'qa.js')).pipe(response);
    } else if (request.url === '/unavailable.mp4') {
      response.writeHead(404); response.end('Intentional QA media failure');
    } else if (request.url === '/') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html);
    } else { response.writeHead(404); response.end(); }
  });
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(4174, '127.0.0.1', () => console.log('Open http://127.0.0.1:4174/ in your local browser. Stop with Ctrl+C.'));
});
