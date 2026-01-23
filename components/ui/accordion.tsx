"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const AccordionContext = React.createContext<{
    activeItem: string | undefined;
    setActiveItem: (item: string | undefined) => void;
    type: "single" | "multiple";
}>({
    activeItem: undefined,
    setActiveItem: () => { },
    type: "single",
})

const AccordionItemContext = React.createContext<{ value: string }>({ value: "" })

const Accordion = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        type?: "single" | "multiple"
        collapsible?: boolean
        defaultValue?: string
    }
>(({ className, type = "single", collapsible = true, defaultValue, children, ...props }, ref) => {
    const [activeItem, setActiveItem] = React.useState<string | undefined>(defaultValue)

    const handleSetActiveItem = React.useCallback((item: string | undefined) => {
        if (collapsible && item === activeItem) {
            setActiveItem(undefined)
        } else {
            setActiveItem(item)
        }
    }, [activeItem, collapsible])

    return (
        <AccordionContext.Provider value={{ activeItem, setActiveItem: handleSetActiveItem, type }}>
            <div ref={ref} className={cn(className)} {...props}>
                {children}
            </div>
        </AccordionContext.Provider>
    )
})
Accordion.displayName = "Accordion"

const AccordionItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => (
    <AccordionItemContext.Provider value={{ value }}>
        <div ref={ref} className={cn("border-b", className)} {...props}>
            {children}
        </div>
    </AccordionItemContext.Provider>
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    const { activeItem, setActiveItem } = React.useContext(AccordionContext)
    const { value } = React.useContext(AccordionItemContext)
    const isOpen = activeItem === value

    return (
        <div className="flex">
            <button
                ref={ref}
                onClick={() => setActiveItem(value)}
                className={cn(
                    "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
                    className
                )}
                data-state={isOpen ? "open" : "closed"}
                {...props}
            >
                {children}
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
            </button>
        </div>
    )
})
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { activeItem } = React.useContext(AccordionContext)
    const { value } = React.useContext(AccordionItemContext)
    const isOpen = activeItem === value

    if (!isOpen) return null

    return (
        <div
            ref={ref}
            className={cn(
                "overflow-hidden text-sm transition-all animate-in fade-in slide-in-from-top-1 duration-200",
                className
            )}
            {...props}
        >
            <div className="pb-4 pt-0">{children}</div>
        </div>
    )
})
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

