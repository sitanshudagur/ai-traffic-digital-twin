export default function SectionHeader({ eyebrow, heading, description, badge }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#7E7E7E]">
          {eyebrow}
        </p>
        <h2 className="mt-2 max-w-2xl text-[28px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#FFFFFF] sm:text-[32px]">
          {heading}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#B8B8B8]">
            {description}
          </p>
        )}
      </div>
      {badge && (
        <span className="inline-flex items-center rounded-full bg-[#111111] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#4E8CFF]">
          {badge}
        </span>
      )}
    </div>
  );
}
