import http from 'http';

// Test the Swagger UI endpoint
const testSwaggerUI = () => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api-docs',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Swagger UI Status: ${res.statusCode}`);
    console.log(`📖 Swagger UI available at: http://localhost:5000/api-docs`);
    
    if (res.statusCode === 200) {
      console.log('🎉 Swagger UI is working correctly!');
    } else {
      console.log('❌ Swagger UI returned an error status');
    }
  });

  req.on('error', (error) => {
    console.error('❌ Error accessing Swagger UI:', error.message);
    console.log('💡 Make sure the backend server is running on port 5000');
  });

  req.end();
};

// Test the health endpoint
const testHealthEndpoint = () => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`✅ Health Endpoint Status: ${res.statusCode}`);
      try {
        const healthData = JSON.parse(data);
        console.log('📊 Health Data:', healthData);
      } catch (error) {
        console.log('📄 Raw Response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error accessing health endpoint:', error.message);
  });

  req.end();
};

// Test the price status endpoint
const testPriceStatus = () => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/transactions/price-status',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`✅ Price Status Endpoint: ${res.statusCode}`);
      try {
        const priceData = JSON.parse(data);
        console.log('💰 Price Status Data:', priceData);
      } catch (error) {
        console.log('📄 Raw Response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error accessing price status endpoint:', error.message);
  });

  req.end();
};

console.log('🧪 Testing Swagger UI and API endpoints...\n');

// Run tests
testSwaggerUI();
setTimeout(testHealthEndpoint, 1000);
setTimeout(testPriceStatus, 2000);

console.log('\n📋 Test Summary:');
console.log('1. Swagger UI should be available at http://localhost:5000/api-docs');
console.log('2. You can test all API endpoints through the Swagger UI');
console.log('3. The UI provides interactive documentation for all endpoints');
console.log('4. You can execute requests directly from the browser'); 