import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  delay: number;
}

const FeatureCard = ({ title, description, icon: Icon, accent, delay }: FeatureCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.55, delay }}
      whileHover={{ y: -8, scale: 1.01 }}
      className="glass-panel group relative overflow-hidden rounded-3xl p-6"
    >
      <div className="absolute inset-x-6 top-0 h-px opacity-70" style={{ background: accent }} />
      <div
        className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10"
        style={{ background: `${accent}22`, boxShadow: `0 0 40px -15px ${accent}` }}
      >
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </motion.div>
  );
};

export default FeatureCard;
