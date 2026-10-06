// League assets on Robinhood Chain: every Robinhood Stock Token that has a
// Chainlink price feed (35 stocks and funds, 6 Oct 2026). A token without a
// feed can't be scored on-chain, so it can't go into a basket.
//
// Addresses: Robinhood's asset registry (api.robinhood.com/rhj/assets).
// Feeds: Chainlink's Robinhood mainnet directory. Prices are a snapshot of
// those feeds, used for the UI when live prices aren't reachable.
//
// Testnet: Robinhood's faucet hands out TSLA, AMZN, PLTR, AMD (and NFLX,
// which has no feed). There are no Chainlink feeds on testnet, so testnet
// rounds are priced by the same stocks' MAINNET feeds.

import { assignCardColors } from "./palette";

export type AssetKind = "stock" | "etf";

export interface StockInfo {
  /** Token symbol: Robinhood Stock Tokens use the plain ticker. */
  symbol: string;
  ticker: string;
  name: string;
  kind: AssetKind;
  price: number;    // USD per token (feed price: share price × multiplier)
  /** Mainnet token (chain 4663). */
  address: `0x${string}`;
  /** Chainlink price feed proxy on mainnet (8 decimals, multiplier-adjusted). */
  feed: `0x${string}`;
  /** Faucet token on testnet (chain 46630), when the faucet hands it out. */
  testnet?: `0x${string}`;
  /** Company brand colour: only a hint for picking `color`. */
  brand: string;
  /** The stock's own card colour (unique per stock, src/ui/data/palette.ts). */
  color: string;
  /** Pale tint of `color` for the bottom of the card. */
  colorLight: string;
  /** Company logo (Robinhood's CDN, saved under public/logos). */
  logo?: string;
}

type Raw = Omit<StockInfo, "symbol" | "color" | "colorLight" | "logo">;

const s = (ticker: string, name: string, kind: AssetKind, price: number, address: string, feed: string, brand: string, testnet?: string): Raw => ({
  ticker,
  name,
  kind,
  price,
  address: address as `0x${string}`,
  feed: feed as `0x${string}`,
  brand,
  ...(testnet ? { testnet: testnet as `0x${string}` } : {}),
});

