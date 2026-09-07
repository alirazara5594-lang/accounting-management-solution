import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Search } from 'lucide-react'

export interface SelectOption {
  value: string | number
  label: string
  sublabel?: string
  badge?: string
}

interface CompactSelectProps {
  value: string | number
  onChange: (value: any) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  searchPlaceholder?: string
  allowClear?: boolean
  clearLabel?: string
  disabled?: boolean
}

export const CompactSelect: React.FC<CompactSelectProps> = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  searchPlaceholder = 'Search...',
  allowClear = true,
  clearLabel = 'Select...',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 288 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(o => String(o.value) === String(value))

  const updateCoords = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const menuWidth = Math.max(288, rect.width)
    const menuHeight = Math.min(280, options.length * 40 + 60)

    let left = rect.left
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8
    }
    if (left < 8) left = 8

    let top = rect.bottom + 4
    if (top + menuHeight > window.innerHeight - 8 && rect.top > menuHeight + 8) {
      top = rect.top - menuHeight - 4
    }

    setCoords({ top, left, width: menuWidth })
  }

  useEffect(() => {
    if (isOpen) {
      updateCoords()
      const handleScrollOrResize = () => updateCoords()
      window.addEventListener('scroll', handleScrollOrResize, true)
      window.addEventListener('resize', handleScrollOrResize)
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true)
        window.removeEventListener('resize', handleScrollOrResize)
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearch('')
    }
  }, [isOpen])

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('touchstart', handleOutsideClick)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase().trim()
    return options.filter(
      o =>
        o.label?.toLowerCase().includes(q) ||
        o.sublabel?.toLowerCase().includes(q) ||
        o.badge?.toLowerCase().includes(q)
    )
  }, [options, search])

  return (
    <div className="relative inline-block w-full">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          if (!isOpen) updateCoords()
          setIsOpen(!isOpen)
        }}
        title={selectedOption ? selectedOption.label : placeholder}
        className={`w-full h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-strong)] flex items-center justify-between gap-1.5 transition-colors outline-none cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${
          isOpen ? 'ring-2 ring-indigo-500/50 border-indigo-500' : ''
        } ${className}`}
      >
        <span className="truncate text-left font-medium flex-1">
          {selectedOption ? (
            <span>{selectedOption.label}</span>
          ) : (
            <span className="text-[var(--color-text-muted)]">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-indigo-500' : ''
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="max-h-72 overflow-hidden flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Search Box */}
            <div className="relative mb-1.5 shrink-0">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-7 pl-8 pr-2 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-indigo-500"
              />
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-56 space-y-0.5 divide-y divide-[var(--color-border)]/40">
              {allowClear && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('')
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    !value
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'hover:bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'
                  }`}
                >
                  <span>{clearLabel}</span>
                  {!value && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                </button>
              )}

              {filteredOptions.map(o => {
                const isSelected = String(o.value) === String(value)
                return (
                  <button
                    key={String(o.value)}
                    type="button"
                    onClick={() => {
                      onChange(o.value)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'hover:bg-[var(--color-surface-muted)] text-[var(--color-text-strong)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate flex-1">
                      <span className="truncate font-medium text-xs text-[var(--color-text-strong)]">
                        {o.label}
                      </span>
                      {o.badge && (
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded shrink-0">
                          {o.badge}
                        </span>
                      )}
                      {o.sublabel && (
                        <span className="text-[11px] text-[var(--color-text-muted)] truncate">
                          ({o.sublabel})
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>
                )
              })}

              {filteredOptions.length === 0 && (
                <div className="p-3 text-center text-xs text-[var(--color-text-muted)]">
                  No matching options
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
