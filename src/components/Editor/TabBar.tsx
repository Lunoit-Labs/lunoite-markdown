import React from 'react';
import { OpenTab } from '../../types/workspace';
import { FileText, X } from 'lucide-react';

interface TabBarProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}) => {
  if (tabs.length === 0) return null;

  return (
    <div
      className="flex items-center justify-between border-b border-[#e5e3dc] dark:border-[#282b33] bg-[#f8f7f4] dark:bg-[#111215] select-none text-xs"
      role="tablist"
      aria-label="Open documents"
    >
      <div className="flex items-center overflow-x-auto min-w-0">
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`group relative flex items-center gap-2 px-3.5 py-2 border-r border-[#e5e3dc] dark:border-[#282b33] cursor-pointer transition-colors max-w-[200px] shrink-0 ${
              isActive
                ? 'bg-[#ffffff] dark:bg-[#17191e] text-[#191b1f] dark:text-[#eceef2] font-medium border-t-2 border-t-[#2d6a4f] dark:border-t-[#52b788]'
                : 'text-[#59606d] dark:text-[#9ba2b0] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            role="tab"
            aria-selected={isActive}
            title={tab.path}
          >
            <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#2d6a4f] dark:text-[#52b788]' : ''}`} />
            <span className="truncate text-xs">{tab.name}</span>

            {/* Dirty Indicator or Close Button */}
            <div className="flex items-center ml-1">
              {tab.isDirty && (
                <span
                  className="w-2 h-2 rounded-full bg-[#2d6a4f] dark:bg-[#52b788] group-hover:hidden shrink-0"
                  title="Unsaved changes"
                />
              )}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={`p-0.5 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/10 dark:hover:bg-white/10 ${
                  tab.isDirty ? 'hidden group-hover:inline-flex' : 'inline-flex'
                }`}
                title="Close tab"
                aria-label={`Close tab ${tab.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};
