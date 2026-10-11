import React from 'react';

/**
 * 内联 SVG logo（知识收集）：
 * 松墨绿底 + 宣纸卡扇形堆叠（收集意象）+ 前卡大字「知」+ 朱砂印。
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
    aria-label="知识收集 logo"
  >
    <defs>
      <linearGradient id="pine-logo-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#2A5C4B" />
        <stop offset="1" stopColor="#16382E" />
      </linearGradient>
    </defs>

    {/* 松墨绿底 */}
    <rect width="512" height="512" rx="112" fill="url(#pine-logo-bg)" />

    {/* 背卡两张：扇形堆叠，呼应「收集」 */}
    <rect x="176" y="128" width="234" height="278" rx="26" fill="#F5F0E4" opacity="0.20" transform="rotate(-13 293 267)" />
    <rect x="168" y="122" width="238" height="282" rx="26" fill="#F5F0E4" opacity="0.42" transform="rotate(9 287 263)" />

    {/* 前卡：宣纸 */}
    <rect x="134" y="110" width="244" height="292" rx="28" fill="#F5F0E4" />

    {/* 大字「知」：宋体松墨 */}
    <text
      x="254"
      y="322"
      textAnchor="middle"
      fontFamily="'Songti SC','Noto Serif SC','STSong','SimSun',serif"
      fontWeight="700"
      fontSize="204"
      fill="#2C3E36"
    >
      知
    </text>

    {/* 朱砂印章 */}
    <rect x="304" y="322" width="50" height="50" rx="10" fill="#B54434" />
    <rect x="316" y="334" width="26" height="26" rx="5" fill="#F5F0E4" opacity="0.9" />
  </svg>
);
