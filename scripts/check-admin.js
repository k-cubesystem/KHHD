// Node 18+ has built_in fetch

async function checkUrl(url) {
    try {
        const res = await fetch(url, { redirect: 'manual' });
        console.log(`[CHECK] ${url} => Status: ${res.status}`);
        if (res.status === 307 || res.status === 302) {
            console.log(`   Location: ${res.headers.get('location')}`);
        }
        return res.status;
    } catch (e) {
        console.error(`[ERROR] ${url} => ${e.message}`);
        return 0;
    }
}

async function run() {
    console.log("Checking Server Health...");
    await checkUrl('http://localhost:3000/protected'); // 일반 페이지

    console.log("Checking Admin Access...");
    const adminStatus = await checkUrl('http://localhost:3000/admin');

    // 307 -> /protected 또는 /auth/login으로 리다이렉트된다면 "보호됨"을 의미
    // 200 -> 접근 성공 (만약 미들웨어가 뚫렸다면 문제, 아니면 내가 admin이라서 성공)
}

// Node 18 이상이면 fetch 글로벌 사용 가능, 아니면 require 필요하지만 여긴 Next.js 프로젝트라 node_modules에 뭔가 있을듯.
// 일단 그냥 실행해봄.
run();
