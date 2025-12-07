import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Outer pages, forming a heart-like shape */}
      <path d="M12 6 C10 5, 7 4, 4 4.5 L4 18 C7 20, 10 21, 12 21.35" />
      <path d="M12 6 C14 5, 17 4, 20 4.5 L20 18 C17 20, 14 21, 12 21.35" />
      
      {/* Spine */}
      <path d="M12 6 L12 21.35" />

      {/* Inner lines to suggest pages */}
      <path d="M12 6.5 C 11.5 6, 10 5.5, 8 5.5 L 8 18.5 C 10 19.5, 11.5 20, 12 20" />
      <path d="M12 6.5 C 12.5 6, 14 5.5, 16 5.5 L 16 18.5 C 14 19.5, 12.5 20, 12 20" />
    </svg>
  );
};
