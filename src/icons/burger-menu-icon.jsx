import React from 'react';

export default function BurgerMenuIcon({ title = 'Menu' }) {
  return (
    <svg
      viewBox="0 0 20 10"
      width="20"
      height="10"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title && <title>{title}</title>}
      <line
        x1="1"
        y1="1"
        x2="19"
        y2="1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="1"
        y1="5"
        x2="19"
        y2="5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="1"
        y1="9"
        x2="19"
        y2="9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
