import { forwardRef } from "react";

const Dashboard = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref}>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-1">Visão geral do seu negócio imobiliário.</p>
    </div>
  );
});

Dashboard.displayName = "Dashboard";

export default Dashboard;
