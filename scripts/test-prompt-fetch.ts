
import { createAdminClient } from "../lib/supabase/admin";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testFetch() {
    console.log("Testing Admin Client Prompt Fetch...");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log("URL:", url ? "Set" : "Missing");
    console.log("Service Key:", key ? "Set (Length " + key.length + ")" : "Missing");

    if (!url || !key) {
        console.error("Missing environment variables.");
        return;
    }

    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('ai_prompts')
            .select('*')
            .in('key', ['daily_fortune', 'DAILY_FORTUNE']);

        if (error) {
            console.error("Fetch Error:", error);
        } else {
            console.log("Fetch Success. Count:", data?.length);
            console.log("Data:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

testFetch();
