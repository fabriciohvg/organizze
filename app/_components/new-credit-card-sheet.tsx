"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { CreditCardIcon, PlusIcon } from "lucide-react";

import { createCreditCardAction } from "@/app/_actions/wallet-setup-actions";
import { getFirstError, toFormData } from "@/app/_components/form-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import {
  creditCardFormSchema,
  INITIAL_FORM_ACTION_STATE,
  type CreditCardFormValues,
} from "@/lib/validation/wallet-setup";

type NewCreditCardSheetProps = {
  walletId: string;
  buttonLabel: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
};

export function NewCreditCardSheet({
  walletId,
  buttonLabel,
  buttonVariant = "default",
}: NewCreditCardSheetProps) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setFormKey((current) => current + 1);
    }
  };

  return (
    <>
      <Button variant={buttonVariant} onClick={() => setOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        {buttonLabel}
      </Button>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        {open ? (
          <CreditCardSheetForm
            key={formKey}
            walletId={walletId}
            onSuccess={() => handleOpenChange(false)}
          />
        ) : null}
      </Sheet>
    </>
  );
}

function CreditCardSheetForm({
  walletId,
  onSuccess,
}: {
  walletId: string;
  onSuccess: () => void;
}) {
  const [state, submitAction, pending] = useActionState(
    createCreditCardAction.bind(null, walletId),
    INITIAL_FORM_ACTION_STATE,
  );

  const form = useForm({
    defaultValues: {
      name: "",
      institutionName: "",
      creditLimit: "0.00",
      initialBalance: "0.00",
      closingDay: "",
      dueDay: "",
      lastFour: "",
    } satisfies CreditCardFormValues,
    validators: {
      onSubmit: creditCardFormSchema,
    },
    onSubmit: async ({ value }) => {
      startTransition(() => {
        submitAction(toFormData(value));
      });
    },
  });

  useEffect(() => {
    if (state.status === "success") {
      form.reset();
      onSuccess();
    }
  }, [form, onSuccess, state.status]);

  return (
    <SheetContent side="right" className="w-full sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>Adicionar cartão de crédito</SheetTitle>
        <SheetDescription>
          Cadastre os dados operacionais essenciais do cartão sem entrar em
          fluxo de fatura ou pagamento.
        </SheetDescription>
      </SheetHeader>

      <form
        noValidate
        className="flex flex-1 flex-col gap-6 px-4 pb-4"
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
                  <FieldLabel htmlFor={field.name}>Nome do cartão</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid || Boolean(errorMessage)}
                    placeholder="Ex.: Visa principal"
                  />
                  <FieldDescription>
                    Nome de exibição usado nas telas de seleção e resumo.
                  </FieldDescription>
                  {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
                </Field>
              );
            }}
          />

          <form.Field
            name="institutionName"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              const errorMessage =
                state.fieldErrors?.[field.name]?.[0] ??
                getFirstError(field.state.meta.errors);

              return (
                <Field data-invalid={isInvalid || Boolean(errorMessage)}>
                  <FieldLabel htmlFor={field.name}>Instituição</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid || Boolean(errorMessage)}
                    placeholder="Ex.: Itaú"
                  />
                  <FieldDescription>
                    Emissor ou instituição responsável pelo cartão.
                  </FieldDescription>
                  {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
                </Field>
              );
            }}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <form.Field
              name="creditLimit"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                const errorMessage =
                  state.fieldErrors?.[field.name]?.[0] ??
                  getFirstError(field.state.meta.errors);

                return (
                  <Field data-invalid={isInvalid || Boolean(errorMessage)}>
                    <FieldLabel htmlFor={field.name}>
                      Limite de crédito
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      aria-invalid={isInvalid || Boolean(errorMessage)}
                      inputMode="decimal"
                      placeholder="0.00"
                    />
                    <FieldDescription>
                      Deve ser zero ou maior, em linha com a regra atual do
                      schema.
                    </FieldDescription>
                    {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
                  </Field>
                );
              }}
            />

            <form.Field
              name="initialBalance"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                const errorMessage =
                  state.fieldErrors?.[field.name]?.[0] ??
                  getFirstError(field.state.meta.errors);

                return (
                  <Field data-invalid={isInvalid || Boolean(errorMessage)}>
                    <FieldLabel htmlFor={field.name}>Dívida inicial</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      aria-invalid={isInvalid || Boolean(errorMessage)}
                      inputMode="decimal"
                      placeholder="0.00"
                    />
                    <FieldDescription>
                      Valor já carregado antes dos lançamentos novos do app.
                    </FieldDescription>
                    {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
                  </Field>
                );
              }}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <form.Field
              name="closingDay"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                const errorMessage =
                  state.fieldErrors?.[field.name]?.[0] ??
                  getFirstError(field.state.meta.errors);

                return (
                  <Field orientation="responsive" data-invalid={isInvalid || Boolean(errorMessage)}>
                    <FieldContent>
                      <FieldLabel htmlFor={field.name}>
                        Dia de fechamento
                      </FieldLabel>
                      <FieldDescription>
                        Valor entre 1 e 31 conforme a regra atual da base.
                      </FieldDescription>
                      {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
                    </FieldContent>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      aria-invalid={isInvalid || Boolean(errorMessage)}
                      inputMode="numeric"
                      placeholder="8"
                    />
                  </Field>
                );
              }}
            />

            <form.Field
              name="dueDay"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                const errorMessage =
                  state.fieldErrors?.[field.name]?.[0] ??
                  getFirstError(field.state.meta.errors);

                return (
                  <Field orientation="responsive" data-invalid={isInvalid || Boolean(errorMessage)}>
                    <FieldContent>
                      <FieldLabel htmlFor={field.name}>
                        Dia de vencimento
                      </FieldLabel>
                      <FieldDescription>
                        Valor entre 1 e 31 para orientar o resumo do cartão.
                      </FieldDescription>
                      {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
                    </FieldContent>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      aria-invalid={isInvalid || Boolean(errorMessage)}
                      inputMode="numeric"
                      placeholder="15"
                    />
                  </Field>
                );
              }}
            />
          </div>

          <form.Field
            name="lastFour"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              const errorMessage =
                state.fieldErrors?.[field.name]?.[0] ??
                getFirstError(field.state.meta.errors);

              return (
                <Field data-invalid={isInvalid || Boolean(errorMessage)}>
                  <FieldLabel htmlFor={field.name}>Final do cartão</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid || Boolean(errorMessage)}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="Opcional"
                  />
                  <FieldDescription>
                    Opcional. Quando preenchido, deve conter os 4 últimos
                    dígitos.
                  </FieldDescription>
                  {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
                </Field>
              );
            }}
          />
        </FieldGroup>

        {state.status === "error" && state.message ? (
          <Alert variant="destructive">
            <CreditCardIcon />
            <AlertTitle>Não foi possível salvar o cartão</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <SheetFooter className="border-t border-border/60 px-0 pt-4">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onSuccess}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
              {pending ? "Salvando..." : "Salvar cartão"}
            </Button>
          </div>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
