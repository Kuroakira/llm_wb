'use client'

import React from 'react'

interface SpinnerLoaderProps {
  size?: number
  color?: string
  thickness?: number
}

export const SpinnerLoader: React.FC<SpinnerLoaderProps> = ({ 
  size = 16,
  color = '#FFFFFF',
  thickness = 2
}) => {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: `${thickness}px solid transparent`,
        borderTop: `${thickness}px solid ${color}`,
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'spin 1s linear infinite'
      }}
    >
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}