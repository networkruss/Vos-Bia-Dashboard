// src/app/bi/manager/layout.tsx
import { ReactNode } from 'react';

export default function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="manager-section">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-600">Sales team performance and analytics</p>
      </div>
      
      {children}
    </div>
  );
}