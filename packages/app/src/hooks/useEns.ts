import { useState, useEffect } from 'react'
import { EnsPublicClient, createEnsPublicClient } from '@ensdomains/ensjs'
import { mainnet, sepolia } from 'viem/chains'
import { fallback, http } from 'viem'

const mode = import.meta.env.MODE

// Never call `http()` without a URL here. viem then falls back to the chain's
// default public RPC (currently https://eth.merkle.io for mainnet), which sends
// no Access-Control-Allow-Origin header and rate-limits aggressively. In a browser
// the pre-flight is rejected, every ENS read fails with "Failed to fetch", and the
// module wizards hang on the Snapshot ENS field.
const infuraId = import.meta.env.VITE_INFURA_ID

const rpcUrls = (chainId: number): string[] => {
  const infura =
    infuraId && chainId === mainnet.id
      ? [`https://mainnet.infura.io/v3/${infuraId}`]
      : infuraId
        ? [`https://sepolia.infura.io/v3/${infuraId}`]
        : []

  // CORS-enabled public fallbacks, so a single provider outage cannot brick the wizard.
  const publicRpcs =
    chainId === mainnet.id
      ? ['https://ethereum-rpc.publicnode.com', 'https://eth.drpc.org']
      : ['https://ethereum-sepolia-rpc.publicnode.com', 'https://sepolia.drpc.org']

  return [...infura, ...publicRpcs]
}

const useEns = () => {
  const [ensClient, setEnsClient] = useState<EnsPublicClient<any, any> | undefined>(undefined)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<boolean>(false)

  useEffect(() => {
    const initializeClient = async () => {
      try {
        const chain = mode === 'development' ? sepolia : mainnet
        
        // Add ENS registry contract (required by ENS client but missing in viem chain definitions)
        const chainWithEns = {
          ...chain,
          contracts: {
            ...chain.contracts,
            ensRegistry: {
              // https://docs.ens.domains/resolution/#reverse-resolution
              address: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as const,
            },
          },
        } as const

        const client = createEnsPublicClient({
          chain: chainWithEns,
          transport: fallback(rpcUrls(chain.id).map((url) => http(url))),
        })
        setEnsClient(client as EnsPublicClient<any, any>)
      } catch (e) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    initializeClient()
  }, [])

  return { ensClient, loading, error }
}

export default useEns
