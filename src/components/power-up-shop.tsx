'use client';

import type { PowerUpType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BombIcon, RainbowIcon } from '@/components/dog-icons';
import { Coins, PlusSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ShopPowerUp = PowerUpType | '+5 moves';

const powerUps: {
  id: ShopPowerUp;
  name: string;
  description: string;
  cost: number;
  icon: React.ElementType;
}[] = [
  {
    id: 'bomb',
    name: 'Bomb',
    description: 'Clears a 3x3 area.',
    cost: 250,
    icon: BombIcon,
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    description: 'Clears all of one color.',
    cost: 500,
    icon: RainbowIcon,
  },
  {
    id: '+5 moves',
    name: '+5 Moves',
    description: 'Adds 5 extra moves.',
    cost: 750,
    icon: PlusSquare,
  },
];

interface PowerUpShopProps {
  coins: number;
  onPurchase: (powerUp: ShopPowerUp) => void;
  isProcessing: boolean;
  setCoins: (updater: (prevCoins: number) => number) => void;
}

export default function PowerUpShop({
  coins,
  onPurchase,
  isProcessing,
  setCoins,
}: PowerUpShopProps) {
  const { toast } = useToast();

  const handleBuyClick = (item: typeof powerUps[0]) => {
    if (coins < item.cost) {
      toast({
        title: 'Not enough coins!',
        description: `You need ${item.cost} coins to buy a ${item.name}.`,
        variant: 'destructive',
      });
      return;
    }
    setCoins(prev => prev - item.cost);
    onPurchase(item.id);
  };

  return (
    <div className="w-full max-w-lg mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Power-up Shop</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {powerUps.map(item => (
            <Card
              key={item.id}
              className="flex flex-col items-center justify-between p-4"
            >
              <item.icon className="w-12 h-12 mb-2" />
              <h3 className="text-lg font-bold">{item.name}</h3>
              <p className="text-sm text-muted-foreground text-center mb-2 h-10">
                {item.description}
              </p>
              <Button
                onClick={() => handleBuyClick(item)}
                disabled={isProcessing || coins < item.cost}
                className="w-full"
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    Buy for {item.cost}
                    <Coins className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
