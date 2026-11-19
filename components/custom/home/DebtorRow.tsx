import { Avatar, AvatarFallbackText } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Debtor } from "@/types";
import { memo } from "react";
import { useCSSVariable } from "uniwind";
import { Ionicons } from "@expo/vector-icons";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface IconActionProps {
  icon: IoniconName;

  accessibilityLabel: string;

  onPress: () => void;

  destructive?: boolean;
}

export const IconAction = memo(
  ({
    icon,

    accessibilityLabel,

    onPress,

    destructive = false,
  }: IconActionProps) => {
    const iconColor = useCSSVariable(
      destructive ? "--color-destructive" : "--color-foreground",
    ) as string | undefined;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        className="h-11 w-11 items-center justify-center rounded-full bg-secondary active:opacity-70"
      >
        <Ionicons
          name={icon}
          size={20}
          color={iconColor ?? (destructive ? "#dc2626" : "#525252")}
        />
      </Pressable>
    );
  },
);

interface DebtorRowProps {
  debtor: Debtor;

  formatMoney: (amount: number) => string;

  onDelete: (debtor: Debtor) => void;

  onPress: (debtor: Debtor) => void;
}

export const DebtorRow = memo(
  ({ debtor, formatMoney, onDelete, onPress }: DebtorRowProps) => {
    const balance = debtor.balance ?? 0;

    const balanceLabel =
      balance > 0 ? "Borc" : balance < 0 ? "Artıq ödəniş" : "Balans bağlanıb";

    const balanceClass =
      balance > 0
        ? "text-destructive"
        : balance < 0
          ? "text-primary"
          : "text-muted-foreground";

    const initials = debtor.name

      .trim()

      .split(/\s+/)

      .slice(0, 2)

      .map((part) => part.charAt(0))

      .join("")

      .toUpperCase();

    return (
      <Card className="mx-4 mb-2 overflow-hidden rounded-2xl border border-border bg-card p-3">
        <HStack className="items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${debtor.name}, ${balanceLabel}: ${formatMoney(balance)}`}
            accessibilityHint="Borclu təfərrüatlarını açır"
            onPress={() => onPress(debtor)}
            onLongPress={() => onDelete(debtor)}
            className="min-h-12 min-w-0 flex-1 flex-row items-center gap-3"
          >
            <Avatar className="bg-primary/10">
              <AvatarFallbackText className="font-bold text-primary">
                {initials || "?"}
              </AvatarFallbackText>
            </Avatar>

            <VStack className="min-w-0 flex-1 gap-1">
              <Text
                size="md"
                bold
                numberOfLines={1}
                className="text-foreground"
              >
                {debtor.name}
              </Text>

              {debtor.phone ? (
                <Text
                  size="xs"
                  numberOfLines={1}
                  className="text-muted-foreground"
                >
                  {debtor.phone}
                </Text>
              ) : null}

              {debtor.location ? (
                <Text
                  size="xs"
                  numberOfLines={1}
                  className="text-muted-foreground"
                >
                  {debtor.location}
                </Text>
              ) : !debtor.phone ? (
                <Text size="xs" className="text-muted-foreground">
                  Əlavə məlumat yoxdur
                </Text>
              ) : null}
            </VStack>

            <VStack className="max-w-[42%] flex-shrink items-end gap-1">
              <Text
                size="xs"
                numberOfLines={1}
                className="text-right text-muted-foreground"
              >
                {balanceLabel}
              </Text>

              <Text size="md" bold numberOfLines={1} className={balanceClass}>
                {formatMoney(balance)}
              </Text>
            </VStack>
          </Pressable>

          {/* <IconAction
            icon="trash-outline"
            destructive
            accessibilityLabel={`${debtor.name} qeydini sil`}
            onPress={() => onDelete(debtor)}
          /> */}
        </HStack>
      </Card>
    );
  },
);
