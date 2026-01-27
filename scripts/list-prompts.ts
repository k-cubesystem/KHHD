
import { createAdminClient } from "../lib/supabase/admin";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listPrompts() {
    console.log("Listing all AI Prompts...");

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Missing Service Role Key");
        return;
    }

    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('ai_prompts')
            .select('key, label, category');

        if (error) {
            console.error("Error:", error);
        } else {
            console.log("Found Prompts:", data?.length);
            console.table(data);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

listPrompts();
