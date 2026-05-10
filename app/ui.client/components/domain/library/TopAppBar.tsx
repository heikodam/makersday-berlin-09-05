export function TopAppBar(): React.JSX.Element {
  return (
    <header className="h-14 bg-surface-container-lowest border-b border-outline-variant flex items-center px-md gap-md">
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-sm flex items-center pointer-events-none text-outline">
          <span className="material-symbols-outlined text-[20px]">search</span>
        </div>
        <input
          className="w-full max-w-md bg-surface-container rounded-full py-xs pr-sm pl-xl text-body-md font-body-md text-on-surface placeholder:text-outline cursor-not-allowed opacity-50"
          placeholder="Search documents..."
          disabled
          aria-label="Search documents"
        />
      </div>

      <div className="flex items-center gap-sm">
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
          aria-label="Notifications"
          disabled
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
        </button>
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
          aria-label="Settings"
          disabled
        >
          <span className="material-symbols-outlined text-[22px]">settings</span>
        </button>
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-on-secondary text-label-caps font-label-caps">
          U
        </div>
      </div>
    </header>
  );
}
