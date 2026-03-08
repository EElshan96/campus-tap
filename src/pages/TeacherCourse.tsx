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
  ArrowLeft, Plus, QrCode, Loader2, Calendar, Users, Trash2, Clock, Wifi, WifiOff, ChevronDown, ChevronUp, BarChart3, Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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

    const tokenSecret = crypto.randomUUID() + crypto.randomUUID();
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        class_id: classId,
        token_secret: tokenSecret,
        name: newSessionName.trim(),
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

  // Summary stats
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
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">{className}</h1>
              <p className="text-xs text-muted-foreground">
                {totalSessions} session{totalSessions !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Summary Stats */}
        {totalSessions > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="glass-card">
              <CardContent className="py-4 text-center">
                <BarChart3 className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="py-4 text-center">
                <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-2xl font-bold text-foreground">{totalCheckins}</p>
                <p className="text-xs text-muted-foreground">Total Check-ins</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="py-4 text-center">
                <Wifi className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-2xl font-bold text-foreground">{overallOnCampusPct}%</p>
                <p className="text-xs text-muted-foreground">On Campus</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sessions */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Sessions</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Session
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
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No sessions yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first session to start tracking attendance for this course.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sessions.map(s => {
              const isActive = !s.ends_at;
              const isExpanded = expandedSession === s.id;
              const onCampusPct = s.attendance_count > 0
                ? Math.round((s.on_campus_count / s.attendance_count) * 100)
                : 0;
              const records = attendanceRecords[s.id];

              return (
                <Card key={s.id} className="glass-card hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          {s.name || 'Untitled Session'}
                        </CardTitle>
                        {isActive ? (
                          <Badge className="bg-success/15 text-success border-0 text-xs">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Ended</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteSession(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {s.attendance_count} student{s.attendance_count !== 1 ? 's' : ''}
                      </span>
                      {s.attendance_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Wifi className="h-3 w-3" />
                          {onCampusPct}% on campus
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Button onClick={() => navigate(`/teacher/session/${s.id}`)} variant={isActive ? 'default' : 'outline'} className="flex-1">
                        <QrCode className="mr-2 h-4 w-4" />
                        {isActive ? 'Open Session' : 'View Session'}
                      </Button>
                      {s.attendance_count > 0 && (
                        <Button variant="ghost" size="icon" onClick={() => toggleAttendance(s.id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="border border-border rounded-lg overflow-hidden">
                        {loadingAttendance === s.id ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : records && records.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>VUnet ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Network</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {records.map(r => (
                                <TableRow key={r.id}>
                                  <TableCell className="font-mono text-sm">{r.student_id}</TableCell>
                                  <TableCell className="text-sm">{r.student_name || '—'}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {new Date(r.submitted_at).toLocaleTimeString()}
                                  </TableCell>
                                  <TableCell>
                                    {r.on_class_network ? (
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
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No records found.</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
