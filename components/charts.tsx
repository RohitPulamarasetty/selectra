"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { distribution } from "@/lib/metrics";

const textStyle = { fontSize: 10, fill: "#54645a" };
const dimension = { width: 240, height: 150 };

export function ActivityChart({ points }: { points: { day: string; reviews: number }[] }) {
  return <div className="chart-box chart-box-compact" role="img" aria-label={points.map((p) => `${p.day}: ${p.reviews} submissions`).join(", ")}>
    <ResponsiveContainer initialDimension={dimension}>
      <AreaChart data={points} margin={{ top: 6, left: 0, right: 14, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#ded0b6" strokeDasharray="3 4" />
        <XAxis dataKey="day" tick={textStyle} tickLine={false} axisLine={false} minTickGap={21} />
        <YAxis width={31} allowDecimals={false} axisLine={false} tickLine={false} tick={textStyle} />
        <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="chart-tooltip"><strong>{label}</strong>{payload[0].value} submitted</div> : null} />
        <Area type="monotone" dataKey="reviews" stroke="#2c6259" strokeWidth={2.2} fill="#dde9dd" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}

export function StatusChart({ points }: { points: { name: string; value: number; fill: string }[] }) {
  const total = points.reduce((sum, item) => sum + item.value, 0);
  return <div className="eligibility-wrap">
    <div className="eligibility-chart" aria-hidden="true">
      <ResponsiveContainer initialDimension={{ width: 142, height: 142 }}>
        <PieChart><Pie data={total ? points.filter((point) => point.value > 0) : [{ value: 1, fill: "#ebe5d7" }]} dataKey="value"
          nameKey="name" innerRadius={48} outerRadius={61} paddingAngle={total ? 2 : 0} strokeWidth={0} isAnimationActive={false} startAngle={90} endAngle={-270} /></PieChart>
      </ResponsiveContainer>
      <div className="donut-label"><strong>{total}</strong>Applications</div>
    </div>
    <div className="legend-list">{points.map((item) => <div className="legend-row" key={item.name}><i style={{ background: item.fill }} />{item.name}<b>{item.value}</b></div>)}</div>
  </div>;
}

export function ScoreChart({ values }: { values: number[] }) {
  const points = distribution(values);
  return <div className="chart-box chart-box-compact" role="img" aria-label={points.map((p) => `${p.label}: ${p.count}`).join(", ")}>
    <ResponsiveContainer initialDimension={dimension}>
      <BarChart data={points} margin={{ top: 6, left: 0, right: 6, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#ded0b6" strokeDasharray="3 4" />
        <XAxis dataKey="label" tick={textStyle} tickLine={false} axisLine={false} minTickGap={7} />
        <YAxis width={30} allowDecimals={false} axisLine={false} tickLine={false} tick={textStyle} />
        <Tooltip cursor={{ fill: "#f1ecdd" }} content={({ active, payload, label }) => active && payload?.length ? <div className="chart-tooltip"><strong>{label}</strong>{payload[0].value} scores</div> : null} />
        <Bar dataKey="count" fill="#a97c48" radius={[4, 4, 0, 0]} maxBarSize={31} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

