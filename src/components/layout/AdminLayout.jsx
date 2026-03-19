import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-bg-dark">

      {/* Overlay — mobile uniquement, ferme la sidebar au clic */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header mobile avec bouton hamburger — masqué sur desktop (lg+) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shadow-primary/30">
              <span className="material-symbols-outlined text-base filled">shield_person</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">AUTH-BADGE CM14</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Administration OMC</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
