// supabase/functions/accept-invitation/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invitation_id } = await req.json()

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

    // 1. Get the invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('couple_invitations')
      .select('*')
      .eq('id', invitation_id)
      .eq('invitee_email', user.email)
      .single()

    if (inviteError || !invitation) {
      return new Response(JSON.stringify({ error: 'Invitation not found or you are not the invitee.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (invitation.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Invitation has already been responded to.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    const { inviter_id } = invitation
    const invitee_id = user.id
    
    // Use a transaction to ensure both profiles are updated
    const { error: rpcError } = await supabaseAdmin.rpc('link_partners', {
        inviter_id,
        invitee_id,
        p_invitation_id: invitation_id,
    });


    if (rpcError) {
        console.error('RPC Error:', rpcError);
        return new Response(JSON.stringify({ error: 'Failed to link partners. ' + rpcError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ message: 'Invitation accepted and partners linked.' }), {
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
