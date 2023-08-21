/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  StorageAccessible,
  StorageAccessibleInterface,
} from "../../../contracts/common/StorageAccessible";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "offset",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "length",
        type: "uint256",
      },
    ],
    name: "getStorageAt",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "targetContract",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "calldataPayload",
        type: "bytes",
      },
    ],
    name: "simulateAndRevert",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export class StorageAccessible__factory {
  static readonly abi = _abi;
  static createInterface(): StorageAccessibleInterface {
    return new Interface(_abi) as StorageAccessibleInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): StorageAccessible {
    return new Contract(address, _abi, runner) as unknown as StorageAccessible;
  }
}
