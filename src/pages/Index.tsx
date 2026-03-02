import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, QrCode, Shield, Clock } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="vu-gradient">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-foreground/10 backdrop-blur mb-6">
            <GraduationCap className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-primary-foreground mb-4 tracking-tight">
            VU Attendance
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto mb-8">
            Fast, secure QR-based classroom attendance for Vrije Universiteit Amsterdam.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/teacher/login')}
              className="text-base"
            >
              Teacher Login
            </Button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <QrCode className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">QR-Based Check-in</h3>
            <p className="text-sm text-muted-foreground">
              Students scan a rotating QR code to mark attendance instantly from their phones.
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Anti-Cheating</h3>
            <p className="text-sm text-muted-foreground">
              Time-limited signed tokens, IP validation, and one-check-in-per-student enforcement.
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Privacy-First</h3>
            <p className="text-sm text-muted-foreground">
              Configurable data retention, no raw IP storage, and transparent privacy notices.
            </p>
          </div>
        </div>
      </div>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Vrije Universiteit Amsterdam — VU Attendance System
      </footer>
    </div>
  );
}
