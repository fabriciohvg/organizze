CREATE TYPE "public"."transaction_kind" AS ENUM('expense', 'income', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."transaction_schedule_kind" AS ENUM('installment', 'recurring');--> statement-breakpoint
CREATE TYPE "public"."transaction_series_status" AS ENUM('active', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'posted');--> statement-breakpoint
CREATE TABLE "transaction_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"bank_account_id" uuid,
	"credit_card_id" uuid,
	"signed_amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_entries_exactly_one_account" CHECK ((
        ("transaction_entries"."bank_account_id" is not null and "transaction_entries"."credit_card_id" is null)
        or
        ("transaction_entries"."bank_account_id" is null and "transaction_entries"."credit_card_id" is not null)
      ))
);
--> statement-breakpoint
CREATE TABLE "transaction_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"kind" "transaction_kind" NOT NULL,
	"schedule_kind" "transaction_schedule_kind" NOT NULL,
	"status" "transaction_series_status" DEFAULT 'active' NOT NULL,
	"description" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"installment_count" integer,
	"generated_through" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"canceled_at" timestamp with time zone,
	CONSTRAINT "transaction_series_installment_count_rule" CHECK ((
        ("transaction_series"."schedule_kind" = 'installment' and "transaction_series"."installment_count" >= 2)
        or
        ("transaction_series"."schedule_kind" = 'recurring' and "transaction_series"."installment_count" is null)
      )),
	CONSTRAINT "transaction_series_installment_end_date_rule" CHECK ((
        ("transaction_series"."schedule_kind" = 'installment' and "transaction_series"."end_date" is null)
        or
        ("transaction_series"."schedule_kind" = 'recurring')
      ))
);
--> statement-breakpoint
CREATE TABLE "transaction_series_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"bank_account_id" uuid,
	"credit_card_id" uuid,
	"signed_amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_series_entries_exactly_one_account" CHECK ((
        ("transaction_series_entries"."bank_account_id" is not null and "transaction_series_entries"."credit_card_id" is null)
        or
        ("transaction_series_entries"."bank_account_id" is null and "transaction_series_entries"."credit_card_id" is not null)
      ))
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"series_id" uuid,
	"kind" "transaction_kind" NOT NULL,
	"status" "transaction_status" DEFAULT 'posted' NOT NULL,
	"description" text NOT NULL,
	"effective_date" date NOT NULL,
	"occurrence_index" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_occurrence_index_positive" CHECK ("transactions"."occurrence_index" is null or "transactions"."occurrence_index" >= 1)
);
--> statement-breakpoint
ALTER TABLE "transaction_entries" ADD CONSTRAINT "transaction_entries_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_entries" ADD CONSTRAINT "transaction_entries_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_entries" ADD CONSTRAINT "transaction_entries_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_series" ADD CONSTRAINT "transaction_series_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_series_entries" ADD CONSTRAINT "transaction_series_entries_series_id_transaction_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."transaction_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_series_entries" ADD CONSTRAINT "transaction_series_entries_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_series_entries" ADD CONSTRAINT "transaction_series_entries_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_series_id_transaction_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."transaction_series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transaction_entries_transaction_id_idx" ON "transaction_entries" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_entries_bank_account_created_at_idx" ON "transaction_entries" USING btree ("bank_account_id","created_at");--> statement-breakpoint
CREATE INDEX "transaction_entries_credit_card_created_at_idx" ON "transaction_entries" USING btree ("credit_card_id","created_at");--> statement-breakpoint
CREATE INDEX "transactions_wallet_effective_date_idx" ON "transactions" USING btree ("wallet_id","effective_date");--> statement-breakpoint
CREATE INDEX "transactions_series_effective_date_idx" ON "transactions" USING btree ("series_id","effective_date");--> statement-breakpoint
CREATE INDEX "transactions_wallet_status_effective_date_idx" ON "transactions" USING btree ("wallet_id","status","effective_date");