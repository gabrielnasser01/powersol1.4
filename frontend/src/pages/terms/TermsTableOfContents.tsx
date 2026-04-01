import React from 'react';
import { motion } from 'framer-motion';
import { List } from 'lucide-react';
import { theme } from '../../theme';
import { termsSections } from './termsData';

interface TermsTableOfContentsProps {
  activeSection: string;
  onSectionClick: (id: string) => void;
}

export function TermsTableOfContents({ activeSection, onSectionClick }: TermsTableOfContentsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="hidden lg:block sticky top-28"
    >
      <div
        className="rounded-2xl p-5 max-h-[calc(100vh-8rem)] overflow-y-auto"
        style={{
          background: theme.gradients.card,
          border: `1px solid ${theme.colors.border}`,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-zinc-800">
          <List className="w-4 h-4" style={{ color: theme.colors.neonCyan }} />
          <span className="text-sm font-semibold" style={{ color: theme.colors.text }}>
            Table of Contents
          </span>
        </div>
        <nav className="space-y-1">
          {termsSections.map((section) => {
            const isActive = activeSection === section.id;
            const sectionNumber = section.title.split('.')[0];
            const sectionName = section.title.replace(/^\d+\.\s*/, '');
            return (
              <button
                key={section.id}
                onClick={() => onSectionClick(section.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-200 flex items-start space-x-2 group"
                style={{
                  background: isActive ? `${theme.colors.neonBlue}15` : 'transparent',
                  borderLeft: isActive ? `2px solid ${theme.colors.neonBlue}` : '2px solid transparent',
                  color: isActive ? theme.colors.neonBlue : theme.colors.textMuted,
                }}
              >
                <span
                  className="font-mono shrink-0 mt-px"
                  style={{
                    color: isActive ? theme.colors.neonCyan : theme.colors.textMuted,
                  }}
                >
                  {sectionNumber}.
                </span>
                <span className="group-hover:text-white transition-colors leading-tight">
                  {sectionName}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </motion.div>
  );
}
