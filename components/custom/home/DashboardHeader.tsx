import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Keyboard, Pressable, ScrollView } from "react-native";
import * as Contacts from "expo-contacts";
import { useCSSVariable } from "uniwind";
import { BottomSheetTextInput } from "@/components/ui/bottomsheet";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Text as UIText } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { IconAction } from "@/components/custom/home/DebtorRow";
import { Ionicons } from "@expo/vector-icons";
import {
  PhoneNumberInput,
  PhoneNumberInputRef,
} from "../inputs/PhoneNumberInputs";
import AppFormSheet from "@/components/shared/AppFormSheet";
import type { ToastNotice } from "@/components/shared/Toast";

const ADD_DEBTOR_SNAP_POINTS: Array<string | number> = ["82%"];

interface SheetFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
}

const SheetField = memo(
  ({
    label,
    value,
    placeholder,
    onChangeText,
    autoCapitalize = "sentences",
    keyboardType = "default",
  }: SheetFieldProps) => {
    const placeholderColor = useCSSVariable("--color-muted-foreground") as
      | string
      | undefined;

    return (
      <VStack className="w-full gap-2">
        <UIText size="sm" className="font-medium text-foreground">
          {label}
        </UIText>

        <BottomSheetTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor ?? "#A3A3A3"}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground"
        />
      </VStack>
    );
  },
);

const normalizeLocation = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ıİ]/g, "i")
    .replace(/[əƏ]/g, "e")
    .toLowerCase()
    .trim();
