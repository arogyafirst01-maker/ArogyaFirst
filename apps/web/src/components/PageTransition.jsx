import { motion } from 'framer-motion';

const defaultVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const defaultTransition = {
  duration: 0.3,
  ease: 'easeInOut',
};

function PageTransition({ children, variants = defaultVariants }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={defaultTransition}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
