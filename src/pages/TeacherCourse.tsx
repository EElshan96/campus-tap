import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, Plus, QrCode, Loader2, Calendar, Users, Trash2, Clock, Wifi, WifiOff, ChevronDown, ChevronUp, BarChart3, Download, BookOpen,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';

interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string | null;
  submitted_at: string;
  on_class_network: boolean | null;
  ip_address: string | null;
}

interface SessionItem {
  id: string;
  name: string | null;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  attendance_count: number;
  on_campus_count: number;
}

export default function TeacherCourse() {
  const { id: classId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [className, setClassName] = useState('');
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSessionName, setNewSessionName] = useState('');
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord[]>>({});
  const [loadingAttendance, setLoadingAttendance] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/teacher/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && classId) {
      fetchClassInfo();
      fetchSessions();
    }
  }, [user, classId]);

  const fetchClassInfo = async () => {
    const { data } = await supabase
      .from('classes')
      .select('name')
      .eq('id', classId!)
      .single();
    if (data) setClassName(data.name);
  };

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, name, starts_at, ends_at, created_at')
      .eq('class_id', classId!)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const sessionsWithStats = await Promise.all(
        data.map(async (s) => {
          const { data: attendanceData } = await supabase
            .from('attendance')
            .select('on_class_network')
            .eq('session_id', s.id);

          const total = attendanceData?.length ?? 0;
          const onCampus = attendanceData?.filter(a => a.on_class_network).length ?? 0;

          return { ...s, attendance_count: total, on_campus_count: onCampus };
        })
      );
      setSessions(sessionsWithStats);
    }
    setLoading(false);
  };

  const toggleAttendance = async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }

    setExpandedSession(sessionId);

    if (attendanceRecords[sessionId]) return;

    setLoadingAttendance(sessionId);
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('session_id', sessionId)
      .order('submitted_at', { ascending: true });

    if (data) {
      setAttendanceRecords(prev => ({ ...prev, [sessionId]: data }));
    }
    setLoadingAttendance(null);
  };

  const createSession = async () => {
    if (!newSessionName.trim() || !user || !classId) return;
    setCreating(true);

    // Fetch teacher's configured network ranges
    const { data: settings } = await supabase
      .from('teacher_settings')
      .select('allowed_network_ranges')
      .eq('teacher_id', user.id)
      .single();

    const allowedCidrs = settings?.allowed_network_ranges ?? [];

    const tokenSecret = crypto.randomUUID() + crypto.randomUUID();
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        class_id: classId,
        token_secret: tokenSecret,
        name: newSessionName.trim(),
        allowed_cidrs: allowedCidrs,
      })
      .select()
      .single();

    if (error || !data) {
      toast({ title: 'Error', description: error?.message || 'Failed to create session', variant: 'destructive' });
    } else {
      setNewSessionName('');
      setDialogOpen(false);
      fetchSessions();
      toast({ title: 'Session created' });
    }
    setCreating(false);
  };

  const deleteSession = async (sessionId: string) => {
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      if (expandedSession === sessionId) setExpandedSession(null);
      fetchSessions();
      toast({ title: 'Session deleted' });
    }
  };

  const exportAllCSV = async () => {
    if (sessions.length === 0) return;
    
    const allRecords: { session_name: string; student_id: string; student_name: string; submitted_at: string; on_campus: string; ip_address: string }[] = [];
    
    for (const s of sessions) {
      const { data } = await supabase
        .from('attendance')
        .select('student_id, student_name, submitted_at, on_class_network, ip_address')
        .eq('session_id', s.id)
        .order('submitted_at', { ascending: true });
      
      if (data) {
        data.forEach(a => {
          allRecords.push({
            session_name: s.name || 'Untitled',
            student_id: a.student_id,
            student_name: a.student_name || '',
            submitted_at: a.submitted_at,
            on_campus: a.on_class_network ? 'Yes' : 'No',
            ip_address: a.ip_address || '',
          });
        });
      }
    }

    const headers = ['Session', 'VUnet ID', 'Name', 'Submitted At', 'On Campus', 'IP Address'];
    const csvRows = [
      headers.join(','),
      ...allRecords.map(r =>
        [r.session_name, r.student_id, r.student_name, r.submitted_at, r.on_campus, r.ip_address]
          .map(v => `"${v.replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${className.replace(/\s+/g, '-').toLowerCase()}-attendance.csv`;
    a.click();
    toast({ title: 'CSV exported' });
  };

  const totalSessions = sessions.length;
  const totalCheckins = sessions.reduce((sum, s) => sum + s.attendance_count, 0);
  const totalOnCampus = sessions.reduce((sum, s) => sum + s.on_campus_count, 0);
  const overallOnCampusPct = totalCheckins > 0 ? Math.round((totalOnCampus / totalCheckins) * 100) : 0;

  if (authLoading || loading) {
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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/teacher/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-9 h-9 rounded-xl vu-gradient flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">{className}</h1>
              <p className="text-[11px] text-muted-foreground">
                {totalSessions} session{totalSessions !== 1 ? 's' : ''} · {totalCheckins} check-in{totalCheckins !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {totalCheckins > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportAllCSV}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Summary Stats */}
        {totalSessions > 0 && (
          <motion.div
            className="grid grid-cols-3 gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass-card">
              <CardContent className="py-4 text-center">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center mx-auto mb-2">
                  <BarChart3 className="h-4 w-4 text-accent-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
                <p className="text-[11px] text-muted-foreground">Sessions</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="py-4 text-center">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center mx-auto mb-2">
                  <Users className="h-4 w-4 text-accent-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{totalCheckins}</p>
                <p className="text-[11px] text-muted-foreground">Total Check-ins</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="py-4 text-center">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center mx-auto mb-2">
                  <Wifi className="h-4 w-4 text-accent-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{overallOnCampusPct}%</p>
                <p className="text-[11px] text-muted-foreground">On Campus</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Sessions header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Sessions</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Session Name</Label>
                  <Input
                    placeholder="e.g., Week 1 — Introduction"
                    value={newSessionName}
                    onChange={e => setNewSessionName(e.target.value)}
                    maxLength={100}
                    className="h-11"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createSession} disabled={creating || !newSessionName.trim()}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {sessions.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-dashed border-2">
              <CardContent className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No sessions yet</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                  Create your first session to start tracking attendance for this course.
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Session
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((s, i) => {
              const isActive = !s.ends_at;
              const isExpanded = expandedSession === s.id;
              const onCampusPct = s.attendance_count > 0
                ? Math.round((s.on_campus_count / s.attendance_count) * 100)
                : 0;
              const records = attendanceRecords[s.id];

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="glass-card group">
                    <CardHeader className="pb-2 px-5 pt-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'vu-gradient' : 'bg-muted'}`}>
                            <QrCode className={`w-4 h-4 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">
                              {s.name || 'Untitled Session'}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-3 mt-0.5 text-[11px]">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(s.created_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {s.attendance_count}
                              </span>
                              {s.attendance_count > 0 && (
                                <span className="flex items-center gap-1">
                                  <Wifi className="h-3 w-3" />
                                  {onCampusPct}%
                                </span>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isActive ? (
                            <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-0 text-[10px] px-2">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-2">Ended</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteSession(s.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 px-5 pb-5">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigate(`/teacher/session/${s.id}`)}
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1 h-9"
                        >
                          <QrCode className="mr-1.5 h-3.5 w-3.5" />
                          {isActive ? 'Open Session' : 'View Session'}
                        </Button>
                        {s.attendance_count > 0 && (
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => toggleAttendance(s.id)}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>

                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border border-border rounded-xl overflow-hidden"
                        >
                          {loadingAttendance === s.id ? (
                            <div className="flex justify-center py-6">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : records && records.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/30">
                                  <TableHead className="text-[11px] font-semibold">VUnet ID</TableHead>
                                  <TableHead className="text-[11px] font-semibold">Name</TableHead>
                                  <TableHead className="text-[11px] font-semibold">Time</TableHead>
                                  <TableHead className="text-[11px] font-semibold">Network</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {records.map(r => (
                                  <TableRow key={r.id} className="hover:bg-muted/20">
                                    <TableCell className="font-mono text-xs">{r.student_id}</TableCell>
                                    <TableCell className="text-xs">{r.student_name || '—'}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {new Date(r.submitted_at).toLocaleTimeString()}
                                    </TableCell>
                                    <TableCell>
                                      {r.on_class_network ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] px-2 py-0.5 text-[10px] font-medium">
                                          <Wifi className="h-2.5 w-2.5" />
                                          On Campus
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-medium">
                                          <WifiOff className="h-2.5 w-2.5" />
                                          Off Campus
                                        </span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-4">No records found.</p>
                          )}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
