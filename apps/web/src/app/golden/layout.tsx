import type { ReactNode } from 'react';
import '../../components/golden/golden.css';

/**
 * Golden reference routes (BB-256). Global CSS is imported here —
 * Next allows global styles only from app/ files (the BB-244 class).
 */
export default function GoldenLayout({ children }: { children: ReactNode }) {
  return children;
}
