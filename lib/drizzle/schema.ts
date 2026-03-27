import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const wallets = pgTable("wallets", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  currencyCode: varchar("currency_code", { length: 3 })
    .notNull()
    .default("BRL"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  walletId: uuid("wallet_id")
    .notNull()
    .references(() => wallets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  institutionName: text("institution_name").notNull(),
  initialBalance: numeric("initial_balance", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const creditCards = pgTable(
  "credit_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    institutionName: text("institution_name").notNull(),
    creditLimit: numeric("credit_limit", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    initialBalance: numeric("initial_balance", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    closingDay: smallint("closing_day").notNull(),
    dueDay: smallint("due_day").notNull(),
    lastFour: varchar("last_four", { length: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("credit_cards_credit_limit_non_negative", sql`${table.creditLimit} >= 0`),
    check("credit_cards_closing_day_range", sql`${table.closingDay} between 1 and 31`),
    check("credit_cards_due_day_range", sql`${table.dueDay} between 1 and 31`),
  ],
);

export const transactionKindEnum = pgEnum("transaction_kind", [
  "expense",
  "income",
  "transfer",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "posted",
]);

export const transactionScheduleKindEnum = pgEnum("transaction_schedule_kind", [
  "installment",
  "recurring",
]);

export const transactionSeriesStatusEnum = pgEnum("transaction_series_status", [
  "active",
  "canceled",
]);

export const transactionSeries = pgTable(
  "transaction_series",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    kind: transactionKindEnum("kind").notNull(),
    scheduleKind: transactionScheduleKindEnum("schedule_kind").notNull(),
    status: transactionSeriesStatusEnum("status").notNull().default("active"),
    description: text("description").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    installmentCount: integer("installment_count"),
    generatedThrough: date("generated_through").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "transaction_series_installment_count_rule",
      sql`(
        (${table.scheduleKind} = 'installment' and ${table.installmentCount} >= 2)
        or
        (${table.scheduleKind} = 'recurring' and ${table.installmentCount} is null)
      )`,
    ),
    check(
      "transaction_series_installment_end_date_rule",
      sql`(
        (${table.scheduleKind} = 'installment' and ${table.endDate} is null)
        or
        (${table.scheduleKind} = 'recurring')
      )`,
    ),
  ],
);

export const transactionSeriesEntries = pgTable(
  "transaction_series_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => transactionSeries.id, { onDelete: "cascade" }),
    bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, {
      onDelete: "restrict",
    }),
    creditCardId: uuid("credit_card_id").references(() => creditCards.id, {
      onDelete: "restrict",
    }),
    signedAmount: numeric("signed_amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "transaction_series_entries_exactly_one_account",
      sql`(
        (${table.bankAccountId} is not null and ${table.creditCardId} is null)
        or
        (${table.bankAccountId} is null and ${table.creditCardId} is not null)
      )`,
    ),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    seriesId: uuid("series_id").references(() => transactionSeries.id, {
      onDelete: "set null",
    }),
    kind: transactionKindEnum("kind").notNull(),
    status: transactionStatusEnum("status").notNull().default("posted"),
    description: text("description").notNull(),
    effectiveDate: date("effective_date").notNull(),
    occurrenceIndex: integer("occurrence_index"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "transactions_occurrence_index_positive",
      sql`${table.occurrenceIndex} is null or ${table.occurrenceIndex} >= 1`,
    ),
    index("transactions_wallet_effective_date_idx").on(
      table.walletId,
      table.effectiveDate,
    ),
    index("transactions_series_effective_date_idx").on(
      table.seriesId,
      table.effectiveDate,
    ),
    index("transactions_wallet_status_effective_date_idx").on(
      table.walletId,
      table.status,
      table.effectiveDate,
    ),
  ],
);

export const transactionEntries = pgTable(
  "transaction_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, {
      onDelete: "restrict",
    }),
    creditCardId: uuid("credit_card_id").references(() => creditCards.id, {
      onDelete: "restrict",
    }),
    signedAmount: numeric("signed_amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "transaction_entries_exactly_one_account",
      sql`(
        (${table.bankAccountId} is not null and ${table.creditCardId} is null)
        or
        (${table.bankAccountId} is null and ${table.creditCardId} is not null)
      )`,
    ),
    index("transaction_entries_transaction_id_idx").on(table.transactionId),
    index("transaction_entries_bank_account_created_at_idx").on(
      table.bankAccountId,
      table.createdAt,
    ),
    index("transaction_entries_credit_card_created_at_idx").on(
      table.creditCardId,
      table.createdAt,
    ),
  ],
);

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = typeof wallets.$inferInsert;

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;

export type CreditCard = typeof creditCards.$inferSelect;
export type InsertCreditCard = typeof creditCards.$inferInsert;

export type TransactionSeries = typeof transactionSeries.$inferSelect;
export type InsertTransactionSeries = typeof transactionSeries.$inferInsert;

export type TransactionSeriesEntry = typeof transactionSeriesEntries.$inferSelect;
export type InsertTransactionSeriesEntry =
  typeof transactionSeriesEntries.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

export type TransactionEntry = typeof transactionEntries.$inferSelect;
export type InsertTransactionEntry = typeof transactionEntries.$inferInsert;
