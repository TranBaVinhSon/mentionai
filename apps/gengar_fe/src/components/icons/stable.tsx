import * as React from "react";

export const StableDiffusionIcon = ({
  size = 20,
  ...props
}: React.HTMLAttributes<SVGElement> & { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="none"
    {...props}
  >
    <rect width="18" height="18" fill="#7A45E6" rx="5"></rect>
    <g clipPath="url(#icon-sd_svg__a)">
      <path
        fill="#fff"
        d="M10.461 6.43V4.252c-.73-.485-1.901-.791-3.038-.791-2.398 0-3.837 1.296-3.837 3.077s1.44 2.394 3.02 2.845c1.315.397 2.08.63 2.08 1.332 0 .648-.623 1.061-1.724 1.061-1.422 0-2.541-.576-3.34-1.296v2.358c.87.63 2.078 1.008 3.446 1.008 2.523 0 3.997-1.243 3.997-3.15 0-2.052-1.705-2.592-3.268-3.006-1.191-.323-1.83-.575-1.83-1.205 0-.594.55-.972 1.545-.972 1.12 0 2.257.396 2.95.917Z"
      ></path>
      <path
        fill="#FF4057"
        d="M12.477 11.888c0-.828.622-1.458 1.439-1.458.817 0 1.44.63 1.44 1.458s-.64 1.458-1.44 1.458c-.8 0-1.44-.648-1.44-1.458Z"
      ></path>
    </g>
    <defs>
      <clipPath id="icon-sd_svg__a">
        <path fill="#fff" d="M3.586 3.46h11.769v10.386H3.585z"></path>
      </clipPath>
    </defs>
  </svg>
);
