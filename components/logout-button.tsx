"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface LogoutButtonProps extends React.ComponentProps<typeof Button> {
  children?: React.ReactNode;
}

export function LogoutButton({ children, className, variant = "default", ...props }: LogoutButtonProps) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh(); // Refresh to clear server session state if visible
    router.push("/auth/login");
  };

  return (
    <Button onClick={logout} className={className} variant={variant} {...props}>
      {children || "Logout"}
    </Button>
  );
}
