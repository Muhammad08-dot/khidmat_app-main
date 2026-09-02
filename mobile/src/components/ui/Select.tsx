import React, { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { Icon } from "./Icon";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[] | string[];
  value: string;
  onChange: (value: string) => void;
}

/** Simple dropdown built as a modal option list (RN has no <select>). */
export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const normalized: SelectOption[] = options.map((o) =>
    typeof o === "string" ? { label: o, value: o } : o
  );

  const selected = normalized.find((o) => o.value === value);

  return (
    <View>
      {label && (
        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/50">
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5"
      >
        <Text className="text-sm text-ink">{selected?.label ?? "Select..."}</Text>
        <Icon icon={ChevronDown} color="#1F5D3F66" size={16} />
      </Pressable>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-ink/40 p-6"
          onPress={() => setOpen(false)}
        >
          <Pressable className="max-h-[60%] w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-2">
            <ScrollView>
              {normalized.map((opt) => {
                const active = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`rounded-lg px-4 py-3 ${
                      active ? "bg-primary/10" : ""
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        active ? "font-bold text-primary" : "text-ink"
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default Select;
