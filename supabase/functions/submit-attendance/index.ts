import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifyToken(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const enc = new TextEncoder();
  const data = `${parts[0]}.${parts[1]}`;
  const signature = base64urlDecode(parts[2]);
  
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  
  const valid = await crypto.subtle.verify("HMAC", key, signature, enc.encode(data));
  if (!valid) return null;
  
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[1])));
  
  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return null;
  
  return payload;
}

async function hashValue(value: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple in-memory rate limiting (per function instance)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(sessionId);
  if (!entry || entry.resetAt < now) {
    rateLimits.set(sessionId, { count: 1, resetAt: now + 60000 }); // 1 minute window
    return false;
  }
  entry.count++;
  return entry.count > 30; // Max 30 submissions per minute per session
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, student_id, student_name } = await req.json();

    if (!token || !student_id) {
      return new Response(JSON.stringify({ error: 'token and VUnet ID are required' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Validate student_id format (alphanumeric, max 20 chars)
    if (!/^[a-zA-Z0-9]{1,20}$/.test(student_id)) {
      return new Response(JSON.stringify({ error: 'Invalid student ID format. Use alphanumeric characters only (max 20).' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Sanitize student_name
    const cleanName = student_name ? String(student_name).slice(0, 100).replace(/[<>&"']/g, '') : null;

    // Extract session_id from token payload (without verification first to get the session)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    let rawPayload: Record<string, unknown>;
    try {
      const decoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      rawPayload = JSON.parse(decoded);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const sessionId = rawPayload.session_id as string;
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Invalid token payload' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Rate limiting
    if (isRateLimited(sessionId)) {
      return new Response(JSON.stringify({ error: 'Too many submissions. Please try again later.' }), { 
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Get session and its secret
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, token_secret, allowed_cidrs, class_id, ends_at')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { 
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Check if session has ended
    if (session.ends_at && new Date(session.ends_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'This session has ended' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Now verify the token with the session's secret
    const payload = await verifyToken(token, session.token_secret);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token. Please scan the QR code again.' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // IP-based network check
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 'unknown';
    
    let onClassNetwork = false;
    // Simple CIDR check (basic implementation)
    if (session.allowed_cidrs && session.allowed_cidrs.length > 0) {
      // For MVP, just check if IP starts with any of the configured prefixes
      onClassNetwork = session.allowed_cidrs.some((cidr: string) => {
        const prefix = cidr.split('/')[0].split('.').slice(0, -1).join('.');
        return clientIp.startsWith(prefix);
      });
    }

    // Hash user agent
    const userAgent = req.headers.get('user-agent') || '';
    const userAgentHash = userAgent ? await hashValue(userAgent) : null;

    // Insert attendance (unique constraint handles duplicates)
    const { error: insertError } = await supabase
      .from('attendance')
      .insert({
        session_id: sessionId,
        student_id: student_id.toUpperCase(),
        student_name: cleanName,
        on_class_network: onClassNetwork,
        user_agent_hash: userAgentHash,
        ip_address: clientIp,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ error: 'You have already marked attendance for this session.' }), { 
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to record attendance' }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Attendance recorded successfully!',
      on_class_network: onClassNetwork
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
