/* eslint-disable react/no-children-prop */
"use client";

import { startTransition, useActionState } from "react";
import { useForm } from "@tanstack/react-form";
import { CheckCircle2Icon, WalletCardsIcon } from "lucide-react";

import { createWalletAction } from "@/app/_actions/wallet-setup-actions";
import { getFirstError, toFormData } from "@/app/_components/form-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  INITIAL_FORM_ACTION_STATE,
  type WalletFormValues,
  walletFormSchema,
} from "@/lib/validation/wallet-setup";

export function NewWalletForm() {
  const [state, submitAction, pending] = useActionState(
    createWalletAction,
    INITIAL_FORM_ACTION_STATE,
  );

  const form = useForm({
    defaultValues: {
      name: "",
      currencyCode: "BRL",
    } satisfies WalletFormValues,
    validators: {
      onSubmit: walletFormSchema,
    },
    onSubmit: async ({ value }) => {
      startTransition(() => {
        submitAction(toFormData(value));
      });
    },
  });

  return (
    <Card className="border border-border/60 bg-card/95 shadow-sm">
      <CardHeader>
        <CardTitle>Nova carteira</CardTitle>
        <CardDescription>
          A carteira é o contêiner principal do V1. Todas as contas bancárias,
          cartões e transações futuras vão nascer dentro dela.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field
              name="name"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                const errorMessage =
                  state.fieldErrors?.[field.name]?.[0] ??
                  getFirstError(field.state.meta.errors);

                return (
                  <Field data-invalid={isInvalid || Boolean(errorMessage)}>
                    <FieldLabel htmlFor={field.name}>
                      Nome da carteira
                    </FieldLabel>
                    <input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={isInvalid || Boolean(errorMessage)}
                      autoComplete="off"
                      placeholder="Ex.: Pessoal 2026"
                      className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                    />
                    <FieldDescription>
                      Use um nome simples para identificar o contexto financeiro
                      principal.
                    </FieldDescription>
                    {errorMessage ? (
                      <FieldError>{errorMessage}</FieldError>
                    ) : null}
                  </Field>
                );
              }}
            />

            <form.Field
              name="currencyCode"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                const errorMessage =
                  state.fieldErrors?.[field.name]?.[0] ??
                  getFirstError(field.state.meta.errors);

                return (
                  <Field data-invalid={isInvalid || Boolean(errorMessage)}>
                    <FieldLabel htmlFor="wallet-currency">
                      Moeda base
                    </FieldLabel>
                    <Select
                      name={field.name}
                      value={field.state.value}
                      onValueChange={field.handleChange}
                    >
                      <SelectTrigger
                        id="wallet-currency"
                        className="w-full"
                        aria-invalid={isInvalid || Boolean(errorMessage)}
                      >
                        <SelectValue placeholder="Selecione a moeda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="BRL">
                            Real brasileiro (BRL)
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      A primeira versão opera com uma moeda base por carteira.
                    </FieldDescription>
                    {errorMessage ? (
                      <FieldError>{errorMessage}</FieldError>
                    ) : null}
                  </Field>
                );
              }}
            />
          </FieldGroup>

          {state.status === "error" && state.message ? (
            <Alert variant="destructive">
              <CheckCircle2Icon />
              <AlertTitle>Não foi possível criar a carteira</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-sm text-muted-foreground">
              Depois da criação, os blocos de conta bancária e cartão passam a
              funcionar no mesmo layout.
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <WalletCardsIcon data-icon="inline-start" />
              )}
              {pending ? "Criando..." : "Criar carteira"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