interface LocationAutocompleteFieldProps {
  value: string;
  locations: string[];
  onChangeText: (value: string) => void;
}
const LocationAutocompleteField = memo(
  ({ value, locations, onChangeText }: LocationAutocompleteFieldProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const query = normalizeLocation(value);
    const suggestions = useMemo(() => {
      if (query.length < 2) return [];
      const uniqueLocations = [
        ...new Set(locations.map((item) => item.trim()).filter(Boolean)),
      ];
      return uniqueLocations
        .filter((item) => {
          const normalized = normalizeLocation(item);
          if (!normalized || normalized === query) return false;
          return normalized.includes(query) || query.includes(normalized);
        })
        .sort((a, b) => {
          const aStarts = normalizeLocation(a).startsWith(query);
          const bStarts = normalizeLocation(b).startsWith(query);
          return Number(bStarts) - Number(aStarts);
        })
        .slice(0, 3);
    }, [locations, query]);
    const handleSelect = useCallback(
      (location: string) => {
        onChangeText(location);
        setIsFocused(false);
        Keyboard.dismiss();
      },
      [onChangeText],
    );
    const placeholderColor = useCSSVariable("--color-muted-foreground") as
      | string
      | undefined;
    return (
      <VStack className="gap-2">
        <UIText size="sm" className="font-medium text-foreground">
          Ünvan
        </UIText>
        <BottomSheetTextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Ünvan daxil edin"
          placeholderTextColor={placeholderColor ?? "#A3A3A3"}
          autoCapitalize="words"
          className="h-12 rounded-xl border border-input bg-background px-4 text-base text-foreground"
        />
        {isFocused && suggestions.length > 0 && (
          <VStack className="max-h-52 overflow-hidden rounded-xl border border-border bg-card p-1">
            <UIText size="xs" className="px-3 py-2 text-muted-foreground">
              Əvvəl istifadə etdiyin məkanlar
            </UIText>
            {suggestions.map((item) => (
              <Pressable
                key={item}
                onPressIn={() => handleSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item} ünvanını seç`}
                className="rounded-lg px-3 py-2.5 active:bg-secondary"
              >
                <HStack className="items-center gap-3">
                  <Ionicons name="location-outline" size={18} color="#737373" />
                  <UIText size="sm" className="flex-1 text-foreground">
                    {item}
                  </UIText>
                  <Ionicons name="arrow-down" size={16} color="#737373" />
                </HStack>
              </Pressable>
            ))}
          </VStack>
        )}
      </VStack>
    );
  },
);
interface AddDebtorSheetProps {
  visible: boolean;
  isSaving: boolean;
  locations: string[];
  onDismiss: () => void;
  onSave: (name: string, phone: string, location: string) => Promise<boolean>;
  onNotify: (
    message: string,
    action: ToastNotice["action"],
    title?: string,
  ) => void;
}
export const AddDebtorSheet = memo(
  ({
    visible,
    isSaving,
    locations,
    onDismiss,
    onSave,
    onNotify,
  }: AddDebtorSheetProps) => {
    const phoneInputRef = useRef<PhoneNumberInputRef>(null);
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const contactIconColor = useCSSVariable("--color-foreground") as
      | string
      | undefined;
    useEffect(() => {
      if (!visible) return;
      setName("");
      setLocation("");
      phoneInputRef.current?.clear();
    }, [visible]);
    const handleSave = useCallback(async () => {
      if (isSaving) return;
      const phoneField = phoneInputRef.current;
      if (phoneField && !phoneField.isValid()) {
        onNotify("Daxil etdiyiniz telefon nömrəsi düzgün deyil.", "warning");
        return;
      }
      const internationalPhone = phoneField?.getValue() ?? "";
      const saved = await onSave(name, internationalPhone, location);
      if (saved) Keyboard.dismiss();
    }, [isSaving, name, location, onSave, onNotify]);
    const handleContactSelect = useCallback(async () => {
      try {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== "granted") {
          onNotify("Kontaktlara giriş icazəsi verilmədi.", "warning");
          return;
        }
        Keyboard.dismiss();
        const contact = await Contacts.presentContactPickerAsync();
        if (!contact) return;
        if (contact.name) setName(contact.name);
        const contactPhone = contact.phoneNumbers?.find((item) =>
          Boolean(item.number?.trim()),
        )?.number;
        if (contactPhone) phoneInputRef.current?.setValue(contactPhone);
      } catch (error) {
        console.error("Contact picker error:", error);
        onNotify("Kontakt seçmək mümkün olmadı.", "error");
      }
    }, [onNotify]);
    const placeholderColor = useCSSVariable("--color-muted-foreground") as
      | string
      | undefined;
    return (
      <AppFormSheet
        visible={visible}
        title="Borclu əlavə et"
        isSaving={isSaving}
        onDismiss={onDismiss}
        onSave={handleSave}
        snapPoints={ADD_DEBTOR_SNAP_POINTS}
      >
        <HStack className="w-full items-end gap-2">
          <VStack className="min-w-0 flex-1">
            <SheetField
              label="Ad və soyad"
              value={name}
              onChangeText={setName}
              placeholder="Ad və soyad"
              autoCapitalize="words"
            />
          </VStack>
          <Pressable
            onPress={() => void handleContactSelect()}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Kontaktlardan seç"
            className="h-12 w-12 items-center justify-center rounded-xl bg-secondary active:opacity-70"
          >
            <Ionicons
              name="person-add-outline"
              size={20}
              color={contactIconColor ?? "#525252"}
            />
          </Pressable>
        </HStack>
        <PhoneNumberInput
          ref={phoneInputRef}
          disabled={isSaving}
          renderInput={(inputProps) => (
            <BottomSheetTextInput
              {...inputProps}
              placeholderTextColor={placeholderColor ?? "#A3A3A3"}
              className="min-w-0 flex-1 border border-input bg-background px-3 text-base text-foreground"
            />
          )}
        />
        <LocationAutocompleteField
          value={location}
          locations={locations}
          onChangeText={setLocation}
        />
      </AppFormSheet>
    );
  },
);
interface DashboardHeaderProps {
  debtorCount: number;
  formatMoney: (amount: number) => string;
  onToggleBalance: () => void;
  onOpenReports: () => void;
  onOpenSettings: () => void;
  searchQuery: string;
  selectedLocation: string | null;
  showBalance: boolean;
  totalBalance: number;
  locations: string[];
  onSearchChange: (value: string) => void;
  onLocationChange: (location: string | null) => void;
}
export const DashboardHeader = memo(
  ({
    debtorCount,
    formatMoney,
    onToggleBalance,
    onOpenReports,
    onOpenSettings,
    searchQuery,
    selectedLocation,
    showBalance,
    totalBalance,
    locations,
    onSearchChange,
    onLocationChange,
  }: DashboardHeaderProps) => {
    const totalBalanceClass =
      totalBalance > 0
        ? "text-destructive"
        : totalBalance < 0
          ? "text-primary"
          : "text-muted-foreground";

    const placeholderColor = useCSSVariable("--color-muted-foreground") as
      | string
      | undefined;
    return (
      <VStack className="gap-4 px-5 pb-3 pt-3">
        <HStack className="items-center justify-between gap-3">
          <VStack className="flex-1 gap-1">
            <Heading size="2xl" className="text-foreground">
              Borclular
            </Heading>
            <UIText size="sm" className="text-muted-foreground">
              Hesablarınızı rahat izləyin
            </UIText>
          </VStack>
        </HStack>
        <Card className="gap-3 rounded-2xl border border-border bg-card p-4">
          <HStack className="items-center justify-between gap-3">
            <VStack className="min-w-0 flex-1 gap-1">
              <UIText size="sm" className="text-muted-foreground">
                Ümumi borc
              </UIText>
              <UIText
                size="2xl"
                bold
                className={totalBalanceClass}
                numberOfLines={1}
              >
                {formatMoney(totalBalance)}
              </UIText>
            </VStack>
            <IconAction
              icon={showBalance ? "eye-outline" : "eye-off-outline"}
              accessibilityLabel={
                showBalance ? "Məbləğləri gizlət" : "Məbləğləri göstər"
              }
              onPress={onToggleBalance}
            />
          </HStack>
          <HStack className="items-center gap-2">
            <Ionicons name="people-outline" size={17} color="#737373" />
            <UIText size="sm" className="text-muted-foreground">
              {debtorCount} borclu qeydiyyatdadır
            </UIText>
          </HStack>
        </Card>
        <HStack className="items-center gap-2">
          <Input className="h-12 min-w-0 flex-1 rounded-xl bg-card">
            <InputField
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder="Ad və ya telefonla axtar"
              placeholderTextColor={placeholderColor ?? "#A3A3A3"}
              accessibilityLabel="Borclu axtarışı"
              returnKeyType="search"
              autoCapitalize="none"
              className="text-foreground"
            />
          </Input>
          {searchQuery.length > 0 && (
            <IconAction
              icon="close"
              accessibilityLabel="Axtarışı təmizlə"
              onPress={() => onSearchChange("")}
            />
          )}
        </HStack>
        {locations.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <HStack className="gap-2">
              <Button
                size="sm"
                variant={selectedLocation === null ? "default" : "outline"}
                className="rounded-full px-4"
                onPress={() => onLocationChange(null)}
              >
                <ButtonText>Hamısı</ButtonText>
              </Button>
              {locations.map((location) => {
                const selected = selectedLocation === location;
                return (
                  <Button
                    key={location}
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    className="rounded-full px-4"
                    onPress={() => onLocationChange(location)}
                  >
                    <ButtonText>{location}</ButtonText>
                  </Button>
                );
              })}
            </HStack>
          </ScrollView>
        )}
        <HStack className="mt-1 items-center justify-between">
          <Heading size="lg" className="text-foreground">
            Borclu siyahısı
          </Heading>
        </HStack>
      </VStack>
    );
  },
);
