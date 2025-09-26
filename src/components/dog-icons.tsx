import type { SVGProps } from 'react';

export const PawIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="11" cy="4" r="2" fill="#8B4513" stroke="none" />
    <circle cx="17" cy="5" r="2" fill="#8B4513" stroke="none" />
    <circle cx="6" cy="9" r="2" fill="#8B4513" stroke="none" />
    <circle cx="19" cy="11" r="2" fill="#8B4513" stroke="none" />
    <path d="M7.1 12.4c-.3 1.2.3 2.5 1.4 3.1 1.4.8 3.1.3 4-1 .8-1.1.5-2.7-.6-3.4-1.1-.7-2.6-.5-3.8.3z" fill="#D2691E" stroke="none" />
  </svg>
);

export const BoneIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path
      d="M16.5 6.5a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0zM7.5 17.5a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0z"
      fill="#F5DEB3"
      stroke="#DEB887"
      strokeWidth="1.5"
    />
    <path d="M12 6.5v11" stroke="#DEB887" strokeWidth="1.5" />
  </svg>
);

export const DogHouseIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M4 21V10.8a2 2 0 0 1 .6-1.4l8-8a2 2 0 0 1 2.8 0l8 8a2 2 0 0 1 .6 1.4V21" fill="#DC143C" stroke="#8B0000" strokeWidth="1" />
    <path d="M9 21v-8a3 3 0 0 1 6 0v8" fill="none" stroke="#FFFF00" strokeWidth="2" />
    <rect x="2" y="19" width="20" height="3" fill="#A0522D" stroke="none" />
  </svg>
);

export const BallIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" fill="#32CD32" stroke="none" />
    <path d="M12 2a10 10 0 0 0-4.47 19.16M12 2a10 10 0 0 1 4.47 19.16" stroke="#FFFFFF" strokeWidth="1.5" />
  </svg>
);

export const FoodBowlIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2 16.2c0-2.3 1.8-4.2 4-4.2h12c2.2 0 4 1.9 4 4.2v.8H2v-.8z" fill="#4682B4" stroke="#4169E1" strokeWidth="1" />
    <ellipse cx="12" cy="12" rx="6" ry="2" fill="#F0E68C" stroke="none" />
  </svg>
);
