import { Activity, Cpu, Radio, Satellite, TimerReset, Wifi } from 'lucide-react';

export default function SystemStatusStrip({ isRunning, mode, signalsOnline = 4, connectedVehicles = 152, updateRate = '1 sec' }) {
  const items = [
    {
      label: 'Simulation',
      value: isRunning ? 'LIVE' : 'PAUSED',
      icon: Activity,
      accent: isRunning ? 'text-traffic-free' : 'text-[#7E7E7E]',
    },
    {
      label: 'AI Controller',
      value: mode === 'optimized' ? 'ACTIVE' : 'STANDBY',
      icon: Cpu,
      accent: mode === 'optimized' ? 'text-[#4E8CFF]' : 'text-[#7E7E7E]',
    },
    {
      label: 'Network Health',
      value: 'GOOD',
      icon: Satellite,
      accent: 'text-traffic-free',
    },
    {
      label: 'Signals Online',
      value: `${signalsOnline}/4`,
      icon: Radio,
      accent: 'text-[#FFFFFF]',
    },
    {
      label: 'Connected Vehicles',
      value: connectedVehicles.toString(),
      icon: Wifi,
      accent: 'text-[#FFFFFF]',
    },
    {
      label: 'Update Rate',
      value: updateRate,
      icon: TimerReset,
      accent: 'text-[#FFFFFF]',
    },
  ];

  return (
    <div className="flex h-[44px] min-w-0 items-center overflow-x-auto rounded-[22px] border border-white/10 bg-[#111111]/95 px-3 py-2 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3 divide-x divide-white/10">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex shrink-0 items-center gap-2 px-2 last:px-0">
              <Icon className={`h-3.5 w-3.5 ${item.accent}`} />
              <span className="text-[10px] uppercase tracking-[0.22em] text-[#7E7E7E]">
                {item.label}
              </span>
              <span className="text-[11px] font-semibold text-[#FFFFFF]">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
