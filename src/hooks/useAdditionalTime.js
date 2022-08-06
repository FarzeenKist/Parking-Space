import { useState, useEffect, useCallback } from "react";
import { useContractKit } from "@celo-tools/use-contractkit";
import { useMinterContract } from "./useMinterContract";

export const useAdditionalTime = () => {
  const { address } = useContractKit();
  const [additionalTime, setAdditionalTime] = useState(0);
  const minterContract = useMinterContract();

  const getAdditionalTime = useCallback(async () => {
    if (!minterContract) return;
    // fetch a connected wallet token balance
    const value = await minterContract.methods.additionalTime().call();
    setAdditionalTime(value);
  }, [minterContract]);

  useEffect(() => {
    if (address) getAdditionalTime();
  }, [address, getAdditionalTime]);

  return {
    additionalTime,
    getAdditionalTime,
  };
};
