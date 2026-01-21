import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const error = requestUrl.searchParams.get("error");
    const error_description = requestUrl.searchParams.get("error_description");

    console.log("=== AUTH CALLBACK START ===");
    console.log("Code:", code ? "EXISTS" : "MISSING");

    if (error) {
        console.error("[Callback Error]", error, error_description);
        return NextResponse.redirect(
            `${requestUrl.origin}/auth/login?error=${encodeURIComponent(error_description || error)}`
        );
    }

    if (!code) {
        console.error("[Callback] No code provided");
        return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=no_code`);
    }

    // CRITICAL: Create response FIRST, then inject cookies into it
    const redirectResponse = NextResponse.redirect(`${requestUrl.origin}/protected`);

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    console.log("[setAll called] Cookie count:", cookiesToSet.length);
                    // Inject cookies into the redirect response
                    cookiesToSet.forEach(({ name, value, options }) => {
                        console.log("[Setting cookie]", name);
                        redirectResponse.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
        console.error("[Session Exchange Error]", exchangeError);
        return NextResponse.redirect(
            `${requestUrl.origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
        );
    }

    console.log("[Session Exchange Success]", data.user?.email);

    // CRITICAL FIX: Explicitly set the session to trigger cookie storage
    if (data.session) {
        console.log("[Explicitly setting session]");
        const { error: setSessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
        });

        if (setSessionError) {
            console.error("[Set Session Error]", setSessionError);
        }
    }

    console.log("[Cookies in Response]", redirectResponse.cookies.getAll().map(c => c.name));
    console.log("=== AUTH CALLBACK END - Redirecting to /protected ===");

    return redirectResponse;
}
