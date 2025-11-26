import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, MessageSquare, GitBranch, Settings, Bot, PanelLeftClose, PanelRightClose } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
const navItems = [
  { to: "/", icon: Home, label: "Dashboard" },
  { to: "/rooms", icon: MessageSquare, label: "Rooms" },
  { to: "/integrations", icon: GitBranch, label: "Integrations" },
  { to: "/settings", icon: Settings, label: "Settings" },
];
export function AppSidebar(): JSX.Element {
  const location = useLocation();
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const labelVariants = {
    collapsed: { opacity: 0, x: -10, width: 0, transition: { duration: 0.2, ease: "easeInOut" } },
    expanded: { opacity: 1, x: 0, width: 'auto', transition: { duration: 0.2, ease: "easeInOut", delay: 0.1 } },
  };
  return (
    <Sidebar>
      <SidebarHeader>
        <div className={cn("flex items-center gap-2.5 px-2 py-1", isCollapsed && "justify-center")}>
          <div className="h-8 w-8 rounded-lg bg-gradient-primary center flex-shrink-0">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                variants={labelVariants}
                className="text-lg font-display font-semibold overflow-hidden whitespace-nowrap"
              >
                Conductor
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <TooltipProvider delayDuration={0}>
            {navItems.map((item) => (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to))}
                    >
                      <NavLink to={item.to}>
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.span
                              initial="collapsed"
                              animate="expanded"
                              exit="collapsed"
                              variants={labelVariants}
                              className="overflow-hidden whitespace-nowrap"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" align="center">
                    <p>{item.label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </TooltipProvider>
        </SidebarMenu>
      </SidebarContent>
      <div className="p-2 border-t border-sidebar-border">
        <SidebarMenuButton onClick={toggleCollapsed} className="w-full justify-start">
          {isCollapsed ? <PanelRightClose className="h-5 w-5 mx-auto" /> : <PanelLeftClose className="h-5 w-5" />}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                variants={labelVariants}
                className="overflow-hidden whitespace-nowrap ml-2"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </SidebarMenuButton>
      </div>
    </Sidebar>
  );
}