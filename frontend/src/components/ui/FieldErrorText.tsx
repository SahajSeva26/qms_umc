interface FieldErrorTextProps {
  message: string
}

// useReshapingResolver joins multiple sibling-field errors with a plain
// space — this only splits them back apart if each message already ends in ".".
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
