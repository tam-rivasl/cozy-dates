// supabase/functions/invite-partner/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invitee_email } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (user.email === invitee_email) {
      return new Response(JSON.stringify({ error: 'You cannot invite yourself.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if inviter is already paired
    const { data: inviterProfile, error: inviterError } = await supabaseAdmin
      .from('profiles')
      .select('partner_id')
      .eq('id', user.id)
      .single()

    if (inviterError) throw inviterError
    if (inviterProfile.partner_id) {
       return new Response(JSON.stringify({ error: 'You are already paired with someone.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if invitee exists and is already paired
    const { data: inviteeUser, error: inviteeUserError } = await supabaseAdmin.auth.admin.getUserByEmail(invitee_email)
    if (inviteeUserError || !inviteeUser.user) {
         return new Response(JSON.stringify({ error: 'User with this email does not exist.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: inviteeProfile, error: inviteeProfileError } = await supabaseAdmin
        .from('profiles')
        .select('partner_id')
        .eq('id', inviteeUser.user.id)
        .single();
    
    if (inviteeProfileError) throw inviteeProfileError;

    if (inviteeProfile.partner_id) {
        return new Response(JSON.stringify({ error: 'This user is already paired.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Check for existing pending invitation
    const { data: existingInvite, error: existingInviteError } = await supabaseAdmin
      .from('couple_invitations')
      .select('id')
      .or(`and(inviter_id.eq.${user.id},invitee_email.eq.${invitee_email},status.eq.pending),and(inviter_id.eq.${inviteeUser.user.id},invitee_email.eq.${user.email},status.eq.pending)`)
      .maybeSingle()

    if(existingInviteError) throw existingInviteError;

    if (existingInvite) {
       return new Response(JSON.stringify({ error: 'An invitation already exists between you and this user.' }), {
        status: 409, // Conflict
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: newInvite, error: newInviteError } = await supabaseAdmin
      .from('couple_invitations')
      .insert({
        inviter_id: user.id,
        invitee_email: invitee_email,
        status: 'pending'
      })
      .select()
      .single()

    if (newInviteError) {
      throw newInviteError
    }

    return new Response(JSON.stringify(newInvite), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
