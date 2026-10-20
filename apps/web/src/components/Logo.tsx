import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  className?: string;
  iconOnly?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  subtitle,
  className = '',
  iconOnly = false
}) => {
  const sizeMap = {
    sm: {
      img: 'w-7 h-7 rounded-lg',
      text: 'text-base',
      sub: 'text-[9px]'
    },
    md: {
      img: 'w-9 h-9 rounded-xl',
      text: 'text-lg',
      sub: 'text-[10px]'
    },
    lg: {
      img: 'w-11 h-11 rounded-2xl',
      text: 'text-2xl',
      sub: 'text-[11px]'
    },
    xl: {
      img: 'w-16 h-16 rounded-3xl',
      text: 'text-3xl',
      sub: 'text-xs'
    }
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* 3D Glass App Icon badge matching uploaded brand design */}
      <div className={`relative shrink-0 flex items-center justify-center overflow-hidden shadow-lg shadow-blue-500/20 ring-1 ring-white/10 ${currentSize.img}`}>
        <img
          src="/logo-squircle.png"
          alt="IntellMeet Icon"
          className="w-full h-full object-cover"
        />
      </div>

      {showText && !iconOnly && (
        <div className="flex flex-col">
          <div className={`font-extrabold tracking-tight leading-none ${currentSize.text}`}>
            <span className="text-white">Intell</span>
            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
              Meet
            </span>
          </div>
          {subtitle && (
            <span className={`uppercase font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mt-1 ${currentSize.sub}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
