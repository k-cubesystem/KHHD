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
>(({ className, value, ...props }, ref) => (
    <div ref={ref} className={cn("border-b", className)} data-value={value} {...props} />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    const { activeItem, setActiveItem } = React.useContext(AccordionContext)
    // Find parent Item value. In a real Radix impl access is easier, here we hack or need Context in Item.
    // Actually, to make this fully work without Radix, we need another Context in AccordionItem.
    // Let's simplify: User MUST use AccordionItem with 'value'. We need to pass that down.
    // Better approach: Wrap Item contents? No, let's create ItemContext.
    return (
        <AccordionItemContext.Consumer>
            {({ value }) => (
                <div className="flex">
                    <button
                        ref={ref}
                        onClick={() => setActiveItem(value)}
                        className={cn(
                            "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
                            className
                        )}
                        data-state={activeItem === value ? "open" : "closed"}
                        {...props}
                    >
                        {children}
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                    </button>
                </div>
            )}
        </AccordionItemContext.Consumer>
    )
})
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { activeItem } = React.useContext(AccordionContext)
    return (
        <AccordionItemContext.Consumer>
            {({ value }) => {
                const isOpen = activeItem === value
                if (!isOpen) return null
                return (
                    <div
                        ref={ref}
                        className={cn(
                            "overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
                            className
                        )}
                        {...props}
                    >
                        <div className="pb-4 pt-0">{children}</div>
                    </div>
                )
            }}
        </AccordionItemContext.Consumer>
    )
})
AccordionContent.displayName = "AccordionContent"

// Helper Context for Item
const AccordionItemContext = React.createContext<{ value: string }>({ value: "" })

// Re-declare AccordionItem to use Context
const AccordionItemWithContext = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => (
    <AccordionItemContext.Provider value={{ value }}>
        <div ref={ref} className={cn("border-b", className)} {...props}>
            {children}
        </div>
    </AccordionItemContext.Provider>
))
AccordionItemWithContext.displayName = "AccordionItem"

export { Accordion, AccordionItemWithContext as AccordionItem, AccordionTrigger, AccordionContent }
