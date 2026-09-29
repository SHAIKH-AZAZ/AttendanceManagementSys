'use client';

import type { MouseEvent } from 'react';
import { LogOut } from 'lucide-react';
import type { AcademicMeta, User } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { initials, ROLE_LABELS } from '@/lib/client';
import { Button, cn } from '@/components/ui';

export interface NavItem {
  id: string;
  label: string;
}

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={cn(
          'grid size-8 place-items-center rounded-md font-serif text-lg leading-none font-semibold',
          inverted ? 'bg-white text-brand-800' : 'bg-brand-700 text-white'
        )}
      >
        A
      </span>
      <span className={cn('font-serif text-lg font-semibold tracking-tight', inverted ? 'text-white' : 'text-slate-900')}>
        AttendEASE365
      </span>
    </span>
  );
}

export function Navbar({
  user,
  meta,
  items,
  active,
  onNavigate,
}: {
  user: User;
  meta?: AcademicMeta;
  items: NavItem[];
  active: string;
  onNavigate: (id: string) => void;
}) {
  const { logout } = useAuth();
  const campus = meta?.campuses.find((c) => c.id === user.campusId);
  const department = meta?.departments.find((d) => d.id === user.departmentId);
  const term = meta?.trimesters.find((t) => t.status === 'ACTIVE');

  const handleNav = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    // Let modified clicks open the view in a new tab.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(id);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />
        {(department || campus) && (
          <div className="hidden min-w-0 border-l border-slate-200 pl-4 md:block">
            <p className="truncate text-sm font-medium text-slate-800">{department?.name ?? campus?.name}</p>
            <p className="truncate text-xs text-slate-500">
              {[department ? campus?.name : null, term?.name].filter(Boolean).join(', ')}
            </p>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{user.fullName}</p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
          </div>
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-800 ring-1 ring-brand-200"
          >
            {initials(user.fullName)}
          </span>
          <Button variant="secondary" size="sm" onClick={logout}>
            <LogOut aria-hidden />
            <span className="sr-only sm:not-sr-only">Sign out</span>
          </Button>
        </div>
      </div>
      <nav aria-label="Sections" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="-mx-3 -mb-px flex overflow-x-auto">
          {items.map((item) => {
            const isActive = item.id === active;
            return (
              <li key={item.id}>
                <a
                  href={`?view=${item.id}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(event) => handleNav(event, item.id)}
                  className={cn(
                    'inline-flex h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'border-brand-700 text-brand-800'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  )}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
