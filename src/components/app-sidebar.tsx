import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, MessageSquare, GitBranch, Settings, Bot } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
const navItems = [
  { to: "/", icon: Home, label: "Dashboard" },
  { to: "/rooms", icon: MessageSquare, label: "Rooms" },
  { to: "/integrations", icon: GitBranch, label: "Integrations" },
  { to: "/settings", icon: Settings, label: "Settings" },
];
export function AppSidebar(): JSX.Element {
  const location = useLocation();
  return (
    <Sidebar>
      <SidebarHeader>
        <NavLink to="/" className="flex items-center gap-2.5 px-2 py-1">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-display font-semibold">Conductor</span>
        </NavLink>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to))}
              >
                <NavLink to={item.to}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}