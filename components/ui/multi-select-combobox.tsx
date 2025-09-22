"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface MultiSelectComboboxProps {
  options: string[]
  selected: string[]
  onSelectionChange: (selected: string[]) => void
  placeholder?: string
  emptyText?: string
  className?: string
}

export function MultiSelectCombobox({
  options,
  selected,
  onSelectionChange,
  placeholder = "Select items...",
  emptyText = "No items found.",
  className,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (option: string) => {
    if (selected.includes(option)) {
      onSelectionChange(selected.filter((item) => item !== option))
    } else {
      onSelectionChange([...selected, option])
    }
  }

  const handleRemove = (option: string) => {
    onSelectionChange(selected.filter((item) => item !== option))
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-transparent"
          >
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <span>
                {selected.length} item{selected.length !== 1 ? "s" : ""} selected
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search amenities..." />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem key={option} value={option} onSelect={() => handleSelect(option)}>
                    <Check className={cn("mr-2 h-4 w-4", selected.includes(option) ? "opacity-100" : "opacity-0")} />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Display selected items as removable badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/50">
          {selected.map((item) => (
            <Badge key={item} variant="secondary" className="flex items-center gap-1">
              {item}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
