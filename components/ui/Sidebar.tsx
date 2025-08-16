"use client";

import React from "react";
import clsx from "clsx";
import {
  Home,
  Server,
  Activity,
  Settings,
  BarChart3,
  Users,
  HardDrive,
  Network,
  Shield,
  Bell,
  LucideIcon,
} from "lucide-react";
import Icon from "./Icon";

export type SidebarItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  active?: boolean;
  badge?: string | number;
};

const defaultItems: SidebarItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home, active: true },
  { id: "nodes", label: "Nodes", icon: Server },
  { id: "vms", label: "Virtual Machines", icon: HardDrive },
  { id: "containers", label: "Containers", icon: Users },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "network", label: "Network", icon: Network },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
  { id: "activity", label: "Activity", icon: Activity, badge: "3" },
  { id: "security", label: "Security", icon: Shield },
  { id: "alerts", label: "Alerts", icon: Bell, badge: "2" },
  { id: "settings", label: "Settings", icon: Settings },
];

export type SidebarProps = {
  items?: SidebarItem[];
  onItemClick?: (item: SidebarItem) => void;
  collapsed?: boolean;
  className?: string;
};

export function Sidebar({
  items = defaultItems,
  onItemClick,
  collapsed = false,
  className,
}: SidebarProps) {
  const handleItemClick = (item: SidebarItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  return (
    <div
      className={clsx(
        "flex h-full flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900",
        collapsed ? "w-16" : "w-64",
        "transition-all duration-200 ease-in-out",
        className
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center border-b border-gray-200 px-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Icon icon={Server} size="sm" className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Proxmox VE
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Dashboard</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={clsx(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
              item.active
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            )}
          >
            <Icon
              icon={item.icon}
              size="sm"
              className={clsx(
                item.active
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400"
              )}
            />
            {!collapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span
                    className={clsx(
                      "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-2 text-xs font-medium",
                      item.active
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600" />
          {!collapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Admin</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">admin@pve</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;