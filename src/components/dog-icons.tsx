import type { HTMLAttributes } from 'react';

const Emoji = ({
  emoji,
  ...props
}: { emoji: string } & HTMLAttributes<HTMLSpanElement>) => (
  <span
    role="img"
    style={{ fontSize: '2.5rem', lineHeight: 1 }}
    {...props}
  >
    {emoji}
  </span>
);

export const PawIcon = (props: HTMLAttributes<HTMLSpanElement>) => (
  <Emoji emoji="🐕" {...props} />
);

export const BoneIcon = (props: HTMLAttributes<HTMLSpanElement>) => (
  <Emoji emoji="🐩" {...props} />
);

export const DogHouseIcon = (props: HTMLAttributes<HTMLSpanElement>) => (
  <Emoji emoji="🐶" {...props} />
);

export const BallIcon = (props: HTMLAttributes<HTMLSpanElement>) => (
  <Emoji emoji="🐕‍🦺" {...props} />
);

export const FoodBowlIcon = (props: HTMLAttributes<HTMLSpanElement>) => (
  <Emoji emoji="🦮" {...props} />
);

export const LeashIcon = (props: HTMLAttributes<HTMLSpanElement>) => (
  <Emoji emoji="🪢" {...props} />
);

export const PawPrintIcon = (props: HTMLAttributes<HTMLSpanElement>) => (
  <Emoji emoji="🐾" {...props} />
);

export const HotdogIcon = (props: HTMLAttributes<HTMLSpanElement>) => (
  <Emoji emoji="🌭" {...props} />
);

export const BombIcon = (props: HTMLAttributes<HTMLSpanElement>) => (
  <Emoji emoji="💣" {...props} />
);

export const ColumnClearIcon = (props: HTMLAttributes<HTMLSpanElement>) => (
  <Emoji emoji="⚡" {...props} />
);

export const RowClearIcon = (props: HTMLAttributes<HTMLSpanElement>) => (
  <Emoji emoji="🔥" {...props} />
);
