// supabase/functions/unpair-partner/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // 1. Get current user's profile to find partner_id
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('partner_id')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    const partnerId = userProfile?.partner_id;
    if (!partnerId) {
       return new Response(JSON.stringify({ error: 'You are not paired with anyone.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Use a transaction to unpair both users
    const { error: rpcError } = await supabaseAdmin.rpc('unlink_partners', {
      user_id_1: user.id,
      user_id_2: partnerId,
    });

    if (rpcError) {
      throw rpcError;
    }

    return new Response(JSON.stringify({ message: 'Successfully unpaired.' }), {
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
