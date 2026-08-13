'use client';

import dynamic from 'next/dynamic';

export const ThemePreviewBridge = dynamic(() => import('@/components/ThemePreviewBridge'), { ssr: false });
export const ConsultationModalHost = dynamic(() => import('@/components/ConsultationModalHost'), { ssr: false });
export const PwaRegister = dynamic(() => import('@/components/PwaRegister'), { ssr: false });
