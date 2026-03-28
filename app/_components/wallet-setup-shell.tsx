import {
  BadgeCheckIcon,
  Building2Icon,
  CreditCardIcon,
  LandmarkIcon,
  ShieldCheckIcon,
  WalletCardsIcon,
} from "lucide-react";

import { NewBankAccountSheet } from "@/app/_components/new-bank-account-sheet";
import { NewCreditCardSheet } from "@/app/_components/new-credit-card-sheet";
import { NewWalletForm } from "@/app/_components/new-wallet-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import {
  getLatestWallet,
  listBankAccountsByWalletId,
  listCreditCardsByWalletId,
} from "@/lib/drizzle/queries";

export async function WalletSetupShell() {
  const wallet = await getLatestWallet();

  const [bankAccounts, creditCards] = wallet
    ? await Promise.all([
        listBankAccountsByWalletId(wallet.id),
        listCreditCardsByWalletId(wallet.id),
      ])
    : [[], []];

  const currencyCode = wallet?.currencyCode ?? "BRL";

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="relative overflow-hidden rounded-[calc(var(--radius)*4)] border border-border/60 bg-card/95 p-6 shadow-sm sm:p-8">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/12 via-primary/4 to-transparent" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Persistido em DB</Badge>
                <Badge variant="outline">TanStack Form</Badge>
                <Badge variant="outline">Server Actions</Badge>
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                  Estruture sua carteira antes das transações.
                </h1>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Este fluxo agora grava de verdade no banco usando ações de
                  servidor, mantendo o foco em carteira, contas bancárias e
                  cartões de crédito.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[24rem] lg:max-w-md">
              <MetricCard
                label="Carteira"
                value={wallet ? "Ativa" : "Pendente"}
                caption={wallet ? wallet.name : "Crie a primeira carteira"}
                icon={<WalletCardsIcon />}
              />
              <MetricCard
                label="Contas"
                value={String(bankAccounts.length).padStart(2, "0")}
                caption="Persistidas no banco"
                icon={<LandmarkIcon />}
              />
              <MetricCard
                label="Cartões"
                value={String(creditCards.length).padStart(2, "0")}
                caption="Persistidos no banco"
                icon={<CreditCardIcon />}
              />
            </div>
          </div>
        </header>

        {!wallet ? (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <NewWalletForm />

            <Card className="border border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle>O que acontece depois</CardTitle>
                <CardDescription>
                  Assim que a carteira existir, a tela passa a mostrar os dados
                  persistidos e libera os dois formulários reutilizáveis em
                  sheets.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <StepCard
                  icon={<BadgeCheckIcon />}
                  title="1. Carteira ativa"
                  description="Nome e moeda definem o contexto principal do V1."
                />
                <StepCard
                  icon={<Building2Icon />}
                  title="2. Contas bancárias"
                  description="Cadastre instituição e saldo inicial para preparar receitas, despesas e transferências."
                />
                <StepCard
                  icon={<ShieldCheckIcon />}
                  title="3. Cartões de crédito"
                  description="Cadastre limite, dívida inicial, fechamento e vencimento antes dos fluxos futuros de fatura."
                />
              </CardContent>
            </Card>
          </section>
        ) : (
          <>
            <WalletOverviewCard
              name={wallet.name}
              currencyCode={wallet.currencyCode}
            />

            <section className="grid gap-6 xl:grid-cols-2">
              <AccountsSection
                title="Contas bancárias"
                description="Registre as contas que vão receber saldo inicial, receitas, despesas e transferências."
                count={bankAccounts.length}
                action={
                  <NewBankAccountSheet
                    walletId={wallet.id}
                    buttonLabel="Nova conta"
                  />
                }
                emptyTitle="Nenhuma conta bancária cadastrada"
                emptyDescription="Comece pela conta principal para deixar o fluxo de lançamentos e transferências pronto para o próximo passo."
                emptyIcon={<LandmarkIcon />}
                emptyAction={
                  <NewBankAccountSheet
                    walletId={wallet.id}
                    buttonLabel="Adicionar conta bancária"
                  />
                }
              >
                <div className="flex flex-col gap-3">
                  {bankAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      title={account.name}
                      subtitle={account.institutionName}
                      amountLabel="Saldo inicial"
                      amountValue={formatCurrency(
                        Number(account.initialBalance),
                        currencyCode,
                      )}
                      meta={`Moeda base ${currencyCode}`}
                      icon={<LandmarkIcon />}
                    />
                  ))}
                </div>
              </AccountsSection>

              <AccountsSection
                title="Cartões de crédito"
                description="Cadastre os cartões com limite, dívida carregada e datas de fechamento e vencimento."
                count={creditCards.length}
                action={
                  <NewCreditCardSheet
                    walletId={wallet.id}
                    buttonLabel="Novo cartão"
                  />
                }
                emptyTitle="Nenhum cartão cadastrado"
                emptyDescription="Esse bloco prepara os metadados essenciais do cartão sem entrar ainda em faturas ou pagamentos."
                emptyIcon={<CreditCardIcon />}
                emptyAction={
                  <NewCreditCardSheet
                    walletId={wallet.id}
                    buttonLabel="Adicionar cartão de crédito"
                  />
                }
              >
                <div className="flex flex-col gap-3">
                  {creditCards.map((card) => (
                    <AccountCard
                      key={card.id}
                      title={card.name}
                      subtitle={card.institutionName}
                      amountLabel="Limite"
                      amountValue={formatCurrency(
                        Number(card.creditLimit),
                        currencyCode,
                      )}
                      meta={`Fecha dia ${card.closingDay} • vence dia ${card.dueDay}${card.lastFour ? ` • final ${card.lastFour}` : ""}`}
                      icon={<CreditCardIcon />}
                      supportingValue={`Dívida inicial ${formatCurrency(
                        Number(card.initialBalance),
                        currencyCode,
                      )}`}
                    />
                  ))}
                </div>
              </AccountsSection>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function WalletOverviewCard({
  name,
  currencyCode,
}: {
  name: string;
  currencyCode: string;
}) {
  return (
    <Card className="border border-border/60 bg-card/95 shadow-sm">
      <CardHeader className="border-b border-border/60">
        <CardTitle>{name}</CardTitle>
        <CardDescription>
          Carteira ativa pronta para receber contas bancárias, cartões e os
          primeiros fluxos transacionais do V1.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">{currencyCode}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4 pt-1 sm:grid-cols-3">
        <SummaryTile
          label="Moeda base"
          value={currencyCode}
          description="Escopo monetário da carteira"
        />
        <SummaryTile
          label="Escopo"
          value="Pessoal"
          description="Sem multi-wallet visível nesta etapa"
        />
        <SummaryTile
          label="Origem"
          value="Banco de dados"
          description="A tela agora reflete inserts reais"
        />
      </CardContent>
    </Card>
  );
}

function AccountsSection({
  title,
  description,
  count,
  action,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  children,
}: {
  title: string;
  description: string;
  count: number;
  action: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon: React.ReactNode;
  emptyAction: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-border/60 bg-card/95 shadow-sm">
      <CardHeader className="border-b border-border/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CardTitle>{title}</CardTitle>
              <Badge variant="outline">{count}</Badge>
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-1">
        {count === 0 ? (
          <Empty className="border border-dashed border-border bg-muted/25">
            <EmptyHeader>
              <EmptyMedia variant="icon">{emptyIcon}</EmptyMedia>
              <EmptyTitle>{emptyTitle}</EmptyTitle>
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>{emptyAction}</EmptyContent>
          </Empty>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function AccountCard({
  title,
  subtitle,
  amountLabel,
  amountValue,
  meta,
  icon,
  supportingValue,
}: {
  title: string;
  subtitle: string;
  amountLabel: string;
  amountValue: string;
  meta: string;
  icon: React.ReactNode;
  supportingValue?: string;
}) {
  return (
    <Card size="sm" className="border border-border/60 bg-background/80">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{subtitle}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">{amountLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {amountLabel}
            </span>
            <strong className="font-mono text-lg font-semibold">
              {amountValue}
            </strong>
          </div>
          {supportingValue ? (
            <span className="text-sm text-muted-foreground">
              {supportingValue}
            </span>
          ) : null}
        </div>
        <Separator />
        <p className="text-sm text-muted-foreground">{meta}</p>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <div className="text-primary">{icon}</div>
      </div>
      <strong className="text-lg font-semibold tracking-tight">{value}</strong>
      <p className="text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}

function StepCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border/60 bg-muted/20 p-4">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <strong className="text-base font-semibold tracking-tight">{value}</strong>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
  }).format(value);
}
