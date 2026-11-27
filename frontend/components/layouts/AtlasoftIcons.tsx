import React from "react";
import Image from "next/image";

interface IconProps {
  size?: number;
  className?: string;
}

interface BrandMarkProps extends IconProps {
  variant?: "dark-bg" | "auto";
}

const DEFAULT_ICON_COLOR = "text-[#484644] dark:text-white";

export function AtlasoftBrandMark({
  size = 24,
  className = "",
  variant = "dark-bg",
}: BrandMarkProps) {
  const width = Math.round(size * 1.6);

  if (variant === "auto") {
    return (
      <>
        <Image
          src="/images/black-logo.png"
          alt=""
          width={width}
          height={size}
          className={`h-auto w-auto object-contain dark:hidden ${className}`}
          style={{ height: size }}
          aria-hidden="true"
          priority
        />
        <Image
          src="/images/white-logo.png"
          alt=""
          width={width}
          height={size}
          className={`hidden h-auto w-auto object-contain dark:block ${className}`}
          style={{ height: size }}
          aria-hidden="true"
          priority
        />
      </>
    );
  }

  return (
    <Image
      src="/images/white-logo.png"
      alt=""
      width={width}
      height={size}
      className={`h-auto w-auto object-contain ${className}`}
      style={{ height: size }}
      aria-hidden="true"
      priority
    />
  );
}

export function AtlasoftHomeIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={`${DEFAULT_ICON_COLOR} ${className}`}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 1.8L1.5 8.1H3.6V16H14.4V8.1H16.5L9 1.8ZM7.3 10.2H10.7V16H7.3V10.2Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <path d="M9 1.8L1.5 8.1H3.6L9 3.6L14.4 8.1H16.5L9 1.8Z" fill="currentColor" />
    </svg>
  );
}

export function AtlasoftResourcesIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={`${DEFAULT_ICON_COLOR} ${className}`}
      aria-hidden="true"
    >
      <path d="M9 1.5L15.8 5.2L9 8.9L2.2 5.2L9 1.5Z" fill="currentColor" fillOpacity="0.55" />
      <path d="M2.2 5.2L9 8.9V16.5L2.2 12.8V5.2Z" fill="currentColor" fillOpacity="0.95" />
      <path d="M15.8 5.2L9 8.9V16.5L15.8 12.8V5.2Z" fill="currentColor" fillOpacity="0.72" />
    </svg>
  );
}

export function AtlasoftDepartmentsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={`${DEFAULT_ICON_COLOR} ${className}`}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.5 2.8C2.5 2.47 2.77 2.2 3.1 2.2H10.4C10.73 2.2 11 2.47 11 2.8V16H8V12H5.6V16H2.5V2.8ZM4.3 4.3V6.3H6.3V4.3H4.3ZM7.3 4.3V6.3H9.3V4.3H7.3ZM4.3 7.8V9.8H6.3V7.8H4.3ZM7.3 7.8V9.8H9.3V7.8H7.3Z"
        fill="currentColor"
        fillOpacity="0.92"
      />
      <rect x="11.5" y="6.2" width="4" height="9.8" rx="0.5" fill="currentColor" fillOpacity="0.55" />
    </svg>
  );
}

export function AtlasoftDocumentsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={`${DEFAULT_ICON_COLOR} ${className}`}
      aria-hidden="true"
    >
      <rect
        x="2.2"
        y="2.6"
        width="13.6"
        height="12.8"
        rx="1.1"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path d="M2.2 3.7C2.2 3.09 2.69 2.6 3.3 2.6H14.7C15.31 2.6 15.8 3.09 15.8 3.7V5.7H2.2V3.7Z" fill="currentColor" />
      <rect x="4.2" y="7.7" width="9.6" height="1.6" rx="0.3" fill="currentColor" fillOpacity="0.9" />
      <rect x="4.2" y="10.4" width="9.6" height="1.5" rx="0.3" fill="currentColor" fillOpacity="0.65" />
      <rect x="4.2" y="13" width="6.4" height="1.3" rx="0.3" fill="currentColor" fillOpacity="0.45" />
    </svg>
  );
}

