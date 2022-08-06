import { useContract } from "./useContract";
import ParkingSpaceAbi from "../contracts/ParkingSpace.json";
import parkingSpace from "../contracts/ParkingSpace-address.json";

// export interface for smart contract
export const useMinterContract = () =>
  useContract(ParkingSpaceAbi.abi, parkingSpace.ParkingSpace);
