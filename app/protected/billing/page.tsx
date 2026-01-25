import { redirect } from "next/navigation";

export default function BillingPage() {
    return redirect("/protected/membership/manage?tab=store");
}
