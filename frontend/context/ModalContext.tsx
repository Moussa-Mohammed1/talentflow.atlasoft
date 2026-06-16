"use client";
import { createContext, useContext, useState } from "react";

const ModalContext = createContext({ isModalOpen: false, setModalOpen: (val: boolean) => {} });

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  return (
    <ModalContext.Provider value={{ isModalOpen, setModalOpen }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);