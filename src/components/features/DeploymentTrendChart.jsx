import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export const DeploymentTrendChart = ({ deployments }) => {
  const data = useMemo(() => {
    const weeks = {};
    function getWeekNumber(d) {
      const onejan = new Date(d.getFullYear(), 0, 1);
      return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    }
    // Generate last 8 weeks keys
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const key = `Wk ${getWeekNumber(d)}`;
      weeks[key] = 0;
    }

    deployments.forEach(d => {
      if (!d.createdAt) return;
      const date = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
      const key = `Wk ${getWeekNumber(date)}`;
      if (weeks[key] !== undefined) weeks[key]++;
    });

    return Object.entries(weeks).map(([name, value]) => ({ name, value }));
  }, [deployments]);

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} allowDecimals={false} />
          <RechartsTooltip cursor={{stroke: '#3b82f6', strokeWidth: 2}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
