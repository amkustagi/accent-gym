const P: Record<string, JSX.Element> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z" />,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>,
  mic: <><rect x="9" y="3" width="6" height="11.5" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  play: <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  speaker: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /></>,
  refresh: <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5" />,
  download: <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M4.5 19.5h15" />,
  upload: <path d="M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5M4.5 19.5h15" />,
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4m-4 3.5h8M9.5 20.5 10 17h4l.5 3.5" />,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  book: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />,
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" />,
  swap: <path d="M7 4 3.5 7.5 7 11M3.5 7.5H17M17 20l3.5-3.5L17 13M20.5 16.5H7" />,
  blocks: <><rect x="3.5" y="14" width="17" height="6.5" rx="2" /><rect x="3.5" y="4" width="8" height="7" rx="2" /><rect x="13.5" y="4" width="7" height="7" rx="2" /></>,
  scissors: <><circle cx="6" cy="6.5" r="2.7" /><circle cx="6" cy="17.5" r="2.7" /><path d="M8.3 8 20 18.5M8.3 16 20 5.5" /></>,
  metronome: <path d="M9 3h6l4 18H5zM12 17l5-10M8 15h8" />,
  pause: <path d="M8.5 5v14M15.5 5v14" />,
  wave: <path d="M2 12h2l2-6 3 12 3-15 3 15 3-9 2 3h2" />,
  flame: <path d="M12 21.5a7 7 0 0 0 7-7c0-4.5-3.5-6.5-4-10.5-2.5 2-3 4.5-3 6.5-1-1-1.5-2-1.5-3.5C8 9 5 11 5 14.5a7 7 0 0 0 7 7z" />,
  sparkle: <path d="M12 3c.7 4.7 2.8 7 7.5 7.5-4.7.7-6.8 2.8-7.5 7.5-.7-4.7-2.8-6.8-7.5-7.5C9.2 10 11.3 7.7 12 3zM19 16.5c.3 1.6 1 2.3 2.5 2.5-1.6.3-2.2 1-2.5 2.5-.3-1.6-1-2.2-2.5-2.5 1.6-.3 2.2-1 2.5-2.5z" />,
  mouth: <><path d="M3 12c3-4 6-5 9-3 3-2 6-1 9 3-3 5-6 6.5-9 6.5S6 17 3 12z" /><path d="M3 12c5 2 13 2 18 0" /></>,
  bolt: <path d="M13.5 2.5 4.5 13.5H12l-1.5 8 9-11H12z" />,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>,
  ear: <path d="M7 9a5 5 0 1 1 10 0c0 3-2.5 4-3.5 6-.6 1.3-.8 3-2.5 4.5a3 3 0 0 1-4.5-1M10 9a2 2 0 1 1 4 0" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.8 3.8 5.8 3.8 9s-1.2 6.2-3.8 9c-2.6-2.8-3.8-5.8-3.8-9S9.4 5.8 12 3z" /></>,
  chat: <path d="M4 5.5h16v10H9l-4.5 4v-4H4z M8 9.5h8M8 12.5h5" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5" /></>,
  crown: <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 6.5 12 13l8.5-6.5" /></>,
  message: <path d="M4 4.5h16v11H8.5L4 19.5z" />,
  gift: <><rect x="3.5" y="8" width="17" height="4" rx="1" /><path d="M5 12v8.5h14V12M12 8v12.5M12 8C10 4 6.5 4.5 7 7c.3 1.3 2.5 1 5 1zm0 0c2-4 5.5-3.5 5-1-.3 1.3-2.5 1-5 1z" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.5" /></>,
};

export type IconKey = keyof typeof P;

export function Icon({ name, className, size }: { name: string; className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] ?? P.info}
    </svg>
  );
}
