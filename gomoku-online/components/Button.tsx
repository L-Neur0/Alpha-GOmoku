import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'wood';
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
    children, 
    variant = 'primary', 
    fullWidth = false, 
    className = '', 
    ...props 
}) => {
    const baseStyles = "px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
        primary: "bg-stone-800 text-white hover:bg-stone-700 ring-2 ring-stone-900 ring-offset-2",
        secondary: "bg-stone-200 text-stone-800 hover:bg-stone-300 border-2 border-stone-300",
        danger: "bg-red-600 text-white hover:bg-red-700 ring-2 ring-red-600 ring-offset-2",
        wood: "bg-wood-800 text-white hover:bg-wood-400 border-b-4 border-wood-800 hover:border-wood-800"
    };

    return (
        <button 
            className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};