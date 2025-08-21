import React from 'react';
import { render } from '@playwright/test';
import { ConnectionProvider } from '@/lib/contexts/ConnectionContext';
import ToastProvider from '@/components/ui/Toast';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ConnectionProvider>
      <ToastProvider />
      {children}
    </ConnectionProvider>
  );
};

const customRender = (ui: React.ReactElement, options?: any) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@playwright/test';
export { customRender as render };