// Most recognisable first: they get first pick of the colours.
const RAW: Raw[] = [
  s("NVDA", "NVIDIA", "stock", 240.66, "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15", "#76B900"),
  s("TSLA", "Tesla", "stock", 381.32, "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", "0x4A1166a659A55625345e9515b32adECea5547C38", "#E31937", "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E"),
  s("AAPL", "Apple", "stock", 332.51, "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9", "0x6B22A786bAa607d76728168703a39Ea9C99f2cD0", "#A2AAAD"),
  s("MSFT", "Microsoft", "stock", 534.09, "0xe93237C50D904957Cf27E7B1133b510C669c2e74", "0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E", "#0078D4"),
  s("AMZN", "Amazon", "stock", 255.63, "0x12f190a9F9d7D37a250758b26824B97CE941bF54", "0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C", "#FF9900", "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02"),
  s("GOOGL", "Alphabet Class A", "stock", 347.43, "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3", "0xF6f373a037c30F0e5010d854385cA89185AE638b", "#4285F4"),
  s("META", "Meta Platforms", "stock", 744.49, "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35", "0x7C38C00C30BEe9378381E7B6135d7283356D71b1", "#0866FF"),
  s("AMD", "AMD", "stock", 657.21, "0x86923f96303D656E4aa86D9d42D1e57ad2023fdC", "0x943A29E7ae51A4798823ca9eEd2ed533B2A22C72", "#111111", "0x71178BAc73cBeb415514eB542a8995b82669778d"),
  s("PLTR", "Palantir Technologies", "stock", 191.93, "0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A", "0x820ABedFF239034956B7A9d2F0a331f9F075eB4c", "#1B1C1F", "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0"),
  s("TSM", "Taiwan Semiconductor Manufacturing", "stock", 483.65, "0x58FfE4a942d3885bAa22D7520691F611EF09e7AA", "0x874cF94aa8eC88Fd9560094dD065f2fB3E41Fc2F", "#C8102E"),
  s("COIN", "Coinbase", "stock", 188.42, "0x6330D8C3178a418788dF01a47479c0ce7CCF450b", "0xA3a468A452940B7D6b69991207B508c609a98Ef2", "#0052FF"),
  s("SPCX", "Space Exploration Technologies Corp. Class A Common Stock", "stock", 173.38, "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa", "0xB265810950ba6c5C0Ff821c9963014a56fD8Bffb", "#1A1A1A"),
  s("ASML", "ASML Holding NV", "stock", 1842.06, "0x47F93d52cBeC7C6D2CfC080e154002370a60dAEA", "0xB4106147E8cce40b7d46124090d373A71b70f87D", "#0F238C"),
  s("MU", "Micron Technology", "stock", 1065.55, "0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD", "0x425EEFdCf05ed6526C3cE61Af99429A228a6d596", "#0065B3"),
  s("ORCL", "Oracle", "stock", 146.1, "0xb0992820E760d836549ba69BC7598b4af75dEE03", "0x0e6a64a2B58A6693a531E6c555f3A5d042eEA844", "#C74634"),
  s("INTC", "Intel", "stock", 113.95, "0xc72b96e0E48ecd4DC75E1e45396e26300BC39681", "0x3f390C5C24628Ac7C489515402235FeAD71D1913", "#0071C5"),
  s("MSTR", "Strategy Inc.", "stock", 164.88, "0xec262a75e413fAfD0dF80480274532C79D42da09", "0x396118bdFB181e6240E74D243F266B061c0edc3D", "#F7931A"),
  s("CRCL", "Circle Internet Group", "stock", 84.5, "0xdF0992E440dD0be65BD8439b609d6D4366bf1CB5", "0x6652eDf64bA3731C4F2D3ce821A0Fb1f1f6b482a", "#3D7EFF"),
  s("BABA", "Alibaba", "stock", 108.49, "0xad25Ac6C84D497db898fa1E8387bf6Af3532a1c4", "0x62Cc8F9b5f56a33c9C8A60c8B92779f523c4E984", "#FF6A00"),
  s("DELL", "Dell", "stock", 577.07, "0x941AE714EC6D8130c7B75d67160Ca08f1e7d11Dd", "0x1C6c8cADBe02E19129c39dDB92281cE4c0bf206b", "#007DB8"),
  s("SNDK", "Sandisk Corporation", "stock", 1673.74, "0xB90A19fF0Af67f7779afF50A882A9CfF42446400", "0xfb133Fa4B7b385802B693a293606682Df47109A3", "#E2001A"),
  s("NBIS", "Nebius Group", "stock", 253.18, "0x9D9c6684F596F66a64C030B93A886D51Fd4D7931", "0xE1D87B116Ba0fe898998f1D140339D1fA1E09705", "#D9F84A"),
  s("CRWV", "CoreWeave", "stock", 91.55, "0x5f10A1C971B69e47e059e1dC91901B59b3fB49C3", "0xe1b3aABCAFAd1c94708dc1367dcfF8Aa4407487C", "#5B3DF5"),
  s("RKLB", "Rocket Lab Corporation", "stock", 74.14, "0x3b14C39E89D60D627b42a1A4CA45b5bb45Fc12e2", "0x045477BF65Aef6f4F2386ad0164579e48381CC74", "#0B0B0C"),
  s("IONQ", "IonQ", "stock", 43.4, "0x558378E000D634A36593E338eBacdd6207640EfE", "0x22EfeC4919baf55F360E0EDee4AbEB26DE4971eb", "#2E2BFF"),
  s("RGTI", "Rigetti Computing", "stock", 15.11, "0x284358abc07F9359f19f4b5b4aC91901Be2597Ba", "0x2A045cF1C49c61c166C036d2f06FA2D2d984f765", "#3F51B5"),
  s("GME", "GameStop", "stock", 24.74, "0x1b0E319c6A659F002271B69dB8A7df2F911c153E", "0x27C71df6A64fB476468EdF256CF72c038baB5B67", "#E2231A"),
  s("CLSK", "CleanSpark", "stock", 12.38, "0xcBB95BBF36099d34dA091dc6Fa6F49EfA257Cee3", "0x810c12D3a554Bc47fd39597Fe3b3AAC4941F50eF", "#00B2A9"),
  s("USAR", "USA Rare Earth", "stock", 13.92, "0xd917B029C761D264c6A312BBbcDA868658eF86a6", "0xA994d3684e8400A6c8078226925779FdeE682DD9", "#8B5E3C"),
  s("SPY", "SPDR S&P 500 ETF Trust", "etf", 780.08, "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C", "0x319724394D3A0e3669269846abE664Cd621f9f6A", "#1D2B53"),
  s("QQQ", "Invesco QQQ", "etf", 759.94, "0xD5f3879160bc7c32ebb4dC785F8a4F505888de68", "0x80901d846d5D7B030F26B480776EE3b29374C2ae", "#00205B"),
  s("EWY", "iShares MSCI South Korea fund", "etf", 188.58, "0x7f0aBeF0C07280F82c6a08ead09dEd6BAE2C13Fc", "0xEFdf54610B62A7753Ec30bDc380847c12D32e1D1", "#000000"),
  s("SGOV", "iShares 0-3 Month Treasury Bond", "etf", 101.19, "0x92FD66527192E3e61d4DDd13322Aa222DE86F9B5", "0xa0DF4ee0fFf975306345875E3548Fcc519577A11", "#2E7D32"),
  s("SLV", "iShares Silver Trust", "etf", 55.31, "0x411eFb0E7f985935DAec3D4C3ebaEa0d0AD7D89f", "0x209b73908e92Ae021826eD79609845451Ecba2ce", "#A8A9AD"),
  s("USO", "United States Oil Fund", "etf", 144.08, "0xa30FA36Db767ad9eD3f7a60fC79526fB4d56D344", "0x75a9c76Ef439e2C7c2E5a34Ab105EcFe3766431c", "#1F1F1F"),
];

const COLORS = assignCardColors(RAW.map((r) => ({ key: r.ticker, brand: r.brand })));

export const STOCKS: StockInfo[] = RAW.map((r) => ({
  ...r,
  symbol: r.ticker,
  color: COLORS[r.ticker].c,
  colorLight: COLORS[r.ticker].l,
  logo: `/logos/${r.ticker}.png`,
}));

export const byTicker = (t: string): StockInfo | undefined => STOCKS.find((x) => x.ticker === t.toUpperCase());

/**
 * Showcase-only movement numbers (% since round start). Deterministic so the
 * page renders the same on server and client. Live pages use real snapshots.
 */
export function demoChangePct(ticker: string): number {
  let h = 0;
  for (const c of ticker) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Math.round((((h % 900) - 380) / 100) * 100) / 100; // about −3.8% … +5.2%
}
