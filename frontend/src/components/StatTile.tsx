import React from 'react';

interface StatTileProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  subtext,
  icon,
  badge,
}) => {
  return (
    <div className="stat-tile">
      <div className="stat-tile-label">
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon}
          {label}
        </span>
        {badge}
      </div>
      <div className="stat-tile-value mono-data">{value}</div>
      {subtext && <div className="stat-tile-subtext">{subtext}</div>}
    </div>
  );
};
