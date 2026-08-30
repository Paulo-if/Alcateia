import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}

export function ActionCard({ icon, title, subtitle, onClick }: Props) {
  return (
    <button type="button" className="action-card" onClick={onClick}>
      <span className="action-card-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="action-card-text">
        <strong className="action-card-title">{title}</strong>
        <span className="action-card-sub">{subtitle}</span>
      </span>
    </button>
  );
}