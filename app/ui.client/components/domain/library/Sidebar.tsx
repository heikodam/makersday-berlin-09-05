export function Sidebar(): React.JSX.Element {
  return (
    <aside className="w-[220px] flex-shrink-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col py-md px-sm gap-xs">
      <div className="flex items-center gap-sm px-sm py-xs mb-md">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_stories
          </span>
        </div>
        <div>
          <p className="text-title-sm font-title-sm text-on-surface m-0 leading-tight">Scholastic AI</p>
          <p className="text-body-sm font-body-sm text-on-surface-variant m-0 text-[11px]">Digital Library</p>
        </div>
      </div>

      <nav className="flex flex-col gap-xs">
        <a
          href="/library"
          className="flex items-center gap-sm px-sm py-xs rounded-lg bg-secondary-container text-on-secondary-container text-body-md font-body-md"
          aria-current="page"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1" }}>
            local_library
          </span>
          Library
        </a>

        <a
          href="#"
          className="flex items-center gap-sm px-sm py-xs rounded-lg text-on-surface-variant text-body-md font-body-md opacity-40 cursor-not-allowed"
          aria-disabled="true"
          tabIndex={-1}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chat</span>
          Chat
        </a>

        <a
          href="#"
          className="flex items-center gap-sm px-sm py-xs rounded-lg text-on-surface-variant text-body-md font-body-md opacity-40 cursor-not-allowed"
          aria-disabled="true"
          tabIndex={-1}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">history</span>
          History
        </a>
      </nav>
    </aside>
  );
}
