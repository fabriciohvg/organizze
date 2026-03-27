# V1 Database Assumptions

This document describes the current assumptions and boundaries of the V1 database model implemented in Drizzle and PostgreSQL.

## Goal

The V1 database is designed to support a minimal personal finance product with:

- wallets
- bank accounts
- credit cards
- income
- expenses
- transfers between bank accounts
- one-time transactions
- installment transactions
- recurring transactions

The current schema is intended to move fast while keeping the data model extensible for future Supabase Auth, shared wallets, categories, and richer credit-card flows.

## Current Tables

The current V1 schema includes these tables:

- `wallets`
- `bank_accounts`
- `credit_cards`
- `transaction_series`
- `transaction_series_entries`
- `transactions`
- `transaction_entries`

The current schema also includes these enums:

- `transaction_kind`: `expense`, `income`, `transfer`
- `transaction_status`: `pending`, `posted`
- `transaction_schedule_kind`: `installment`, `recurring`
- `transaction_series_status`: `active`, `canceled`

## Wallet Assumptions

- A wallet is the top-level container for financial data.
- A wallet has a `name` and a `currency_code`.
- The default wallet currency is `BRL`.
- There is no `user_id` or membership relation yet.
- Shared-wallet support is deferred until auth is introduced.
- Deleting a wallet cascades to its bank accounts, credit cards, transaction series, and transactions.

## Account Assumptions

- `bank_accounts` and `credit_cards` are separate tables in V1.
- A bank account belongs to exactly one wallet.
- A credit card belongs to exactly one wallet.
- A wallet can have many bank accounts and many credit cards.
- `bank_accounts.initial_balance` is the opening balance for the account.
- `credit_cards.initial_balance` is the opening carried debt for the card.
- `credit_cards.credit_limit` must be non-negative.
- `credit_cards.closing_day` and `credit_cards.due_day` must be between `1` and `31`.
- Account deletion is blocked when referenced by transaction entry tables that use `ON DELETE RESTRICT`.

## Transaction Assumptions

- Concrete transactions are stored in `transactions`.
- Account impacts are stored in `transaction_entries`.
- Every transaction belongs to exactly one wallet.
- A transaction may optionally belong to a `transaction_series`.
- Every transaction has one `effective_date`.
- Every transaction has one `description`.
- `transactions.status` is either `pending` or `posted`.
- `transactions.occurrence_index` is optional, but if present it must be `>= 1`.

## Series Assumptions

- Installment and recurring definitions are stored in `transaction_series`.
- Concrete generated rows are stored separately in `transactions`.
- `transaction_series.schedule_kind` is either `installment` or `recurring`.
- `transaction_series.status` is either `active` or `canceled`.
- Installment series require `installment_count >= 2`.
- Recurring series must keep `installment_count` as `null`.
- Installment series must keep `end_date` as `null`.
- Recurring series may have an optional `end_date`.
- `generated_through` is used to track how far a series has already been materialized.
- V1 assumes monthly recurrence only.

## Entry Assumptions

- `transaction_entries` stores concrete account movements for each transaction.
- `transaction_series_entries` stores the template account movements for a series.
- In both entry tables, exactly one of `bank_account_id` or `credit_card_id` must be set.
- `signed_amount` is the stored monetary value used to affect balances.

Signed amount semantics in V1:

- Bank income: positive
- Bank expense: negative
- Transfer out from a bank account: negative
- Transfer in to a bank account: positive
- Credit-card purchase: positive

## Balance Assumptions

The intended balance model for V1 is:

- Bank account balance = `initial_balance + sum(posted bank transaction entries)`
- Credit card balance = `initial_balance + sum(posted credit-card transaction entries)`

Pending transactions exist in the database, but V1 assumes they should not affect reported balances.

## Rules Enforced by the Database

The current database enforces:

- primary keys
- foreign keys
- nullability
- wallet cascade deletion
- series-to-transaction `ON DELETE SET NULL`
- account restrict deletion from entry tables
- credit-card numeric/day checks
- installment and recurring shape checks in `transaction_series`
- one-account-only checks in `transaction_entries`
- one-account-only checks in `transaction_series_entries`
- positive `occurrence_index` when present

## Rules Not Enforced by the Database

The following rules are currently assumed to be application/service-layer responsibilities, not SQL-enforced rules:

- `income` should only target bank accounts
- `expense` should create exactly one entry
- `transfer` should create exactly two bank-account entries
- transfer entries should sum to zero
- all accounts referenced by a transaction should belong to the same wallet as the parent transaction
- all accounts referenced by a transaction series should belong to the same wallet as the parent series
- recurring generation should not overwrite already materialized occurrences
- pending transactions should be excluded from balance queries
- editing one occurrence should not mutate the rest of the series unless explicitly requested

## Explicit V1 Omissions

These areas are intentionally out of scope for the current V1 schema:

- auth integration
- wallet membership
- categories
- tags
- payees or merchants
- transaction notes
- receipt or attachment storage
- credit-card bill payment flows
- credit-card invoices or statements
- multi-currency conversions
- daily or weekly recurrence rules
- reconciliation/import metadata
- budgets or financial goals

## Future Evolution

Expected next additions after V1:

- `wallet_members` when Supabase Auth is introduced
- categories for reporting and filtering
- service/query helpers for balance calculation
- transaction creation flows that enforce business rules
- credit-card bill settlement and statement modeling
