import { motion } from 'framer-motion'

interface SystemHintProps {
  text: string
}

const SystemHint = ({ text }: SystemHintProps) => {
  return (
    <motion.p
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-xs text-[#A9B7C8]/70"
    >
      {text}
    </motion.p>
  )
}

export default SystemHint
