import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

type ManageAction = "create" | "join" | "leave";

type MembershipStatus = "accepted" | "pending" | "declined";

type MembershipRole = "owner" | "member";

interface ManageCoupleRequest {
  action: ManageAction;
  name?: string | null;
  inviteCode?: string | null;
}

interface ManageCoupleResponse {
  couple: {
    id: string;
    name: string | null;
    inviteCode: string | null;
  } | null;
  membershipStatus: MembershipStatus;
  membershipRole: MembershipRole | null;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error("Missing Supabase configuration for manage-couple function.");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function createLogger(requestId: string) {
  return (level: "INFO" | "WARN" | "ERROR", message: string, payload?: unknown) => {
    const entry = `[${new Date().toISOString()}] [manage-couple] [${requestId}] ${message}`;
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

function sanitizeInvite(code: string | null | undefined) {
  if (!code) return null;
  return code.trim().toUpperCase();
}

function generateInviteCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return code;
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

  let payload: ManageCoupleRequest;
  try {
    payload = await req.json();
  } catch (error) {
    log("ERROR", "Invalid JSON payload", error);
    return Response.json({ error: "Invalid JSON payload" }, { status: 400, headers: corsHeaders });
  }

  if (!payload.action) {
    log("WARN", "Missing action");
    return Response.json({ error: "Missing action" }, { status: 400, headers: corsHeaders });
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !authData?.user) {
    log("WARN", "Authorization failed", authError ?? "No user");
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const userId = authData.user.id;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (payload.action === "leave") {
      log("WARN", "Leave action not implemented", { userId });
      return Response.json({ error: "Leave action not implemented" }, { status: 400, headers: corsHeaders });
    }

    const { data: memberships } = await supabaseAdmin
      .from("profile_couples")
      .select("couple_id, status, role")
      .eq("profile_id", userId);

    const acceptedMembership = memberships?.find((row) => row.status === "accepted");

    if (acceptedMembership) {
      log("INFO", "User already has an active couple", { userId, coupleId: acceptedMembership.couple_id });
      return Response.json(
        {
          error: "Ya tienes una pareja activa. Primero cierra la actual para crear o unirte a otra.",
        },
        { status: 409, headers: corsHeaders },
      );
    }

    let coupleId: string | null = null;
    let inviteCode: string | null = null;
    let membershipRole: MembershipRole = "member";

    if (payload.action === "create") {
      const coupleName = payload.name?.trim() || authData.user.user_metadata?.display_name || "Nuestra pareja";
      const generatedCode = generateInviteCode();

      const { data: coupleRow, error: coupleError } = await supabaseAdmin
        .from("couples")
        .insert({ name: coupleName, invite_code: generatedCode })
        .select("id, invite_code")
        .single();

      if (coupleError || !coupleRow) {
        throw coupleError ?? new Error("No pudimos crear la pareja");
      }

      coupleId = coupleRow.id;
      inviteCode = coupleRow.invite_code ?? generatedCode;
      membershipRole = "owner";

      const { error: membershipError } = await supabaseAdmin
        .from("profile_couples")
        .upsert(
          {
            profile_id: userId,
            couple_id: coupleId,
            status: "accepted",
            role: membershipRole,
          },
          { onConflict: "profile_id,couple_id" },
        );

      if (membershipError) {
        throw membershipError;
      }
    }

    if (payload.action === "join") {
      const normalizedCode = sanitizeInvite(payload.inviteCode);
      if (!normalizedCode) {
        return Response.json({ error: "Necesitamos el codigo de tu pareja." }, { status: 400, headers: corsHeaders });
      }

      const { data: coupleRow, error: coupleError } = await supabaseAdmin
        .from("couples")
        .select("id, name, invite_code")
        .eq("invite_code", normalizedCode)
        .single();

      if (coupleError || !coupleRow) {
        return Response.json({ error: "No encontramos una pareja con ese codigo." }, { status: 404, headers: corsHeaders });
      }

      coupleId = coupleRow.id;
      inviteCode = coupleRow.invite_code ?? normalizedCode;
      membershipRole = "member";

      const { error: membershipError } = await supabaseAdmin
        .from("profile_couples")
        .upsert(
          {
            profile_id: userId,
            couple_id: coupleId,
            status: "accepted",
            role: membershipRole,
          },
          { onConflict: "profile_id,couple_id" },
        );

      if (membershipError) {
        throw membershipError;
      }
    }

    if (!coupleId) {
      throw new Error("No se pudo determinar la pareja");
    }

    const { data: coupleData, error: coupleFetchError } = await supabaseAdmin
      .from("couples")
      .select("id, name, invite_code")
      .eq("id", coupleId)
      .single();

    if (coupleFetchError || !coupleData) {
      throw coupleFetchError ?? new Error("No pudimos recuperar la pareja creada");
    }

    const response: ManageCoupleResponse = {
      couple: {
        id: coupleData.id,
        name: coupleData.name,
        inviteCode: coupleData.invite_code,
      },
      membershipStatus: "accepted",
      membershipRole,
    };

    log("INFO", "Couple action completed", { userId, action: payload.action, coupleId });
    return Response.json(response, { status: 200, headers: corsHeaders });
  } catch (error) {
    log("ERROR", "Failed to manage couple", error);
    return Response.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500, headers: corsHeaders });
  }
});
