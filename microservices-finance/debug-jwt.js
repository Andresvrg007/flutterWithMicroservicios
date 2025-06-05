const jwt = require('jsonwebtoken');

// The token from the login response
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODQwYWM2NTQ1MDEzZTAzNzZlYTZhNDZiNTIiLCJ1c2VybmFtZSI6InVzZXJuYW1lIiwiYXV0aCI6dHJ1ZSwiaWF0IjoxNzMzNDIzMDU1LCJleHAiOjE3MzM1MDk0NTV9.yDgMl9VuYTMqQ6K-SYhAK_YT6XAeFR5lhKE0y1s5WM4";

console.log('🔍 Decoding JWT token...');

// Decode without verification to see the payload
const decoded = jwt.decode(token, { complete: true });
console.log('\n📋 Token Header:', JSON.stringify(decoded.header, null, 2));
console.log('\n📋 Token Payload:', JSON.stringify(decoded.payload, null, 2));

// Try verifying with different secrets
const secrets = [
    'your_super_secret_jwt_key_here_2024',
    'your-secret-key',
    'your_super_secret_jwt_key_finance_microservices_2024_production',
    process.env.JWT_SECRET
];

console.log('\n🔐 Testing JWT secrets...');

secrets.forEach((secret, index) => {
    if (!secret) {
        console.log(`❌ Secret ${index + 1}: undefined/null`);
        return;
    }
    
    try {
        const verified = jwt.verify(token, secret);
        console.log(`✅ Secret ${index + 1} (${secret}): VALID`);
        console.log('   User ID:', verified.userId);
        console.log('   Username:', verified.username);
        console.log('   Expires:', new Date(verified.exp * 1000));
    } catch (error) {
        console.log(`❌ Secret ${index + 1} (${secret}): ${error.message}`);
    }
});
