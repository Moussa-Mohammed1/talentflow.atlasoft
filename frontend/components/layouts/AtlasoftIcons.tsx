import React from "react";
import Image from "next/image";
interface IconProps {
  size?: number;
  className?: string;
}

export function AtlasoftBrandMark({ size = 18, className = "" }: IconProps) {
  return (
    <img width={size} height={size}  src="images/white-logo.png" className={className} aria-hidden="true">
    </img>
  );
}

export function AtlasoftHomeIcon({ size = 24, className = "" }: IconProps) {
  return (
     <Image
      src="/images/white-logo.png"
      alt=""
      width={Math.round(size * 1.6)}
      height={size}
      className={`h-auto w-auto object-contain ${className}`}
      style={{ height: size }}
      aria-hidden="true"
      priority
    />
  );
}

export function AtlasoftResourcesIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <path d="M9 1.5L15.8 5.2L9 8.9L2.2 5.2L9 1.5Z" fill="#50E6FF" />
      <path d="M2.2 5.2L9 8.9V16.5L2.2 12.8V5.2Z" fill="#0078D4" />
      <path d="M15.8 5.2L9 8.9V16.5L15.8 12.8V5.2Z" fill="#2899F5" />
    </svg>
  );
}

export function AtlasoftDepartmentsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="2.2" width="8.5" height="13.8" rx="0.6" fill="#0078D4" />
      <rect x="11" y="6.2" width="4.5" height="9.8" rx="0.5" fill="#50E6FF" />
      <rect x="4.3" y="4.3" width="2" height="2" fill="#9CEBFF" />
      <rect x="7.3" y="4.3" width="2" height="2" fill="#9CEBFF" />
      <rect x="4.3" y="7.8" width="2" height="2" fill="#9CEBFF" />
      <rect x="7.3" y="7.8" width="2" height="2" fill="#9CEBFF" />
      <rect x="5.6" y="12" width="2.4" height="4" fill="#9CEBFF" />
    </svg>
  );
}

export function AtlasoftDocumentsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2.5" width="14" height="13" rx="0.8" fill="#0078D4" />
      <rect x="2" y="2.5" width="14" height="3.2" rx="0.8" fill="#50E6FF" />
      <rect x="3.8" y="7.2" width="10.4" height="2" rx="0.3" fill="#FFFFFF" />
      <rect x="3.8" y="10.2" width="10.4" height="2" rx="0.3" fill="#9CEBFF" />
      <rect x="3.8" y="13.1" width="7.2" height="1.5" rx="0.3" fill="#9CEBFF" />
    </svg>
  );
}

export function AtlasoftEvaluationsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2.5" width="14" height="13" rx="1" fill="#0078D4" />
      <path d="M4.2 12.2L7.1 9.1L9.4 11L13.8 6.2" stroke="#50E6FF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13.8" cy="6.2" r="1.5" fill="#7FBA00" />
      <circle cx="7.1" cy="9.1" r="1.1" fill="#9CEBFF" />
    </svg>
  );
}

export function AtlasoftJobsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <path d="M6.4 4.8V3.4C6.4 2.7 6.9 2.2 7.6 2.2H10.4C11.1 2.2 11.6 2.7 11.6 3.4V4.8" stroke="#50E6FF" strokeWidth="1.5" />
      <rect x="2" y="4.8" width="14" height="10.8" rx="1" fill="#0078D4" />
      <path d="M2 8.2H16V9.8H2V8.2Z" fill="#50E6FF" />
      <rect x="7.6" y="7.5" width="2.8" height="2.6" rx="0.4" fill="#FFFFFF" />
    </svg>
  );
}

export function AtlasoftTalentsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <circle cx="7.5" cy="5.6" r="3.1" fill="#50E6FF" />
      <path d="M2.2 15.2C2.2 12.2 4.6 10.2 7.5 10.2C10.4 10.2 12.8 12.2 12.8 15.2H2.2Z" fill="#0078D4" />
      <path
        d="M13.6 3.2L14.4 4.9L16.3 5.2L14.9 6.5L15.2 8.4L13.6 7.5L11.9 8.4L12.2 6.5L10.8 5.2L12.7 4.9L13.6 3.2Z"
        fill="#FFB900"
      />
    </svg>
  );
}

export function AtlasoftRecruitIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="9" r="6.8" fill="#0078D4" />
      <circle cx="9" cy="9" r="4.3" fill="#50E6FF" />
      <circle cx="9" cy="9" r="1.9" fill="#FFFFFF" />
      <path d="M12.2 5.8L15.8 2.2M15.8 2.2H13.2M15.8 2.2V4.8" stroke="#7FBA00" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AtlasoftHelpIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="9" r="7" fill="#0078D4" />
      <path
        d="M6.9 6.7C6.9 5.6 7.8 4.8 9 4.8C10.2 4.8 11.1 5.5 11.1 6.6C11.1 7.6 10.3 8.1 9.5 8.6C9 8.9 8.8 9.3 8.8 10V10.4"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="8.9" cy="12.9" r="1" fill="#50E6FF" />
    </svg>
  );
}

export function AtlasoftAdminUsersIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <path d="M9 1.8L15 4.2V8.8C15 12.5 12.4 15.2 9 16.3C5.6 15.2 3 12.5 3 8.8V4.2L9 1.8Z" fill="#0078D4" />
      <circle cx="9" cy="7.1" r="2" fill="#FFB900" />
      <path d="M5.8 12.5C5.8 10.8 7.2 9.8 9 9.8C10.8 9.8 12.2 10.8 12.2 12.5" stroke="#50E6FF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AtlasoftInviteIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <rect x="1.8" y="3.8" width="14.4" height="10.4" rx="0.9" fill="#0078D4" />
      <path d="M2.2 4.3L9 9.5L15.8 4.3" stroke="#50E6FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14.2" cy="12.8" r="2.6" fill="#7FBA00" />
      <path d="M14.2 11.6V14M13 12.8H15.4" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function AtlasoftSettingsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <path
        d="M7.6 1.8H10.4L10.9 3.6C11.4 3.8 11.9 4.1 12.3 4.4L14.1 3.8L15.5 6.2L14 7.5C14.1 8 14.2 8.5 14.2 9C14.2 9.5 14.1 10 14 10.5L15.5 11.8L14.1 14.2L12.3 13.6C11.9 13.9 11.4 14.2 10.9 14.4L10.4 16.2H7.6L7.1 14.4C6.6 14.2 6.1 13.9 5.7 13.6L3.9 14.2L2.5 11.8L4 10.5C3.9 10 3.8 9.5 3.8 9C3.8 8.5 3.9 8 4 7.5L2.5 6.2L3.9 3.8L5.7 4.4C6.1 4.1 6.6 3.8 7.1 3.6L7.6 1.8Z"
        fill="#A19F9D"
      />
      <circle cx="9" cy="9" r="2.6" fill="#50E6FF" />
    </svg>
  );
}

export function AtlasoftProfileIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="9" r="7" fill="#0078D4" />
      <circle cx="9" cy="6.8" r="2.4" fill="#FFFFFF" />
      <path d="M4.6 14.1C5.4 12 7.1 10.9 9 10.9C10.9 10.9 12.6 12 13.4 14.1" fill="#50E6FF" />
    </svg>
  );
}
