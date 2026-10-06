/**
 * Agent-key mode: one object that unites the two non-custodial halves of an
 * autonomous agent's economy.
 *
 *   const wallet = createAgentWallet({
 *     apiKey: process.env.AGENTRAIL_PROTOCOL_API_KEY!,   // the governed vault side
 *     secretKey: process.env.AGENT_SECRET_KEY!, // the agent's OWN Stellar key
 *   });
 *
 *   await wallet.topUp(5);                       // pull USDC from the vault (policy-bounded)
 *   const res = await wallet.fetch(url, init);   // pay an x402 service with those funds
 *
 * The agent PULLS working capital from the AgentRailProtocol vault with `topUp` (a normal
 * bounded spend: the release is enforced on-chain by the owner's policy), then
 * SPENDS it autonomously on external x402 services with `fetch` (each 402 is
 * settled by the agent's own key). The platform never holds the agent's key, and
 * the vault owner sets the ceiling the agent can ever pull. This is the same USDC
 * on both legs: the vault dispenses the Stellar testnet/mainnet USDC that the
 * x402 exact-scheme settles in, so the two economies compose without a swap.
 */
import { Keypair } from '@stellar/stellar-sdk';
import { createSpender, type Budget, type AgentRailProtocolClient, type Spend } from './spender.js';
import { createPayingFetch } from './payments/x402.js';

export interface AgentWalletOptions {
  /** Scoped AgentRailProtocol API key (cc_...): the governed vault side. */
  apiKey: string;
  /** The agent's OWN Stellar secret. Non-custodial: only the agent ever holds it. */
  secretKey: string;
  /** AgentRailProtocol API base. Defaults to AGENTRAIL_PROTOCOL_API_URL or http://localhost:4100. */
  apiUrl?: string;
  /** x402 network (default STELLAR_NETWORK or `stellar:testnet`). */
  network?: string;
  /** Override fetch for the AgentRailProtocol control calls (tests). */
  fetchImpl?: typeof fetch;
  /** Timeout for AgentRailProtocol control calls in ms. */
  timeoutMs?: number;
}

export interface AgentWallet {
  /** The agent's Stellar address (its own hot wallet, funded by `topUp`). */
  readonly address: string;
  /**
   * Pull USDC from the AgentRailProtocol vault into THIS wallet, bounded on-chain by the
   * owner's policy. Resolves once the spend is accepted; funds land when the
   * release settles (poll the returned spend, or `getBudget`).
   */
  topUp(amount: number, opts?: { reason?: string; policyId?: string }): Promise<Spend>;
  /** A `fetch` that transparently settles x402 402 challenges from THIS wallet. */
  readonly fetch: typeof fetch;
  /** Remaining AgentRailProtocol budget the owner still lets this agent pull. */
  getBudget(): Promise<Budget>;
  /** The underlying spender client, for anything else (disburse, limits, activity). */
  readonly agentRailProtocol: AgentRailProtocolClient;
}

export function createAgentWallet(options: AgentWalletOptions): AgentWallet {
  if (!options.secretKey) throw new Error('createAgentWallet: secretKey is required');
  // Throws on a malformed secret, which is the validation we want up front.
  const address = Keypair.fromSecret(options.secretKey).publicKey();

  const agentRailProtocol = createSpender({
    apiKey: options.apiKey,
    apiUrl: options.apiUrl,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
  });
  const payingFetch = createPayingFetch({ secretKey: options.secretKey, network: options.network });

  return {
    address,
    agentRailProtocol,
    fetch: payingFetch,
    getBudget: () => agentRailProtocol.getBudget(),
    topUp: (amount, opts) =>
      agentRailProtocol.pay(address, amount, {
        reason: opts?.reason ?? 'agent wallet top-up',
        ...(opts?.policyId ? { policyId: opts.policyId } : {}),
      }),
  };
}
