import { createContext, ReactNode, useContext, useState } from 'react';

type ModalProviderProps = {
  children: ReactNode;
};

type ModalContextType<T> = {
  modalData: T;
  setModalData: (data: T) => void;
};

const ModalContext = createContext<ModalContextType<any> | undefined>(undefined);

export function ModalProvider<T>({ children }: ModalProviderProps) {
  const [modalData, setModalData] = useState<T | null>(null);

  return <ModalContext.Provider value={{ modalData, setModalData }}>{children}</ModalContext.Provider>;
}

export function useModal<T>() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context as ModalContextType<T>;
}
