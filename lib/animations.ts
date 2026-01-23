import { Variants } from "framer-motion";

// UX Pro Max Standard: Entrance Animation (Springy & Smooth)
export const fadeInUp: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30
        }
    }
};

export const fadeIn: Variants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.4, ease: "easeOut" }
    }
};

// UX Pro Max Standard: Hover Animation
export const hoverScale = {
    whileHover: {
        scale: 1.02,
        transition: { duration: 0.2 }
    },
    whileTap: { scale: 0.98 }
};

export const buttonShimmer: Variants = {
    initial: { backgroundPosition: "-200% 0" },
    hover: {
        backgroundPosition: "200% 0",
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
        }
    }
};

// Stagger Children (List Items)
export const staggerContainer: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

// Mobile Menu Slide
export const mobileMenuVariants: Variants = {
    closed: { opacity: 0, x: "100%" },
    open: {
        opacity: 1,
        x: 0,
        transition: { type: "spring", stiffness: 300, damping: 30 }
    }
};
