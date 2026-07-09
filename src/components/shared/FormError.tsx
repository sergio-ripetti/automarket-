export default function FormError({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p
      style={{
        fontFamily: 'Outfit',
        fontSize: '0.7rem',
        color: 'rgba(239,68,68,0.85)',
        marginTop: '0.3rem',
      }}
    >
      {message}
    </p>
  )
}
