"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-8">Welcome to Proxmox VE Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Link href="/vms" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors">
          <h2 className="text-2xl font-semibold mb-4">Virtual Machines</h2>
          <p>Manage and monitor your VMs and containers.</p>
        </Link>
        <Link href="/monitoring" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors">
          <h2 className="text-2xl font-semibold mb-4">Monitoring</h2>
          <p>View real-time metrics and logs for your nodes.</p>
        </Link>
        <Link href="/alerts" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors">
          <h2 className="text-2xl font-semibold mb-4">Alerts</h2>
          <p>Configure and view alerts for your cluster.</p>
        </Link>
        <Link href="/settings" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors">
          <h2 className="text-2xl font-semibold mb-4">Settings</h2>
          <p>Customize your dashboard settings.</p>
        </Link>
      </div>
    </main>
  );
}