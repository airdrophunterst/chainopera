const ABI = [
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "receiver", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  { inputs: [{ internalType: "int256", name: "price", type: "int256" }], name: "InvalidPrice", type: "error" },
  {
    inputs: [
      { internalType: "uint256", name: "required", type: "uint256" },
      { internalType: "uint256", name: "actual", type: "uint256" },
    ],
    name: "InvalidValue",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "caller", type: "address" },
    ],
    name: "NotOwner",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "pendingOwner", type: "address" },
      { internalType: "address", name: "caller", type: "address" },
    ],
    name: "NotPendingOwner",
    type: "error",
  },
  { inputs: [], name: "SwitchOff", type: "error" },
  { inputs: [], name: "ZeroAddress", type: "error" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "uint256", name: "new_checkIn_amount", type: "uint256" }], name: "ActionValuesChanged", type: "event" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "account", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "remains", type: "uint256" },
    ],
    name: "CheckedIn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "account", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "CheckedInUSDT",
    type: "event",
  },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "new_owner", type: "address" }], name: "OwnerChanged", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "new_pendingOwner", type: "address" }], name: "PendingOwnerChanged", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "new_priceFeedAddress", type: "address" }], name: "PriceFeedAddressChanged", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "new_receiver", type: "address" }], name: "ReceiverChanged", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "bool", name: "new_switch", type: "bool" }], name: "SwitchChanged", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "new_usdtAddress", type: "address" }], name: "USDTAddressChanged", type: "event" },
  { inputs: [], name: "acceptOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "checkIn", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [], name: "checkInUSDT", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "getActionValues", outputs: [{ internalType: "uint256[1]", name: "", type: "uint256[1]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getCheckInAmount", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getCheckInAmountUSDT", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getOwner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getPendingOwner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getPriceFeedAddress", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getReceiver", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getSwitch", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getUSDTAddress", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256[1]", name: "new_actionValues", type: "uint256[1]" }], name: "setActionValues", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "new_owner", type: "address" }], name: "setOwner", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "new_priceFeedAddress", type: "address" }], name: "setPriceFeedAddress", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "new_receiver", type: "address" }], name: "setReceiver", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "bool", name: "new_switch", type: "bool" }], name: "setSwitch", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "new_usdtAddress", type: "address" }], name: "setUSDTAddress", outputs: [], stateMutability: "nonpayable", type: "function" },
];

module.exports = { ABI };
