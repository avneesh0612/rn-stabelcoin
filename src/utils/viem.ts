import { baseSepolia } from "viem/chains";
import { client } from "../client";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

export const createViemClients = async () => {
  // Create a public client using Base Sepolia
  const publicClient = client.viem.createPublicClient({
    chain: baseSepolia,
  });

  if (client.wallets.primary?.chain !== "EVM") {
    throw new Error("Primary wallet is not an EVM wallet");
  }

  // Create a wallet client using the primary wallet
  const walletClient = await client.viem.createWalletClient({
    wallet: client.wallets.primary,
    chain: baseSepolia,
  });

  return { publicClient, walletClient };
};

export const sendTransaction = async (
  to: `0x${string}`,
  value: bigint,
  data: `0x${string}` = "0x"
) => {
  try {
    const { walletClient } = await createViemClients();

    // Prepare the transaction
    const transaction = {
      to,
      value,
      data,
    };

    // Send the transaction
    const hash = await walletClient.sendTransaction(transaction);

    return hash;
  } catch (error) {
    console.error("Transaction error:", error);
    throw error;
  }
};

export const getBalance = async (address: `0x${string}`) => {
  try {
    const { publicClient } = await createViemClients();
    const balance = await publicClient.getBalance({ address });
    return balance;
  } catch (error) {
    console.error("Balance check error:", error);
    throw error;
  }
};

export const generateWallet = async () => {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address,
    privateKey,
  };
};

export async function sendTransaction(to: `0x${string}`, value: bigint) {
  const walletViemClient = client.viem.createWalletClient({
    wallet: client.wallets.primary,
    chain: mainnet,
  });
  const hash = await walletViemClient.sendTransaction({ to, value });
  return hash;
}
