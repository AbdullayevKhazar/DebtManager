import React, {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";

import {
  FlatList,
  Modal,
  Pressable,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  getAllCountries,
  usePhoneInput,
  type ICountry,
} from "rn-international-phone-number";

import { useCSSVariable } from "uniwind";

import { Heading } from "@/components/ui/heading";
import { Text as UIText } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";

export interface PhoneNumberInputRef {
  getValue: () => string;
  setValue: (value: string) => void;
  clear: () => void;
  isValid: () => boolean;
}

interface PhoneNumberInputProps {
  label?: string;
  disabled?: boolean;
  renderInput?: (props: TextInputProps) => React.ReactNode;
}

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getDialCode = (country: ICountry) => {
  const root = country.idd?.root ?? "";
  const suffix = country.idd?.suffixes;

  const suffixValue = Array.isArray(suffix)
    ? (suffix[0] ?? "")
    : (suffix ?? "");

  return `${root}${suffixValue}`;
};

const PhoneNumberInputBase = forwardRef<
  PhoneNumberInputRef,
  PhoneNumberInputProps
>(function PhoneNumberInput(
  { label = "Telefon", disabled = false, renderInput },
  forwardedRef,
) {
  const {
    country,
    nationalPhoneNumberFormatted,
    internationalPhoneNumber,
    isValidPhoneNumber,
    onChangePhoneNumber,
    setCountry,
    setPhoneNumber,
  } = usePhoneInput({
    defaultCountry: "AZ",
  });
  const placeholderColor = useCSSVariable("--color-muted-foreground") as
    | string
    | undefined;
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const foreground = useCSSVariable("--color-foreground") as string | undefined;

  const muted = useCSSVariable("--color-muted-foreground") as
    | string
    | undefined;

  const countries = useMemo(
    () =>
      getAllCountries()
        .slice()
        .sort((a, b) => a.name.common.localeCompare(b.name.common)),
    [],
  );

  const filteredCountries = useMemo(() => {
    const query = normalizeSearch(countrySearch);
    const digits = countrySearch.replace(/\D/g, "");

    if (!query && !digits) return countries;

    return countries.filter((item) => {
      const matchesName = normalizeSearch(item.name.common).includes(query);

      const matchesDialCode =
        digits.length > 0 &&
        getDialCode(item).replace(/\D/g, "").includes(digits);

      return matchesName || matchesDialCode;
    });
  }, [countries, countrySearch]);

  const closeCountryPicker = useCallback(() => {
    setCountryPickerVisible(false);
    setCountrySearch("");
  }, []);

  useImperativeHandle(
    forwardedRef,
    () => ({
      getValue: () => {
        const hasNumber =
          nationalPhoneNumberFormatted.replace(/\D/g, "").length > 0;

        return hasNumber ? internationalPhoneNumber : "";
      },

      setValue: (value: string) => {
        setPhoneNumber(value);
      },

      clear: () => {
        setPhoneNumber("");
      },

      isValid: () => {
        const hasNumber =
          nationalPhoneNumberFormatted.replace(/\D/g, "").length > 0;

        return !hasNumber || isValidPhoneNumber;
      },
    }),
    [
      nationalPhoneNumberFormatted,
      internationalPhoneNumber,
      isValidPhoneNumber,
      setPhoneNumber,
    ],
  );

  const inputProps: TextInputProps = {
    value: nationalPhoneNumberFormatted,
    onChangeText: onChangePhoneNumber,
    keyboardType: "phone-pad",
    placeholder: "50 123 45 67",
    placeholderTextColor: muted ?? "#737373",
    autoCapitalize: "none",
    autoCorrect: false,
    editable: !disabled,
    returnKeyType: "done",
    style: {
      flex: 1,
      minWidth: 0,
      paddingVertical: 0,
      paddingHorizontal: 0,
      fontSize: 16,
      color: foreground ?? "#171717",
    },
    accessibilityLabel: "Telefon nömrəsi",
  };

  return (
    <>
      <VStack className="gap-2">
        <UIText size="sm" className="font-medium text-foreground">
          {label}
        </UIText>

        <HStack className="h-12 items-center rounded-xl border border-input bg-background px-3">
          <Pressable
            disabled={disabled}
            onPress={() => setCountryPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Ölkə kodunu seç"
            className="h-full flex-row items-center gap-1.5"
          >
            <UIText size="lg">{country?.flag ?? "🌐"}</UIText>

            <UIText size="sm" className="font-semibold text-foreground">
              {country ? getDialCode(country) : "+994"}
            </UIText>

            <Ionicons
              name="chevron-down"
              size={15}
              color={muted ?? "#737373"}
            />
          </Pressable>

          <View className="mx-3 h-6 w-px bg-border" />

          {renderInput ? (
            renderInput(inputProps)
          ) : (
            <TextInput {...inputProps} />
          )}

          {nationalPhoneNumberFormatted.length > 0 && (
            <Pressable
              onPress={() => setPhoneNumber("")}
              hitSlop={8}
              accessibilityLabel="Telefon nömrəsini təmizlə"
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={muted ?? "#737373"}
              />
            </Pressable>
          )}
        </HStack>
      </VStack>

      <Modal
        visible={countryPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={closeCountryPicker}
      >
        <View className="flex-1 justify-end bg-black/50">
          <Pressable
            className="absolute inset-0"
            onPress={closeCountryPicker}
            accessibilityLabel="Ölkə seçimini bağla"
          />

          <VStack className="max-h-[82%] rounded-t-3xl border border-border bg-background px-4 pb-6 pt-4">
            <HStack className="mb-4 items-center justify-between">
              <Heading size="lg" className="text-foreground">
                Ölkə kodu seç
              </Heading>

              <Pressable
                onPress={closeCountryPicker}
                hitSlop={10}
                accessibilityLabel="Bağla"
              >
                <Ionicons
                  name="close"
                  size={23}
                  color={foreground ?? "#171717"}
                />
              </Pressable>
            </HStack>

            <TextInput
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder="Ölkə və ya kod axtar..."
              placeholderTextColor={muted ?? "#737373"}
              autoCapitalize="none"
              className="mb-3 h-11 rounded-xl border border-input bg-card px-3 text-foreground"
              style={{ color: foreground ?? "#171717" }}
            />

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.cca2}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setCountry(item);
                    closeCountryPicker();
                  }}
                  className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-secondary"
                >
                  <UIText size="lg">{item.flag}</UIText>

                  <UIText size="sm" className="flex-1 text-foreground">
                    {item.name.common}
                  </UIText>

                  <UIText
                    size="sm"
                    className="font-medium text-muted-foreground"
                  >
                    {getDialCode(item)}
                  </UIText>
                </Pressable>
              )}
              ListEmptyComponent={
                <UIText
                  size="sm"
                  className="py-6 text-center text-muted-foreground"
                >
                  Ölkə tapılmadı
                </UIText>
              }
            />
          </VStack>
        </View>
      </Modal>
    </>
  );
});

export const PhoneNumberInput = memo(PhoneNumberInputBase);
