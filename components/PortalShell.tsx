import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function PortalShell({ children, name, company }: { children: React.ReactNode; name: string; company: string }) {
  return (
    <div className="app-shell">
      <Sidebar companyName={company}/>
      <div className="main-area">
        <Topbar name={name} company={company}/>
        {children}
      </div>
    </div>
  )
}
