import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Plus, QrCode, Loader2, Calendar, Users, Trash2, Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface SessionItem {
  id: string;
  name: string | null;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  attendance_count?: number;
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
      // Fetch attendance counts for each session
      const sessionsWithCounts = await Promise.all(
        data.map(async (s) => {
          const { count } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id);
          return { ...s, attendance_count: count ?? 0 };
        })
      );
      setSessions(sessionsWithCounts);
    }
    setLoading(false);
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

  const startSession = async (sessionId: string) => {
    navigate(`/teacher/session/${sessionId}`);
  };

  const deleteSession = async (sessionId: string) => {
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchSessions();
      toast({ title: 'Session deleted' });
    }
  };

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
                {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
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
                        {s.attendance_count ?? 0} student{(s.attendance_count ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => startSession(s.id)} variant={isActive ? 'default' : 'outline'} className="w-full">
                      <QrCode className="mr-2 h-4 w-4" />
                      {isActive ? 'Open Session' : 'View Session'}
                    </Button>
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
