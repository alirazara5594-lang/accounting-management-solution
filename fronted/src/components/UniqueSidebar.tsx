import React, { useState, useEffect, useMemo } from 'react';
import { NAVIGATION, type NavGroup } from '../navigation';
import type { UserData } from '../Login';
import {
  ChevronRight,
  LogOut,
  ChevronLeft,
  LayoutGrid,
  ExternalLink,
  X,
} from 'lucide-react';
import AmsLogo from './AmsLogo';
import './UniqueSidebar.css';

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
  modules: string[];
  currentUser: UserData;
  onLogout: () => void;
  moduleBadgeCounts?: Record<string, number>;
}

interface SectionCategory {
  id: string;
  title: string;
  moduleIds: string[];
}

const SECTION_CATEGORIES: SectionCategory[] = [
  {
    id: 'financials',
    title: 'Financials',
    moduleIds: ['overview', 'sales', 'procurement', 'banking', 'accounting']
  },
  {
    id: 'operations',
    title: 'Operations',
    moduleIds: ['assets', 'manufacturing', 'payroll', 'field', 'projects']
  },
  {
    id: 'governance',
    title: 'Governance & AI',
    moduleIds: ['compliance', 'analytics', 'administration']
  }
];

interface QuickActionConfig {
  primaryLabel: string;
  primaryTarget: string;
  tag: string;
}

const MODULE_QUICK_ACTIONS: Record<string, QuickActionConfig> = {
  Sales: {
    primaryLabel: '＋ New Invoice',
    primaryTarget: 'Invoices',
    tag: 'IFRS 15 · Revenue Sync',
  },
  Procurement: {
    primaryLabel: '＋ New Purchase Order',
    primaryTarget: 'Purchase Orders',
    tag: '3-Way Match Active',
  },
  Banking: {
    primaryLabel: '＋ Record Payment',
    primaryTarget: 'Bank Accounts',
    tag: 'Multi-Currency Real-time',
  },
  Accounting: {
    primaryLabel: '＋ New Journal Entry',
    primaryTarget: 'Journal Entries',
    tag: 'Double-Entry Audit Ready',
  },
  Assets: {
    primaryLabel: '＋ Add Fixed Asset',
    primaryTarget: 'Fixed Assets',
    tag: 'IAS 16 · Depreciation',
  },
  Manufacturing: {
    primaryLabel: '＋ New Production Order',
    primaryTarget: 'Production Orders',
    tag: 'Job Costing Active',
  },
  Payroll: {
    primaryLabel: '＋ Run Payroll',
    primaryTarget: 'Run Payroll',
    tag: 'Tax & Salary Engine',
  },
  Field: {
    primaryLabel: '＋ New Survey Job',
    primaryTarget: 'Survey Jobs',
    tag: 'Field GPS Sync',
  },
  Projects: {
    primaryLabel: '＋ New Project',
    primaryTarget: 'Projects',
    tag: 'WBS & Budget Control',
  },
  Compliance: {
    primaryLabel: '＋ Tax Filing',
    primaryTarget: 'VAT / Sales Tax',
    tag: 'ZATCA / FBR / HMRC',
  },
  Analytics: {
    primaryLabel: '＋ AI Ledger Audit',
    primaryTarget: 'Summary',
    tag: 'Live Intelligent Insights',
  },
  Administration: {
    primaryLabel: '＋ Invite User',
    primaryTarget: 'Users & Roles',
    tag: 'Role Access Control',
  },
};

