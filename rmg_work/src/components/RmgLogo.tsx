interface RmgLogoProps {
  className?: string;
}

export function RmgLogo({ className = '' }: RmgLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Dış geometrik kasa çerçevesi */}
        <path
          d="M6 2H30L34 6V30L30 34H6L2 30V6L6 2Z"
          fill="#111827"
          stroke="#246BFD"
          strokeWidth="1.5"
        />
        {/* Üst köşe turuncu vurgu çizgisi */}
        <path d="M24 2H30L34 6V11" stroke="#FF7900" strokeWidth="1.8" strokeLinecap="square" />
        {/* R harfi */}
        <path
          d="M7 24.5V11.5H12.2C13.9 11.5 15 12.4 15 13.9C15 15.1 14.1 15.9 12.7 16.3L15.1 24.5"
          stroke="#F5F7FA"
          strokeWidth="2.3"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        {/* M harfi (mavi geometrik omurga) */}
        <path
          d="M15.4 24.5V11.5L18.6 18.2L21.8 11.5V24.5"
          stroke="#246BFD"
          strokeWidth="2.3"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        {/* G harfi (turuncu vurgu) */}
        <path
          d="M29.2 14.1C28.6 12.5 27.1 11.5 25.3 11.5C23.1 11.5 21.8 13.1 21.8 18C21.8 22.9 23.1 24.5 25.5 24.5C27.5 24.5 28.9 23.3 29.2 21.2V18H25.4"
          stroke="#FF7900"
          strokeWidth="2.3"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
      <span className="font-display text-lg font-bold tracking-tight text-[#F5F7FA]">
        RMG <span className="text-[#FF7900]">TECH</span>
      </span>
    </span>
  );
}
