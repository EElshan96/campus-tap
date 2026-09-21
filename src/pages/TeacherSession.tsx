import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, StopCircle, Loader2, Users, QrCode, Radio } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string | null;
  submitted_at: string;
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
  const [sessionName, setSessionName] = useState('');
  const [classId, setClassId] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/teacher/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!sessionId || !user) return;
    const fetchInfo = async () => {
      const { data: session } = await supabase
        .from('sessions')
        .select('*, classes(name, id)')
        .eq('id', sessionId)
        .single();
      if (session) {
        setClassName((session as any).classes?.name || 'Unknown');
        setClassId((session as any).classes?.id || '');
        setSessionName((session as any).name || 'Untitled Session');
        if (session.ends_at) setSessionEnded(true);
      }
      setLoading(false);
    };
    fetchInfo();
  }, [sessionId, user]);

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
      const interval = setInterval(generateToken, 90000);
      return () => clearInterval(interval);
    }
  }, [loading, user, sessionEnded, generateToken]);

  useEffect(() => {
    if (!sessionId || !user) return;

    const fetchAttendance = async () => {
      const { data } = await supabase
        .from('attendance')
        .select('id, student_id, student_name, submitted_at')
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
      {/* Frosted header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => classId ? navigate(`/teacher/course/${classId}`) : navigate('/teacher/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${sessionEnded ? 'bg-muted' : 'vu-gradient'}`}>
              <QrCode className={`w-4 h-4 ${sessionEnded ? 'text-muted-foreground' : 'text-white'}`} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">{sessionName}</h1>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                {className}
                <span className="text-border">·</span>
                {sessionEnded ? (
                  <span>Ended</span>
                ) : (
                  <span className="flex items-center gap-1 text-[hsl(var(--success))]">
                    <Radio className="h-2.5 w-2.5" /> Live
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCSV}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export
            </Button>
            {!sessionEnded && (
              <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={endSession}>
                <StopCircle className="mr-1.5 h-3.5 w-3.5" /> End
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card-elevated overflow-hidden">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-base">
                  {sessionEnded ? 'Session Ended' : 'Scan to Check In'}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-6">
                {!sessionEnded && qrToken ? (
                  <>
                    <div className="p-5 bg-white rounded-2xl border border-border shadow-sm">
                      <QRCodeSVG
                        value={qrToken}
                        size={260}
                        level="M"
                        bgColor="transparent"
                        fgColor="hsl(220, 40%, 10%)"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-4 text-center">
                      Auto-refreshes every 90 seconds
                    </p>
                  </>
                ) : sessionEnded ? (
                  <div className="py-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <StopCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">This session has ended.</p>
                  </div>
                ) : (
                  <div className="py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Attendance List */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card-elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                      <Users className="h-4 w-4 text-accent-foreground" />
                    </div>
                    Present
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px] bg-primary/10 text-primary border-0">
                      {attendance.length}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {attendance.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No students have checked in yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-1">
                    {attendance.map((a, i) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground">{a.student_id}</p>
                          {a.student_name && (
                            <p className="text-[11px] text-muted-foreground truncate">{a.student_name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {new Date(a.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
