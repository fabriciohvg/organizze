import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/drizzle";
import { bankAccounts, creditCards, wallets } from "@/lib/drizzle/schema";

type WalletInsert = typeof wallets.$inferInsert;
type BankAccountInsert = typeof bankAccounts.$inferInsert;
type CreditCardInsert = typeof creditCards.$inferInsert;

export type CreateWalletInput = {
  name: WalletInsert["name"];
  currencyCode?: WalletInsert["currencyCode"];
};

export type CreateBankAccountInput = {
  walletId: BankAccountInsert["walletId"];
  name: BankAccountInsert["name"];
  institutionName: BankAccountInsert["institutionName"];
  initialBalance?: BankAccountInsert["initialBalance"];
};

export type CreateCreditCardInput = {
  walletId: CreditCardInsert["walletId"];
  name: CreditCardInsert["name"];
  institutionName: CreditCardInsert["institutionName"];
  creditLimit?: CreditCardInsert["creditLimit"];
  initialBalance?: CreditCardInsert["initialBalance"];
  closingDay: CreditCardInsert["closingDay"];
  dueDay: CreditCardInsert["dueDay"];
  lastFour?: CreditCardInsert["lastFour"];
};

export async function createWallet(input: CreateWalletInput) {
  const [wallet] = await db
    .insert(wallets)
    .values({
      name: input.name,
      ...(input.currencyCode ? { currencyCode: input.currencyCode } : {}),
    })
    .returning();

  return wallet;
}

export async function createBankAccount(input: CreateBankAccountInput) {
  const [bankAccount] = await db
    .insert(bankAccounts)
    .values({
      walletId: input.walletId,
      name: input.name,
      institutionName: input.institutionName,
      ...(input.initialBalance !== undefined
        ? { initialBalance: input.initialBalance }
        : {}),
    })
    .returning();

  return bankAccount;
}

export async function createCreditCard(input: CreateCreditCardInput) {
  const [creditCard] = await db
    .insert(creditCards)
    .values({
      walletId: input.walletId,
      name: input.name,
      institutionName: input.institutionName,
      closingDay: input.closingDay,
      dueDay: input.dueDay,
      ...(input.creditLimit !== undefined
        ? { creditLimit: input.creditLimit }
        : {}),
      ...(input.initialBalance !== undefined
        ? { initialBalance: input.initialBalance }
        : {}),
      ...(input.lastFour !== undefined ? { lastFour: input.lastFour } : {}),
    })
    .returning();

  return creditCard;
}

export async function getLatestWallet() {
  const [wallet] = await db
    .select()
    .from(wallets)
    .orderBy(desc(wallets.createdAt))
    .limit(1);

  return wallet ?? null;
}

export async function listBankAccountsByWalletId(walletId: string) {
  return db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.walletId, walletId))
    .orderBy(desc(bankAccounts.createdAt));
}

export async function listCreditCardsByWalletId(walletId: string) {
  return db
    .select()
    .from(creditCards)
    .where(eq(creditCards.walletId, walletId))
    .orderBy(desc(creditCards.createdAt));
}
