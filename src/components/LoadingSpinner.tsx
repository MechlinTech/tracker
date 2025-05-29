import { motion } from 'framer-motion';

export default function LoadingSpinner() {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative">
        <motion.div
          className="w-16 h-16 border-4 border-primary-200 rounded-full"
          animate={{
            rotate: 360
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute top-0 left-0 w-16 h-16 border-4 border-primary-600 rounded-full border-t-transparent"
          animate={{
            rotate: 360
          }}
          transition={{
            duration: 0.75,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
      <span className="ml-4 text-lg font-medium text-primary-900">Loading...</span>
    </div>
  );
}