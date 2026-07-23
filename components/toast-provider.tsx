'use client'
import { createContext, useCallback, useContext, useState } from 'react'

type ToastType = 'success' | 'error'
interface Toast { id: number; message: string; type: ToastType }
interface ToastCtx { showToast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastCtx>({ showToast: () => {} })
export const useToast = () => useContext(ToastContext)

let _id = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++_id
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-[4.5rem] left-4 right-4 max-w-xl mx-auto z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`px-4 py-3 rounded-xl border text-sm font-medium shadow-xl
                ${t.type === 'success'
                  ? 'bg-[#1a1614] border-[#22c55e]/50 text-[#22c55e]'
                  : 'bg-[#1a1614] border-[#ef4444]/50 text-[#ef4444]'}`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
