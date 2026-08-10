import { JsonRpcProvider } from 'ethers'
import { NETWORK } from 'utils/networks'

/**
 * Read-only providers for mainnet/sepolia ENS lookups, used from wizards that may
 * themselves be connected to a different chain.
 *
 * These must point at an endpoint that sends CORS headers. Relying on a library
 * default (viem's `http()` with no URL, or ethers' shared fallback Infura key)
 * puts the wizard at the mercy of a third party's rate limits and CORS policy,
 * and when that endpoint rejects the request the ENS field hangs.
 */

const infuraId = import.meta.env.VITE_INFURA_ID

const RPC_URLS: Record<number, string> = {
  [NETWORK.MAINNET]: infuraId
    ? `https://mainnet.infura.io/v3/${infuraId}`
    : 'https://ethereum-rpc.publicnode.com',
  [NETWORK.SEPOLIA]: infuraId
    ? `https://sepolia.infura.io/v3/${infuraId}`
    : 'https://ethereum-sepolia-rpc.publicnode.com',
}

const makeProvider = (chainId: number) =>
  new JsonRpcProvider(RPC_URLS[chainId], chainId, { staticNetwork: true })

export const getMainnetProvider = () => makeProvider(NETWORK.MAINNET)
export const getSepoliaProvider = () => makeProvider(NETWORK.SEPOLIA)
