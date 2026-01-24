const http = require('http');

const url = 'http://localhost:3000/auth/sign-up';

console.log(`Testing connection to ${url}...`);

http.get(url, (res) => {
    const { statusCode } = res;
    console.log(`Status Code: ${statusCode}`);

    if (statusCode === 200) {
        console.log('✅ Page is accessible.');
    } else {
        console.log(`❌ Failed to load page. Status: ${statusCode}`);
    }

    res.resume(); // Consume response data to free up memory
}).on('error', (e) => {
    console.error(`❌ Request error: ${e.message}`);
});
