import { createClient } from "@/lib/supabase/server";
import { getDestinyTargets } from "@/app/actions/destiny-targets";

export default async function TestDestinyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-8">Please login first</div>;
  }

  // Test 1: Direct View Query
  const { data: viewData, error: viewError } = await supabase
    .from("v_destiny_targets")
    .select("*");

  // Test 2: RPC Function
  const { data: rpcData, error: rpcError } = await supabase
    .rpc("get_user_destiny_targets", {
      user_id_param: user.id,
    });

  // Test 3: Server Action
  const actionData = await getDestinyTargets();

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Destiny Targets Debug</h1>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">User Info</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify({ id: user.id, email: user.email }, null, 2)}
        </pre>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Test 1: Direct View Query</h2>
        {viewError ? (
          <pre className="bg-red-100 p-4 rounded text-red-800">
            {JSON.stringify(viewError, null, 2)}
          </pre>
        ) : (
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(viewData, null, 2)}
          </pre>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Test 2: RPC Function</h2>
        {rpcError ? (
          <pre className="bg-red-100 p-4 rounded text-red-800">
            {JSON.stringify(rpcError, null, 2)}
          </pre>
        ) : (
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(rpcData, null, 2)}
          </pre>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Test 3: Server Action (getDestinyTargets)</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(actionData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
