// supabase/functions/onboard-user/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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
  return (level: "INFO"|"WARN"|"ERROR", message: string, payload?: unknown) => {
    const entry = `[${new Date().toISOString()}] [onboard-user] [${requestId}] ${message}`;
    if (payload === undefined) {
      (level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log)(entry);
    } else {
      (level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log)(entry, payload);
    }
  };
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) throw new Error("Invalid avatar format");
  const mimeType = match[1];
  const base64 = match[2];
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) buffer[i] = binary.charCodeAt(i);
  const extension = (mimeType.split("/")[1] ?? "png").toLowerCase();
  const blob = new Blob([buffer], { type: mimeType });
  return { blob, mimeType, extension };
}

async function getUserMetadata(client: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user) throw error ?? new Error("User not found");
  return data.user;
}

function isValidUuid(v?: string | null) {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const log = createLogger(requestId);

  if (req.method !== "POST") {
    log("WARN", "Rejected non-POST request");
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch (error) {
    log("ERROR", "Failed to parse request body", error);
    return Response.json({ error: "Invalid JSON payload" }, { status: 400, headers: corsHeaders });
  }

  // INPUTS
  const {
    userId,
    displayName,
    avatarDataUrl,
    createCouple,       // boolean
    coupleName,         // opcional al crear
    coupleCode,         // UUID string al unirse
    registrationToken,  // token esperado en user_metadata.registration_token
  } = payload;

  if (!userId || !displayName || !registrationToken) {
    log("WARN", "Missing required fields", { userId, displayName, registrationTokenPresent: !!registrationToken });
    return Response.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
  }

  const db = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1) Validar usuario y token de registro
    const user = await getUserMetadata(db, userId);
    const meta: Record<string, unknown> = user.user_metadata ?? {};
    const storedToken = typeof meta.registration_token === "string" ? meta.registration_token : null;
    if (storedToken && storedToken !== registrationToken) {
      log("WARN", "Registration token mismatch", { userId });
      return Response.json({ error: "Registration token mismatch" }, { status: 403, headers: corsHeaders });
    }

    // 2) Subir avatar si viene
    let avatarUrl: string | null = null;
    if (avatarDataUrl) {
      try {
        const { blob, extension } = parseDataUrl(avatarDataUrl);
        const filePath = `${userId}/${Date.now()}.${extension}`;
        const { error: uploadError } = await db.storage.from("avatars").upload(filePath, blob, {
          contentType: blob.type,
          upsert: true,
        });
        if (uploadError) throw uploadError;
        const { data: publicData } = db.storage.from("avatars").getPublicUrl(filePath);
        avatarUrl = publicData?.publicUrl ?? null;
      } catch (avatarError) {
        log("ERROR", "Failed to upload avatar", avatarError);
        return Response.json({ error: "Avatar upload failed" }, { status: 500, headers: corsHeaders });
      }
    }

    // 3) Asegurar profile (id = auth.users.id)
    {
      const { error: profileError } = await db.from("profiles").upsert(
        {
          id: userId,
          display_name: displayName,
          avatar_url: avatarUrl,
        },
        { onConflict: "id" },
      );
      if (profileError) throw profileError;
    }

    // 4) Crear o recuperar couple y crear membresía
    let coupleId: string | null = null;
    let inviteCode: string | null = null;
    let membershipRole = createCouple ? "owner" : "member";
    let membershipStatus: "pending" | "accepted" | "declined" = "accepted";

    if (createCouple) {
      // Crear pareja: invite_code UUID lo genera la DB por default
      const { data: coupleRow, error: coupleError } = await db
        .from("couples")
        .insert({ name: coupleName ?? displayName })
        .select("id, invite_code")
        .single();
      if (coupleError || !coupleRow) throw coupleError ?? new Error("Failed to create couple");
      coupleId = coupleRow.id;
      inviteCode = coupleRow.invite_code as string;

      // Inserta membresía aceptada del creador (role owner)
      const { error: mErr } = await db
        .from("profile_couples")
        .insert({ profile_id: userId, couple_id: coupleId, status: "accepted", role: membershipRole });
      if (mErr) throw mErr;

    } else {
      // Unirse con código: debe ser UUID (según DDL)
      if (!isValidUuid(coupleCode)) {
        return Response.json({ error: "Invalid invite code format" }, { status: 400, headers: corsHeaders });
      }

      const { data: coupleRow, error: coupleError } = await db
        .from("couples")
        .select("id, invite_code")
        .eq("invite_code", String(coupleCode).toLowerCase())
        .single();

      if (coupleError || !coupleRow) {
        return Response.json({ error: "Couple not found" }, { status: 404, headers: corsHeaders });
      }

      coupleId = coupleRow.id;
      inviteCode = coupleRow.invite_code as string;

      // Upsert membresía a accepted
      const { error: membershipError } = await db
        .from("profile_couples")
        .upsert(
          { profile_id: userId, couple_id: coupleId, status: "accepted", role: membershipRole },
          { onConflict: "profile_id,couple_id" },
        );
      if (membershipError) throw membershipError;
    }

    if (!coupleId) {
      log("ERROR", "Couple ID missing after processing", { userId, createCouple });
      return Response.json({ error: "Could not determine couple" }, { status: 500, headers: corsHeaders });
    }

    const responseBody = { inviteCode, membershipStatus, coupleId };
    log("INFO", "Onboarding completed", { userId, coupleId, membershipStatus });
    return Response.json(responseBody, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    // Mapea violaciones de triggers a 409 (conflict)
    const msg = typeof error?.message === "string" ? error.message : String(error);
    const lower = msg.toLowerCase();

    if (lower.includes("already has 2 accepted members") ||
        lower.includes("already has an accepted couple")) {
      return Response.json({ error: msg }, { status: 409, headers: corsHeaders });
    }

    console.error("Unexpected onboarding failure", error);
    return Response.json({ error: msg || "Unexpected error" }, { status: 500, headers: corsHeaders });
  }
});
