import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

type MembershipStatus = "accepted" | "pending" | "declined";

type MembershipRole = "owner" | "member";

interface OnboardRequestBody {
  userId: string;
  displayName: string;
  theme?: string | null;
  avatarDataUrl?: string | null;
  createCouple: boolean;
  coupleName?: string | null;
  coupleCode?: string | null;
  registrationToken: string;
}

interface OnboardResponseBody {
  inviteCode: string | null;
  membershipStatus: MembershipStatus;
}

interface DataUrlResult {
  blob: Blob;
  mimeType: string;
  extension: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase configuration in edge function environment.");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function createLogger(requestId: string) {
  return (level: "INFO" | "WARN" | "ERROR", message: string, payload?: unknown) => {
    const entry = `[${new Date().toISOString()}] [onboard-user] [${requestId}] ${message}`;
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

function parseDataUrl(dataUrl: string): DataUrlResult {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) {
    throw new Error("Invalid avatar format");
  }

  const mimeType = match[1];
  const base64 = match[2];
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }

  const extension = mimeType.split("/")[1] ?? "png";
  const blob = new Blob([buffer], { type: mimeType });

  return { blob, mimeType, extension };
}

async function getUserMetadata(client: SupabaseClient, userId: string) {
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user) {
    throw error ?? new Error("User not found");
  }
  return data.user;
}

function normalizeInviteCode(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
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

  let payload: OnboardRequestBody;
  try {
    payload = await req.json();
  } catch (error) {
    log("ERROR", "Failed to parse request body", error);
    return Response.json({ error: "Invalid JSON payload" }, { status: 400, headers: corsHeaders });
  }

  const {
    userId,
    displayName,
    theme,
    avatarDataUrl,
    createCouple,
    coupleName,
    coupleCode,
    registrationToken,
  } = payload;

  if (!userId || !displayName || !registrationToken) {
    log("WARN", "Missing required fields", payload);
    return Response.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const user = await getUserMetadata(supabaseAdmin, userId);
    const meta = user.user_metadata ?? {};

    if (meta.registration_token && meta.registration_token !== registrationToken) {
      log("WARN", "Registration token mismatch", { userId });
      return Response.json({ error: "Registration token mismatch" }, { status: 403, headers: corsHeaders });
    }

    let avatarUrl: string | null = null;

    if (avatarDataUrl) {
      try {
        const { blob, extension } = parseDataUrl(avatarDataUrl);
        const filePath = `${userId}/${Date.now()}.${extension}`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("avatars")
          .upload(filePath, blob, {
            contentType: blob.type,
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicData } = supabaseAdmin.storage.from("avatars").getPublicUrl(filePath);
        avatarUrl = publicData?.publicUrl ?? null;
      } catch (avatarError) {
        log("ERROR", "Failed to upload avatar", avatarError);
        return Response.json({ error: "Avatar upload failed" }, { status: 500, headers: corsHeaders });
      }
    }

    let coupleId: string | null = null;
    let inviteCode: string | null = null;
    let membershipRole: MembershipRole = createCouple ? "owner" : "member";
    let membershipStatus: MembershipStatus = "accepted";

    if (createCouple) {
      const generatedCode = generateInviteCode();
      const { data: coupleRow, error: coupleError } = await supabaseAdmin
        .from("couples")
        .insert({
          name: coupleName ?? displayName,
          invite_code: generatedCode,
        })
        .select("id, invite_code")
        .single();

      if (coupleError || !coupleRow) {
        throw coupleError ?? new Error("Failed to create couple");
      }

      coupleId = coupleRow.id;
      inviteCode = coupleRow.invite_code ?? generatedCode;
    } else {
      const normalizedCode = normalizeInviteCode(coupleCode);
      if (!normalizedCode) {
        return Response.json({ error: "Couple code is required" }, { status: 400, headers: corsHeaders });
      }

      const { data: coupleRow, error: coupleError } = await supabaseAdmin
        .from("couples")
        .select("id")
        .eq("invite_code", normalizedCode)
        .single();

      if (coupleError || !coupleRow) {
        return Response.json({ error: "Couple not found" }, { status: 404, headers: corsHeaders });
      }

      coupleId = coupleRow.id;
      inviteCode = normalizedCode;

      const { data: existingMembership, error: membershipFetchError } = await supabaseAdmin
        .from("profile_couples")
        .select("status")
        .eq("profile_id", userId)
        .eq("couple_id", coupleId)
        .maybeSingle();

      if (membershipFetchError) {
        throw membershipFetchError;
      }

      if (existingMembership?.status) {
        membershipStatus = existingMembership.status as MembershipStatus;
      }
    }

    if (!coupleId) {
      log("ERROR", "Couple ID missing after processing", { userId, createCouple });
      return Response.json({ error: "Could not determine couple" }, { status: 500, headers: corsHeaders });
    }

    const profilePayload = {
      id: userId,
      display_name: displayName,
      avatar_url: avatarUrl,
      theme: theme ?? null,
      couple_id: coupleId,
    };

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (profileError) {
      throw profileError;
    }

    const { error: membershipError } = await supabaseAdmin
      .from("profile_couples")
      .upsert(
        {
          profile_id: userId,
          couple_id: coupleId,
          status: membershipStatus,
          role: membershipRole,
        },
        { onConflict: "profile_id,couple_id" },
      );

    if (membershipError) {
      throw membershipError;
    }

    const responseBody: OnboardResponseBody = {
      inviteCode,
      membershipStatus,
    };

    log("INFO", "Onboarding completed", { userId, coupleId, membershipStatus });
    return Response.json(responseBody, { status: 200, headers: corsHeaders });
  } catch (error) {
    log("ERROR", "Unexpected onboarding failure", error);
    return Response.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500, headers: corsHeaders });
  }
});
