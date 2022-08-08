import { useState, useEffect, useCallback } from "react";
import { useContractKit } from "@celo-tools/use-contractkit";
import { useMinterContract } from "./useMinterContract";
import BigNumber from "bignumber.js";
export const useMintFee = () => {
  const { address } = useContractKit();
  const [mintFee, setMintFee] = useState(0);
  const minterContract = useMinterContract();

  const getMintFee = useCallback(async () => {
    if (!minterContract) return;
    // fetch a connected wallet token balance
    const value = new BigNumber(await minterContract.methods.getMintFee().call());
    setMintFee(value);
  }, [minterContract]);

  useEffect(() => {
    if (address) getMintFee();
  }, [address, getMintFee]);

  return {
    mintFee,
    getMintFee,
  };
};
