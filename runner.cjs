const { spawn } = require('child_process');

function startServer() {
  const child = spawn('cmd.exe', ['/c', 'npm run dev'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  child.on('exit', (code) => {
    console.log('Next.js process exited with code ' + code + '. Restarting in 2s...');
    setTimeout(startServer, 2000);
  });

  child.on('error', (err) => {
    console.error('Error starting server:', err);
    setTimeout(startServer, 2000);
  });
}

startServer();
