

async function testBackend() {
  try {
    const testTransaction = {
      decayStartTime: "1234567890",
      inputTokenAddress: "0x1234567890123456789012345678901234567890",
      inputStartAmount: "1000000000000000000",
      outputTokenAddress: "0x0987654321098765432109876543210987654321",
      outputTokenAmountOverride: "2000000000000000000",
      orderHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      transactionHash: "0x0987654321098765432109876543210987654321098765432109876543210987"
    };

    const response = await fetch('http://localhost:5000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transactions: [testTransaction] })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error:', response.status, errorText);
    } else {
      const result = await response.json();
      console.log('Success:', result);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testBackend(); 