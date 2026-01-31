
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Simple .env parser
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), ".env.local");
        if (!fs.existsSync(envPath)) return;
        const envContent = fs.readFileSync(envPath, "utf-8");
        envContent.split("\n").forEach((line) => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ""); // Remove quotes
                process.env[key] = value;
            }
        });
    } catch (e) {
        console.error("Error loading .env.local", e);
    }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function setAdminRole(email: string) {
    console.log(`Looking for user: ${email}...`);

    // 1. Find User by Email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error("Error listing users:", listError);
        return;
    }

    const user = users.find((u) => u.email === email);

    if (!user) {
        console.error(`User with email ${email} not found.`);
        return;
    }

    console.log(`Found user: ${user.id}`);

    // 2. Update Profile
    console.log("Updating profile role to 'admin'...");
    const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", user.id)
        .select();

    if (updateError) {
        console.error("Error updating profile:", updateError);
    } else {
        console.log("Successfully updated profile:", data);
    }
}

// Target email
const TARGET_EMAIL = "pdkshno1@gmail.com";
setAdminRole(TARGET_EMAIL);
