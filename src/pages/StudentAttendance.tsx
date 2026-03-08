import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, GraduationCap, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';

export default function StudentAttendance() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; onNetwork?: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !vunetId.trim() || !firstName.trim() || !lastName.trim()) return;
    setSubmitting(true);
    setResult(null);

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
        <Card className="w-full max-w-md glass-card">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">
              Please scan the QR code displayed in your classroom to mark attendance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md glass-card">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Marked Present!</h2>
            <p className="text-muted-foreground mb-4">{result.message}</p>
            <div className="flex items-center justify-center gap-2 text-sm">
              {result.onNetwork ? (
                <>
                  <Wifi className="h-4 w-4 text-success" />
                  <span className="text-success">On campus network</span>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl vu-gradient mb-3">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">VU Attendance</h1>
          <p className="text-sm text-muted-foreground">Confirm your attendance</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Mark Attendance</CardTitle>
            <CardDescription>Enter your student ID to confirm your presence.</CardDescription>
          </CardHeader>
          <CardContent>
            {result && !result.success && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {result.message}
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID *</Label>
                <Input
                  id="studentId"
                  placeholder="e.g., ABC1234"
                  value={studentId}
                  onChange={e => setStudentId(e.target.value.toUpperCase())}
                  required
                  maxLength={20}
                  pattern="[a-zA-Z0-9]*"
                  title="Alphanumeric characters only"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentName">Name (optional)</Label>
                <Input
                  id="studentName"
                  placeholder="Your name"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !studentId.trim()}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Attendance
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Your IP is checked to verify campus network presence. 
          User-agent data may be hashed for anti-fraud purposes.
        </p>
      </div>
    </div>
  );
}
