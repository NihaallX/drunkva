"use client";

import { ChevronLeft } from "lucide-react";
import type { FullInfoSelectedStats } from "@/components/drunkva/ShareOverlay/ShareOverlayFullInfo";

interface FullInfoStatPickerProps {
  selectedStats: FullInfoSelectedStats;
  onChange: (next: FullInfoSelectedStats) => void;
  onBack: () => void;
  onGenerate: () => void;
}

type OptionalStatKey = keyof FullInfoSelectedStats;

const OPTIONAL_GROUPS: Array<{
  label: string;
  items: Array<{ key: OptionalStatKey; title: string; description: string }>;
}> = [
  {
    label: "SESSION",
    items: [
      {
        key: "duration",
        title: "Duration",
        description: "Total time from first to last drink",
      },
      {
        key: "activeDuration",
        title: "Active Duration",
        description: "Time spent actually drinking (gaps capped)",
      },
      {
        key: "drinkBreakdown",
        title: "Drink Breakdown",
        description: "Per-type count: beer, shots, wine, etc.",
      },
      {
        key: "confidenceGraph",
        title: "Confidence Graph",
        description: "Visual chart of your session curve",
      },
    ],
  },
  {
    label: "RECORDS",
    items: [
      {
        key: "personalBests",
        title: "Personal Bests",
        description: "Any PRs you set tonight",
      },
    ],
  },
  {
    label: "EXTRAS",
    items: [
      {
        key: "washroomCount",
        title: "Washroom Breaks",
        description: "Number of washroom visits logged",
      },
      {
        key: "burpCount",
        title: "Burp Count",
        description: "Number of burps logged (yes, really)",
      },
      {
        key: "chaknaLevel",
        title: "Chakna Level",
        description: "How much food you had: none / light / heavy",
      },
    ],
  },
  {
    label: "SOCIAL",
    items: [
      {
        key: "witnesses",
        title: "Witnesses",
        description: "People who confirmed your session",
      },
      {
        key: "venue",
        title: "Venue",
        description: "Where you were drinking",
      },
      {
        key: "sessionTitle",
        title: "Session Title",
        description: "The AI-generated title of the night",
      },
    ],
  },
];

const CORE_ITEMS: Array<{ title: string; description: string }> = [
  {
    title: "Peak Confidence",
    description: "Your highest confidence % of the night",
  },
  {
    title: "Confidence Stage",
    description: "Which stage you peaked at",
  },
  {
    title: "Total Drinks",
    description: "How many drinks you logged",
  },
];

function Checkbox({ checked, locked }: { checked: boolean; locked?: boolean }) {
  if (locked) {
    return (
      <div className="flex size-5 items-center justify-center rounded-md border-[0.5px] border-[#3a3a3a] bg-[#1f1f1f] text-[12px] text-[#666]">
        {"\u2713"}
      </div>
    );
  }

  if (checked) {
    return (
      <div className="flex size-5 items-center justify-center rounded-md bg-[#f97316] text-[12px] font-bold text-white">
        {"\u2713"}
      </div>
    );
  }

  return <div className="size-5 rounded-md border-[0.5px] border-[#333] bg-[#1e1e1e]" />;
}

function OptionalRow({
  title,
  description,
  checked,
  onToggle,
}: {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-[14px] border-[0.5px] border-[#1e1e1e] bg-[#111] px-3.5 py-3 text-left transition-colors hover:bg-[#151515]"
    >
      <div className="pr-3">
        <div className="text-[14px] font-semibold text-white">{title}</div>
        <div className="mt-1 text-[12px] text-[#555]">{description}</div>
      </div>
      <Checkbox checked={checked} />
    </button>
  );
}

function CoreRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex w-full items-center justify-between rounded-[14px] border-[0.5px] border-[#1e1e1e] bg-[#101010] px-3.5 py-3">
      <div className="pr-3">
        <div className="text-[14px] font-semibold text-[#c7c7c7]">{title}</div>
        <div className="mt-1 text-[12px] text-[#555]">{description}</div>
      </div>
      <Checkbox checked locked />
    </div>
  );
}

export function FullInfoStatPicker({ selectedStats, onChange, onBack, onGenerate }: FullInfoStatPickerProps) {
  const toggle = (key: OptionalStatKey) => {
    onChange({ ...selectedStats, [key]: !selectedStats[key] });
  };

  return (
    <div className="mx-auto w-full max-w-[390px]">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex size-8 items-center justify-center rounded-full border-[0.5px] border-[#222] bg-[#111] text-[#aaa]"
          aria-label="Back to templates"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div>
          <h2 className="text-[18px] font-semibold text-white">Customise your card</h2>
          <p className="mt-1 text-[12px] text-[#555]">Choose what to show on your Full Info card</p>
        </div>
      </div>

      <div className="max-h-[62dvh] space-y-4 overflow-y-auto pr-1">
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-[#333]">CORE</div>
          <div className="space-y-2">
            {CORE_ITEMS.map((item) => (
              <CoreRow key={item.title} title={item.title} description={item.description} />
            ))}
          </div>
        </div>

        {OPTIONAL_GROUPS.map((group) => (
          <div key={group.label} className="border-t-[0.5px] border-[#1a1a1a] pt-4">
            <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-[#333]">{group.label}</div>
            <div className="space-y-2">
              {group.items.map((item) => (
                <OptionalRow
                  key={item.key}
                  title={item.title}
                  description={item.description}
                  checked={selectedStats[item.key]}
                  onToggle={() => toggle(item.key)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        id="full-info-generate-card-btn"
        type="button"
        onClick={onGenerate}
        className="simple-auth-btn mt-5 h-12 w-full rounded-xl bg-[#f97316] text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
      >
        Generate card
        <span className="btn-arrow" aria-hidden="true">
          {"\u2192"}
        </span>
      </button>
    </div>
  );
}
