import assert from "node:assert/strict";
import test from "node:test";

import { inArray } from "drizzle-orm";

import { client, db } from "@/lib/drizzle";
import {
  createBankAccount,
  createCreditCard,
  createWallet,
} from "@/lib/drizzle/queries";
import { bankAccounts, creditCards, wallets } from "@/lib/drizzle/schema";

type PgError = Error & {
  code?: string;
  constraint_name?: string;
  constraint?: string;
  cause?: unknown;
  message: string;
};

type CleanupState = {
  walletIds: string[];
  bankAccountIds: string[];
  creditCardIds: string[];
};

function createCleanupState(): CleanupState {
  return {
    walletIds: [],
    bankAccountIds: [],
    creditCardIds: [],
  };
}

function makePrefix(label: string): string {
  return `query-test-${label}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function cleanup(state: CleanupState) {
  await deleteByIds(bankAccounts, bankAccounts.id, state.bankAccountIds);
  await deleteByIds(creditCards, creditCards.id, state.creditCardIds);
  await deleteByIds(wallets, wallets.id, state.walletIds);
}

async function deleteByIds<TColumn extends { name: string }>(
  table: { id: TColumn },
  column: TColumn,
  ids: string[],
) {
  if (ids.length === 0) return;

  await db
    .delete(table as never)
    .where(inArray(column as never, [...new Set(ids)]));
}

function trackRow<TRow extends { id: string }>(
  state: CleanupState,
  table: keyof CleanupState,
  row: TRow,
): TRow {
  state[table].push(row.id);
  return row;
}

async function expectConstraintError(
  action: () => Promise<unknown>,
  expectedConstraint: string,
) {
  try {
    await action();
    assert.fail(`Expected database error for constraint ${expectedConstraint}`);
  } catch (error) {
    const pgError = findPgError(error);

    assert.ok(pgError, `Could not extract Postgres error from: ${String(error)}`);
    assert.equal(
      pgError.constraint_name ?? pgError.constraint,
      expectedConstraint,
      pgError.message,
    );
  }
}

function findPgError(error: unknown): PgError | null {
  if (!error || typeof error !== "object") return null;

  const pgError = error as PgError;
  if (pgError.constraint_name || pgError.constraint) {
    return pgError;
  }

  if ("cause" in pgError) {
    return findPgError(pgError.cause);
  }

  return null;
}

test("drizzle create queries", async (t) => {
  await t.test("createWallet inserts and returns default currency", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("wallet-default");

    try {
      const wallet = trackRow(
        state,
        "walletIds",
        await createWallet({ name: `${prefix}-wallet` }),
      );

      assert.equal(wallet.name, `${prefix}-wallet`);
      assert.equal(wallet.currencyCode, "BRL");
    } finally {
      await cleanup(state);
    }
  });

  await t.test("createWallet inserts and returns explicit currency", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("wallet-explicit");

    try {
      const wallet = trackRow(
        state,
        "walletIds",
        await createWallet({
          name: `${prefix}-wallet`,
          currencyCode: "USD",
        }),
      );

      assert.equal(wallet.name, `${prefix}-wallet`);
      assert.equal(wallet.currencyCode, "USD");
    } finally {
      await cleanup(state);
    }
  });

  await t.test("createBankAccount inserts and returns default initial balance", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("bank-default");

    try {
      const wallet = trackRow(
        state,
        "walletIds",
        await createWallet({ name: `${prefix}-wallet` }),
      );
      const bankAccount = trackRow(
        state,
        "bankAccountIds",
        await createBankAccount({
          walletId: wallet.id,
          name: `${prefix}-bank`,
          institutionName: `${prefix}-institution`,
        }),
      );

      assert.equal(bankAccount.walletId, wallet.id);
      assert.equal(bankAccount.initialBalance, "0.00");
      assert.equal(bankAccount.institutionName, `${prefix}-institution`);
    } finally {
      await cleanup(state);
    }
  });

  await t.test("createBankAccount fails for nonexistent wallet", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("bank-invalid-wallet");

    try {
      await expectConstraintError(
        () =>
          createBankAccount({
            walletId: "11111111-1111-1111-1111-111111111111",
            name: `${prefix}-bank`,
            institutionName: `${prefix}-institution`,
            initialBalance: "25.10",
          }),
        "bank_accounts_wallet_id_wallets_id_fk",
      );
    } finally {
      await cleanup(state);
    }
  });

  await t.test("createCreditCard inserts and returns provided values", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("card-valid");

    try {
      const wallet = trackRow(
        state,
        "walletIds",
        await createWallet({ name: `${prefix}-wallet` }),
      );
      const creditCard = trackRow(
        state,
        "creditCardIds",
        await createCreditCard({
          walletId: wallet.id,
          name: `${prefix}-card`,
          institutionName: `${prefix}-institution`,
          creditLimit: "5000.00",
          initialBalance: "120.30",
          closingDay: 8,
          dueDay: 15,
          lastFour: "4242",
        }),
      );

      assert.equal(creditCard.walletId, wallet.id);
      assert.equal(creditCard.creditLimit, "5000.00");
      assert.equal(creditCard.initialBalance, "120.30");
      assert.equal(creditCard.closingDay, 8);
      assert.equal(creditCard.dueDay, 15);
      assert.equal(creditCard.lastFour, "4242");
    } finally {
      await cleanup(state);
    }
  });

  await t.test("createCreditCard inserts and returns default numeric values", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("card-defaults");

    try {
      const wallet = trackRow(
        state,
        "walletIds",
        await createWallet({ name: `${prefix}-wallet` }),
      );
      const creditCard = trackRow(
        state,
        "creditCardIds",
        await createCreditCard({
          walletId: wallet.id,
          name: `${prefix}-card`,
          institutionName: `${prefix}-institution`,
          closingDay: 10,
          dueDay: 20,
        }),
      );

      assert.equal(creditCard.creditLimit, "0.00");
      assert.equal(creditCard.initialBalance, "0.00");
      assert.equal(creditCard.lastFour, null);
    } finally {
      await cleanup(state);
    }
  });

  await t.test("createCreditCard fails for invalid closing day", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("card-invalid-closing");

    try {
      const wallet = trackRow(
        state,
        "walletIds",
        await createWallet({ name: `${prefix}-wallet` }),
      );

      await expectConstraintError(
        () =>
          createCreditCard({
            walletId: wallet.id,
            name: `${prefix}-card`,
            institutionName: `${prefix}-institution`,
            closingDay: 0,
            dueDay: 20,
          }),
        "credit_cards_closing_day_range",
      );
    } finally {
      await cleanup(state);
    }
  });

  await t.test("createCreditCard fails for negative credit limit", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("card-negative-limit");

    try {
      const wallet = trackRow(
        state,
        "walletIds",
        await createWallet({ name: `${prefix}-wallet` }),
      );

      await expectConstraintError(
        () =>
          createCreditCard({
            walletId: wallet.id,
            name: `${prefix}-card`,
            institutionName: `${prefix}-institution`,
            creditLimit: "-1.00",
            closingDay: 10,
            dueDay: 20,
          }),
        "credit_cards_credit_limit_non_negative",
      );
    } finally {
      await cleanup(state);
    }
  });
});

test.after(async () => {
  await client.end();
});
