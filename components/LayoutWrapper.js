"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function LayoutWrapper({ children, title, subtitle, actions }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`app-frame ${isCollapsed ? "nav-collapsed" : ""}`}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((value) => !value)}
      />
      <div className="workspace-column">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          subtitle={subtitle}
          actions={actions}
        />
        <main className="workspace-main">
          <div className="workspace-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
