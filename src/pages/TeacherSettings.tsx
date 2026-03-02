import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Data Retention</CardTitle>
            <CardDescription>
              Attendance records will be automatically deleted after this period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Retention period (days)</Label>
              <Input
                type="number"
                min={7}
                max={365}
                value={retentionDays}
                onChange={e => setRetentionDays(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Allowed Network Ranges</CardTitle>
            <CardDescription>
              Define CIDR ranges for your campus network. Students on these networks will be marked as "on campus".
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., 130.37.0.0/16"
                value={newRange}
                onChange={e => setNewRange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRange())}
              />
              <Button variant="outline" onClick={addRange}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {networkRanges.length > 0 && (
              <div className="space-y-2">
                {networkRanges.map((range, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <code className="text-sm text-foreground">{range}</code>
                    <Button variant="ghost" size="icon" onClick={() => removeRange(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" /> Save Settings
        </Button>
      </main>
    </div>
  );
}
