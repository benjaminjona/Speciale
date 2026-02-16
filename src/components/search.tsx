import { Input, InputGroup, CloseButton } from "@chakra-ui/react";
import { LuSearch } from "react-icons/lu";
import { useRef, useState, KeyboardEvent } from "react";

type SearchProps = {
  onSubmit: (value: string) => void;
  placeholder?: string;
};

export const Search = ({ onSubmit, placeholder }: SearchProps) => {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const endElement = value ? (
    <CloseButton
      size="xs"
      onClick={() => {
        setValue("");
        inputRef.current?.focus();
      }}
      me="-2"
    />
  ) : undefined;

  return (
    <InputGroup flex="1" startElement={<LuSearch />} endElement={endElement}>
      <Input
        ref={inputRef}
        placeholder={placeholder || "Search..."}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />
    </InputGroup>
  );
};
