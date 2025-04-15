import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  className,
  disabled,
}) => {
  return (
    <button
      className={`bg-[#00DB7B] text-black rounded-md transition-transform duration-200 hover:bg-primary-dark hover:scale-105 active:scale-95 px-4 py-3 text-sm  ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
