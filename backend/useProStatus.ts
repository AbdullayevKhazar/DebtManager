import { useState } from "react";

export const useProStatus = () => {
  const [isPro, setIsPro] = useState(true);

  return isPro;
};
