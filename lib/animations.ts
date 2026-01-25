import { Variants } from "framer-motion";

// UX Pro Max Standard: Entrance Animation
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

// UX Pro Max Standard: Hover Animation
export const hoverScale = {
  whileHover: { 
    scale: 1.02, 
    transition: { duration: 0.2 } 
  },
  whileTap: { scale: 0.98 }
};

// Shimmer Effect (Button Hover)
export const shimmerVariants: Variants = {
  initial: { backgroundPosition: "-200% 0" },
  animate: { 
    backgroundPosition: "200% 0",
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

// Stagger Children (List Items)
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Mobile Menu Variants
export const mobileMenuVariants: Variants = {
  initial: { opacity: 0, x: "100%" },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: {
    opacity: 0,
    x: "100%",
    transition: {
      duration: 0.2
    }
  }
};
