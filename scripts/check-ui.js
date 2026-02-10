const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runTest() {
    console.log('Starting UI Test...');
    const browser = await chromium.launch({ headless: true }); // 헤드리스 모드로 실행
    const context = await browser.newContext({
        viewport: { width: 375, height: 812 }, // iPhone X 사이즈 (모바일 강제)
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    });
    const page = await context.newPage();

    try {
        // 1. 멤버십 페이지 접속
        console.log('1. Navigating to Membership Page...');
        await page.goto('http://localhost:3000/protected/membership', { waitUntil: 'networkidle' });

        // 스크린샷 1: 멤버십 페이지 (게스트)
        await page.screenshot({ path: 'test-membership-guest.png', fullPage: true });
        console.log('   - Screenshot saved: test-membership-guest.png');

        // 2. Skip Login/Signup (User is already logged in manually)
        console.log('2. Skipping Login/Signup (User is already authenticated)...');
        // We might need to handle the case where we are NOT logged in, but for this manual run, we assume.

        // 3. 다시 멤버십 페이지 확인 (로그인 상태)
        console.log('3. Navigating to Membership Page (Logged in)...');
        await page.goto('http://localhost:3000/protected/membership', { waitUntil: 'networkidle' });
        await page.screenshot({ path: 'test-membership-user.png', fullPage: true });
        console.log('   - Screenshot saved: test-membership-user.png');

        // 4. 오늘의 운세 분석
        console.log('4. Navigating to Today Fortune...');
        await page.goto('http://localhost:3000/protected/analysis/today', { waitUntil: 'networkidle' });

        // 운세 생성 버튼 찾기 (상황에 따라 다름, 로딩이 자동인지 버튼인지)
        // 보통 "새로고침"이나 "운세 보기" 버튼이 있음.
        // DailyFortuneView 컴포넌트를 보면 '대상 선택'이 있고 자동으로 로딩될 수도 있음.
        // 새로고침 버튼은 refresh icon이 있는 버튼.

        // 잠시 대기 (자동 생성되는지)
        await page.waitForTimeout(3000);

        // 결과 텍스트가 있는지 확인
        // 결과 텍스트가 있는지 확인
        const fortuneText = await page.locator('.whitespace-pre-wrap').first();

        // Always force refresh to ensure we test the "Save to History" logic (which only runs on generation)
        // Even if text is visible (cached), we want to generate a new one to verify history saving.
        const refreshBtn = await page.locator('button[title*="새로고침"]');
        if (await refreshBtn.isVisible()) {
            console.log('   - Clicking refresh to force new generation and test history save...');
            await refreshBtn.click();
            await page.waitForTimeout(8000); // Wait for AI generation (give it enough time)
        } else {
            console.log('   - Refresh button not found??');
        }

        if (await fortuneText.isVisible()) {
            console.log('   - Fortune text confirmed.');
        }

        await page.screenshot({ path: 'test-today-fortune.png' });
        console.log('   - Screenshot saved: test-today-fortune.png');

        // 5. 히스토리 확인
        console.log('6. Navigating to History...');
        await page.goto('http://localhost:3000/protected/history', { waitUntil: 'networkidle' });
        await page.screenshot({ path: 'test-history.png', fullPage: true });
        console.log('   - Screenshot saved: test-history.png');

        // 히스토리 리스트에 'TODAY' 혹은 '오늘의 운세'가 있는지 확인
        const historyItem = await page.getByText(/TODAY|오늘의/i).first();
        if (await historyItem.isVisible()) {
            console.log('✅ TEST PASSED: Analysis record found in history.');
        } else {
            console.error('❌ TEST FAILED: Analysis record NOT found in history.');
        }

    } catch (error) {
        console.error('Test failed with error:', error);
        await page.screenshot({ path: 'test-failure.png' });
    } finally {
        await browser.close();
        console.log('Test finished.');
    }
}

runTest();
