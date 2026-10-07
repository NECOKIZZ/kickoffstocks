// App chrome helpers. The app's navigation is the sidebar (src/web/components/AppSidebar.tsx).

export function AnnouncementBar({ children }: { children: React.ReactNode }) {
  return <div className="bg-brand-ink py-2.5 text-center font-clash text-[13px] text-brand-paper/80">{children}</div>;
}
