import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // Allow all origins for now
  'Access-Control-Allow-Headers': '*',  // Allow all headers
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  console.log('=== Request Details ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('=== Handling OPTIONS Request ===');
    console.log('Sending CORS headers:', corsHeaders);
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    console.log('=== Processing POST Request ===');
    
    // Verify authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header:', authHeader ? 'Present' : 'Missing');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get the request body
    console.log('Parsing request body...');
    const body = await req.json();
    console.log('Request body:', { ...body, newPassword: '[REDACTED]' });

    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      console.error('Missing required fields:', { userId: !!userId, newPassword: !!newPassword });
      throw new Error('Missing required fields');
    }

    // Create Supabase admin client
    console.log('Creating Supabase admin client...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    console.log('Environment variables:', {
      SUPABASE_URL: supabaseUrl ? 'Present' : 'Missing',
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey ? 'Present' : 'Missing'
    });

    const supabaseAdmin = createClient(
      supabaseUrl ?? '',
      serviceRoleKey ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Update the user's password using the admin API
    console.log('Updating user password...');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (error) {
      console.error('Error updating password:', error);
      throw error;
    }

    // Update the force_password_change flag in the profiles table
    console.log('Updating force_password_change flag...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ force_password_change: true })
      .eq('id', userId)

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw profileError;
    }

    console.log('=== Password Reset Successful ===');
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Origin': 'http://localhost:5173',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  } catch (error) {
    console.error('=== Error in Function ===');
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Origin': 'http://localhost:5173',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Content-Type': 'application/json',
        },
        status: 400,
      },
    )
  }
}) 