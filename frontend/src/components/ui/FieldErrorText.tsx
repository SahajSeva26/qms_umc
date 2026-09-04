interface FieldErrorTextProps {
  message: string
}

/**
 * useReshapingResolver's accumulation fix joins multiple simultaneous
 * sibling-field errors (e.g. a nested location/address object's City AND
 * Pincode both blank) into one space-separated string — "City is required.
 * Pincode is required." A single run-on sentence is hard to scan once 3-4
 * messages accumulate, so this renders each sentence on its own line.
 * Splits on ". " (a period followed by a space) — every message this hook
 * ever produces is itself a complete, period-terminated sentence, so this
 * never mis-splits a message's own internal punctuation.
 */
const FieldErrorText = ({ message }: FieldErrorTextProps) => {
  const sentences = message.split(/(?<=\.)\s+/).filter(Boolean)
  return (
    <p className="text-[11px] mt-1 text-danger">
      {sentences.map((sentence, i) => (
        <span key={i} className="block">{sentence}</span>
      ))}
    </p>
  )
}

export default FieldErrorText
