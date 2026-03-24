/**
 * Hook Socket.io — AUTH-BADGE CM14
 *
 * Établit une connexion WebSocket authentifiée au backend.
 * Les handlers sont mis à jour par référence : pas besoin de les mémoïser.
 * Retourne { socket, connected }.
 *
 * Usage :
 *   const { connected } = useSocket({
 *     'scan:new':        (data) => ...,
 *     'badge:revoked':   (data) => ...,
 *     'alert:broadcast': (data) => ...,
 *   })
 */
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SOCKET_EVENTS = ['scan:new', 'badge:revoked', 'alert:broadcast', 'terminal:decommissioned', 'terminal:online', 'user:status']

export function useSocket(handlers = {}) {
  const [connected, setConnected] = useState(false)
  const socketRef  = useRef(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {

    const session = JSON.parse(localStorage.getItem('cm14_session') || '{}')
    const token = session.accessToken
    if (!token) return

    const socket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    SOCKET_EVENTS.forEach(event => {
      socket.on(event, (data) => handlersRef.current[event]?.(data))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, []) // mount/unmount uniquement

  return { socket: socketRef.current, connected }
}
