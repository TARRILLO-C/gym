import React from 'react';

const PageLayout = ({ 
  title, 
  subtitle, 
  actionButton, 
  children 
}) => {
  return (
    <div className="page-animate-entry" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: '1 1 min-content' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.2rem)', marginBottom: '8px', lineHeight: '1.2' }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actionButton && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {actionButton}
          </div>
        )}
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
