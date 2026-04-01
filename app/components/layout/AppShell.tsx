"use client";

import { useState } from "react";
import { useNavigation, type AppMode } from "@/lib/NavigationContext";
import { useIsDesktop } from "@/app/hooks/useMediaQuery";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";
import MoreSheet from "./MoreSheet";
import FeedbackModal from "@/app/components/shared/FeedbackModal";
import NotificationSettings from "@/app/components/shared/NotificationSettings";
import HealthIntegrations from "@/app/components/shared/HealthIntegrations";
import SyncStatusIndicator from "@/app/components/shared/SyncStatusIndicator";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { currentMode, navigateTo } = useNavigation();
  const isDesktop = useIsDesktop();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);

  const handleNavigate = (mode: AppMode) => {
    navigateTo(mode);
    setMoreOpen(false);
  };

  const sidebarWidth = isDesktop ? (sidebarCollapsed ? 56 : 224) : 0;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {isDesktop ? (
        <Sidebar
          activeMode={currentMode}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      ) : (
        <>
          <BottomNav
            activeMode={currentMode}
            onNavigate={handleNavigate}
            onMorePress={() => setMoreOpen(true)}
          />
          <MoreSheet
            isOpen={moreOpen}
            onClose={() => setMoreOpen(false)}
            onNavigate={handleNavigate}
            onOpenFeedback={() => setFeedbackOpen(true)}
            onOpenNotifications={() => setNotificationsOpen(true)}
            onOpenHealth={() => setHealthOpen(true)}
          />
        </>
      )}

      {/* Main content area */}
      <main
        className="transition-[margin] duration-200 pb-20 md:pb-0"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-[var(--background)]/80 backdrop-blur-sm border-b border-[var(--card-border)] px-4 py-2 flex items-center justify-end gap-2">
          <SyncStatusIndicator />
        </div>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <NotificationSettings isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <HealthIntegrations isOpen={healthOpen} onClose={() => setHealthOpen(false)} />
    </div>
  );
}
