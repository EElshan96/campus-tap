import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, StopCircle, Loader2, Users, Wifi, WifiOff } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';

interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string | null;
  submitted_at: string;
  on_class_network: boolean | null;
  ip_address: string | null;
}

export default function TeacherSession() {
  const { id: sessionId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [qrToken, setQrToken] = useState('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [className, setClassName] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/teacher/login');
  }, [user, authLoading, navigate]);

  // Fetch session info
  useEffect(() => {
    if (!sessionId || !user) return;
    const fetchInfo = async () => {
      const { data: session } = await supabase
        .from('sessions')
        .select('*, classes(name)')
        .eq('id', sessionId)
        .single();
      if (session) {
        setClassName((session as any).classes?.name || 'Unknown');
        if (session.ends_at) setSessionEnded(true);
      }
      setLoading(false);
    };
    fetchInfo();
  }, [sessionId, user]);

  // Generate and rotate QR token
  const generateToken = useCallback(async () => {
    if (!sessionId || sessionEnded) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await supabase.functions.invoke('generate-session-token', {
        body: { session_id: sessionId },
      });
      
      if (res.error) {
        console.error('Token generation error:', res.error);
        return;
      }
      
      if (res.data?.token) {
        const attendUrl = `${window.location.origin}/attend?token=${res.data.token}`;
        setQrToken(attendUrl);
      }
    } catch (err) {
      console.error('Failed to generate token:', err);
    }
  }, [sessionId, sessionEnded]);

  useEffect(() => {
    if (!loading && user && !sessionEnded) {
      generateToken();
      const interval = setInterval(generateToken, 90000); // Rotate every 90 seconds
      return () => clearInterval(interval);
    }
  }, [loading, user, sessionEnded, generateToken]);

  // Fetch attendance and subscribe to realtime
  useEffect(() => {
    if (!sessionId || !user) return;

    const fetchAttendance = async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', sessionId)
        .order('submitted_at', { ascending: true });
      if (data) setAttendance(data);
    };
    fetchAttendance();

    const channel = supabase
      .channel(`attendance-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'attendance',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setAttendance(prev => [...prev, payload.new as AttendanceRecord]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, user]);

  const endSession = async () => {
    if (!sessionId) return;
    await supabase.from('sessions').update({ ends_at: new Date().toISOString() }).eq('id', sessionId);
    setSessionEnded(true);
    toast({ title: 'Session ended' });
  };

  const exportCSV = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await supabase.functions.invoke('export-attendance', {
        body: null,
        headers: {},
      });

      // Use fetch directly for CSV download
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-attendance?session_id=${sessionId}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const csv = await response.text();
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `attendance-${sessionId}.csv`;
      a.click();
    } catch (err) {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">{className}</h1>
              <p className="text-xs text-muted-foreground">
                {sessionEnded ? 'Session ended' : 'Session active'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            {!sessionEnded && (
              <Button variant="destructive" size="sm" onClick={endSession}>
                <StopCircle className="mr-2 h-4 w-4" /> End Session
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-8">
          {/* QR Code */}
          <Card className="glass-card">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">
                {sessionEnded ? 'Session Ended' : 'Scan to Mark Attendance'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {!sessionEnded && qrToken ? (
                <>
                  <div className="p-4 bg-card rounded-2xl border border-border">
                    <QRCodeSVG
                      value={qrToken}
                      size={280}
                      level="M"
                      bgColor="transparent"
                      fgColor="hsl(213, 40%, 12%)"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    QR code refreshes automatically every 90 seconds
                  </p>
                </>
              ) : sessionEnded ? (
                <p className="text-muted-foreground py-8">This session has ended.</p>
              ) : (
                <Loader2 className="h-8 w-8 animate-spin text-primary my-8" />
              )}
            </CardContent>
          </Card>

          {/* Attendance List */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Present
                </CardTitle>
                <Badge variant="secondary" className="text-sm">
                  {attendance.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No students have checked in yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {attendance.map(a => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm text-foreground">{a.student_id}</p>
                        {a.student_name && (
                          <p className="text-xs text-muted-foreground">{a.student_name}</p>
                        )}
                        {a.ip_address && (
                          <p className="text-xs text-muted-foreground font-mono">{a.ip_address}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {a.on_class_network ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success px-2 py-0.5 text-xs font-medium">
                            <Wifi className="h-3 w-3" />
                            On Campus
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-medium">
                            <WifiOff className="h-3 w-3" />
                            Off Campus
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.submitted_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
