import React from 'react';
import { motion } from 'framer-motion';
import { theme } from '../../theme';
import type { TermsSection } from './termsData';

interface TermsSectionCardProps {
  section: TermsSection;
  index: number;
}

export function TermsSectionCard({ section, index }: TermsSectionCardProps) {
  return (
    <motion.section
      id={section.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.03 }}
      className="scroll-mt-28"
    >
      <div
        className="rounded-2xl p-6 md:p-8 transition-all duration-300 hover:border-zinc-600"
        style={{
          background: theme.gradients.card,
          border: `1px solid ${theme.colors.border}`,
          backdropFilter: 'blur(20px)',
        }}
      >
        <h3
          className="text-lg md:text-xl font-bold mb-5 pb-3 border-b border-zinc-800"
          style={{ color: theme.colors.text }}
        >
          {section.title}
        </h3>
        <div className="space-y-4">
          {section.content.map((paragraph, pIndex) => (
            <p
              key={pIndex}
              className="text-sm md:text-base leading-relaxed"
              style={{
                color: paragraph === paragraph.toUpperCase() && paragraph.length > 50
                  ? theme.colors.textMuted
                  : '#d4d4d8',
              }}
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
