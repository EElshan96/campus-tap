import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2, Settings, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

export default function TeacherSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [retentionDays, setRetentionDays] = useState(90);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/teacher/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('teacher_settings')
        .select('retention_days')
        .eq('teacher_id', user.id)
        .maybeSingle();
      if (data) {
        setRetentionDays(data.retention_days);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('teacher_settings').upsert({
      teacher_id: user.id,
      retention_days: retentionDays,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'teacher_id' });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved' });
    }
    setSaving(false);
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
      {/* Frosted header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/teacher/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </div>
          <h1 className="text-sm font-bold text-foreground">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <Clock className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm">Data Retention</CardTitle>
                  <CardDescription className="text-[11px]">
                    Attendance records auto-delete after this period.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-xs">Retention period (days)</Label>
                <Input
                  type="number"
                  min={7}
                  max={365}
                  value={retentionDays}
                  onChange={e => setRetentionDays(Number(e.target.value))}
                  className="h-10"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Button onClick={save} disabled={saving} className="w-full h-11">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
