import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, QrCode, Shield, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const features = [
  {
    icon: QrCode,
    title: 'QR-Based Check-in',
    desc: 'Students scan a rotating QR code to mark attendance instantly from their phones.',
  },
  {
    icon: Shield,
    title: 'Anti-Cheating',
    desc: 'Signed tokens, campus IP validation, and one-check-in-per-student enforcement.',
  },
  {
    icon: Clock,
    title: 'Privacy-First',
    desc: 'Configurable data retention and transparent privacy notices built in.',
  },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="vu-gradient-hero relative overflow-hidden">
        <div className="pattern-dots absolute inset-0 opacity-30" />
        <div className="relative container mx-auto px-4 py-24 md:py-36 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-1.5 text-sm text-white/80 mb-8"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Vrije Universiteit Amsterdam
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="text-4xl md:text-6xl font-extrabold text-white mb-5 tracking-tight leading-[1.1]"
          >
            Classroom attendance,<br />
            <span className="text-primary-foreground/60">made effortless.</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="text-lg md:text-xl text-white/60 max-w-lg mx-auto mb-10"
          >
            Secure QR-based check-ins with campus network verification. No apps to install.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              size="lg"
              onClick={() => navigate('/teacher/login')}
              className="text-base px-8 bg-white text-foreground hover:bg-white/90 shadow-lg"
            >
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid md:grid-cols-3 gap-6"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              custom={i}
              className="group p-6 rounded-2xl border border-border bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl vu-gradient flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Vrije Universiteit Amsterdam — VU Attendance System
      </footer>
    </div>
  );
}
