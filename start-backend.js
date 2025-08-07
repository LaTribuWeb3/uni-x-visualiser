import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Uni-X Visualizer Backend Server...');
console.log('📖 Swagger UI will be available at: http://localhost:5000/api-docs');
console.log('💡 Press Ctrl+C to stop the server\n');

// Start the backend server using shell
const isWindows = process.platform === 'win32';
const shell = isWindows ? 'cmd.exe' : '/bin/bash';
const shellArgs = isWindows ? ['/c'] : ['-c'];
const command = isWindows ? 'npx tsx src/backend.ts' : 'npx tsx src/backend.ts';

const backendProcess = spawn(shell, [...shellArgs, command], {
  stdio: 'inherit',
  cwd: __dirname
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping server...');
  backendProcess.kill('SIGINT');
  process.exit(0);
});

backendProcess.on('close', (code) => {
  console.log(`\n📴 Backend server stopped with code ${code}`);
  process.exit(code);
});

backendProcess.on('error', (error) => {
  console.error('❌ Failed to start backend server:', error);
  process.exit(1);
}); 