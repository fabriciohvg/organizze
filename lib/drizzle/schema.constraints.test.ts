import assert from "node:assert/strict";
import test from "node:test";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { client, db } from ".";

import {
  bankAccounts,
  creditCards,
  transactionEntries,
  transactions,
  transactionSeries,
  transactionSeriesEntries,
  wallets,
} from "@/lib/drizzle/schema";

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
  transactionSeriesIds: string[];
  transactionSeriesEntryIds: string[];
  transactionIds: string[];
  transactionEntryIds: string[];
};

function createCleanupState(): CleanupState {
  return {
    walletIds: [],
    bankAccountIds: [],
    creditCardIds: [],
    transactionSeriesIds: [],
    transactionSeriesEntryIds: [],
    transactionIds: [],
    transactionEntryIds: [],
  };
}

function makePrefix(label: string): string {
  return `db-test-${label}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function cleanup(state: CleanupState) {
  await deleteByIds(
    transactionEntries,
    transactionEntries.id,
    state.transactionEntryIds,
  );
  await deleteByIds(transactions, transactions.id, state.transactionIds);
  await deleteByIds(
    transactionSeriesEntries,
    transactionSeriesEntries.id,
    state.transactionSeriesEntryIds,
  );
  await deleteByIds(
    transactionSeries,
    transactionSeries.id,
    state.transactionSeriesIds,
  );
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

async function createWallet(
  state: CleanupState,
  prefix: string,
  currencyCode?: string,
) {
  const [wallet] = await db
    .insert(wallets)
    .values({
      name: `${prefix}-wallet`,
      ...(currencyCode ? { currencyCode } : {}),
    })
    .returning();

  state.walletIds.push(wallet.id);
  return wallet;
}

async function createBankAccount(
  state: CleanupState,
  walletId: string,
  prefix: string,
  initialBalance = "0",
) {
  const [bankAccount] = await db
    .insert(bankAccounts)
    .values({
      walletId,
      name: `${prefix}-bank`,
      institutionName: `${prefix}-institution`,
      initialBalance,
    })
    .returning();

  state.bankAccountIds.push(bankAccount.id);
  return bankAccount;
}

async function createCreditCard(
  state: CleanupState,
  walletId: string,
  prefix: string,
  overrides?: Partial<typeof creditCards.$inferInsert>,
) {
  const [creditCard] = await db
    .insert(creditCards)
    .values({
      walletId,
      name: `${prefix}-card`,
      institutionName: `${prefix}-institution`,
      creditLimit: "1000",
      initialBalance: "0",
      closingDay: 10,
      dueDay: 20,
      lastFour: "4242",
      ...overrides,
    })
    .returning();

  state.creditCardIds.push(creditCard.id);
  return creditCard;
}

async function createTransactionSeries(
  state: CleanupState,
  walletId: string,
  prefix: string,
  overrides?: Partial<typeof transactionSeries.$inferInsert>,
) {
  const [series] = await db
    .insert(transactionSeries)
    .values({
      walletId,
      kind: "expense",
      scheduleKind: "recurring",
      status: "active",
      description: `${prefix}-series`,
      startDate: "2026-01-01",
      endDate: null,
      installmentCount: null,
      generatedThrough: "2026-12-31",
      ...overrides,
    })
    .returning();

  state.transactionSeriesIds.push(series.id);
  return series;
}

async function createTransactionSeriesEntry(
  state: CleanupState,
  seriesId: string,
  prefix: string,
  overrides?: Partial<typeof transactionSeriesEntries.$inferInsert>,
) {
  const [entry] = await db
    .insert(transactionSeriesEntries)
    .values({
      seriesId,
      bankAccountId: null,
      creditCardId: null,
      signedAmount: "-10.00",
      ...overrides,
    })
    .returning();

  state.transactionSeriesEntryIds.push(entry.id);
  return entry;
}

async function createTransaction(
  state: CleanupState,
  walletId: string,
  prefix: string,
  overrides?: Partial<typeof transactions.$inferInsert>,
) {
  const [transaction] = await db
    .insert(transactions)
    .values({
      walletId,
      seriesId: null,
      kind: "expense",
      status: "posted",
      description: `${prefix}-transaction`,
      effectiveDate: "2026-03-27",
      occurrenceIndex: null,
      ...overrides,
    })
    .returning();

  state.transactionIds.push(transaction.id);
  return transaction;
}

async function createTransactionEntry(
  state: CleanupState,
  transactionId: string,
  overrides?: Partial<typeof transactionEntries.$inferInsert>,
) {
  const [entry] = await db
    .insert(transactionEntries)
    .values({
      transactionId,
      bankAccountId: null,
      creditCardId: null,
      signedAmount: "-10.00",
      ...overrides,
    })
    .returning();

  state.transactionEntryIds.push(entry.id);
  return entry;
}

test("database schema constraints", async (t) => {
  await t.test("wallets insert with default currency_code", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("wallet-default");

    try {
      const wallet = await createWallet(state, prefix);
      assert.equal(wallet.currencyCode, "BRL");
    } finally {
      await cleanup(state);
    }
  });

  await t.test("wallets insert with explicit currency_code", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("wallet-explicit");

    try {
      const wallet = await createWallet(state, prefix, "USD");
      assert.equal(wallet.currencyCode, "USD");
    } finally {
      await cleanup(state);
    }
  });

  await t.test(
    "bank_accounts allow creation under existing wallet",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("bank-valid");

      try {
        const wallet = await createWallet(state, prefix);
        const bankAccount = await createBankAccount(
          state,
          wallet.id,
          prefix,
          "50.25",
        );
        assert.equal(bankAccount.walletId, wallet.id);
        assert.equal(bankAccount.initialBalance, "50.25");
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test("bank_accounts reject nonexistent wallet_id", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("bank-invalid-wallet");

    try {
      await expectConstraintError(
        () =>
          db.insert(bankAccounts).values({
            walletId: "11111111-1111-1111-1111-111111111111",
            name: `${prefix}-bank`,
            institutionName: `${prefix}-institution`,
            initialBalance: "0",
          }),
        "bank_accounts_wallet_id_wallets_id_fk",
      );
    } finally {
      await cleanup(state);
    }
  });

  await t.test("bank_accounts delete when wallet is deleted", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("bank-cascade");

    try {
      const wallet = await createWallet(state, prefix);
      const bankAccount = await createBankAccount(state, wallet.id, prefix);

      await db.delete(wallets).where(eq(wallets.id, wallet.id));
      state.walletIds = state.walletIds.filter((id) => id !== wallet.id);
      state.bankAccountIds = state.bankAccountIds.filter(
        (id) => id !== bankAccount.id,
      );

      const rows = await db
        .select({ id: bankAccounts.id })
        .from(bankAccounts)
        .where(eq(bankAccounts.id, bankAccount.id));

      assert.equal(rows.length, 0);
    } finally {
      await cleanup(state);
    }
  });

  await t.test(
    "credit_cards allow creation under existing wallet",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("card-valid");

      try {
        const wallet = await createWallet(state, prefix);
        const creditCard = await createCreditCard(state, wallet.id, prefix);
        assert.equal(creditCard.walletId, wallet.id);
        assert.equal(creditCard.creditLimit, "1000.00");
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test("credit_cards reject nonexistent wallet_id", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("card-invalid-wallet");

    try {
      await expectConstraintError(
        () =>
          db.insert(creditCards).values({
            walletId: "11111111-1111-1111-1111-111111111111",
            name: `${prefix}-card`,
            institutionName: `${prefix}-institution`,
            creditLimit: "1000",
            initialBalance: "0",
            closingDay: 10,
            dueDay: 20,
          }),
        "credit_cards_wallet_id_wallets_id_fk",
      );
    } finally {
      await cleanup(state);
    }
  });

  await t.test("credit_cards reject negative credit_limit", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("card-negative-limit");

    try {
      const wallet = await createWallet(state, prefix);

      await expectConstraintError(
        () =>
          db.insert(creditCards).values({
            walletId: wallet.id,
            name: `${prefix}-card`,
            institutionName: `${prefix}-institution`,
            creditLimit: "-1.00",
            initialBalance: "0",
            closingDay: 10,
            dueDay: 20,
          }),
        "credit_cards_credit_limit_non_negative",
      );
    } finally {
      await cleanup(state);
    }
  });

  await t.test("credit_cards reject closing_day outside 1..31", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("card-invalid-closing");

    try {
      const wallet = await createWallet(state, prefix);

      await expectConstraintError(
        () =>
          db.insert(creditCards).values({
            walletId: wallet.id,
            name: `${prefix}-card`,
            institutionName: `${prefix}-institution`,
            creditLimit: "1000",
            initialBalance: "0",
            closingDay: 0,
            dueDay: 20,
          }),
        "credit_cards_closing_day_range",
      );
    } finally {
      await cleanup(state);
    }
  });

  await t.test("credit_cards reject due_day outside 1..31", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("card-invalid-due");

    try {
      const wallet = await createWallet(state, prefix);

      await expectConstraintError(
        () =>
          db.insert(creditCards).values({
            walletId: wallet.id,
            name: `${prefix}-card`,
            institutionName: `${prefix}-institution`,
            creditLimit: "1000",
            initialBalance: "0",
            closingDay: 10,
            dueDay: 32,
          }),
        "credit_cards_due_day_range",
      );
    } finally {
      await cleanup(state);
    }
  });

  await t.test("credit_cards delete when wallet is deleted", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("card-cascade");

    try {
      const wallet = await createWallet(state, prefix);
      const creditCard = await createCreditCard(state, wallet.id, prefix);

      await db.delete(wallets).where(eq(wallets.id, wallet.id));
      state.walletIds = state.walletIds.filter((id) => id !== wallet.id);
      state.creditCardIds = state.creditCardIds.filter(
        (id) => id !== creditCard.id,
      );

      const rows = await db
        .select({ id: creditCards.id })
        .from(creditCards)
        .where(eq(creditCards.id, creditCard.id));

      assert.equal(rows.length, 0);
    } finally {
      await cleanup(state);
    }
  });

  await t.test(
    "transaction_series allow recurring series with installment_count null",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("series-recurring");

      try {
        const wallet = await createWallet(state, prefix);
        const series = await createTransactionSeries(state, wallet.id, prefix);
        assert.equal(series.scheduleKind, "recurring");
        assert.equal(series.installmentCount, null);
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_series allow installment series with installment_count >= 2 and null end_date",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("series-installment");

      try {
        const wallet = await createWallet(state, prefix);
        const series = await createTransactionSeries(state, wallet.id, prefix, {
          scheduleKind: "installment",
          installmentCount: 12,
          endDate: null,
        });

        assert.equal(series.scheduleKind, "installment");
        assert.equal(series.installmentCount, 12);
        assert.equal(series.endDate, null);
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_series reject installment series with installment_count < 2",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("series-installment-invalid-count");

      try {
        const wallet = await createWallet(state, prefix);

        await expectConstraintError(
          () =>
            db.insert(transactionSeries).values({
              walletId: wallet.id,
              kind: "expense",
              scheduleKind: "installment",
              status: "active",
              description: `${prefix}-series`,
              startDate: "2026-01-01",
              endDate: null,
              installmentCount: 1,
              generatedThrough: "2026-12-31",
            }),
          "transaction_series_installment_count_rule",
        );
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_series reject recurring series with non-null installment_count",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("series-recurring-invalid-count");

      try {
        const wallet = await createWallet(state, prefix);

        await expectConstraintError(
          () =>
            db.insert(transactionSeries).values({
              walletId: wallet.id,
              kind: "expense",
              scheduleKind: "recurring",
              status: "active",
              description: `${prefix}-series`,
              startDate: "2026-01-01",
              endDate: null,
              installmentCount: 3,
              generatedThrough: "2026-12-31",
            }),
          "transaction_series_installment_count_rule",
        );
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test("transaction_series reject nonexistent wallet_id", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("series-invalid-wallet");

    try {
      await expectConstraintError(
        () =>
          db.insert(transactionSeries).values({
            walletId: "11111111-1111-1111-1111-111111111111",
            kind: "expense",
            scheduleKind: "recurring",
            status: "active",
            description: `${prefix}-series`,
            startDate: "2026-01-01",
            endDate: null,
            installmentCount: null,
            generatedThrough: "2026-12-31",
          }),
        "transaction_series_wallet_id_wallets_id_fk",
      );
    } finally {
      await cleanup(state);
    }
  });

  await t.test("transaction_series delete when wallet is deleted", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("series-cascade");

    try {
      const wallet = await createWallet(state, prefix);
      const series = await createTransactionSeries(state, wallet.id, prefix);

      await db.delete(wallets).where(eq(wallets.id, wallet.id));
      state.walletIds = state.walletIds.filter((id) => id !== wallet.id);
      state.transactionSeriesIds = state.transactionSeriesIds.filter(
        (id) => id !== series.id,
      );

      const rows = await db
        .select({ id: transactionSeries.id })
        .from(transactionSeries)
        .where(eq(transactionSeries.id, series.id));

      assert.equal(rows.length, 0);
    } finally {
      await cleanup(state);
    }
  });

  await t.test(
    "transaction_series_entries allow row with only bank_account_id",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("series-entry-bank");

      try {
        const wallet = await createWallet(state, prefix);
        const bankAccount = await createBankAccount(state, wallet.id, prefix);
        const series = await createTransactionSeries(state, wallet.id, prefix);
        const entry = await createTransactionSeriesEntry(
          state,
          series.id,
          prefix,
          {
            bankAccountId: bankAccount.id,
            creditCardId: null,
          },
        );

        assert.equal(entry.bankAccountId, bankAccount.id);
        assert.equal(entry.creditCardId, null);
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_series_entries allow row with only credit_card_id",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("series-entry-card");

      try {
        const wallet = await createWallet(state, prefix);
        const creditCard = await createCreditCard(state, wallet.id, prefix);
        const series = await createTransactionSeries(state, wallet.id, prefix);
        const entry = await createTransactionSeriesEntry(
          state,
          series.id,
          prefix,
          {
            bankAccountId: null,
            creditCardId: creditCard.id,
            signedAmount: "10.00",
          },
        );

        assert.equal(entry.bankAccountId, null);
        assert.equal(entry.creditCardId, creditCard.id);
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_series_entries reject both account columns set",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("series-entry-both");

      try {
        const wallet = await createWallet(state, prefix);
        const bankAccount = await createBankAccount(state, wallet.id, prefix);
        const creditCard = await createCreditCard(state, wallet.id, prefix);
        const series = await createTransactionSeries(state, wallet.id, prefix);

        await expectConstraintError(
          () =>
            db.insert(transactionSeriesEntries).values({
              seriesId: series.id,
              bankAccountId: bankAccount.id,
              creditCardId: creditCard.id,
              signedAmount: "10.00",
            }),
          "transaction_series_entries_exactly_one_account",
        );
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_series_entries reject neither account column set",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("series-entry-neither");

      try {
        const wallet = await createWallet(state, prefix);
        const series = await createTransactionSeries(state, wallet.id, prefix);

        await expectConstraintError(
          () =>
            db.insert(transactionSeriesEntries).values({
              seriesId: series.id,
              bankAccountId: null,
              creditCardId: null,
              signedAmount: "10.00",
            }),
          "transaction_series_entries_exactly_one_account",
        );
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_series_entries reject nonexistent series_id",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("series-entry-invalid-series");

      try {
        const wallet = await createWallet(state, prefix);
        const bankAccount = await createBankAccount(state, wallet.id, prefix);

        await expectConstraintError(
          () =>
            db.insert(transactionSeriesEntries).values({
              seriesId: "11111111-1111-1111-1111-111111111111",
              bankAccountId: bankAccount.id,
              creditCardId: null,
              signedAmount: "-10.00",
            }),
          "transaction_series_entries_series_id_transaction_series_id_fk",
        );
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_series_entries block deleting a referenced bank account",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("series-entry-restrict-bank");

      try {
        const wallet = await createWallet(state, prefix);
        const bankAccount = await createBankAccount(state, wallet.id, prefix);
        const series = await createTransactionSeries(state, wallet.id, prefix);
        await createTransactionSeriesEntry(state, series.id, prefix, {
          bankAccountId: bankAccount.id,
          creditCardId: null,
        });

        await expectConstraintError(
          () =>
            db.delete(bankAccounts).where(eq(bankAccounts.id, bankAccount.id)),
          "transaction_series_entries_bank_account_id_bank_accounts_id_fk",
        );
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_series_entries block deleting a referenced credit card",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("series-entry-restrict-card");

      try {
        const wallet = await createWallet(state, prefix);
        const creditCard = await createCreditCard(state, wallet.id, prefix);
        const series = await createTransactionSeries(state, wallet.id, prefix);
        await createTransactionSeriesEntry(state, series.id, prefix, {
          bankAccountId: null,
          creditCardId: creditCard.id,
          signedAmount: "10.00",
        });

        await expectConstraintError(
          () => db.delete(creditCards).where(eq(creditCards.id, creditCard.id)),
          "transaction_series_entries_credit_card_id_credit_cards_id_fk",
        );
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transactions allow one-time transaction with null series_id",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("tx-onetime");

      try {
        const wallet = await createWallet(state, prefix);
        const transaction = await createTransaction(state, wallet.id, prefix);
        assert.equal(transaction.seriesId, null);
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transactions allow series-backed transaction with valid series_id",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("tx-series");

      try {
        const wallet = await createWallet(state, prefix);
        const series = await createTransactionSeries(state, wallet.id, prefix);
        const transaction = await createTransaction(state, wallet.id, prefix, {
          seriesId: series.id,
          occurrenceIndex: 1,
        });

        assert.equal(transaction.seriesId, series.id);
        assert.equal(transaction.occurrenceIndex, 1);
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test("transactions reject nonexistent wallet_id", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("tx-invalid-wallet");

    try {
      await expectConstraintError(
        () =>
          db.insert(transactions).values({
            walletId: "11111111-1111-1111-1111-111111111111",
            seriesId: null,
            kind: "expense",
            status: "posted",
            description: `${prefix}-transaction`,
            effectiveDate: "2026-03-27",
            occurrenceIndex: null,
          }),
        "transactions_wallet_id_wallets_id_fk",
      );
    } finally {
      await cleanup(state);
    }
  });

  await t.test("transactions reject nonexistent series_id", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("tx-invalid-series");

    try {
      const wallet = await createWallet(state, prefix);

      await expectConstraintError(
        () =>
          db.insert(transactions).values({
            walletId: wallet.id,
            seriesId: "11111111-1111-1111-1111-111111111111",
            kind: "expense",
            status: "posted",
            description: `${prefix}-transaction`,
            effectiveDate: "2026-03-27",
            occurrenceIndex: 1,
          }),
        "transactions_series_id_transaction_series_id_fk",
      );
    } finally {
      await cleanup(state);
    }
  });

  await t.test("transactions reject occurrence_index <= 0", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("tx-invalid-occurrence");

    try {
      const wallet = await createWallet(state, prefix);

      await expectConstraintError(
        () =>
          db.insert(transactions).values({
            walletId: wallet.id,
            seriesId: null,
            kind: "expense",
            status: "posted",
            description: `${prefix}-transaction`,
            effectiveDate: "2026-03-27",
            occurrenceIndex: 0,
          }),
        "transactions_occurrence_index_positive",
      );
    } finally {
      await cleanup(state);
    }
  });

  await t.test("transactions delete when wallet is deleted", async () => {
    const state = createCleanupState();
    const prefix = makePrefix("tx-wallet-cascade");

    try {
      const wallet = await createWallet(state, prefix);
      const transaction = await createTransaction(state, wallet.id, prefix);

      await db.delete(wallets).where(eq(wallets.id, wallet.id));
      state.walletIds = state.walletIds.filter((id) => id !== wallet.id);
      state.transactionIds = state.transactionIds.filter(
        (id) => id !== transaction.id,
      );

      const rows = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(eq(transactions.id, transaction.id));

      assert.equal(rows.length, 0);
    } finally {
      await cleanup(state);
    }
  });

  await t.test(
    "transactions set series_id to null when the series is deleted",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("tx-series-null");

      try {
        const wallet = await createWallet(state, prefix);
        const series = await createTransactionSeries(state, wallet.id, prefix);
        const transaction = await createTransaction(state, wallet.id, prefix, {
          seriesId: series.id,
          occurrenceIndex: 1,
        });

        await db
          .delete(transactionSeries)
          .where(eq(transactionSeries.id, series.id));
        state.transactionSeriesIds = state.transactionSeriesIds.filter(
          (id) => id !== series.id,
        );

        const rows = await db
          .select({ seriesId: transactions.seriesId })
          .from(transactions)
          .where(eq(transactions.id, transaction.id));

        assert.equal(rows.length, 1);
        assert.equal(rows[0]?.seriesId, null);
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_entries allow row with only bank_account_id",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("tx-entry-bank");

      try {
        const wallet = await createWallet(state, prefix);
        const bankAccount = await createBankAccount(state, wallet.id, prefix);
        const transaction = await createTransaction(state, wallet.id, prefix);
        const entry = await createTransactionEntry(state, transaction.id, {
          bankAccountId: bankAccount.id,
          creditCardId: null,
        });

        assert.equal(entry.bankAccountId, bankAccount.id);
        assert.equal(entry.creditCardId, null);
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_entries allow row with only credit_card_id",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("tx-entry-card");

      try {
        const wallet = await createWallet(state, prefix);
        const creditCard = await createCreditCard(state, wallet.id, prefix);
        const transaction = await createTransaction(state, wallet.id, prefix);
        const entry = await createTransactionEntry(state, transaction.id, {
          bankAccountId: null,
          creditCardId: creditCard.id,
          signedAmount: "10.00",
        });

        assert.equal(entry.bankAccountId, null);
        assert.equal(entry.creditCardId, creditCard.id);
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_entries reject both account columns set",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("tx-entry-both");

      try {
        const wallet = await createWallet(state, prefix);
        const bankAccount = await createBankAccount(state, wallet.id, prefix);
        const creditCard = await createCreditCard(state, wallet.id, prefix);
        const transaction = await createTransaction(state, wallet.id, prefix);

        await expectConstraintError(
          () =>
            db.insert(transactionEntries).values({
              transactionId: transaction.id,
              bankAccountId: bankAccount.id,
              creditCardId: creditCard.id,
              signedAmount: "10.00",
            }),
          "transaction_entries_exactly_one_account",
        );
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_entries reject neither account column set",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("tx-entry-neither");

      try {
        const wallet = await createWallet(state, prefix);
        const transaction = await createTransaction(state, wallet.id, prefix);

        await expectConstraintError(
          () =>
            db.insert(transactionEntries).values({
              transactionId: transaction.id,
              bankAccountId: null,
              creditCardId: null,
              signedAmount: "10.00",
            }),
          "transaction_entries_exactly_one_account",
        );
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_entries reject nonexistent transaction_id",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("tx-entry-invalid-transaction");

      try {
        const wallet = await createWallet(state, prefix);
        const bankAccount = await createBankAccount(state, wallet.id, prefix);

        await expectConstraintError(
          () =>
            db.insert(transactionEntries).values({
              transactionId: "11111111-1111-1111-1111-111111111111",
              bankAccountId: bankAccount.id,
              creditCardId: null,
              signedAmount: "-10.00",
            }),
          "transaction_entries_transaction_id_transactions_id_fk",
        );
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_entries block deleting a referenced bank account",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("tx-entry-restrict-bank");

      try {
        const wallet = await createWallet(state, prefix);
        const bankAccount = await createBankAccount(state, wallet.id, prefix);
        const transaction = await createTransaction(state, wallet.id, prefix);
        await createTransactionEntry(state, transaction.id, {
          bankAccountId: bankAccount.id,
          creditCardId: null,
        });

        await expectConstraintError(
          () =>
            db.delete(bankAccounts).where(eq(bankAccounts.id, bankAccount.id)),
          "transaction_entries_bank_account_id_bank_accounts_id_fk",
        );
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_entries block deleting a referenced credit card",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("tx-entry-restrict-card");

      try {
        const wallet = await createWallet(state, prefix);
        const creditCard = await createCreditCard(state, wallet.id, prefix);
        const transaction = await createTransaction(state, wallet.id, prefix);
        await createTransactionEntry(state, transaction.id, {
          bankAccountId: null,
          creditCardId: creditCard.id,
          signedAmount: "10.00",
        });

        await expectConstraintError(
          () => db.delete(creditCards).where(eq(creditCards.id, creditCard.id)),
          "transaction_entries_credit_card_id_credit_cards_id_fk",
        );
      } finally {
        await cleanup(state);
      }
    },
  );

  await t.test(
    "transaction_entries delete when parent transaction is deleted",
    async () => {
      const state = createCleanupState();
      const prefix = makePrefix("tx-entry-cascade");

      try {
        const wallet = await createWallet(state, prefix);
        const bankAccount = await createBankAccount(state, wallet.id, prefix);
        const transaction = await createTransaction(state, wallet.id, prefix);
        const entry = await createTransactionEntry(state, transaction.id, {
          bankAccountId: bankAccount.id,
          creditCardId: null,
        });

        await db
          .delete(transactions)
          .where(eq(transactions.id, transaction.id));
        state.transactionIds = state.transactionIds.filter(
          (id) => id !== transaction.id,
        );
        state.transactionEntryIds = state.transactionEntryIds.filter(
          (id) => id !== entry.id,
        );

        const rows = await db
          .select({ id: transactionEntries.id })
          .from(transactionEntries)
          .where(eq(transactionEntries.id, entry.id));

        assert.equal(rows.length, 0);
      } finally {
        await cleanup(state);
      }
    },
  );
});

test.after(async () => {
  await client.end();
});
