import * as React from "react";

export const UserAnonymous = ({
  size = 20,
  ...props
}: React.HTMLAttributes<SVGElement> & { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 20 20"
    {...props}
  >
    <path
      fill="currentColor"
      d="M15 2H5L4 8h12zM0 10s2 1 10 1 10-1 10-1l-4-2H4zm8 4h4v1H8z"
    />
    <circle cx={6} cy={15} r={3} fill="currentColor" />
    <circle cx={14} cy={15} r={3} fill="currentColor" />
  </svg>
);