export function AtlasoftEvaluationsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={`${DEFAULT_ICON_COLOR} ${className}`}
      aria-hidden="true"
    >
      <rect
        x="2.2"
        y="2.6"
        width="13.6"
        height="12.8"
        rx="1.1"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M4.3 12L7.1 9L9.4 10.9L13.7 6.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="13.7" cy="6.2" r="1.4" fill="currentColor" />
      <circle cx="7.1" cy="9" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function AtlasoftJobsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={`${DEFAULT_ICON_COLOR} ${className}`}
      aria-hidden="true"
    >
      <path
        d="M6.4 4.8V3.4C6.4 2.7 6.9 2.2 7.6 2.2H10.4C11.1 2.2 11.6 2.7 11.6 3.4V4.8"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="2.2"
        y="4.8"
        width="13.6"
        height="10.6"
        rx="1.1"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M2.2 8.5H15.8V9.9H2.2V8.5Z" fill="currentColor" fillOpacity="0.85" />
      <rect x="7.6" y="7.5" width="2.8" height="2.6" rx="0.4" fill="currentColor" />
    </svg>
  );
}

export function AtlasoftTalentsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={`${DEFAULT_ICON_COLOR} ${className}`}
      aria-hidden="true"
    >
      <circle cx="7.5" cy="5.6" r="3" fill="currentColor" fillOpacity="0.82" />
      <path
        d="M2.2 15.2C2.2 12.2 4.6 10.2 7.5 10.2C10.4 10.2 12.8 12.2 12.8 15.2H2.2Z"
        fill="currentColor"
        fillOpacity="0.92"
      />
      <path
        d="M13.6 3.2L14.4 4.9L16.3 5.2L14.9 6.5L15.2 8.4L13.6 7.5L11.9 8.4L12.2 6.5L10.8 5.2L12.7 4.9L13.6 3.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AtlasoftRecruitIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={`${DEFAULT_ICON_COLOR} ${className}`}
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="6.6" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.12" />
      <circle cx="9" cy="9" r="3.9" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" />
      <path
        d="M12 6L15.8 2.2M15.8 2.2H13.1M15.8 2.2V4.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AtlasoftHelpIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={`${DEFAULT_ICON_COLOR} ${className}`}
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="9"
        r="6.8"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M6.9 6.7C6.9 5.6 7.8 4.8 9 4.8C10.2 4.8 11.1 5.5 11.1 6.6C11.1 7.6 10.3 8.1 9.5 8.6C9 8.9 8.8 9.3 8.8 10V10.4"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
      <circle cx="8.9" cy="12.9" r="1" fill="currentColor" />
    </svg>
  );
}

export function AtlasoftAdminUsersIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={`${DEFAULT_ICON_COLOR} ${className}`}
      aria-hidden="true"
    >
      <path
        d="M9 1.8L15 4.2V8.8C15 12.5 12.4 15.2 9 16.3C5.6 15.2 3 12.5 3 8.8V4.2L9 1.8Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="7.1" r="1.9" fill="currentColor" />
      <path
        d="M5.8 12.5C5.8 10.8 7.2 9.8 9 9.8C10.8 9.8 12.2 10.8 12.2 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AtlasoftInviteIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={`${DEFAULT_ICON_COLOR} ${className}`}
      aria-hidden="true"
    >
      <rect
        x="1.9"
        y="3.8"
        width="13.2"
        height="9.8"
        rx="1"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2.3 4.3L8.5 9.2L14.7 4.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.2 10.6V15M12 12.8H16.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AtlasoftSettingsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={`${DEFAULT_ICON_COLOR} ${className}`}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.6 1.8H10.4L10.9 3.6C11.4 3.8 11.9 4.1 12.3 4.4L14.1 3.8L15.5 6.2L14 7.5C14.1 8 14.2 8.5 14.2 9C14.2 9.5 14.1 10 14 10.5L15.5 11.8L14.1 14.2L12.3 13.6C11.9 13.9 11.4 14.2 10.9 14.4L10.4 16.2H7.6L7.1 14.4C6.6 14.2 6.1 13.9 5.7 13.6L3.9 14.2L2.5 11.8L4 10.5C3.9 10 3.8 9.5 3.8 9C3.8 8.5 3.9 8 4 7.5L2.5 6.2L3.9 3.8L5.7 4.4C6.1 4.1 6.6 3.8 7.1 3.6L7.6 1.8ZM9 6.4C7.56 6.4 6.4 7.56 6.4 9C6.4 10.44 7.56 11.6 9 11.6C10.44 11.6 11.6 10.44 11.6 9C11.6 7.56 10.44 6.4 9 6.4Z"
        fill="currentColor"
        fillOpacity="0.88"
      />
    </svg>
  );
}

export function AtlasoftProfileIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={`${DEFAULT_ICON_COLOR} ${className}`}
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="9"
        r="6.8"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="9" cy="6.8" r="2.2" fill="currentColor" />
      <path d="M4.8 14C5.6 12 7.2 11 9 11C10.8 11 12.4 12 13.2 14" fill="currentColor" fillOpacity="0.85" />
    </svg>
  );
}
