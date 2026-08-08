import { MapPin } from 'lucide-react';

const statusColor = {
  free: 'text-[#2DD36F]',
  moderate: 'text-[#FFD43B]',
  heavy: 'text-[#FF922B]',
  severe: 'text-[#FF4D4F]',
  unknown: 'text-[#FFFFFF]',
};

function getStatusColor(status) {
  return statusColor[status?.toLowerCase()] ?? statusColor.unknown;
}

export default function CongestionPrediction({ prediction }) {
  const hasPrediction = Boolean(prediction && (prediction.current || prediction.forecast30 || prediction.forecast60));
  const junctionId = prediction?.junctionId ?? prediction?.roadId ?? 'Unknown location';
  const approach = prediction?.approach;
  const current = prediction?.current ?? 'Unknown';
  const forecast30 = prediction?.forecast30 ?? 'Unknown';
  const forecast60 = prediction?.forecast60 ?? 'Unknown';
  const expectedQueue = prediction?.expectedQueue;

  const stages = [
    {
      key: 'current',
      label: 'Current condition',
      state: current,
      detail: expectedQueue != null ? `${expectedQueue} vehicles` : null,
      note: approach ? `Approach ${approach}` : null,
    },
    {
      key: 'forecast30',
      label: '+30 sec',
      state: forecast30,
    },
    {
      key: 'forecast60',
      label: '+60 sec',
      state: forecast60,
    },
  ];

  return (
    <section id="prediction" className="section-anchor mb-20 py-8 lg:mb-20 lg:py-10">
      <div className="space-y-3">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#7E7E7E]">CONGESTION PREDICTION</p>
          <h3 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-[#FFFFFF] sm:text-[32px]">
            Near-future traffic forecast
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#B8B8B8]">
            Current traffic conditions are used to estimate near-future congestion at the selected junction.
          </p>
          <p className="mt-2 text-[11px] text-[#7E7E7E]">
            <MapPin className="mr-2 inline h-4 w-4 text-[#4E8CFF]" />ML FORECAST · Selected Junction {junctionId}
          </p>
        </div>

        {hasPrediction ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {stages.map((stage) => (
              <div key={stage.key} className="flex h-auto sm:h-[240px] flex-col justify-between rounded-[20px] border border-[#252D3A] bg-[#111111] px-4 py-3">
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#7E7E7E]">{stage.label}</p>

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#7E7E7E]">Junction</p>
                    <p className="text-lg font-semibold text-[#FFFFFF]">{junctionId}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#7E7E7E]">Condition</p>
                    <p className={`text-2xl font-semibold ${getStatusColor(stage.state)}`}>{stage.state}</p>
                  </div>

                  {stage.detail && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-[#7E7E7E]">Expected queue</p>
                      <p className="text-sm font-semibold text-[#FFFFFF]">{stage.detail}</p>
                    </div>
                  )}
                </div>
                {stage.note ? <p className="text-sm text-[#7E7E7E]">{stage.note}</p> : <div className="h-4" />}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] border border-[#252D3A] bg-[#111111] px-5 py-4">
            <p className="text-sm font-semibold text-[#FFFFFF]">Awaiting prediction data</p>
            <p className="mt-2 text-sm leading-6 text-[#7E7E7E]">
              No short-term forecast is available at the moment. The section will update when prediction data arrives.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
