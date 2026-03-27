CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"name" text NOT NULL,
	"institution_name" text NOT NULL,
	"initial_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"name" text NOT NULL,
	"institution_name" text NOT NULL,
	"credit_limit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"initial_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"closing_day" smallint NOT NULL,
	"due_day" smallint NOT NULL,
	"last_four" varchar(4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_cards_credit_limit_non_negative" CHECK ("credit_cards"."credit_limit" >= 0),
	CONSTRAINT "credit_cards_closing_day_range" CHECK ("credit_cards"."closing_day" between 1 and 31),
	CONSTRAINT "credit_cards_due_day_range" CHECK ("credit_cards"."due_day" between 1 and 31)
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"currency_code" varchar(3) DEFAULT 'BRL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;