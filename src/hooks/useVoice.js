import { useState, useRef, useCallback } from 'react'

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export default function useVoice() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.')
      return
    }

    setError(null)
    setTranscript('')

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript
      setTranscript(result)
    }

    recognition.onerror = (event) => {
      // "no-speech" and "aborted" are not real errors the user cares about
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setError(null)
      } else {
        setError(`Voice error: ${event.error}`)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  return { isListening, transcript, startListening, stopListening, error }
}