export default function UniqueSidebar({
  activePage,
  onNavigate,
  modules,
  currentUser,
  onLogout,
  moduleBadgeCounts,
}: Props) {
  const [isSecondaryOpen, setIsSecondaryOpen] = useState<boolean>(false);
  const [panelTop, setPanelTop] = useState<number>(14);
  const panelRef = React.useRef<HTMLElement | null>(null);

  const activeGroupName = useMemo(() => {
    return activePage.split('.')[0] || 'Overview';
  }, [activePage]);

  const activeGroup = useMemo(() => {
    return NAVIGATION.find((g) => g.name === activeGroupName) || null;
  }, [activeGroupName]);

  const showSecondary = activeGroupName !== 'Overview' && Boolean(activeGroup) && isSecondaryOpen;

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', '205px');
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--subpanel-width', showSecondary ? '235px' : '0px');
  }, [showSecondary]);

  // Viewport Boundary Guard: Ensure card never touches the bottom border of screen
  useEffect(() => {
    if (showSecondary && panelRef.current) {
      const actualHeight = panelRef.current.offsetHeight;
      const bottomSafeMargin = 75; // Generous space above bottom border
      const maxTop = Math.max(16, window.innerHeight - actualHeight - bottomSafeMargin);
      if (panelTop > maxTop) {
        setPanelTop(maxTop);
      }
    }
  }, [showSecondary, activeGroupName, panelTop]);

  const enabledGroups = useMemo(() => {
    return NAVIGATION.filter(
      (group) => !modules || modules.length === 0 || modules.includes(group.moduleId)
    );
  }, [modules]);

  // Position in Front of Clicked Module with generous viewport breathing room
  const handleModuleClick = (e: React.MouseEvent<HTMLButtonElement>, group: NavGroup) => {
    if (group.name === 'Overview') {
      setIsSecondaryOpen(false);
      onNavigate('Overview.Overview');
      return;
    }

    // If clicking the active module and panel is already open -> TOGGLE CLOSE IT
    if (activeGroupName === group.name && isSecondaryOpen) {
      setIsSecondaryOpen(false);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    // Accurate height calculation: Header (58px) + Lead (38px) + items (36px each) + padding (20px)
    const estimatedHeight = 58 + 38 + (group.items.length * 36) + 20;
    const bottomSafeMargin = 75;
    const maxTop = Math.max(16, window.innerHeight - estimatedHeight - bottomSafeMargin);
    const calculatedTop = Math.max(16, Math.min(rect.top - 6, maxTop));
    setPanelTop(calculatedTop);

    setIsSecondaryOpen(true);
    if (!activePage.startsWith(group.name + '.')) {
      onNavigate(`${group.name}.Summary`);
    }
  };

  const handleSubItemClick = (groupName: string, item: string) => {
    setIsSecondaryOpen(false);
    if (item === 'Summary' || item === 'Dashboard') {
      onNavigate(`${groupName}.Summary`);
    } else {
      onNavigate(`${groupName}.${item}`);
    }
  };

  return (
    <>
      {/* ══ Primary Column (Main Modules Sidebar) ══ */}
      <aside className="unique-sidebar expanded">
        {/* Brand Header with Custom AMS Logo */}
        <div className="unique-brand-header">
          <div
            className="unique-brand-logo"
            onClick={() => onNavigate('Overview.Overview')}
            title="AMS Accounting Management Solutions"
          >
            <AmsLogo variant="sidebar" height={36} />
          </div>
        </div>

        {/* Navigation Groups by Category */}
        <nav className="unique-nav-scroll">
          {SECTION_CATEGORIES.map((category) => {
            const categoryGroups = enabledGroups.filter((g) =>
              category.moduleIds.includes(g.moduleId)
            );
            if (categoryGroups.length === 0) return null;

            return (
              <div key={category.id} className="unique-nav-section">
                <div className="unique-section-title">{category.title}</div>

                <div className="unique-section-items">
                  {categoryGroups.map((group) => {
                    const isActive = activeGroupName === group.name;
                    const Icon = group.icon;
                    const badgeCount = moduleBadgeCounts?.[group.moduleId];

                    return (
                      <div key={group.moduleId} className="unique-item-wrap">
                        <button
                          className={`unique-nav-btn ${isActive ? 'active' : ''} ${isActive && isSecondaryOpen ? 'secondary-open' : ''}`}
                          onClick={(e) => handleModuleClick(e, group)}
                        >
                          <div className="unique-icon-box">
                            <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                          </div>

                          <span className="unique-item-label">{group.label}</span>
                          {badgeCount ? (
                            <span className="unique-badge">{badgeCount}</span>
                          ) : (
                            <ChevronRight
                              size={12}
                              className={`unique-item-arrow ${isActive && isSecondaryOpen ? 'rotated' : ''}`}
                            />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Profile & Logout Footer */}
        <div className="unique-sidebar-footer">
          <div className="unique-user-card">
            <div className="unique-user-avatar">
              {currentUser?.avatar || 'MA'}
            </div>
            <div className="unique-user-info">
              <span className="unique-user-name" title={currentUser?.fullName || 'Muhammad Ali'}>
                {currentUser?.fullName || 'Muhammad Ali'}
              </span>
              <span className="unique-user-role">
                {currentUser?.role || 'Finance admin'}
              </span>
            </div>
            <button
              className="unique-user-logout-btn"
              onClick={onLogout}
              title="Sign out of AMS ERP"
            >
              <LogOut size={13} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </aside>

      {/* ══ Option A: Auto-Fit Height Submodule Card in Front of Module ══ */}
      {activeGroupName !== 'Overview' && activeGroup && (
        <aside
          ref={panelRef}
          className={`unique-secondary-panel option-a ${showSecondary ? 'open' : 'closed'}`}
          style={{ top: `${panelTop}px` }}
        >
          {/* Panel Header with X Close Button */}
          <div className="secondary-panel-header">
            <div className="secondary-badge">
              <activeGroup.icon size={16} strokeWidth={2.2} />
            </div>
            <div className="secondary-title-wrap">
              <h4 className="secondary-title">{activeGroup.label}</h4>
              <span className="secondary-subtitle">{activeGroup.items.length} Sub-Modules</span>
            </div>
            <button
              className="secondary-close-btn"
              onClick={() => setIsSecondaryOpen(false)}
              title="Close submodules panel (✕)"
            >
              <X size={14} />
            </button>
          </div>

          {/* Submodule Items Navigation (Auto-Fit Height, Zero Scroll) */}
          <div className="secondary-nav-scroll">
            {/* Dashboard Summary Lead Action */}
            <button
              className={`secondary-sub-item secondary-lead-item ${activePage === `${activeGroup.name}.Summary` ? 'active' : ''}`}
              onClick={() => handleSubItemClick(activeGroup.name, 'Summary')}
            >
              <LayoutGrid size={14} className="sub-icon" />
              <span className="secondary-sub-text">Dashboard Summary</span>
              <ExternalLink size={11} style={{ marginLeft: 'auto', opacity: 0.55 }} />
            </button>

            {/* Sub-Items List */}
            <div className="secondary-items-list">
              {activeGroup.items.map((item) => {
                const itemKey = `${activeGroup.name}.${item}`;
                const isItemActive = activePage === itemKey;

                return (
                  <button
                    key={item}
                    className={`secondary-sub-item ${isItemActive ? 'active' : ''}`}
                    onClick={() => handleSubItemClick(activeGroup.name, item)}
                  >
                    <span className="secondary-bullet">•</span>
                    <span className="secondary-sub-text">{item}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
