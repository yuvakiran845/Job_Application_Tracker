import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatBucket } from '../../utils/analytics';
import { pluralize } from '../../utils/format';

// Single series, so no legend box: the card title names what is plotted.
// Specs: bars <= 24px with a 4px rounded data-end, hairline solid gridlines,
// recessive axes, text in text colours (never the bar colour).
const BAR_COLOR = '#4f46e5'; // brand-600
const BAR_HOVER = '#4338ca'; // brand-700
const GRID = '#e2e8f0'; // slate-200
const AXIS_TEXT = '#64748b'; // slate-500

function ChartTooltip({ active, payload, granularity }) {
  if (!active || !payload?.length) return null;
  const { start, count } = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-slate-900">{formatBucket(start, granularity)}</p>
      <p className="mt-0.5 text-slate-600">{pluralize(count, 'application')}</p>
    </div>
  );
}

export function OverTimeChart({ data, granularity }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
        <XAxis
          dataKey="start"
          tickFormatter={(start) => formatBucket(start, granularity).replace('Week of ', '')}
          tick={{ fill: AXIS_TEXT, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: AXIS_TEXT, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ fill: '#f1f5f9' }}
          content={<ChartTooltip granularity={granularity} />}
          isAnimationActive={false}
        />
        <Bar
          dataKey="count"
          fill={BAR_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          activeBar={{ fill: BAR_HOVER }}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
