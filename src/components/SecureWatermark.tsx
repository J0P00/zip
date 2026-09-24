import React, { useEffect, useState } from 'react';

interface SecureWatermarkProps {
  studentIdentifier: string;
  activityIdentifier: string;
  sessionIdentifier?: string;
  theme?: 'light' | 'dark';
  className?: string;
}

export default function SecureWatermark({
  studentIdentifier,
  activityIdentifier,
  sessionIdentifier,
  theme = 'light',
  className = ''
}: SecureWatermarkProps) {
  const [currentTimestamp, setCurrentTimestamp] = useState(() => {
    const now = new Date();
    return now.toISOString().replace('T', ' ').slice(0, 19);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTimestamp(now.toISOString().replace('T', ' ').slice(0, 19));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const watermarkText = `STUDENT: ${studentIdentifier} • ${activityIdentifier} ${sessionIdentifier ? `• SESS: ${sessionIdentifier.slice(0, 8)}` : ''} • ${currentTimestamp}`;

  // Generate a grid of watermark stamps
  const stamps = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute inset-0 z-20 overflow-hidden ${className}`}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <div className="grid h-full w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8 p-6 opacity-[0.06] dark:opacity-[0.09] transition-opacity duration-300">
        {stamps.map((idx) => (
          <div
            key={idx}
            className="flex items-center justify-center transform -rotate-25"
          >
            <div className="text-center font-mono text-[10px] font-black leading-tight tracking-wider text-slate-900 dark:text-white uppercase whitespace-nowrap">
              <div>STUDENT: {studentIdentifier}</div>
              <div>{activityIdentifier}</div>
              {sessionIdentifier && <div>SESSION: {sessionIdentifier.slice(0, 10)}</div>}
              <div>{currentTimestamp}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
