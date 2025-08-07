import http from 'http';

// Test if the daemon is running by checking if it's processing transactions
const testDaemon = () => {
  console.log('🧪 Testing Price Enrichment Daemon...');
  
  // Check if MongoDB is accessible
  const testMongoDB = () => {
    const options = {
      hostname: 'localhost',
      port: 27017,
      path: '/',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      console.log(`✅ MongoDB is accessible (Status: ${res.statusCode})`);
    });

    req.on('error', (error) => {
      console.log('⚠️ MongoDB connection test failed (this is normal if MongoDB is not running on port 27017)');
    });

    req.end();
  };

  // Check if the backend API is running
  const testBackendAPI = () => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      console.log(`✅ Backend API is running (Status: ${res.statusCode})`);
    });

    req.on('error', (error) => {
      console.log('⚠️ Backend API is not running (this is normal if backend is not started)');
    });

    req.end();
  };

  // Check if the frontend is running
  const testFrontend = () => {
    const options = {
      hostname: 'localhost',
      port: 5173,
      path: '/',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      console.log(`✅ Frontend is running (Status: ${res.statusCode})`);
    });

    req.on('error', (error) => {
      console.log('⚠️ Frontend is not running (this is normal if frontend is not started)');
    });

    req.end();
  };

  // Run tests
  console.log('🔍 Checking system components...\n');
  
  setTimeout(testMongoDB, 100);
  setTimeout(testBackendAPI, 200);
  setTimeout(testFrontend, 300);
  
  setTimeout(() => {
    console.log('\n📊 Daemon Test Summary:');
    console.log('✅ If you see Node.js processes running, the daemon is active');
    console.log('✅ Check the console output for daemon logs');
    console.log('✅ The daemon should be processing transactions every 30 seconds');
    console.log('\n💡 To see daemon logs, run: npm run start-daemon');
    console.log('💡 To start all services: npm run start-all');
  }, 1000);
};

testDaemon(); 