import { createClient } from 'npm:@supabase/supabase-js@2.39.7'

// Esta función permite sincronizar tareas con un servicio externo
Deno.serve(async (req) => {
  try {
    // Solo permitir solicitudes POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Obtener el token de autorización
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Crear cliente de Supabase con el token del usuario
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Obtener datos del cuerpo de la solicitud
    const { category, since } = await req.json()
    
    // Validar parámetros
    if (!category) {
      return new Response(JSON.stringify({ error: 'Category is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Construir la consulta para obtener tareas
    let query = supabaseClient
      .from('tasks')
      .select('*')
      .eq('category', category)
      .eq('completed', false)
      .order('date', { ascending: true })
    
    // Añadir filtro de fecha si se proporciona
    if (since) {
      query = query.gte('date', since)
    }
    
    // Ejecutar la consulta
    const { data: tasks, error } = await query
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Aquí simularíamos la sincronización con un servicio externo
    // Por ejemplo, podríamos enviar las tareas a un API de calendario, etc.
    
    // En un caso real, aquí iría el código para sincronizar con el servicio externo
    const syncResults = {
      synced: tasks.length,
      timestamp: new Date().toISOString(),
      tasks: tasks
    }

    return new Response(JSON.stringify(syncResults), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
