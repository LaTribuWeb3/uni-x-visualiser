const tokens = [
  {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    name: "WETH",
    decimals: 18,
  },
  {
    address: "0x0000000000000000000000000000000000000000",
    name: "ETH",
    decimals: 18,
  },
  {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    name: "USDC",
    decimals: 6,
  },
  {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    name: "USDT",
    decimals: 6,
  },
  {
    address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
    name: "PEPE",
    decimals: 18,
  },
  {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    name: "WBTC",
    decimals: 8,
  },
  {
    address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",
    name: "MATIC",
    decimals: 18,
  },
  {
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    name: "DAI",
    decimals: 18,
  },
  {
    address: "0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85",
    name: "FETCH",
    decimals: 18,
  },
  {
    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    name: "UNI",
    decimals: 18,
  },
  {
    address: "0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3",
    name: "ONDO",
    decimals: 18,
  },
  {
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    name: "LINK",
    decimals: 18,
  },
  {
    address: "0xE0f63A424a4439cBE457D80E4f4b51aD25b2c56C",
    name: "SPX",
    decimals: 8,
  },
  {
    address: "0xaaeE1A9723aaDB7afA2810263653A34bA2C21C7a",
    name: "MOG",
    decimals: 18,
  },
  {
    address: "0x761D38e5ddf6ccf6Cf7c55759d5210750B5D60F3",
    name: "ELON",
    decimals: 18,
  },
  {
    address: "0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1",
    name: "ARB",
    decimals: 18,
  },
  {
    address: "0x57e114B691Db790C35207b2e685D4A43181e6061",
    name: "ENA",
    decimals: 18,
  },
  {
    address: "0x9D65fF81a3c488d585bBfb0Bfe3c7707c7917f54",
    name: "SSV",
    decimals: 18,
  },
  {
    address: "0x0B010000b7624eb9B3DfBC279673C76E9D29D5F7",
    name: "OBOL",
    decimals: 18,
  },
  {
    address: "0x88909D489678dD17aA6D9609F89B0419Bf78FD9a",
    name: "L3",
    decimals: 18,
  },
  {
    address: "0xbe0Ed4138121EcFC5c0E56B40517da27E6c5226B",
    name: "ATH",
    decimals: 18,
  },
  {
    address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
    name: "CRV",
    decimals: 18,
  },
  {
    address: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942",
    name: "MANA",
    decimals: 18,
  },
  {
    address: "0x7420B4b9a0110cdC71fB720908340C03F9Bc03EC",
    name: "JASMY",
    decimals: 18,
  },
  {
    address: "0x643C4E15d7d62Ad0aBeC4a9BD4b001aA3Ef52d66",
    name: "SYRUP",
    decimals: 18,
  },
  {
    address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    name: "cbBTC",
    decimals: 8,
  },
  {
    address: "0x00c83aeCC790e8a4453e5dD3B0B4b3680501a7A7",
    name: "SKL",
    decimals: 18,
  },
  {
    address: "0xfd418e42783382E86Ae91e445406600Ba144D162",
    name: "ZRC",
    decimals: 18,
  },
  {
    address: "0xfF20817765cB7f73d4bde2e66e067E58D11095C2",
    name: "AMP",
    decimals: 18,
  },
  {
    address: "0xfB7B4564402E5500dB5bB6d63Ae671302777C75a",
    name: "DEXT",
    decimals: 18,
  },
  {
    address: "0xA35923162C49cF95e6BF26623385eb431ad920D3",
    name: "TURBO",
    decimals: 18,
  },
  {
    address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
    name: "SHIB",
    decimals: 18,
  },
  {
    address: "0x6985884C4392D348587B19cb9eAAf157F13271cd",
    name: "ZRO",
    decimals: 18,
  },
  {
    address: "0xe53EC727dbDEB9E2d5456c3be40cFF031AB40A55",
    name: "SUPER",
    decimals: 18,
  },
  {
    address: "0xc944E90C64B2c07662A292be6244BDf05Cda44a7",
    name: "GRT",
    decimals: 18,
  },
  {
    address: "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704",
    name: "cbETH",
    decimals: 18,
  },
  {
    address: "0xD31a59c85aE9D8edEFeC411D448f90841571b89c",
    name: "SOL",
    decimals: 9,
  },
  {
    address: "0x1Bbe973BeF3a977Fc51CbED703E8ffDEfE001Fed",
    name: "PORTAL",
    decimals: 18,
  },
  {
    address: "0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd",
    name: "GUSD",
    decimals: 2,
  },
  {
    address: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
    name: "aEthPYUSD",
    decimals: 6,
  },
  {
    address: "0x467719aD09025FcC6cF6F8311755809d45a5E5f3",
    name: "AXL",
    decimals: 6,
  },
  {
    address: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
    name: "COMP",
    decimals: 18,
  },
  {
    address: "0xEd04915c23f00A313a544955524EB7DBD823143d",
    name: "ACH",
    decimals: 8,
  },
  {
    address: "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
    name: "SNX",
    decimals: 18,
  },
  {
    address: "0x9BE89D2a4cd102D8Fecc6BF9dA793be995C22541",
    name: "BBTC",
    decimals: 8,
  },
  {
    address: "0x77E06c9eCCf2E797fd462A92B6D7642EF85b0A44",
    name: "wTAO",
    decimals: 9,
  },
  {
    address: "0x595832F8FC6BF59c85C527fEC3740A1b7a361269",
    name: "POWR",
    decimals: 6,
  },
  {
    address: "0x6055Dc6Ff1077eebe5e6D2BA1a1f53d7Ef8430dE",
    name: "ES",
    decimals: 6,
  },
  {
    address: "0x582d872A1B094FC48F5DE31D3B73F2D9bE47def1",
    name: "TONCOIN",
    decimals: 9,
  },
  {
    address: "0xA2cd3D43c775978A96BdBf12d733D5A1ED94fb18",
    name: "XCN",
    decimals: 18,
  },
  {
    address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
    name: "AAVE",
    decimals: 18,
  },
  {
    address: "0x44108f0223A3C3028F5Fe7AEC7f9bb2E66beF82F",
    name: "ACX",
    decimals: 18,
  },
  {
    address: "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c",
    name: "EURC",
    decimals: 6,
  },
  {
    address: "0x3073f7aAA4DB83f95e9FFf17424F71D4751a3073",
    name: "MOVE",
    decimals: 8,
  },
  {
    address: "0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b",
    name: "CRO",
    decimals: 8,
  },
  {
    address: "0x226bb599a12C826476e3A771454697EA52E9E220",
    name: "PRO",
    decimals: 8,
  },
  {
    address: "0x4C19596f5aAfF459fA38B0f7eD92F11AE6543784",
    name: "TRU",
    decimals: 8,
  },
  {
    address: "0x27054b13b1B798B345b591a4d22e6562d47eA75a",
    name: "AST",
    decimals: 4,
  },
  {
    address: "0xB64ef51C888972c908CFacf59B47C1AfBC0Ab8aC",
    name: "STORJ",
    decimals: 8,
  },
  {
    address: "0x607F4C5BB672230e8672085532f7e901544a7375",
    name: "RLC",
    decimals: 9,
  },
  {
    address: "0xd1d2Eb1B1e90B638588728b4130137D262C87cae",
    name: "GALA",
    decimals: 8,
  },
  {
    address: "0x14feE680690900BA0ccCfC76AD70Fd1b95D10e16",
    name: "PAAL",
    decimals: 9,
  },
  {
    "address": "0x0258F474786DdFd37ABCE6df6BBb1Dd5dfC4434a",
    "name": "ORN",
    "decimals": 8
  },
  {
    "address": "0x037A54AaB062628C9Bbae1FDB1583c195585fe41",
    "name": "LCX",
    "decimals": 18
  },
  {
    "address": "0x0391D2021f89DC339F60Fff84546EA23E337750f",
    "name": "BOND",
    "decimals": 18
  },
  {
    "address": "0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919",
    "name": "RAI",
    "decimals": 18
  },
  {
    "address": "0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828",
    "name": "UMA",
    "decimals": 18
  },
  {
    "address": "0x08d967bb0134F2d07f7cfb6E246680c53927DD30",
    "name": "MATH",
    "decimals": 18
  },
  {
    "address": "0x090185f2135308BaD17527004364eBcC2D37e5F6",
    "name": "SPELL",
    "decimals": 18
  },
  {
    "address": "0x0954906da0Bf32d5479e25f46056d22f08464cab",
    "name": "INDEX",
    "decimals": 18
  },
  {
    "address": "0x09a3EcAFa817268f77BE1283176B946C4ff2E608",
    "name": "MIR",
    "decimals": 18
  },
  {
    "address": "0x0b38210ea11411557c13457D4dA7dC6ea731B88a",
    "name": "API3",
    "decimals": 18
  },
  {
    "address": "0x0bb217E40F8a5Cb79Adf04E1aAb60E5abd0dfC1e",
    "name": "SWFTC",
    "decimals": 8
  },
  {
    "address": "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
    "name": "YFI",
    "decimals": 18
  },
  {
    "address": "0x0D3CbED3f69EE050668ADF3D9Ea57241cBa33A2B",
    "name": "PDA",
    "decimals": 18
  },
  {
    "address": "0x0D8775F648430679A709E98d2b0Cb6250d2887EF",
    "name": "BAT",
    "decimals": 18
  },
  {
    "address": "0x0f2D719407FdBeFF09D87557AbB7232601FD9F29",
    "name": "SYN",
    "decimals": 18
  },
  {
    "address": "0x10dea67478c5F8C5E2D90e5E9B26dBe60c54d800",
    "name": "TAIKO",
    "decimals": 18
  },
  {
    "address": "0x111111111117dC0aa78b770fA6A738034120C302",
    "name": "1INCH",
    "decimals": 18
  },
  {
    "address": "0x12970E6868f88f6557B76120662c1B3E50A646bf",
    "name": "LADYS",
    "decimals": 18
  },
  {
    "address": "0x14778860E937f509e651192a90589dE711Fb88a9",
    "name": "CYBER",
    "decimals": 18
  },
  {
    "address": "0x152649eA73beAb28c5b49B26eb48f7EAD6d4c898",
    "name": "Cake",
    "decimals": 18
  },
  {
    "address": "0x163f8C2467924be0ae7B5347228CABF260318753",
    "name": "WLD",
    "decimals": 18
  },
  {
    "address": "0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671",
    "name": "NMR",
    "decimals": 18
  },
  {
    "address": "0x18084fbA666a33d37592fA2633fD49a74DD93a88",
    "name": "tBTC",
    "decimals": 18
  },
  {
    "address": "0x18aAA7115705e8be94bfFEBDE57Af9BFc265B998",
    "name": "AUDIO",
    "decimals": 18
  },
  {
    "address": "0x1A4b46696b2bB4794Eb3D4c26f1c55F9170fa4C5",
    "name": "BIT",
    "decimals": 18
  },
  {
    "address": "0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8",
    "name": "EURA",
    "decimals": 18
  },
  {
    "address": "0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C",
    "name": "BNT",
    "decimals": 18
  },
  {
    "address": "0x221657776846890989a759BA2973e427DfF5C9bB",
    "name": "REPv2",
    "decimals": 18
  },
  {
    "address": "0x259338656198eC7A76c729514D3CB45Dfbf768A1",
    "name": "RESOLV",
    "decimals": 18
  },
  {
    "address": "0x25f8087EAD173b73D6e8B84329989A8eEA16CF73",
    "name": "YGG",
    "decimals": 18
  },
  {
    "address": "0x27702a26126e0B3702af63Ee09aC4d1A084EF628",
    "name": "ALEPH",
    "decimals": 18
  },
  {
    "address": "0x28d38dF637dB75533bD3F71426F3410a82041544",
    "name": "PROMPT",
    "decimals": 18
  },
  {
    "address": "0x2A79324c19Ef2B89Ea98b23BC669B7E7c9f8A517",
    "name": "WAXP",
    "decimals": 8
  },
  {
    "address": "0x2dfF88A56767223A5529eA5960Da7A3F5f766406",
    "name": "ID",
    "decimals": 18
  },
  {
    "address": "0x2e9d63788249371f1DFC918a52f8d799F4a38C94",
    "name": "TOKE",
    "decimals": 18
  },
  {
    "address": "0x30D20208d987713f46DFD34EF128Bb16C404D10f",
    "name": "SD",
    "decimals": 18
  },
  {
    "address": "0x31c8EAcBFFdD875c74b94b077895Bd78CF1E64A3",
    "name": "RAD",
    "decimals": 18
  },
  {
    "address": "0x320623b8E4fF03373931769A31Fc52A4E78B5d70",
    "name": "RSR",
    "decimals": 18
  },
  {
    "address": "0x32353A6C91143bfd6C7d363B546e62a9A2489A20",
    "name": "AGLD",
    "decimals": 18
  },
  {
    "address": "0x33349B282065b0284d756F0577FB39c158F935e6",
    "name": "MPL",
    "decimals": 18
  },
  {
    "address": "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0",
    "name": "FXS",
    "decimals": 18
  },
  {
    "address": "0x3472A5A71965499acd81997a54BBA8D852C6E53d",
    "name": "BADGER",
    "decimals": 18
  },
  {
    "address": "0x3506424F91fD33084466F402d5D97f05F8e3b4AF",
    "name": "CHZ",
    "decimals": 18
  },
  {
    "address": "0x3593D125a4f7849a1B059E64F4517A86Dd60c95d",
    "name": "OM",
    "decimals": 18
  },
  {
    "address": "0x3597bfD533a99c9aa083587B074434E61Eb0A258",
    "name": "DENT",
    "decimals": 8
  },
  {
    "address": "0x362bc847A3a9637d3af6624EeC853618a43ed7D2",
    "name": "PRQ",
    "decimals": 18
  },
  {
    "address": "0x36E66fbBce51e4cD5bd3C62B637Eb411b18949D4",
    "name": "OMNI",
    "decimals": 18
  },
  {
    "address": "0x3845badAde8e6dFF049820680d1F14bD3903a5d0",
    "name": "SAND",
    "decimals": 18
  },
  {
    "address": "0x38E68A37E401F7271568CecaAc63c6B1e19130B4",
    "name": "BANANA",
    "decimals": 18
  },
  {
    "address": "0x39fBBABf11738317a448031930706cd3e612e1B9",
    "name": "WXRP",
    "decimals": 18
  },
  {
    "address": "0x3B50805453023a91a8bf641e279401a0b23FA6F9",
    "name": "REZ",
    "decimals": 18
  },
  {
    "address": "0x3E5A19c91266aD8cE2477B91585d1856B84062dF",
    "name": "A8",
    "decimals": 18
  },
  {
    "address": "0x3f80B1c54Ae920Be41a77f8B902259D48cf24cCf",
    "name": "KERNEL",
    "decimals": 18
  },
  {
    "address": "0x408e41876cCCDC0F92210600ef50372656052a38",
    "name": "REN",
    "decimals": 18
  },
  {
    "address": "0x41545f8b9472D758bB669ed8EaEEEcD7a9C4Ec29",
    "name": "FORT",
    "decimals": 18
  },
  {
    "address": "0x419D0d8BdD9aF5e606Ae2232ed285Aff190E711b",
    "name": "FUN",
    "decimals": 8
  },
  {
    "address": "0x42bBFa2e77757C645eeaAd1655E0911a7553Efbc",
    "name": "BOBA",
    "decimals": 18
  },
  {
    "address": "0x430EF9263E76DAE63c84292C3409D61c598E9682",
    "name": "PYR",
    "decimals": 18
  },
  {
    "address": "0x44ff8620b8cA30902395A7bD3F2407e1A091BF73",
    "name": "VIRTUAL",
    "decimals": 18
  },
  {
    "address": "0x4507cEf57C46789eF8d1a19EA45f4216bae2B528",
    "name": "TOKEN",
    "decimals": 9
  },
  {
    "address": "0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6",
    "name": "POL",
    "decimals": 18
  },
  {
    "address": "0x45804880De22913dAFE09f4980848ECE6EcbAf78",
    "name": "PAXG",
    "decimals": 18
  },
  {
    "address": "0x464eBE77c293E473B48cFe96dDCf88fcF7bFDAC0",
    "name": "KRL",
    "decimals": 18
  },
  {
    "address": "0x4691937a7508860F876c9c0a2a617E7d9E945D4B",
    "name": "WOO",
    "decimals": 18
  },
  {
    "address": "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D",
    "name": "CTSI",
    "decimals": 18
  },
  {
    "address": "0x4a220E6096B25EADb88358cb44068A3248254675",
    "name": "QNT",
    "decimals": 18
  },
  {
    "address": "0x4B1E80cAC91e2216EEb63e29B957eB91Ae9C2Be8",
    "name": "JUP",
    "decimals": 18
  },
  {
    "address": "0x4d1C297d39C5c1277964D0E3f8Aa901493664530",
    "name": "PUFFER",
    "decimals": 18
  },
  {
    "address": "0x4d224452801ACEd8B2F0aebE155379bb5D594381",
    "name": "APE",
    "decimals": 18
  },
  {
    "address": "0x4E15361FD6b4BB609Fa63C81A2be19d873717870",
    "name": "FTM",
    "decimals": 18
  },
  {
    "address": "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B",
    "name": "CVX",
    "decimals": 18
  },
  {
    "address": "0x4F9254C83EB525f9FCf346490bbb3ed28a81C667",
    "name": "CELR",
    "decimals": 18
  },
  {
    "address": "0x4Fabb145d64652a948d72533023f6E7A623C7C53",
    "name": "BUSD",
    "decimals": 18
  },
  {
    "address": "0x5283D291DBCF85356A21bA090E6db59121208b44",
    "name": "BLUR",
    "decimals": 18
  },
  {
    "address": "0x55296f69f40Ea6d20E478533C15A6B08B654E758",
    "name": "XYO",
    "decimals": 18
  },
  {
    "address": "0x553F4cB7256D8fC038E91d36Cb63fa7C13b624AB",
    "name": "TANSSI",
    "decimals": 12
  },
  {
    "address": "0x56072C95FAA701256059aa122697B133aDEd9279",
    "name": "SKY",
    "decimals": 18
  },
  {
    "address": "0x5732046A883704404F284Ce41FfADd5b007FD668",
    "name": "BLZ",
    "decimals": 18
  },
  {
    "address": "0x579CEa1889991f68aCc35Ff5c3dd0621fF29b0C9",
    "name": "IQ",
    "decimals": 18
  },
  {
    "address": "0x57B946008913B82E4dF85f501cbAeD910e58D26C",
    "name": "POND",
    "decimals": 18
  },
  {
    "address": "0x58b6A8A3302369DAEc383334672404Ee733aB239",
    "name": "LPT",
    "decimals": 18
  },
  {
    "address": "0x58D97B57BB95320F9a05dC918Aef65434969c2B2",
    "name": "MORPHO",
    "decimals": 18
  },
  {
    "address": "0x594DaaD7D77592a2b97b725A7AD59D7E188b5bFa",
    "name": "APU",
    "decimals": 18
  },
  {
    "address": "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32",
    "name": "LDO",
    "decimals": 18
  },
  {
    "address": "0x5aFE3855358E112B5647B952709E6165e1c1eEEe",
    "name": "SAFE",
    "decimals": 18
  },
  {
    "address": "0x5Cf04716BA20127F1E2297AdDCf4B5035000c9eb",
    "name": "NKN",
    "decimals": 18
  },
  {
    "address": "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0",
    "name": "LUSD",
    "decimals": 18
  },
  {
    "address": "0x6033F7f88332B8db6ad452B7C6D5bB643990aE3f",
    "name": "LSK",
    "decimals": 18
  },
  {
    "address": "0x6123B0049F904d730dB3C36a31167D9d4121fA6B",
    "name": "RBN",
    "decimals": 18
  },
  {
    "address": "0x626E8036dEB333b408Be468F951bdB42433cBF18",
    "name": "AIOZ",
    "decimals": 18
  },
  {
    "address": "0x62D0A8458eD7719FDAF978fe5929C6D342B0bFcE",
    "name": "BEAM",
    "decimals": 18
  },
  {
    "address": "0x64Bc2cA1Be492bE7185FAA2c8835d9b824c8a194",
    "name": "BIGTIME",
    "decimals": 18
  },
  {
    "address": "0x66761Fa41377003622aEE3c7675Fc7b5c1C2FaC5",
    "name": "CPOOL",
    "decimals": 18
  },
  {
    "address": "0x675B68AA4d9c2d3BB3F0397048e62E6B7192079c",
    "name": "FUEL",
    "decimals": 9
  },
  {
    "address": "0x6810e776880C02933D47DB1b9fc05908e5386b96",
    "name": "GNO",
    "decimals": 18
  },
  {
    "address": "0x69af81e73A73B40adF4f3d4223Cd9b1ECE623074",
    "name": "MASK",
    "decimals": 18
  },
  {
    "address": "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
    "name": "SUSHI",
    "decimals": 18
  },
  {
    "address": "0x6c5bA91642F10282b576d91922Ae6448C9d52f4E",
    "name": "PHA",
    "decimals": 18
  },
  {
    "address": "0x6c6EE5e31d828De241282B9606C8e98Ea48526E2",
    "name": "HOT",
    "decimals": 18
  },
  {
    "address": "0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24",
    "name": "RNDR",
    "decimals": 18
  },
  {
    "address": "0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D",
    "name": "LQTY",
    "decimals": 18
  },
  {
    "address": "0x6E2a43be0B1d33b726f0CA3b8de60b3482b8b050",
    "name": "ARKM",
    "decimals": 18
  },
  {
    "address": "0x6fB3e0A217407EFFf7Ca062D46c26E5d60a14d69",
    "name": "IOTX",
    "decimals": 18
  },
  {
    "address": "0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96",
    "name": "XSGD",
    "decimals": 6
  },
  {
    "address": "0x71Ab77b7dbB4fa7e017BC15090b2163221420282",
    "name": "HIGH",
    "decimals": 18
  },
  {
    "address": "0x72e4f9F808C49A2a61dE9C5896298920Dc4EEEa9",
    "name": "BITCOIN",
    "decimals": 8
  },
  {
    "address": "0x744d70FDBE2Ba4CF95131626614a1763DF805B9E",
    "name": "SNT",
    "decimals": 18
  },
  {
    "address": "0x7613C48E0cd50E42dD9Bf0f6c235063145f6f8DC",
    "name": "PIRATE",
    "decimals": 18
  },
  {
    "address": "0x767FE9EDC9E0dF98E07454847909b5E959D7ca0E",
    "name": "ILV",
    "decimals": 18
  },
  {
    "address": "0x77FbA179C79De5B7653F68b5039Af940AdA60ce0",
    "name": "FORTH",
    "decimals": 18
  },
  {
    "address": "0x7A58c0Be72BE218B41C608b7Fe7C5bB630736C71",
    "name": "PEOPLE",
    "decimals": 18
  },
  {
    "address": "0x7ABc8A5768E6bE61A6c693a6e4EAcb5B60602C4D",
    "name": "CXT",
    "decimals": 18
  },
  {
    "address": "0x7DD9c5Cba05E151C895FDe1CF355C9A1D5DA6429",
    "name": "GLM",
    "decimals": 18
  },
  {
    "address": "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    "name": "wstETH",
    "decimals": 18
  },
  {
    "address": "0x808507121B80c02388fAd14726482e061B8da827",
    "name": "PENDLE",
    "decimals": 18
  },
  {
    "address": "0x812Ba41e071C7b7fA4EBcFB62dF5F45f6fA853Ee",
    "name": "Neiro",
    "decimals": 9
  },
  {
    "address": "0x814e0908b12A99FeCf5BC101bB5d0b8B5cDf7d26",
    "name": "MDT",
    "decimals": 18
  },
  {
    "address": "0x8207c1FfC5B6804F6024322CcF34F29c3541Ae26",
    "name": "OGN",
    "decimals": 18
  },
  {
    "address": "0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4",
    "name": "ANKR",
    "decimals": 18
  },
  {
    "address": "0x83e6f1E41cdd28eAcEB20Cb649155049Fac3D5Aa",
    "name": "POLS",
    "decimals": 18
  },
  {
    "address": "0x8457CA5040ad67fdebbCC8EdCE889A335Bc0fbFB",
    "name": "ALT",
    "decimals": 18
  },
  {
    "address": "0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419",
    "name": "DIA",
    "decimals": 18
  },
  {
    "address": "0x853d955aCEf822Db058eb8505911ED77F175b99e",
    "name": "FRAX",
    "decimals": 18
  },
  {
    "address": "0x85Eee30c52B0b379b046Fb0F85F4f3Dc3009aFEC",
    "name": "KEEP",
    "decimals": 18
  },
  {
    "address": "0x88dF592F8eb5D7Bd38bFeF7dEb0fBc02cf3778a0",
    "name": "TRB",
    "decimals": 18
  },
  {
    "address": "0x8DE5B80a0C1B02Fe4976851D030B36122dbb8624",
    "name": "VANRY",
    "decimals": 18
  },
  {
    "address": "0x8E870D67F660D95d5be530380D0eC0bd388289E1",
    "name": "USDP",
    "decimals": 18
  },
  {
    "address": "0x8f8221aFbB33998d8584A2B05749bA73c37a938a",
    "name": "REQ",
    "decimals": 18
  },
  {
    "address": "0x92D6C1e31e14520e676a687F0a93788B716BEff5",
    "name": "DYDX",
    "decimals": 18
  },
  {
    "address": "0x93A2Db22B7c736B341C32Ff666307F4a9ED910F5",
    "name": "HYPER",
    "decimals": 18
  },
  {
    "address": "0x944824290CC12F31ae18Ef51216A223Ba4063092",
    "name": "MASA",
    "decimals": 18
  },
  {
    "address": "0x967da4048cD07aB37855c090aAF366e4ce1b9F48",
    "name": "OCEAN",
    "decimals": 18
  },
  {
    "address": "0x9813037ee2218799597d83D4a5B6F3b6778218d9",
    "name": "BONE",
    "decimals": 18
  },
  {
    "address": "0x9992eC3cF6A55b00978cdDF2b27BC6882d88D1eC",
    "name": "POLY",
    "decimals": 18
  },
  {
    "address": "0x9C7BEBa8F6eF6643aBd725e45a4E8387eF260649",
    "name": "G",
    "decimals": 18
  },
  {
    "address": "0x9E32b13ce7f2E80A01932B42553652E053D6ed8e",
    "name": "Metis",
    "decimals": 18
  },
  {
    "address": "0xA0Ef786Bf476fE0810408CaBA05E536aC800ff86",
    "name": "MYRIA",
    "decimals": 18
  },
  {
    "address": "0xa1d0E215a23d7030842FC67cE582a6aFa3CCaB83",
    "name": "YFII",
    "decimals": 18
  },
  {
    "address": "0xa1faa113cbE53436Df28FF0aEe54275c13B40975",
    "name": "ALPHA",
    "decimals": 18
  },
  {
    "address": "0xaA7a9CA87d3694B5755f213B5D04094b8d0F0A6F",
    "name": "TRAC",
    "decimals": 18
  },
  {
    "address": "0xAC57De9C1A09FeC648E93EB98875B212DB0d460B",
    "name": "BabyDoge",
    "decimals": 9
  },
  {
    "address": "0xADE00C28244d5CE17D72E40330B1c318cD12B7c3",
    "name": "ADX",
    "decimals": 18
  },
  {
    "address": "0xAE12C5930881c53715B369ceC7606B70d8EB229f",
    "name": "C98",
    "decimals": 18
  },
  {
    "address": "0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6",
    "name": "STG",
    "decimals": 18
  },
  {
    "address": "0xB0c7a3Ba49C7a6EaBa6cD4a96C55a1391070Ac9A",
    "name": "MAGIC",
    "decimals": 18
  },
  {
    "address": "0xB0fFa8000886e57F86dd5264b9582b2Ad87b2b91",
    "name": "W",
    "decimals": 18
  },
  {
    "address": "0xb131f4A55907B10d1F0A50d8ab8FA09EC342cd74",
    "name": "MEME",
    "decimals": 18
  },
  {
    "address": "0xb23d80f5FefcDDaa212212F028021B41DEd428CF",
    "name": "PRIME",
    "decimals": 18
  },
  {
    "address": "0xb3999F658C0391d94A37f7FF328F3feC942BcADC",
    "name": "HFT",
    "decimals": 18
  },
  {
    "address": "0xB528edBef013aff855ac3c50b381f253aF13b997",
    "name": "AEVO",
    "decimals": 18
  },
  {
    "address": "0xB62132e35a6c13ee1EE0f84dC5d40bad8d815206",
    "name": "NEXO",
    "decimals": 18
  },
  {
    "address": "0xB705268213D593B8FD88d3FDEFF93AFF5CbDcfAE",
    "name": "IDEX",
    "decimals": 18
  },
  {
    "address": "0xB98d4C97425d9908E66E53A6fDf673ACcA0BE986",
    "name": "ABT",
    "decimals": 18
  },
  {
    "address": "0xba100000625a3754423978a60c9317c58a424e3D",
    "name": "BAL",
    "decimals": 18
  },
  {
    "address": "0xBA11D00c5f74255f56a5E366F4F77f5A186d7f55",
    "name": "BAND",
    "decimals": 18
  },
  {
    "address": "0xba5BDe662c17e2aDFF1075610382B9B691296350",
    "name": "RARE",
    "decimals": 18
  },
  {
    "address": "0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b",
    "name": "AXS",
    "decimals": 18
  },
  {
    "address": "0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD",
    "name": "LRC",
    "decimals": 18
  },
  {
    "address": "0xBBc2AE13b23d715c30720F079fcd9B4a74093505",
    "name": "ERN",
    "decimals": 18
  },
  {
    "address": "0xbC396689893D065F41bc2C6EcbeE5e0085233447",
    "name": "PERP",
    "decimals": 18
  },
  {
    "address": "0xbdF43ecAdC5ceF51B7D1772F722E40596BC1788B",
    "name": "SEI",
    "decimals": 18
  },
  {
    "address": "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
    "name": "ENS",
    "decimals": 18
  },
  {
    "address": "0xc20059e0317DE91738d13af027DfC4a50781b066",
    "name": "SPK",
    "decimals": 18
  },
  {
    "address": "0xc221b7E65FfC80DE234bbB6667aBDd46593D34F0",
    "name": "wCFG",
    "decimals": 18
  },
  {
    "address": "0xc43C6bfeDA065fE2c4c11765Bf838789bd0BB5dE",
    "name": "RED",
    "decimals": 18
  },
  {
    "address": "0xC4441c2BE5d8fA8126822B9929CA0b81Ea0DE38E",
    "name": "USUAL",
    "decimals": 18
  },
  {
    "address": "0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B",
    "name": "TRIBE",
    "decimals": 18
  },
  {
    "address": "0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d",
    "name": "FOX",
    "decimals": 18
  },
  {
    "address": "0xc98D64DA73a6616c42117b582e832812e7B8D57F",
    "name": "RSS3",
    "decimals": 18
  },
  {
    "address": "0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766",
    "name": "STRK",
    "decimals": 18
  },
  {
    "address": "0xcb1592591996765Ec0eFc1f92599A19767ee5ffA",
    "name": "BIO",
    "decimals": 18
  },
  {
    "address": "0xCdF7028ceAB81fA0C6971208e83fa7872994beE5",
    "name": "T",
    "decimals": 18
  },
  {
    "address": "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E",
    "name": "FLOKI",
    "decimals": 9
  },
  {
    "address": "0xD0eC028a3D21533Fdd200838F39c85B03679285D",
    "name": "NEWT",
    "decimals": 18
  },
  {
    "address": "0xD33526068D116cE69F19A9ee46F0bd304F21A51f",
    "name": "RPL",
    "decimals": 18
  },
  {
    "address": "0xD8912C10681D8B21Fd3742244f44658dBA12264E",
    "name": "PLU",
    "decimals": 18
  },
  {
    "address": "0xd9Fcd98c322942075A5C3860693e9f4f03AAE07b",
    "name": "EUL",
    "decimals": 18
  },
  {
    "address": "0xdab396cCF3d84Cf2D07C4454e10C8A6F5b008D2b",
    "name": "GFI",
    "decimals": 18
  },
  {
    "address": "0xdBB7a34Bf10169d6d2D0d02A6cbb436cF4381BFa",
    "name": "ZENT",
    "decimals": 18
  },
  {
    "address": "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
    "name": "USDS",
    "decimals": 18
  },
  {
    "address": "0xdd974D5C2e2928deA5F71b9825b8b646686BD200",
    "name": "KNC",
    "decimals": 18
  },
  {
    "address": "0xDDB3422497E61e13543BeA06989C0789117555c5",
    "name": "COTI",
    "decimals": 18
  },
  {
    "address": "0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F",
    "name": "GTC",
    "decimals": 18
  },
  {
    "address": "0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB",
    "name": "COW",
    "decimals": 18
  },
  {
    "address": "0xDf801468a808a32656D2eD2D2d80B72A129739f4",
    "name": "CUBE",
    "decimals": 8
  },
  {
    "address": "0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30",
    "name": "INJ",
    "decimals": 18
  },
  {
    "address": "0xE41d2489571d322189246DaFA5ebDe1F4699F498",
    "name": "ZRX",
    "decimals": 18
  },
  {
    "address": "0xE6Bfd33F52d82Ccb5b37E16D3dD81f9FFDAbB195",
    "name": "SXT",
    "decimals": 18
  },
  {
    "address": "0xe6fd75ff38Adca4B97FBCD938c86b98772431867",
    "name": "ELA",
    "decimals": 18
  },
  {
    "address": "0xec53bF9167f50cDEB3Ae105f56099aaaB9061F83",
    "name": "EIGEN",
    "decimals": 18
  },
  {
    "address": "0xec67005c4E498Ec7f55E092bd1d35cbC47C91892",
    "name": "MLN",
    "decimals": 18
  },
  {
    "address": "0xEDB171C18cE90B633DB442f2A6F72874093b49Ef",
    "name": "WAMPL",
    "decimals": 18
  },
  {
    "address": "0xEE2a03Aa6Dacf51C18679C516ad5283d8E7C2637",
    "name": "NEIRO",
    "decimals": 9
  },
  {
    "address": "0xef3A930e1FfFFAcd2fc13434aC81bD278B0ecC8d",
    "name": "FIS",
    "decimals": 18
  },
  {
    "address": "0xf091867EC603A6628eD83D274E835539D82e9cc8",
    "name": "ZETA",
    "decimals": 18
  },
  {
    "address": "0xF17e65822b568B3903685a7c9F496CF7656Cc6C2",
    "name": "BICO",
    "decimals": 18
  },
  {
    "address": "0xf1f955016EcbCd7321c7266BccFB96c68ea5E49b",
    "name": "RLY",
    "decimals": 18
  },
  {
    "address": "0xf293d23BF2CDc05411Ca0edDD588eb1977e8dcd4",
    "name": "SYLO",
    "decimals": 18
  },
  {
    "address": "0xF411903cbC70a74d22900a5DE66A2dda66507255",
    "name": "VRA",
    "decimals": 18
  },
  {
    "address": "0xF433089366899D83a9f26A773D59ec7eCF30355e",
    "name": "MTL",
    "decimals": 8
  },
  {
    "address": "0xf4d2888d29D722226FafA5d9B24F9164c092421E",
    "name": "LOOKS",
    "decimals": 18
  },
  {
    "address": "0xF5581dFeFD8Fb0e4aeC526bE659CFaB1f8c781dA",
    "name": "HOPR",
    "decimals": 18
  },
  {
    "address": "0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF",
    "name": "IMX",
    "decimals": 18
  },
  {
    "address": "0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c",
    "name": "ENJ",
    "decimals": 18
  },
  {
    "address": "0xFca59Cd816aB1eaD66534D82bc21E7515cE441CF",
    "name": "RARI",
    "decimals": 18
  },
  {
    "address": "0xFe0c30065B384F05761f15d0CC899D4F9F9Cc0eB",
    "name": "ETHFI",
    "decimals": 18
  }
];

export const getTokenName = (tokenAddress: string) => {
  return tokens.find((token) => token.address === tokenAddress)?.name || tokenAddress;
};

export const getTokenDecimals = (tokenAddress: string) => {
  return tokens.find((token) => token.address === tokenAddress)?.decimals || 18;
};

export const formatVolume = (value: number): { display: string; full: string } => {
  if (value === 0) return { display: '0', full: '0' };
  
  const absValue = Math.abs(value);
  let display: string;
  let full: string;
  
  if (absValue >= 1e9) {
    display = `${(value / 1e9).toFixed(2)}B`;
    full = value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  } else if (absValue >= 1e6) {
    display = `${(value / 1e6).toFixed(2)}M`;
    full = value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  } else if (absValue >= 1e3) {
    display = `${(value / 1e3).toFixed(2)}K`;
    full = value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  } else if (absValue >= 1) {
    display = value.toFixed(2);
    full = value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  } else {
    display = value.toFixed(6);
    full = value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  }
  
  return { display, full };
};

