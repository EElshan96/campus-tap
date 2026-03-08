import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, GraduationCap, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentAttendance() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const isDemo = token === 'demo';
  const [vunetId, setVunetId] = useState(isDemo ? 'abc123' : '');
  const [firstName, setFirstName] = useState(isDemo ? 'Jane' : '');
  const [lastName, setLastName] = useState(isDemo ? 'Doe' : '');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; onNetwork?: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !vunetId.trim() || !firstName.trim() || !lastName.trim()) return;
    setSubmitting(true);
    setResult(null);

    // Demo mode: simulate success after a short delay
    if (isDemo) {
      await new Promise(r => setTimeout(r, 1200));
      setSubmitting(false);
      setResult({ success: true, message: 'Attendance recorded successfully (demo)', onNetwork: true });
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-attendance`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          token,
          student_id: vunetId.trim(),
          student_name: fullName,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: data.message, onNetwork: data.on_class_network });
      } else {
        setResult({ success: false, message: data.error || 'Something went wrong' });
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    }
    setSubmitting(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="w-full max-w-md">
            <CardContent className="py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-7 w-7 text-destructive" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">Invalid Link</h2>
              <p className="text-muted-foreground text-sm">
                Please scan the QR code displayed in your classroom to mark attendance.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="w-full max-w-md">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Marked Present!</h2>
              <p className="text-muted-foreground text-sm mb-5">{result.message}</p>
              <div className="inline-flex items-center gap-2 text-sm rounded-full px-4 py-2 bg-muted">
                {result.onNetwork ? (
                  <>
                    <Wifi className="h-4 w-4 text-success" />
                    <span className="text-success font-medium">On campus network</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Off campus network</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl vu-gradient mb-3">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">VU Attendance</h1>
          <p className="text-sm text-muted-foreground">Confirm your attendance</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mark Attendance</CardTitle>
            <CardDescription>Enter your VUnet ID and name to confirm your presence.</CardDescription>
          </CardHeader>
          <CardContent>
            {result && !result.success && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {result.message}
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vunetId">VUnet ID *</Label>
                <Input
                  id="vunetId"
                  placeholder="e.g., abc123"
                  value={vunetId}
                  onChange={e => setVunetId(e.target.value.toLowerCase())}
                  required
                  maxLength={20}
                  pattern="[a-zA-Z]{3}[0-9]{3}"
                  title="VUnet ID format: 3 letters followed by 3 digits (e.g., abc123)"
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="First name"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                    maxLength={50}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Last name"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                    maxLength={50}
                    className="h-11"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 font-semibold" disabled={submitting || !vunetId.trim() || !firstName.trim() || !lastName.trim()}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Attendance
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center mt-5 leading-relaxed">
          Your IP is checked to verify campus network presence.
          User-agent data may be hashed for anti-fraud purposes.
        </p>
      </motion.div>
    </div>
  );
}
