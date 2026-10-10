import React from 'react';

/**
 * 内联 SVG logo（松墨绿底 + 宣纸卡 + 朱砂印）。
 * 内联而非 <img src>：图片文件会被浏览器/PWA 缓存兜住旧版，
 * 内联后随 JS bundle hash 更新，永不出现新旧不一致。
 */
export const PineLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="inBox Card logo"
  >
    <defs>
      <linearGradient id="pine-logo-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#2A5C4B" />
        <stop offset="1" stopColor="#16382E" />
      </linearGradient>
    </defs>

    {/* 松墨绿底 */}
    <rect width="512" height="512" rx="112" fill="url(#pine-logo-bg)" />

    {/* 背卡：微倾宣纸 */}
    <rect x="180" y="122" width="226" height="284" rx="26" fill="#F5F0E4" opacity="0.28" transform="rotate(-8 293 264)" />

    {/* 前卡：宣纸 */}
    <rect x="118" y="104" width="248" height="306" rx="30" fill="#F5F0E4" />

    {/* 墨字条：松墨 */}
    <rect x="156" y="164" width="150" height="24" rx="12" fill="#2C3E36" />
    <rect x="156" y="216" width="118" height="24" rx="12" fill="#2C3E36" opacity="0.62" />
    <rect x="156" y="268" width="134" height="24" rx="12" fill="#2C3E36" opacity="0.34" />

    {/* 朱砂印章 */}
    <rect x="278" y="330" width="50" height="50" rx="10" fill="#B54434" />
    <rect x="291" y="343" width="24" height="24" rx="4" fill="#F5F0E4" opacity="0.9" />
  </svg>
);
