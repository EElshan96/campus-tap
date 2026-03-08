import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2, Plus, X, Settings, Shield, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

export default function TeacherSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [retentionDays, setRetentionDays] = useState(90);
  const [networkRanges, setNetworkRanges] = useState<string[]>([]);
  const [newRange, setNewRange] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/teacher/login');
  }, [user, authLoading, navigate]);

  const VU_DEFAULT_RANGES = ['145.108.0.0/16', '130.37.0.0/16', '192.87.106.0/24'];

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('teacher_settings')
        .select('*')
        .eq('teacher_id', user.id)
        .maybeSingle();
      if (data) {
        setRetentionDays(data.retention_days);
        setNetworkRanges(data.allowed_network_ranges || []);
      } else {
        setNetworkRanges(VU_DEFAULT_RANGES);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const addRange = () => {
    const trimmed = newRange.trim();
    if (!trimmed || networkRanges.includes(trimmed)) return;
    setNetworkRanges([...networkRanges, trimmed]);
    setNewRange('');
  };

  const removeRange = (idx: number) => {
    setNetworkRanges(networkRanges.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('teacher_settings').upsert({
      teacher_id: user.id,
      retention_days: retentionDays,
      allowed_network_ranges: networkRanges,
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

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <Shield className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm">Allowed Network Ranges</CardTitle>
                  <CardDescription className="text-[11px]">
                    CIDR ranges for campus networks. Matching students are flagged "on campus".
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 130.37.0.0/16"
                  value={newRange}
                  onChange={e => setNewRange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRange())}
                  className="h-10"
                />
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={addRange}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {networkRanges.length > 0 && (
                <div className="space-y-1.5">
                  {networkRanges.map((range, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                      <code className="text-xs text-foreground font-mono">{range}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeRange(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
