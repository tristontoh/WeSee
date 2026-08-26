/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, Bell, MessageSquare, Activity, Sparkles } from 'lucide-react';

interface TopBarSearchProps {
  title?: string;
  onSearch?: (value: string) => void;
  onNotificationClick?: () => void;
  onChatClick?: () => void;
  onActivityClick?: () => void;
  searchValue?: string;
}

export default function TopBarSearch({
  title = 'Dashboard',
  onSearch,
  onNotificationClick,
  onChatClick,
  onActivityClick,
  searchValue = '',
}: TopBarSearchProps) {
  const [value, setValue] = React.useState(searchValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  return (
    <header className="w-full flex items-center justify-between py-4 px-6 bg-white/80 backdrop-blur-md border-b border-navy-100/60 sticky top-0 z-30 font-sans">
      {/* Page Title */}
      <div className="flex items-center space-x-2">
        <h1 className="text-xl font-semibold tracking-tight text-navy-900">
          {title}
        </h1>
      </div>

      {/* Search Input & Action Icons */}
      <div className="flex items-center space-x-4 max-w-lg w-full justify-end">
        {/* Ask AI Search Input */}
        <div className="relative w-full max-w-xs md:max-w-sm group">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-navy-400 group-focus-within:text-primary-500 transition-colors">
            <Sparkles className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Ask AI or search..."
            value={value}
            onChange={handleChange}
            className="w-full pl-10 pr-12 py-2 text-sm text-navy-800 bg-navy-50 border border-navy-100/50 hover:bg-navy-50/80 focus:bg-white rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-150 shadow-sm"
          />
          <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-sans font-medium text-navy-400 bg-white border border-navy-200 rounded-md shadow-sm">
              ⌘A
            </kbd>
          </div>
        </div>

        {/* Small Circular Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Notifications Button */}
          <button
            onClick={onNotificationClick}
            className="p-2 text-navy-500 hover:text-navy-800 bg-navy-50 hover:bg-navy-100 rounded-full transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full border border-white" />
          </button>

          {/* Chat Button */}
          <button
            onClick={onChatClick}
            className="p-2 text-navy-500 hover:text-navy-800 bg-navy-50 hover:bg-navy-100 rounded-full transition-colors cursor-pointer"
            aria-label="Chat with AI"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Activity Logs Button */}
          <button
            onClick={onActivityClick}
            className="p-2 text-navy-500 hover:text-navy-800 bg-navy-50 hover:bg-navy-100 rounded-full transition-colors cursor-pointer"
            aria-label="Activity logs"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
