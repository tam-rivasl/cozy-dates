import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

type MembershipStatus = "accepted" | "pending" | "declined";

type MembershipRole = "owner" | "member" | null;

interface ActivateProfileRequest {
  userId: string;
}

interface ActivateProfileResponse {
  profile: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    theme: string | null;
    confirmedAt: string | null;
  };
  couple: {
    id: string;
    name: string | null;
    inviteCode: string | null;
  } | null;
  membershipStatus: MembershipStatus;
  membershipRole: MembershipRole;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error("Missing Supabase environment configuration for activate-profile function.");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function createLogger(requestId: string) {
  return (level: "INFO" | "WARN" | "ERROR", message: string, payload?: unknown) => {
    const entry = `[${new Date().toISOString()}] [activate-profile] [${requestId}] ${message}`;
    if (payload === undefined) {
      if (level === "ERROR") {
        console.error(entry);
      } else if (level === "WARN") {
        console.warn(entry);
      } else {
        console.log(entry);
      }
      return;
    }

    if (level === "ERROR") {
      console.error(entry, payload);
    } else if (level === "WARN") {
      console.warn(entry, payload);
    } else {
      console.log(entry, payload);
    }
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const log = createLogger(requestId);

  if (req.method !== "POST") {
    log("WARN", "Rejected non-POST request");
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    log("WARN", "Missing authorization header");
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  let payload: ActivateProfileRequest;
  try {
    payload = await req.json();
  } catch (error) {
    log("ERROR", "Failed to parse payload", error);
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
  }

  const { userId } = payload;
  if (!userId) {
    log("WARN", "Missing user id");
    return Response.json({ error: "Missing user id" }, { status: 400, headers: corsHeaders });
  }

  const supabaseAuthClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data: authData, error: authError } = await supabaseAuthClient.auth.getUser();
  if (authError || !authData?.user) {
    log("WARN", "Authorization failed", authError ?? "No user");
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  if (authData.user.id !== userId) {
    log("WARN", "User mismatch", { requestUser: authData.user.id, userId });
    return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    await supabaseAdmin
      .from("profiles")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("id", userId)
      .is("confirmed_at", null);

    const { data: profileRow, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url, theme, confirmed_at")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profileRow) {
      throw profileError ?? new Error("Profile not found");
    }

    const { data: membershipRows, error: membershipError } = await supabaseAdmin
      .from("profile_couples")
      .select("status, role, couple:couples(id, name, invite_code)")
      .eq("profile_id", userId);

    if (membershipError) {
      throw membershipError;
    }

    let membershipStatus: MembershipStatus = "declined";
    let membershipRole: MembershipRole = null;
    let couple: ActivateProfileResponse["couple"] = null;

    if (membershipRows && membershipRows.length > 0) {
      const acceptedMembership = membershipRows.find((row) => row.status === "accepted") ?? membershipRows[0];
      membershipStatus = (acceptedMembership.status as MembershipStatus) ?? "declined";
      membershipRole = (acceptedMembership.role as MembershipRole) ?? null;

      const coupleRow = (acceptedMembership as { couple?: { id?: string; name?: string | null; invite_code?: string | null } }).couple;
      if (coupleRow && coupleRow.id) {
        couple = {
          id: coupleRow.id,
          name: coupleRow.name ?? null,
          inviteCode: coupleRow.invite_code ?? null,
        };
      }
    }

    const response: ActivateProfileResponse = {
      profile: {
        id: profileRow.id,
        displayName: profileRow.display_name,
        avatarUrl: profileRow.avatar_url,
        theme: profileRow.theme,
        confirmedAt: profileRow.confirmed_at,
      },
      couple,
      membershipStatus,
      membershipRole,
    };

    log("INFO", "Profile activation succeeded", { userId, membershipStatus, membershipRole });
    return Response.json(response, { status: 200, headers: corsHeaders });
  } catch (error) {
    log("ERROR", "Activation failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500, headers: corsHeaders });
  }
});
