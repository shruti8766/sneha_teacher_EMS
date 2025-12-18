import React, { createContext, useContext, useState } from 'react';

interface DetailContextType {
  detailName: string | null;
  detailType: string | null;
  setDetail: (name: string | null, type: string | null) => void;
  clearDetail: () => void;
}

const DetailContext = createContext<DetailContextType | undefined>(undefined);

export const DetailProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [detailName, setDetailName] = useState<string | null>(null);
  const [detailType, setDetailType] = useState<string | null>(null);

  const setDetail = (name: string | null, type: string | null) => {
    setDetailName(name);
    setDetailType(type);
  };

  const clearDetail = () => {
    setDetailName(null);
    setDetailType(null);
  };

  return (
    <DetailContext.Provider value={{ detailName, detailType, setDetail, clearDetail }}>
      {children}
    </DetailContext.Provider>
  );
};

export const useDetail = () => {
  const context = useContext(DetailContext);
  if (!context) {
    throw new Error('useDetail must be used within DetailProvider');
  }
  return context;
};
