export default function PMLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      overflow: 'auto',
      zIndex: 9999,
      WebkitUserSelect: 'auto',
      userSelect: 'auto',
    }}>
      {children}
    </div>
  )
}
