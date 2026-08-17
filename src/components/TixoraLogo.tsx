import React from 'react';

interface TixoraIconProps {
  className?: string;
  size?: number;
}

export const TixoraIcon: React.FC<TixoraIconProps> = ({ className = 'w-8 h-8', size }) => {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Base Orange Ticket Body with geometric cutouts */}
      <path
        d="M 5 5
           H 72
           A 6 6 0 0 1 84 5
           H 112
           V 11
           H 116 V 17 H 112
           V 23
           H 116 V 29 H 112
           V 35
           H 116 V 41 H 112
           A 9 9 0 0 0 112 59
           V 65
           H 116 V 71 H 112
           V 77
           H 116 V 83 H 112
           V 89
           H 116 V 95 H 112
           V 95
           H 84
           A 6 6 0 0 1 72 95
           H 5
           V 74
           A 16 16 0 0 1 5 44
           V 40
           H 54
           V 32
           H 5
           Z"
        fill="#FF5500"
        stroke="#E64A00"
        strokeWidth="1.5"
      />

      {/* Perforation circles in double vertical column */}
      <g fill="#FFFFFF">
        {/* Column 1 */}
        <circle cx="75" cy="14" r="2.2" />
        <circle cx="75" cy="22" r="2.2" />
        <circle cx="75" cy="30" r="2.2" />
        <circle cx="75" cy="38" r="2.2" />
        <circle cx="75" cy="46" r="2.2" />
        <circle cx="75" cy="54" r="2.2" />
        <circle cx="75" cy="62" r="2.2" />
        <circle cx="75" cy="70" r="2.2" />
        <circle cx="75" cy="78" r="2.2" />
        <circle cx="75" cy="86" r="2.2" />

        {/* Column 2 */}
        <circle cx="81" cy="14" r="2.2" />
        <circle cx="81" cy="22" r="2.2" />
        <circle cx="81" cy="30" r="2.2" />
        <circle cx="81" cy="38" r="2.2" />
        <circle cx="81" cy="46" r="2.2" />
        <circle cx="81" cy="54" r="2.2" />
        <circle cx="81" cy="62" r="2.2" />
        <circle cx="81" cy="70" r="2.2" />
        <circle cx="81" cy="78" r="2.2" />
        <circle cx="81" cy="86" r="2.2" />
      </g>
    </svg>
  );
};

interface TixoraLogoProps {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
  textSize?: string;
  textColor?: string;
  subtitle?: string;
}

export const TixoraLogo: React.FC<TixoraLogoProps> = ({
  className = 'flex items-center gap-3',
  iconClassName = 'w-8 h-8',
  showText = true,
  textSize = 'text-xl',
  textColor = 'text-slate-900',
  subtitle
}) => {
  return (
    <div className={className}>
      <div className="shrink-0 drop-shadow-xs transition-transform duration-200 group-hover:scale-105">
        <TixoraIcon className={iconClassName} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-black tracking-wider uppercase ${textSize} ${textColor}`}
              style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', letterSpacing: '0.08em' }}
            >
              TIXORA
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] font-medium text-slate-500 font-mono tracking-tight mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TixoraLogo;
