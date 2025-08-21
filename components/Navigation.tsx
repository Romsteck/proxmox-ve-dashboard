"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar, { type SidebarItem } from "@/components/ui/Sidebar";
import {
  Home,
  Server,
  HardDrive,
  Users,
  BarChart3,
  Activity,
  Settings,
  Bell,
  Shield,
  Network,
} from "lucide-react";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";

const Navigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Define navigation items
  const navigationItems: SidebarItem[] = [
    { 
      id: "dashboard", 
      label: "Dashboard", 
      icon: Home, 
      href: "/",
      active: pathname === "/"
    },
    { 
      id: "nodes", 
      label: "Nodes", 
      icon: Server,
      href: "/nodes",
      active: pathname === "/nodes"
    },
    { 
      id: "vms", 
      label: "Virtual Machines", 
      icon: HardDrive,
      href: "/vms",
      active: pathname === "/vms"
    },
    { 
      id: "containers", 
      label: "Containers", 
      icon: Users,
      href: "/containers",
      active: pathname === "/containers"
    },
    { 
      id: "storage", 
      label: "Storage", 
      icon: HardDrive,
      href: "/storage",
      active: pathname === "/storage"
    },
    { 
      id: "network", 
      label: "Network", 
      icon: Network,
      href: "/network",
      active: pathname === "/network"
    },
    {
      id: "metrics",
      label: "Metrics",
      icon: BarChart3,
      href: "/metrics",
      active: pathname === "/metrics"
    },
    {
      id: "monitoring",
      label: "Monitoring",
      icon: Activity,
      href: "/monitoring",
      active: pathname === "/monitoring"
    },
    {
      id: "alerts",
      label: "Alerts",
      icon: Bell,
      href: "/alerts",
      active: pathname === "/alerts",
      badge: "2"
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
      href: "/security",
      active: pathname === "/security"
    },
    { 
      id: "settings", 
      label: "Settings", 
      icon: Settings,
      href: "/settings",
      active: pathname === "/settings"
    },
  ];

  const handleItemClick = (item: SidebarItem) => {
    if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Sidebar
        items={navigationItems}
        onItemClick={handleItemClick}
        collapsed={collapsed}
      />
      <div className="p-2 mt-auto">
        <ConnectionStatusIndicator />
      </div>
    </div>
  );
};

export default Navigation;