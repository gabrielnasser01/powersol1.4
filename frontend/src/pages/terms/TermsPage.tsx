import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield, Scale, AlertTriangle } from 'lucide-react';
import { theme } from '../../theme';
import { termsSections, TERMS_LAST_UPDATED } from './termsData';
import { TermsTableOfContents } from './TermsTableOfContents';
import { TermsSectionCard } from './TermsSectionCard';

const KEY_HIGHLIGHTS = [
  {
    icon: Shield,
    label: 'Age Requirement',
    value: '18+ Only',
    color: theme.colors.neonBlue,
  },
  {
    icon: Scale,
    label: 'Compliance',
    value: 'OFAC Screening',
    color: theme.colors.neonCyan,
  },
  {
    icon: AlertTriangle,
    label: 'Blockchain',
    value: 'Irreversible Txns',
    color: theme.colors.warning,
  },
  {
    icon: FileText,
    label: 'Sections',
    value: `${termsSections.length} Clauses`,
    color: theme.colors.success,
  },
];

export function Terms() {
  const [activeSection, setActiveSection] = useState(termsSections[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible?.target?.id) {
          setActiveSection(visible.target.id);
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0.1 },
    );

    termsSections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleSectionClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10"
        >
          <div className="flex justify-center mb-6">
            <div
              className="p-4 rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.neonBlue}20, ${theme.colors.neonCyan}20)`,
                border: `1px solid ${theme.colors.neonBlue}30`,
                boxShadow: `0 0 30px ${theme.colors.neonBlue}15`,
              }}
            >
              <FileText className="w-8 h-8" style={{ color: theme.colors.neonBlue }} />
            </div>
          </div>
          <h1
            className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4"
            style={{
              fontFamily: 'Orbitron, monospace',
              background: theme.gradients.neon,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Terms of Service
          </h1>
          <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto mb-2">
            Please read these terms carefully before using the PowerSOL platform.
            By using our services, you agree to be bound by these terms.
          </p>
          <p className="text-zinc-500 text-sm">
            Last updated: {TERMS_LAST_UPDATED}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto mb-12"
        >
          {KEY_HIGHLIGHTS.map((h, i) => {
            const Icon = h.icon;
            return (
              <div
                key={i}
                className="rounded-xl p-4 text-center"
                style={{
                  background: theme.gradients.card,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: h.color }} />
                <div className="text-xs text-zinc-500 mb-1">{h.label}</div>
                <div className="text-sm font-semibold" style={{ color: h.color }}>
                  {h.value}
                </div>
              </div>
            );
          })}
        </motion.div>

        <div className="max-w-6xl mx-auto flex gap-8">
          <div className="w-64 shrink-0 hidden lg:block">
            <TermsTableOfContents
              activeSection={activeSection}
              onSectionClick={handleSectionClick}
            />
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            {termsSections.map((section, index) => (
              <TermsSectionCard key={section.id} section={section} index={index} />
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="rounded-2xl p-6 md:p-8 text-center mt-8"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.neonBlue}08, ${theme.colors.neonCyan}08)`,
                border: `1px solid ${theme.colors.neonBlue}20`,
              }}
            >
              <p className="text-zinc-400 text-sm">
                By continuing to use PowerSOL, you acknowledge that you have read, understood,
                and agree to these Terms of Service in their entirety.
              </p>
              <p className="text-zinc-500 text-xs mt-3">
                Document version: {TERMS_LAST_UPDATED} | {termsSections.length} sections
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
