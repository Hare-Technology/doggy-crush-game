import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const Emoji = ({
  emoji,
  className,
  ...props
}: { emoji: string } & HTMLAttributes<HTMLSpanElement>) => (
  <span
    role="img"
    className={cn('text-3xl md:text-5xl leading-none', className)}
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

export const RainbowIcon = (props: HTMLAttributes<HTMLSpanElement>) => (
  <Emoji emoji="🌈" {...props} />
);
