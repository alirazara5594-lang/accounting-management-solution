import * as React from "react"

import { cn } from "@/lib/utils"

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  children?: React.ReactNode
}

function collectOptions(node: React.ReactNode): { value: string; label: React.ReactNode }[] {
  const out: { value: string; label: React.ReactNode }[] = []
  const walk = (n: React.ReactNode) => {
    if (!React.isValidElement(n)) return
    const el = n as React.ReactElement<any>
    if (el.type === SelectItem) {
      out.push({ value: String(el.props.value), label: el.props.children })
      return
    }
    if (el.props?.children != null) {
      React.Children.forEach(el.props.children, walk)
    }
  }
  React.Children.forEach(node, walk)
  return out
}

function findPlaceholder(node: React.ReactNode): string | undefined {
  let placeholder: string | undefined = undefined
  const walk = (n: React.ReactNode) => {
    if (!React.isValidElement(n)) return
    const el = n as React.ReactElement<any>
    if (el.type === SelectValue && el.props?.placeholder) {
      placeholder = el.props.placeholder
      return
    }
    if (el.props?.children != null) {
      React.Children.forEach(el.props.children, walk)
    }
  }
  React.Children.forEach(node, walk)
  return placeholder
}

function Select({
  value,
  defaultValue,
  onValueChange,
  className,
  placeholder,
  disabled,
  children,
}: SelectProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? "")
  const current = value ?? internal
  const options = collectOptions(children)
  const effectivePlaceholder = placeholder || findPlaceholder(children)

  return (
    <select
      data-slot="select"
      value={current}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value
        setInternal(v)
        onValueChange?.(v)
      }}
      className={cn(
        "flex h-9 w-full items-center justify-between gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-sm transition-[color,box-shadow] duration-200 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 text-[var(--color-text-strong)]",
        className
      )}
    >
      {effectivePlaceholder && <option value="">{effectivePlaceholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function SelectTrigger({ className, children }: { className?: string; children?: React.ReactNode }) {
  void children
  return <span className={className} data-slot="select-trigger" />
}

function SelectValue({ placeholder }: { placeholder?: string; children?: React.ReactNode }) {
  void placeholder
  return null
}

function SelectContent({ className, children }: { className?: string; children?: React.ReactNode }) {
  void className
  return <>{children}</>
}

function SelectItem({
  value,
  className,
  children,
  disabled,
}: {
  value: string
  className?: string
  children?: React.ReactNode
  disabled?: boolean
}) {
  void value
  void className
  void disabled
  return <>{children}</>
}

function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function SelectLabel({ children }: { children?: React.ReactNode }) {
  void children
  return null
}

function SelectSeparator() {
  return null
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}