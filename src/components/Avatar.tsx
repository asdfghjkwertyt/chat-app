"use client";

interface AvatarProps {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: string;
  className?: string;
}

const sizeClasses = {
  xs: "w-7 h-7 text-[10px]",
  sm: "w-9 h-9 text-xs",
  md: "w-11 h-11 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-20 h-20 text-2xl",
};

const statusSizes = {
  xs: "w-2 h-2 border",
  sm: "w-2.5 h-2.5 border-[1.5px]",
  md: "w-3 h-3 border-2",
  lg: "w-3.5 h-3.5 border-2",
  xl: "w-4 h-4 border-[3px]",
};

const statusColors: Record<string, string> = {
  online: "bg-emerald-400 glow-green",
  away: "bg-amber-400",
  busy: "bg-rose-400",
  offline: "bg-surface-500",
};

const gradients = [
  "from-indigo-500 to-purple-600",
  "from-violet-500 to-fuchsia-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-rose-600",
  "from-teal-500 to-cyan-600",
  "from-blue-500 to-violet-600",
];

function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Avatar({
  name,
  size = "md",
  status,
  className = "",
}: AvatarProps) {
  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size]} bg-gradient-to-br ${getGradient(name)} rounded-full flex items-center justify-center font-bold text-white shadow-lg`}
      >
        {getInitials(name)}
      </div>
      {status && (
        <div
          className={`absolute -bottom-0.5 -right-0.5 ${statusSizes[size]} ${statusColors[status] || statusColors.offline} rounded-full border-surface-900`}
        />
      )}
    </div>
  );
}
