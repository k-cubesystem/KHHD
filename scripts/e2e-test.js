const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
// Fallback if .env.local missing or empty (CI/CD environments might use system envs)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Error: Missing Supabase credentials in environment.');
    console.error('   Please ensure .env.local exists with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createTestUser() {
    const randomStr = Math.random().toString(36).substring(7);
    const email = `test_e2e_${randomStr}@example.com`;
    const password = 'Password123!';

    console.log(`Creating test user: ${email}`);

    const { data: { user }, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-verify email
        user_metadata: {
            full_name: 'E2E Test User',
            gender: 'male',
            birth_date: '1990-01-01',
            birth_time: '자시 (23:30 ~ 01:29)',
            calendar_type: 'solar'
        }
    });

    if (error) {
        console.error('Failed to create test user:', error);
        throw error;
    }

    return { email, password, userId: user.id };
}

async function runTest() {
    let testUser = null;
    let browser = null;

    try {
        // 1. Setup User
        testUser = await createTestUser();
        console.log(`✅ Test user created: ${testUser.email}`);

        // 2. Launch Browser
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: { width: 375, height: 812 }, // Mobile viewport
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        });
        const page = await context.newPage();

        // 3. Login Flow
        console.log('Navigating to Login Page...');
        await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });

        console.log('Filling login form...');
        await page.fill('input[name="email"]', testUser.email);
        await page.fill('input[name="password"]', testUser.password);
        await page.click('button[type="submit"]');

        console.log('Waiting for redirect to Protected Area...');
        await page.waitForURL('**/protected**', { timeout: 15000 });
        console.log('✅ Login successful!');

        // 4. Verify Membership Page
        console.log('Checking Membership Page...');
        await page.goto('http://localhost:3000/protected/membership', { waitUntil: 'networkidle' });
        await page.screenshot({ path: 'e2e-membership.png', fullPage: true });
        // assert something? maybe verify plan cards exist
        const planCard = await page.locator('.border-primary\\/20').first(); // rough selector for plan card styling
        if (await planCard.isVisible()) console.log('✅ Membership plans visible');

        // 5. Generate Today's Fortune
        console.log('Generating Today Fortune...');
        await page.goto('http://localhost:3000/protected/analysis/today', { waitUntil: 'networkidle' });

        // Wait for generation or click refresh if needed
        // Assuming auto-generation on visit if not present, OR we click refresh
        // Let's look for content or refresh button

        // Wait a bit for initial load
        await page.waitForTimeout(2000);

        const refreshBtn = await page.locator('button[title*="새로고침"]');
        if (await refreshBtn.isVisible()) {
            console.log('Clicking refresh to ensure generation...');
            await refreshBtn.click();
            // Wait for generation (could take 5-10s)
            await page.waitForTimeout(8000);
        } else {
            console.log('Refresh button not found, assuming auto-load...');
            await page.waitForTimeout(5000);
        }

        const fortuneContent = await page.locator('.whitespace-pre-wrap').first();
        if (await fortuneContent.isVisible()) {
            console.log('✅ Fortune content generated/visible');
            await page.screenshot({ path: 'e2e-fortune.png' });
        } else {
            console.error('❌ Fortune content NOT visible');
        }

        // 6. Verify History
        console.log('Verifying History...');
        await page.goto('http://localhost:3000/protected/history', { waitUntil: 'networkidle' });
        await page.screenshot({ path: 'e2e-history.png', fullPage: true });

        // Look for "TODAY" or "오늘의 운세" text
        // The card has "오늘의운세" label (CategoryTabs logic)
        const historyItem = await page.getByText(/오늘의운세|TODAY/i).first();

        if (await historyItem.isVisible()) {
            console.log('✅ History record FOUND!');
        } else {
            console.error('❌ History record NOT found.');
            // Dump page content for debugging
            const content = await page.content();
            fs.writeFileSync('e2e-history-dump.html', content);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
        if (browser) await browser.contexts()[0].pages()[0].screenshot({ path: 'e2e-failure.png' });
    } finally {
        // Cleanup
        if (testUser) {
            console.log(`Cleaning up test user ${testUser.userId}...`);
            await supabase.auth.admin.deleteUser(testUser.userId);
            console.log('User deleted.');
        }
        if (browser) await browser.close();
    }
}

runTest();
